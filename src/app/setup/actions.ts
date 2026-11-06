'use server';

import { redirect } from 'next/navigation';
import { sql, dbMessage } from '@/lib/db';
import { audit, signIn } from '@/lib/auth';
import { hashPassword, passwordProblem } from '@/lib/passwords';
import { setupCodeMatches } from '@/lib/migrate';
import { text, type FormState } from '@/lib/forms';

/** Creates the first administrator. Works only while the site has no active administrator. */
export async function createFirstAdmin(_prev: FormState, form: FormData): Promise<FormState> {
  const code = text(form, 'code', 60);
  const name = text(form, 'name', 100);
  const email = text(form, 'email', 200).toLowerCase();
  const password = String(form.get('password') ?? '');
  const again = String(form.get('again') ?? '');
  const errors: string[] = [];
  if (!code) errors.push('Enter the setup code.');
  if (!name) errors.push('Enter your name.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Enter a valid email address.');
  const problem = passwordProblem(password);
  if (problem) errors.push(`Password: ${problem}`);
  else if (password !== again) errors.push('The two passwords are different.');
  if (errors.length) return { errors };

  if (!(await setupCodeMatches(code))) {
    await new Promise((r) => setTimeout(r, 800)); // slows down guessing
    return { errors: ['That setup code is not right. Use the code you set as NHF_SETUP_CODE, or the newest one in the server log (a line starting “[nhf] No administrator yet”).'] };
  }

  let userId: number | null;
  try {
    const hash = await hashPassword(password);
    userId = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(7262002)`;
      const [{ n }] = await tx<{ n: number }[]>`select count(*) as n from users where is_active and 'admin' = any (roles)`;
      if (Number(n) > 0) return null;
      const [u] = await tx<{ id: number }[]>`insert into users (email, name, password_hash, roles) values (${email}, ${name}, ${hash}, '{admin}') returning id`;
      await tx`delete from app_settings where key = 'setup_code'`;
      return u.id;
    });
  } catch (e) {
    return { errors: [dbMessage(e)] };
  }
  if (!userId) return { errors: ['This site already has an administrator. Sign in instead, or ask them to add you.'] };
  await audit(userId, 'first_admin_created', 'user', userId, { email });
  await signIn(email, password);
  redirect('/admin?welcome=1');
}
