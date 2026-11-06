'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser } from '@/lib/auth';
import { generateFixtures, lagosTimestamp, type ClassificationPlan, type FixtureDraft } from '@/lib/competition';
import { importFixtures } from '@/lib/csv';
import { teamOptions } from '@/lib/queries';
import { CATEGORIES, slugify } from '@/lib/format';
import { bool, fail, id, oneOf, text, type FormState } from '@/lib/forms';

export interface PreviewFixture {
  date: string;
  time: string;
  label: string;
  ref: string | null;
  home: string;
  away: string;
  venue: string | null;
}

interface Meta {
  name: string;
  slug: string;
  seasonId: number;
  category: string;
  format: 'league' | 'groups';
  legs: 1 | 2;
  published: boolean;
}

function readMeta(form: FormData): Meta | string[] {
  const errors: string[] = [];
  const name = text(form, 'name', 80);
  const slug = slugify(text(form, 'slug', 60) || name);
  const seasonId = id(form, 'season');
  const category = oneOf(form, 'category', CATEGORIES);
  const format = oneOf(form, 'format', ['league', 'groups'] as const) ?? 'league';
  const legs = text(form, 'legs', 1) === '2' ? 2 : 1;
  if (!name) errors.push('Give the competition a name.');
  if (!slug) errors.push('Give the competition a web address (letters, numbers and dashes).');
  if (!seasonId) errors.push('Choose the season.');
  if (!category) errors.push('Choose the category.');
  if (errors.length) return errors;
  return { name, slug, seasonId: seasonId!, category: category!, format, legs, published: bool(form, 'published') };
}

/** Write a competition, its groups and fixtures in one transaction. */
async function writeCompetition(
  userId: number,
  meta: Meta,
  groups: { code: string; teams: number[] }[],
  fixtures: (FixtureDraft & { venue?: string | null; venueId?: number | null })[],
): Promise<number> {
  return sql.begin(async (tx) => {
    const [c] = await tx<{ id: number }[]>`
      insert into competitions (season_id, slug, name, category, format, legs, published, created_by)
      values (${meta.seasonId}, ${meta.slug}, ${meta.name}, ${meta.category}::team_category, ${meta.format}::competition_format, ${meta.legs},
              ${meta.published}, ${userId})
      returning id`;
    const groupIds = new Map<string, number>();
    for (const g of groups) {
      const [row] = await tx<{ id: number }[]>`insert into competition_groups (competition_id, code) values (${c.id}, ${g.code}) returning id`;
      groupIds.set(g.code, row.id);
      if (g.teams.length) await tx`insert into group_teams ${tx(g.teams.map((t) => ({ groupId: row.id, teamId: t })))}`;
    }
    // Venues named in a CSV are matched by name, and added if new.
    const venueIds = new Map<string, number>();
    for (const name of new Set(fixtures.map((f) => f.venue).filter((v): v is string => !!v))) {
      const [found] = await tx<{ id: number }[]>`select id from venues where lower(name) = lower(${name}) limit 1`;
      const vid = found?.id ?? (await tx<{ id: number }[]>`insert into venues (name) values (${name}) returning id`)[0].id;
      venueIds.set(name, vid);
    }
    const rows = fixtures.map((f) => ({
      competitionId: c.id,
      stage: f.stage,
      groupId: f.group ? groupIds.get(f.group) ?? null : null,
      round: f.round,
      ref: f.ref,
      label: f.label || 'Match',
      scheduledAt: lagosTimestamp(f.date, f.time),
      venueId: f.venueId ?? (f.venue ? venueIds.get(f.venue) ?? null : null),
      homeTeamId: f.home,
      awayTeamId: f.away,
      homeSlot: f.homeSlot,
      awaySlot: f.awaySlot,
      knockout: f.knockout,
      placeWinner: f.placeWinner,
      placeLoser: f.placeLoser,
    }));
    for (let i = 0; i < rows.length; i += 200) {
      await tx`insert into matches ${tx(rows.slice(i, i + 200))}`;
    }
    return c.id;
  });
}

function preview(fixtures: (FixtureDraft & { venue?: string | null })[], teamName: (id: number) => string): PreviewFixture[] {
  return fixtures.map((f) => ({
    date: f.date,
    time: f.time,
    label: f.label,
    ref: f.ref,
    home: f.home ? teamName(f.home) : f.homeSlot ?? '',
    away: f.away ? teamName(f.away) : f.awaySlot ?? '',
    venue: f.venue ?? null,
  }));
}

