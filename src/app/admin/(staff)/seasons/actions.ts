'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser } from '@/lib/auth';
import { bool, date, fail, id, text, type FormState } from '@/lib/forms';

const ROLES = ['competition_manager', 'registrar'] as const;

function seasonFields(form: FormData): { values: { name: string; startsOn: string; endsOn: string } } | { errors: string[] } {
  const name = text(form, 'name', 20);
  const startsOn = date(form, 'startsOn');
  const endsOn = date(form, 'endsOn');
  const errors: string[] = [];
  if (name.length < 2) errors.push('Give the season a name, such as 2026 or 2026/27.');
  if (!startsOn || !endsOn) errors.push('Enter the first and last day as dates.');
  else if (endsOn <= startsOn) errors.push('The last day must be after the first day.');
  return errors.length ? { errors } : { values: { name, startsOn: startsOn!, endsOn: endsOn! } };
}

export async function createSeason(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser([...ROLES]);
  const f = seasonFields(form);
  if ('errors' in f) return { errors: f.errors };
  const current = bool(form, 'current');
  let seasonId: number;
  try {
    seasonId = await sql.begin(async (tx) => {
      const [s] = await tx<{ id: number }[]>`insert into seasons (name, starts_on, ends_on) values (${f.values.name}, ${f.values.startsOn}, ${f.values.endsOn}) returning id`;
      if (current) {
        await tx`update seasons set is_current = false where is_current and id <> ${s.id}`;
        await tx`update seasons set is_current = true where id = ${s.id}`;
      }
      return s.id;
    });
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'season_created', 'season', seasonId, { ...f.values, current });
  revalidatePath('/admin/seasons');
  return { ok: `Season ${f.values.name} added${current ? ' and made current' : ''}.` };
}

export async function updateSeason(seasonId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser([...ROLES]);
  const f = seasonFields(form);
  if ('errors' in f) return { errors: f.errors };
  // Matches and registrations outside the new dates would no longer belong to the season.
  const [{ outside }] = await sql<{ outside: number }[]>`
    select (select count(*) from matches m join competitions c on c.id = m.competition_id
             where c.season_id = ${seasonId}
               and ((m.scheduled_at at time zone 'Africa/Lagos')::date < ${f.values.startsOn}::date or (m.scheduled_at at time zone 'Africa/Lagos')::date > ${f.values.endsOn}::date)) as outside`;
  try {
    await sql`update seasons set name = ${f.values.name}, starts_on = ${f.values.startsOn}, ends_on = ${f.values.endsOn} where id = ${seasonId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'season_updated', 'season', seasonId, f.values);
  revalidatePath('/admin/seasons');
  return {
    ok: 'Season saved.',
    warnings: Number(outside) > 0 ? [`${outside} of this season’s matches fall outside the new dates. Check the dates, or move those matches.`] : undefined,
  };
}

export async function setCurrentSeason(form: FormData): Promise<void> {
  const user = await requireUser([...ROLES]);
  const seasonId = id(form, 'season');
  if (!seasonId) return;
  // The current season is the one public pages show first, and the default for new registrations.
  await sql.begin(async (tx) => {
    await tx`update seasons set is_current = false where is_current and id <> ${seasonId}`;
    await tx`update seasons set is_current = true where id = ${seasonId}`;
  });
  await audit(user.id, 'season_made_current', 'season', seasonId);
  revalidatePath('/admin/seasons');
  revalidatePath('/', 'layout');
  redirect('/admin/seasons?current=1');
}

export async function deleteSeason(seasonId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser([...ROLES]);
  if (!bool(form, 'sure')) return fail('Tick the box to confirm.');
  const [{ used }] = await sql<{ used: number }[]>`
    select (select count(*) from competitions where season_id = ${seasonId}) + (select count(*) from registrations where season_id = ${seasonId}) as used`;
  if (Number(used) > 0) return fail('This season has competitions or registrations, so it cannot be deleted. Its history stays on the site.');
  try {
    await sql`delete from seasons where id = ${seasonId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'season_deleted', 'season', seasonId);
  redirect('/admin/seasons?deleted=1');
}
