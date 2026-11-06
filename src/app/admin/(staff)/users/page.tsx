import type { Metadata } from 'next';
import { requireUser, ROLE_LABELS, type Role } from '@/lib/auth';
import { users } from '@/lib/admin-queries';
import { ActionForm } from '@/components/ActionForm';
import { fmtDate } from '@/lib/format';
import { createUser, updateUser } from './actions';

export const metadata: Metadata = { title: 'Users' };

const ROLE_NOTES: Record<Role, string> = {
  admin: 'Everything, including users',
  competition_manager: 'Competitions, fixtures, results and confirmation',
  registrar: 'Clubs, players, registrations and transfers',
  scorer: 'Live scoring of assigned matches, and result entry',
  media: 'Writes and publishes news; sees unpublished competitions',
};

function RoleChecks({ selected = [] }: { selected?: string[] }) {
  return (
    <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
      <legend className="small" style={{ fontWeight: 600 }}>
        Roles
      </legend>
      <div className="grid3" style={{ gap: 6 }}>
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <label key={r} className="check" title={ROLE_NOTES[r]}>
            <input type="checkbox" name="roles" value={r} defaultChecked={selected.includes(r)} /> {ROLE_LABELS[r]}
            <span className="small muted">· {ROLE_NOTES[r]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function UsersPage() {
  await requireUser(['admin'], '/admin/users');
  const list = await users();
  return (
    <div className="stack">
      <h1>Users</h1>
      {list.map((u) => (
        <details key={u.id} className="panel">
          <summary>
            <b>{u.name}</b> <span className="muted">{u.email}</span> · {u.roles.map((r) => ROLE_LABELS[r as Role] ?? r).join(', ') || 'no roles'}
            {!u.isActive && <span className="badge off" style={{ marginLeft: 8 }}>Inactive</span>}
            <span className="small muted"> · last sign-in {u.lastLogin ? fmtDate(u.lastLogin) : 'never'}</span>
          </summary>
          <div style={{ marginTop: 12 }}>
            <ActionForm action={updateUser.bind(null, u.id)} submit="Save">
              <RoleChecks selected={u.roles} />
              <div className="fields">
                <label className="check">
                  <input type="checkbox" name="active" defaultChecked={u.isActive} /> Can sign in
                </label>
                <label className="field">
                  Reset password
                  <input type="password" name="password" autoComplete="new-password" placeholder="Leave empty to keep" />
                </label>
              </div>
            </ActionForm>
          </div>
        </details>
      ))}
      <section className="panel">
        <h2>Add a user</h2>
        <ActionForm action={createUser} submit="Add user">
          <div className="fields">
            <label className="field">
              Name
              <input name="name" required maxLength={100} />
            </label>
            <label className="field">
              Email address
              <input name="email" type="email" required />
            </label>
            <label className="field">
              Temporary password
              <input name="password" type="password" required minLength={10} autoComplete="new-password" />
            </label>
          </div>
          <RoleChecks selected={['scorer']} />
        </ActionForm>
      </section>
    </div>
  );
}
