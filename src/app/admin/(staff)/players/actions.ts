'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser } from '@/lib/auth';
import { addDays } from '@/lib/competition';
import { importPlayers } from '@/lib/csv';
import { teamOptions } from '@/lib/queries';
import { bool, date, fail, id, int, oneOf, optText, text, type FormState } from '@/lib/forms';
import { readImage } from '@/lib/images';

const POSITIONS = ['GK', 'DF', 'MF', 'FW'] as const;

function playerFields(form: FormData): { values: Record<string, unknown> } | { errors: string[] } {
  const firstName = text(form, 'firstName', 60);
  const lastName = text(form, 'lastName', 60);
  const gender = oneOf(form, 'gender', ['female', 'male'] as const);
  const nhf = text(form, 'nhfNumber', 14).toUpperCase();
  const dob = text(form, 'dateOfBirth', 10);
  const consent = text(form, 'guardianConsentOn', 10);
  const errors: string[] = [];
  if (!firstName || !lastName) errors.push('Enter the first and last name.');
  if (!gender) errors.push('Choose female or male.');
  if (nhf && !/^NHF-[0-9]{4,8}$/.test(nhf)) errors.push('The NHF number should look like NHF-26001, or leave it empty to issue the next number.');
  if (dob && !date(form, 'dateOfBirth')) errors.push('Enter the date of birth as YYYY-MM-DD.');
  if (errors.length) return { errors };
  const values: Record<string, unknown> = {
    firstName,
    lastName,
    otherNames: optText(form, 'otherNames', 80),
    gender,
    position: oneOf(form, 'position', POSITIONS),
    dateOfBirth: dob || null,
    guardianConsentOn: consent || null,
  };
  if (nhf) values.nhfNumber = nhf;
  return { values };
}

export async function createPlayer(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar']);
  const f = playerFields(form);
  if ('errors' in f) return { errors: f.errors };
  const [dupe] = await sql<{ id: number; nhfNumber: string }[]>`
    select id, nhf_number from players
     where lower(first_name) = lower(${f.values.firstName as string}) and lower(last_name) = lower(${f.values.lastName as string})
       and date_of_birth is not distinct from ${(f.values.dateOfBirth as string | null) ?? null}::date limit 1`;
  if (dupe && !bool(form, 'confirmDuplicate'))
    return {
      errors: [`${f.values.firstName} ${f.values.lastName} (${dupe.nhfNumber}) is already registered with the same date of birth. Open that player instead, or tick “This is a different person”.`],
    };
  let playerId: number;
  try {
    [{ id: playerId }] = await sql<{ id: number }[]>`insert into players ${sql(f.values)} returning id`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'player_created', 'player', playerId);
  redirect(`/admin/players/${playerId}`);
}

