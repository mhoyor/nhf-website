// Sign-in for the admin and the scorer app. Sessions are random tokens in an
// httpOnly cookie; only their SHA-256 hash is stored. Every server action calls
// requireUser itself: a layout check alone does not protect actions.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { sql } from './db';
import { newToken, tokenHash, verifyPassword } from './passwords';

export type Role = 'admin' | 'competition_manager' | 'registrar' | 'scorer' | 'media';

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  competition_manager: 'Competition manager',
  registrar: 'Registrar',
  scorer: 'Scorer',
  media: 'Media',
};

export interface User {
  id: number;
  email: string;
  name: string;
  roles: Role[];
}

const COOKIE = 'nhf_session';
const SESSION_DAYS = 14;

export function can(user: User | null, ...roles: Role[]): boolean {
  if (!user) return false;
  if (user.roles.includes('admin')) return true;
  return roles.some((r) => user.roles.includes(r));
}

export const currentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  const rows = await sql<User[]>`
    select u.id, u.email, u.name, u.roles::text[] as roles
      from sessions s join users u on u.id = s.user_id
     where s.token_hash = ${tokenHash(token)} and s.expires_at > now() and u.is_active`;
  return rows[0] ?? null;
});

/** For pages and actions: sign-in required, and at least one of the roles (admins pass every check). */
export async function requireUser(roles: Role[] = [], next = '/admin'): Promise<User> {
  const user = await currentUser();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  if (roles.length && !can(user, ...roles)) redirect('/admin?denied=1');
  return user;
}

export async function signIn(email: string, password: string): Promise<User | 'locked' | null> {
  const address = email.trim().toLowerCase();
  const [{ failures }] = await sql<{ failures: number }[]>`
    select count(*) as failures from audit_log
     where action = 'login_failed' and data->>'email' = ${address} and at > now() - interval '15 minutes'`;
  if (failures >= 8) return 'locked';
  const [row] = await sql<(User & { passwordHash: string })[]>`
    select id, email, name, roles::text[] as roles, password_hash from users where email = ${address} and is_active`;
  const ok = row ? await verifyPassword(password, row.passwordHash) : false;
  if (!row || !ok) {
    await sql`insert into audit_log (action, entity, data) values ('login_failed', 'user', ${JSON.stringify({ email: address })}::jsonb)`;
    return null;
  }
  const { token, hash } = newToken();
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${hash}, ${row.id}, now() + ${`${SESSION_DAYS} days`}::interval)`;
  await sql`delete from sessions where expires_at < now()`;
  await audit(row.id, 'login', 'user', row.id);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 3600,
  });
  return { id: row.id, email: row.email, name: row.name, roles: row.roles };
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`delete from sessions where token_hash = ${tokenHash(token)}`;
  jar.delete(COOKIE);
}

export async function audit(userId: number | null, action: string, entity: string, entityId: number | null, data?: Record<string, unknown>): Promise<void> {
  await sql`insert into audit_log (user_id, action, entity, entity_id, data)
            values (${userId}, ${action}, ${entity}, ${entityId}, ${data ? JSON.stringify(data) : null}::jsonb)`;
}
