'use server';

import { sql } from '@/lib/db';
import type { FormState } from '@/lib/forms';

export async function signUpNewsletter(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') ?? '').trim().toLowerCase().slice(0, 200);
  if (String(form.get('website') ?? '')) return { ok: 'Thank you.' }; // a field only robots fill in
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { errors: ['Enter an email address, such as you@example.com.'] };
  await sql`insert into newsletter_signups (email) values (${email})
            on conflict (email) do update set unsubscribed_at = null`;
  return { ok: 'Thank you. You will get the next newsletter. Every email has a link to stop them.' };
}
