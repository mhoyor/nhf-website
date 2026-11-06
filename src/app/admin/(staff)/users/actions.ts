'use server';

import { revalidatePath } from 'next/cache';
import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser, ROLE_LABELS, type Role } from '@/lib/auth';
import { hashPassword, passwordProblem, verifyPassword } from '@/lib/passwords';
import { bool, fail, id, text, type FormState } from '@/lib/forms';

const ROLES = Object.keys(ROLE_LABELS) as Role[];

function rolesFrom(form: FormData): Role[] {
  return form.getAll('roles').map(String).filter((r): r is Role => (ROLES as string[]).includes(r));
}

export async function createUser(_prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireUser(['admin']);
  const email = text(form, 'email', 200).toLowerCase();
  const name = text(form, 'name', 100);
  const password = String(form.get('password') ?? '');
  const roles = rolesFrom(form);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.');
  if (!name) return fail('Enter the person’s name.');
  const problem = passwordProblem(password);
  if (problem) return fail(`Temporary password: ${problem}`);
  try {
    const [{ id: userId }] = await sql<{ id: number }[]>`
      insert into users (email, name, password_hash, roles) values (${email}, ${name}, ${await hashPassword(password)}, ${roles}::user_role[]) returning id`;
    await audit(admin.id, 'user_created', 'user', userId, { email, roles });
  } catch (e) {
    return fail(dbMessage(e));
  }
  revalidatePath('/admin/users');
  return { ok: `${name} can now sign in. Give them the temporary password in person or by phone, and ask them to change it.` };
}

export async function updateUser(userId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const admin = await requireUser(['admin']);
  const roles = rolesFrom(form);
  const active = bool(form, 'active');
  if (userId === admin.id && (!roles.includes('admin') || !active)) return fail('You cannot remove your own administrator access.');
  const password = String(form.get('password') ?? '');
  if (password) {
    const problem = passwordProblem(password);
    if (problem) return fail(`New password: ${problem}`);
  }
  try {
    await sql.begin(async (tx) => {
      await tx`update users set roles = ${roles}::user_role[], is_active = ${active} where id = ${userId}`;
      if (password) await tx`update users set password_hash = ${await hashPassword(password)} where id = ${userId}`;
      if (password || !active) await tx`delete from sessions where user_id = ${userId}`;
    });
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(admin.id, 'user_updated', 'user', userId, { roles, active, passwordReset: !!password });
  revalidatePath('/admin/users');
  return { ok: password ? 'Saved, and the password was reset. They are signed out everywhere.' : 'Saved.' };
}

export async function changeOwnPassword(_prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const current = String(form.get('current') ?? '');
  const next = String(form.get('next') ?? '');
  const again = String(form.get('again') ?? '');
  const [row] = await sql<{ passwordHash: string }[]>`select password_hash from users where id = ${user.id}`;
  if (!row || !(await verifyPassword(current, row.passwordHash))) return fail('Your current password is not right.');
  const problem = passwordProblem(next);
  if (problem) return fail(problem);
  if (next !== again) return fail('The new passwords do not match.');
  await sql`update users set password_hash = ${await hashPassword(next)} where id = ${user.id}`;
  await audit(user.id, 'password_changed', 'user', user.id);
  return { ok: 'Password changed.' };
}

export async function assignScorer(form: FormData): Promise<void> {
  const admin = await requireUser(['competition_manager']);
  const matchId = id(form, 'match');
  const userId = id(form, 'user');
  if (!matchId || !userId) return;
  if (bool(form, 'remove')) await sql`delete from scorer_assignments where match_id = ${matchId} and user_id = ${userId}`;
  else await sql`insert into scorer_assignments (match_id, user_id) values (${matchId}, ${userId}) on conflict do nothing`;
  await audit(admin.id, 'scorer_assigned', 'match', matchId, { userId, remove: bool(form, 'remove') });
  revalidatePath(`/score/${matchId}`);
}
