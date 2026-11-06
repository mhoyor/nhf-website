import type { Metadata } from 'next';
import { requireUser, ROLE_LABELS } from '@/lib/auth';
import { ActionForm } from '@/components/ActionForm';
import { changeOwnPassword } from '../users/actions';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountPage() {
  const user = await requireUser([], '/admin/account');
  return (
    <div className="stack" style={{ maxWidth: 560 }}>
      <h1>My account</h1>
      <p>
        {user.name} · {user.email}
        <br />
        <span className="muted">{user.roles.map((r) => ROLE_LABELS[r]).join(', ') || 'No roles yet: ask an administrator.'}</span>
      </p>
      <section className="panel">
        <h2>Change password</h2>
        <ActionForm action={changeOwnPassword} submit="Change password">
          <label className="field">
            Current password
            <input type="password" name="current" required autoComplete="current-password" />
          </label>
          <label className="field">
            New password
            <input type="password" name="next" required minLength={10} autoComplete="new-password" />
            <small>At least 10 characters. A short sentence is easy to remember and hard to guess.</small>
          </label>
          <label className="field">
            New password again
            <input type="password" name="again" required minLength={10} autoComplete="new-password" />
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
