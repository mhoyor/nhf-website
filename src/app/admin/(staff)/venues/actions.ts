'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser } from '@/lib/auth';
import { bool, fail, optText, text, type FormState } from '@/lib/forms';

const ROLES = ['competition_manager', 'registrar'] as const;

function venueFields(form: FormData): { values: Record<string, string | null> } | { errors: string[] } {
  const name = text(form, 'name', 100);
  if (name.length < 2) return { errors: ['Enter the venue’s name, such as “National Hockey Pitch, Moshood Abiola National Stadium”.'] };
  return { values: { name, city: optText(form, 'city', 60), state: optText(form, 'state', 40), surface: optText(form, 'surface', 60) } };
}

export async function createVenue(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser([...ROLES]);
  const f = venueFields(form);
  if ('errors' in f) return { errors: f.errors };
  const [dupe] = await sql<{ id: number }[]>`select id from venues where lower(name) = lower(${f.values.name})`;
  if (dupe) return fail('There is already a venue with that name.');
  let venueId: number;
  try {
    [{ id: venueId }] = await sql<{ id: number }[]>`insert into venues ${sql(f.values)} returning id`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'venue_created', 'venue', venueId, f.values);
  revalidatePath('/admin/venues');
  return { ok: `${f.values.name} added. Choose it when adding fixtures, or as a team’s home ground.` };
}

export async function updateVenue(venueId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser([...ROLES]);
  const f = venueFields(form);
  if ('errors' in f) return { errors: f.errors };
  try {
    await sql`update venues set ${sql(f.values)} where id = ${venueId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'venue_updated', 'venue', venueId, f.values);
  revalidatePath('/admin/venues');
  return { ok: 'Venue saved.' };
}

export async function deleteVenue(venueId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser([...ROLES]);
  if (!bool(form, 'sure')) return fail('Tick the box to confirm.');
  const [{ used }] = await sql<{ used: number }[]>`
    select (select count(*) from matches where venue_id = ${venueId}) + (select count(*) from teams where home_venue_id = ${venueId}) as used`;
  if (Number(used) > 0) return fail('Matches or teams use this venue, so it cannot be deleted.');
  try {
    await sql`delete from venues where id = ${venueId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'venue_deleted', 'venue', venueId);
  redirect('/admin/venues?deleted=1');
}