export async function buildCompetition(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['competition_manager']);
  const meta = readMeta(form);
  if (Array.isArray(meta)) return { errors: meta };
  const teams = await teamOptions(meta.category);
  const groupOf = new Map<number, string>();
  for (const t of teams) {
    const g = text(form, `team.${t.id}`, 1).toUpperCase();
    if (g) groupOf.set(t.id, meta.format === 'league' ? 'L' : g);
  }
  const codes = [...new Set(groupOf.values())].sort();
  const groups = codes.map((code) => ({ code, teams: [...groupOf].filter(([, g]) => g === code).map(([t]) => t) }));
  const plan = (oneOf(form, 'classification', ['none', 'semis', 'places'] as const) ?? 'none') as ClassificationPlan;
  const result = generateFixtures({
    format: meta.format,
    groups: groups.length ? groups : [{ code: meta.format === 'league' ? 'L' : 'A', teams: [] }],
    legs: meta.legs,
    classification: plan,
    firstDay: text(form, 'firstDay', 10),
    daysBetween: Number(text(form, 'daysBetween', 3) || 7),
    kickoffs: text(form, 'kickoffs', 120).split(','),
  });
  if (!result.ok) return { errors: result.errors };
  const venueId = id(form, 'venue');
  const name = new Map(teams.map((t) => [t.id, t.name]));
  if (text(form, 'intent', 10) !== 'create') {
    return { ok: `${result.fixtures.length} fixtures ready. Check them below, then create the competition.`, data: preview(result.fixtures, (t) => name.get(t) ?? String(t)) };
  }
  let compId: number;
  try {
    compId = await writeCompetition(user.id, meta, groups, result.fixtures.map((f) => ({ ...f, venueId })));
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'competition_created', 'competition', compId, { fixtures: result.fixtures.length, source: 'builder' });
  revalidatePath('/admin/competitions');
  redirect(`/admin/competitions/${compId}?created=1`);
}

export async function importCompetition(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['competition_manager']);
  const meta = readMeta(form);
  if (Array.isArray(meta)) return { errors: meta };
  const teams = await teamOptions();
  const result = importFixtures(String(form.get('csv') ?? ''), teams.map((t) => ({ id: t.id, code: t.code, category: t.category })), meta.category);
  if (!result.ok) return { errors: result.errors };
  const { fixtures, groups, format } = result.value;
  const name = new Map(teams.map((t) => [t.id, t.name]));
  if (text(form, 'intent', 10) !== 'create') {
    return { ok: `${fixtures.length} fixtures read. Check them below, then create the competition.`, data: preview(fixtures, (t) => name.get(t) ?? String(t)) };
  }
  let compId: number;
  try {
    compId = await writeCompetition(user.id, { ...meta, format, legs: 1 }, groups, fixtures);
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'competition_created', 'competition', compId, { fixtures: fixtures.length, source: 'csv' });
  revalidatePath('/admin/competitions');
  redirect(`/admin/competitions/${compId}?created=1`);
}

export async function setPublished(form: FormData): Promise<void> {
  const user = await requireUser(['competition_manager']);
  const compId = id(form, 'competition');
  if (!compId) return;
  const published = bool(form, 'published');
  await sql`update competitions set published = ${published} where id = ${compId}`;
  await audit(user.id, published ? 'competition_published' : 'competition_hidden', 'competition', compId);
  revalidatePath(`/admin/competitions/${compId}`);
}

export async function deleteCompetition(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['competition_manager']);
  const compId = id(form, 'competition');
  if (!compId) return fail('Missing competition.');
  if (text(form, 'confirm', 60) !== 'delete') return fail('Type delete to confirm.');
  const [{ played }] = await sql<{ played: number }[]>`
    select count(*) as played from matches m where m.competition_id = ${compId}
       and (m.status <> 'scheduled' or exists (select 1 from match_squads s where s.match_id = m.id))`;
  if (played > 0) return fail(`${played} matches have results or team sheets. Put them back to scheduled first, or hide the competition instead.`);
  await sql`delete from competitions where id = ${compId}`;
  await audit(user.id, 'competition_deleted', 'competition', compId);
  redirect('/admin/competitions');
}
