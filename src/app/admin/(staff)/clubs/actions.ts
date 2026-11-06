'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser } from '@/lib/auth';
import { CATEGORIES, slugify } from '@/lib/format';
import { bool, fail, id, int, oneOf, optText, text, type FormState } from '@/lib/forms';
import { readImage } from '@/lib/images';

function clubFields(form: FormData): { values: Record<string, unknown> } | { errors: string[] } {
  const name = text(form, 'name', 100);
  const slug = slugify(text(form, 'slug', 60) || name);
  const founded = int(form, 'foundedYear');
  const website = optText(form, 'website', 200);
  const errors: string[] = [];
  if (!name) errors.push('Enter the club name.');
  if (!slug) errors.push('Enter a web address for the club.');
  if (founded !== null && (Number.isNaN(founded) || founded < 1900 || founded > 2100)) errors.push('Founded should be a year such as 1998.');
  if (website && !/^https?:\/\/[^\s]+$/i.test(website)) errors.push('The website should start with https://');
  if (errors.length) return { errors };
  return {
    values: { name, slug, shortName: optText(form, 'shortName', 40), state: optText(form, 'state', 40), city: optText(form, 'city', 60), foundedYear: founded, website },
  };
}

export async function createClub(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar', 'competition_manager']);
  const f = clubFields(form);
  if ('errors' in f) return { errors: f.errors };
  let clubId: number;
  try {
    [{ id: clubId }] = await sql<{ id: number }[]>`insert into clubs ${sql(f.values)} returning id`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'club_created', 'club', clubId, f.values);
  redirect(`/admin/clubs/${clubId}`);
}

export async function updateClub(clubId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar', 'competition_manager']);
  const f = clubFields(form);
  if ('errors' in f) return { errors: f.errors };
  try {
    await sql`update clubs set ${sql(f.values)} where id = ${clubId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'club_updated', 'club', clubId, f.values);
  revalidatePath(`/admin/clubs/${clubId}`);
  return { ok: 'Club saved.' };
}

export async function saveTeam(clubId: number, teamId: number | null, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar', 'competition_manager']);
  const name = text(form, 'name', 80);
  const code = text(form, 'code', 5).toUpperCase();
  const category = oneOf(form, 'category', CATEGORIES);
  const colour = text(form, 'colour', 7) || null;
  const venue = id(form, 'venue');
  const errors: string[] = [];
  if (!name) errors.push('Enter the team name, such as Kada Queens.');
  if (!/^[A-Z0-9]{2,5}$/.test(code)) errors.push('The team code is 2 to 5 capital letters or digits, such as KADW. It is used in CSV uploads.');
  if (!category) errors.push('Choose the category.');
  if (colour && !/^#[0-9A-Fa-f]{6}$/.test(colour)) errors.push('Choose a colour.');
  if (errors.length) return { errors };
  const values = { clubId, name, code, category, colour, homeVenueId: venue };
  try {
    if (teamId) {
      const [{ used }] = await sql<{ used: number }[]>`select count(*) as used from registrations where team_id = ${teamId}`;
      const [cur] = await sql<{ category: string }[]>`select category::text as category from teams where id = ${teamId}`;
      if (used > 0 && cur && cur.category !== category) return fail('This team has registrations, so its category cannot change. Create a new team instead.');
      await sql`update teams set ${sql(values)} where id = ${teamId} and club_id = ${clubId}`;
    } else {
      await sql`insert into teams ${sql(values)}`;
    }
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, teamId ? 'team_updated' : 'team_created', 'team', teamId, values);
  revalidatePath(`/admin/clubs/${clubId}`);
  return { ok: teamId ? 'Team saved.' : `Team ${name} added.` };
}

/** A club's crest: shown on its page, in tables and on match cards. */
export async function saveClubCrest(clubId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['registrar', 'competition_manager']);
  const picked = await readImage(form, 'crest', 2, 'The crest');
  if (typeof picked === 'string') return fail(picked);
  const remove = bool(form, 'removeCrest');
  if (!picked && !remove) return fail('Choose an image first.');
  let slug: string | undefined;
  try {
    slug = await sql.begin(async (tx) => {
      let url: string | null = null;
      if (picked) {
        const [m] = await tx<{ id: number }[]>`
          insert into media (filename, content_type, bytes, created_by) values (${picked.name}, ${picked.type}, ${picked.bytes}, ${user.id}) returning id`;
        url = `/media/${m.id}`;
      }
      const [c] = await tx<{ slug: string }[]>`update clubs set crest_url = ${url} where id = ${clubId} returning slug`;
      return c?.slug;
    });
  } catch (e) {
    return fail(dbMessage(e));
  }
  if (!slug) return fail('That club no longer exists.');
  await audit(user.id, picked ? 'club_crest_set' : 'club_crest_removed', 'club', clubId);
  revalidatePath(`/admin/clubs/${clubId}`);
  revalidatePath(`/match-centre/clubs/${slug}`);
  return { ok: picked ? 'Crest saved.' : 'Crest removed.' };
}