export async function updatePlayer(playerId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar']);
  const f = playerFields(form);
  if ('errors' in f) return { errors: f.errors };
  try {
    await sql`update players set ${sql(f.values)} where id = ${playerId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'player_updated', 'player', playerId);
  revalidatePath(`/admin/players/${playerId}`);
  return { ok: 'Player saved.' };
}

export async function registerPlayer(playerId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar']);
  const teamId = id(form, 'team');
  const seasonId = id(form, 'season');
  const shirt = int(form, 'shirt');
  const joined = date(form, 'joinedOn');
  if (!teamId || !seasonId) return fail('Choose the team and season.');
  if (shirt !== null && (Number.isNaN(shirt) || shirt < 1 || shirt > 99)) return fail('The shirt number is from 1 to 99.');
  const status = bool(form, 'approve') ? 'approved' : 'pending';
  try {
    await sql`
      insert into registrations (player_id, team_id, season_id, shirt_number, status, joined_on, approved_by, approved_at, note)
      values (${playerId}, ${teamId}, ${seasonId}, ${shirt}, ${status}::registration_status,
              coalesce(${joined}::date, (select greatest(starts_on, current_date) from seasons where id = ${seasonId})),
              ${status === 'approved' ? user.id : null}, case when ${status === 'approved'} then now() end, ${optText(form, 'note', 200)})`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'registration_created', 'player', playerId, { teamId, seasonId, status });
  revalidatePath(`/admin/players/${playerId}`);
  return { ok: status === 'approved' ? 'Registered and approved.' : 'Registration added. It needs approval before the player can play.' };
}

/**
 * A move to another team in the same category during a season: the current
 * registration ends the day before, the new one starts on the transfer date.
 * Earlier appearances stay with the old club.
 */
export async function transferPlayer(playerId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar']);
  const fromId = id(form, 'from');
  const teamId = id(form, 'team');
  const on = date(form, 'on');
  const shirt = int(form, 'shirt');
  if (!fromId || !teamId || !on) return fail('Choose the current registration, the new team and the transfer date.');
  if (shirt !== null && (Number.isNaN(shirt) || shirt < 1 || shirt > 99)) return fail('The shirt number is from 1 to 99.');
  const status = bool(form, 'approve') ? 'approved' : 'pending';
  try {
    await sql.begin(async (tx) => {
      const [cur] = await tx<{ id: number; teamId: number; seasonId: number; joinedOn: string; category: string }[]>`
        select id, team_id, season_id, joined_on, category::text as category from registrations
         where id = ${fromId} and player_id = ${playerId} and left_on is null and status in ('approved', 'pending') for update`;
      if (!cur) throw Object.assign(new Error('That registration is no longer active.'), { code: 'P0001' });
      if (cur.teamId === teamId) throw Object.assign(new Error('The player is already registered with that team.'), { code: 'P0001' });
      if (on <= cur.joinedOn) throw Object.assign(new Error(`The transfer date must be after they joined their current team (${cur.joinedOn}).`), { code: 'P0001' });
      await tx`update registrations set left_on = ${addDays(on, -1)}::date, note = coalesce(note || ' · ', '') || 'Transferred' where id = ${cur.id}`;
      await tx`
        insert into registrations (player_id, team_id, season_id, shirt_number, status, joined_on, approved_by, approved_at, note)
        values (${playerId}, ${teamId}, ${cur.seasonId}, ${shirt}, ${status}::registration_status, ${on}::date,
                ${status === 'approved' ? user.id : null}, case when ${status === 'approved'} then now() end, ${optText(form, 'note', 200) ?? 'Transfer'})`;
    });
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'player_transferred', 'player', playerId, { fromId, teamId, on, status });
  revalidatePath(`/admin/players/${playerId}`);
  return { ok: 'Transfer recorded. Appearances before the transfer date stay with the old club.' };
}

export async function setRegistrationStatus(form: FormData): Promise<void> {
  const user = await requireUser(['registrar']);
  const regIds = form.getAll('registration').map(Number).filter((n) => Number.isInteger(n) && n > 0);
  const status = oneOf(form, 'status', ['approved', 'rejected', 'withdrawn'] as const);
  if (!regIds.length || !status) return;
  try {
    await sql`
      update registrations
         set status = ${status}::registration_status,
             approved_by = case when ${status} = 'approved' then ${user.id}::bigint else approved_by end,
             approved_at = case when ${status} = 'approved' then now() else approved_at end
       where id in ${sql(regIds)}`;
  } catch (e) {
    // The page shows the registration unchanged; the audit log records why.
    await audit(user.id, 'registration_status_failed', 'registration', regIds[0], { status, error: dbMessage(e) });
    return;
  }
  await audit(user.id, `registration_${status}`, 'registration', regIds.length === 1 ? regIds[0] : null, { ids: regIds });
  revalidatePath('/admin/registrations');
  const back = text(form, 'back', 200);
  if (back.startsWith('/admin/')) revalidatePath(back);
}

export async function recordLeaving(playerId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar']);
  const regId = id(form, 'registration');
  const on = date(form, 'leftOn');
  if (!regId || !on) return fail('Choose the leaving date.');
  try {
    await sql`update registrations set left_on = ${on}::date where id = ${regId} and player_id = ${playerId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'registration_closed', 'registration', regId, { on });
  revalidatePath(`/admin/players/${playerId}`);
  return { ok: 'Leaving date saved.' };
}

/** A club's player list for a season. New players are created; returning players are matched by NHF number. */
export async function importPlayerList(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar']);
  const seasonId = id(form, 'season');
  if (!seasonId) return fail('Choose the season.');
  const approve = bool(form, 'approve');
  const teams = await teamOptions();
  const parsed = importPlayers(String(form.get('csv') ?? ''), teams.map((t) => ({ id: t.id, code: t.code, category: t.category })));
  if (!parsed.ok) return { errors: parsed.errors };
  const rows = parsed.value;
  const numbers = rows.map((r) => r.nhfNumber).filter((n): n is string => !!n);
  const known = numbers.length
    ? await sql<{ id: number; nhfNumber: string; firstName: string; lastName: string }[]>`select id, nhf_number, first_name, last_name from players where nhf_number in ${sql(numbers)}`
    : [];
  const byNumber = new Map(known.map((k) => [k.nhfNumber, k]));
  const active = known.length
    ? await sql<{ playerId: number; teamId: number; category: string }[]>`
        select player_id, team_id, category::text as category from registrations
         where season_id = ${seasonId} and left_on is null and status in ('approved', 'pending') and player_id in ${sql(known.map((k) => k.id))}`
    : [];
  const teamCat = new Map(teams.map((t) => [t.id, t.category]));
  const teamCode = new Map(teams.map((t) => [t.id, t.code]));
  const teamIds = [...new Set(rows.map((r) => r.teamId))];
  const taken = await sql<{ teamId: number; shirtNumber: number; playerId: number }[]>`
    select team_id, shirt_number, player_id from registrations
     where season_id = ${seasonId} and left_on is null and status in ('approved', 'pending') and shirt_number is not null
       and team_id in ${sql(teamIds)}`;
  // Rows without a number must not be people who are already in the register.
  const unnumbered = rows.filter((r) => !r.nhfNumber);
  const lookalikes = unnumbered.length
    ? await sql<{ nhfNumber: string; key: string }[]>`
        select nhf_number, lower(first_name) || '|' || lower(last_name) || '|' || coalesce(date_of_birth::text, '') as key from players
         where lower(first_name) || '|' || lower(last_name) || '|' || coalesce(date_of_birth::text, '')
               in ${sql(unnumbered.map((r) => `${r.firstName.toLowerCase()}|${r.lastName.toLowerCase()}|${r.dateOfBirth ?? ''}`))}`
    : [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let skip = 0;
  for (const r of unnumbered) {
    const hit = lookalikes.find((l) => l.key === `${r.firstName.toLowerCase()}|${r.lastName.toLowerCase()}|${r.dateOfBirth ?? ''}`);
    if (hit) errors.push(`Row ${r.line}: ${r.firstName} ${r.lastName} is already in the register as ${hit.nhfNumber}. Put that number in the row so their history is kept.`);
  }
  for (const r of rows) {
    const k = r.nhfNumber ? byNumber.get(r.nhfNumber) : undefined;
    const clash = r.shirt !== null && taken.find((t) => t.teamId === r.teamId && t.shirtNumber === r.shirt && t.playerId !== k?.id);
    if (clash) errors.push(`Row ${r.line}: shirt ${r.shirt} for ${teamCode.get(r.teamId)} is already worn by another player this season.`);
    if (k && (k.lastName.toLowerCase() !== r.lastName.toLowerCase() || k.firstName.toLowerCase() !== r.firstName.toLowerCase()))
      warnings.push(`Row ${r.line}: ${r.nhfNumber} is ${k.firstName} ${k.lastName} in the register; the existing name is kept.`);
    const a = k ? active.find((x) => x.playerId === k.id && x.category === teamCat.get(r.teamId)) : undefined;
    if (a && a.teamId !== r.teamId) errors.push(`Row ${r.line}: ${r.nhfNumber} is already registered with another team this season. Record a transfer on their page instead.`);
    else if (a) skip++;
  }
  if (errors.length) return { errors, warnings };
  const fresh = rows.filter((r) => !r.nhfNumber || !byNumber.has(r.nhfNumber)).length;
  if (text(form, 'intent', 10) !== 'create') {
    return {
      ok: `Ready: ${fresh} new players, ${rows.length - fresh} returning, ${skip} already registered (skipped). ${approve ? 'Registrations will be approved.' : 'Registrations will wait for approval.'}`,
      warnings,
      data: 'previewed',
    };
  }
  try {
    await sql.begin(async (tx) => {
      for (const r of rows) {
        let pid = r.nhfNumber ? byNumber.get(r.nhfNumber)?.id : undefined;
        if (!pid) {
          const values: Record<string, unknown> = { firstName: r.firstName, lastName: r.lastName, gender: r.gender, dateOfBirth: r.dateOfBirth, position: r.position };
          if (r.nhfNumber) values.nhfNumber = r.nhfNumber;
          [{ id: pid }] = await tx<{ id: number }[]>`insert into players ${tx(values)} returning id`;
        }
        const exists = active.some((x) => x.playerId === pid && x.teamId === r.teamId);
        if (exists) continue;
        await tx`
          insert into registrations (player_id, team_id, season_id, shirt_number, status, joined_on, approved_by, approved_at, note)
          values (${pid}, ${r.teamId}, ${seasonId}, ${r.shirt}, ${approve ? 'approved' : 'pending'}::registration_status,
                  (select greatest(starts_on, current_date) from seasons where id = ${seasonId}),
                  ${approve ? user.id : null}, case when ${approve} then now() end, 'CSV upload')`;
      }
    });
  } catch (e) {
    return { errors: [dbMessage(e)], warnings };
  }
  await audit(user.id, 'players_imported', 'season', seasonId, { rows: rows.length, fresh, approve });
  revalidatePath('/admin/players');
  return { ok: `Done: ${fresh} new players added and ${rows.length - skip} registrations created.`, warnings };
}

/**
 * A player's headshot. Under-18s (or anyone without a date of birth) need a guardian's
 * consent date on record first; public pages also check this when they show it.
 */
export async function savePlayerPhoto(playerId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar']);
  const picked = await readImage(form, 'photo', 3, 'The headshot');
  if (typeof picked === 'string') return fail(picked);
  const remove = bool(form, 'removePhoto');
  if (!picked && !remove) return fail('Choose a photo first.');
  const [p] = await sql<{ adult: boolean; consent: string | null }[]>`
    select coalesce(date_of_birth <= current_date - interval '18 years', false) as adult, guardian_consent_on as consent from players where id = ${playerId}`;
  if (!p) return fail('That player no longer exists.');
  if (picked && !p.adult && !p.consent)
    return fail('This player is under 18, or has no date of birth on record. Enter the date of birth, or the date a parent or guardian gave consent, in the player’s details first.');
  try {
    await sql.begin(async (tx) => {
      let url: string | null = null;
      if (picked) {
        const [m] = await tx<{ id: number }[]>`
          insert into media (filename, content_type, bytes, created_by) values (${picked.name}, ${picked.type}, ${picked.bytes}, ${user.id}) returning id`;
        url = `/media/${m.id}`;
      }
      await tx`update players set photo_url = ${url} where id = ${playerId}`;
    });
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, picked ? 'player_photo_set' : 'player_photo_removed', 'player', playerId);
  revalidatePath(`/admin/players/${playerId}`);
  revalidatePath(`/match-centre/players/${playerId}`);
  return { ok: picked ? 'Headshot saved.' : 'Headshot removed.' };
}
