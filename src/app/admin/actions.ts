'use server';

import { redirect } from 'next/navigation';
import { signIn, signOut } from '@/lib/auth';
import { text, type FormState } from '@/lib/forms';

export async function signInAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = text(form, 'email', 200);
  const password = String(form.get('password') ?? '');
  const next = text(form, 'next', 200);
  if (!email || !password) return { errors: ['Enter your email address and password.'] };
  const user = await signIn(email, password);
  if (user === 'locked') return { errors: ['Too many attempts. Wait 15 minutes, or ask an administrator to check your account.'] };
  if (!user) return { errors: ['That email address and password do not match an active account.'] };
  // Only redirect within the site.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/admin');
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect('/admin/login');
}
