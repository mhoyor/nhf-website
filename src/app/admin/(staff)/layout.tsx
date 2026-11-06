import Link from 'next/link';
import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { can, requireUser, ROLE_LABELS } from '@/lib/auth';
import { signOutAction } from '../actions';

export const metadata: Metadata = { title: { default: 'Admin', template: '%s · NHF admin' }, robots: { index: false } };

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  return (
    <div className="wrap admin">
      <aside>
        <nav aria-label="Admin">
          <Link href="/admin">Dashboard</Link>
          {can(user, 'competition_manager', 'scorer') && <Link href="/admin/competitions">Competitions and results</Link>}
          {can(user, 'registrar') && <Link href="/admin/players">Players</Link>}
          {can(user, 'registrar') && <Link href="/admin/registrations">Registrations</Link>}
          {can(user, 'registrar', 'competition_manager') && <Link href="/admin/clubs">Clubs and teams</Link>}
          {can(user, 'registrar', 'competition_manager') && <Link href="/admin/seasons">Seasons</Link>}
          {can(user, 'registrar', 'competition_manager') && <Link href="/admin/venues">Venues</Link>}
          {can(user, 'media') && <Link href="/admin/news">News</Link>}
          {can(user, 'admin') && <Link href="/admin/users">Users</Link>}
          <Link href="/admin/account">My account</Link>
          <span className="who">
            {user.name}
            <br />
            {user.roles.map((r) => ROLE_LABELS[r]).join(', ') || 'No role yet'}
          </span>
          <form action={signOutAction}>
            <button className="linkbtn" type="submit" style={{ padding: '8px 10px' }}>
              Sign out
            </button>
          </form>
        </nav>
      </aside>
      <main>{children}</main>
    </div>
  );
}
