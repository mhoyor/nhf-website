import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { param } from '@/lib/format';
import { signInAction } from '../actions';
import { ActionForm } from '@/components/ActionForm';
import { sql } from '@/lib/db';

async function anyAdmin(): Promise<boolean> {
  try {
    return (await sql<{ any: boolean }[]>`select exists (select 1 from users where is_active and 'admin' = any (roles)) as any`)[0].any;
  } catch {
    return false; // no users table yet: the database is not set up
  }
}

export const metadata: Metadata = { title: 'Staff sign-in', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const next = param(sp.next) || '/admin';
  if (await currentUser()) redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/admin');
  // A brand-new site has no administrator yet: the first one is made on the setup page.
  if (!(await anyAdmin())) redirect('/setup');
  return (
    <div className="wrap page" style={{ maxWidth: 460 }}>
      <h1>Staff sign-in</h1>
      <p className="muted">For NHF administrators, competition managers, registrars, scorers and media.</p>
      <div className="panel">
        <ActionForm action={signInAction} submit="Sign in">
          <input type="hidden" name="next" value={next} />
          <label className="field">
            Email address
            <input name="email" type="email" autoComplete="username" required />
          </label>
          <label className="field">
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
        </ActionForm>
      </div>
      <p className="small muted" style={{ marginTop: 12 }}>
        Forgotten your password? Ask an NHF administrator to set a new one.
      </p>
    </div>
  );
}
