import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { clubs } from '@/lib/queries';
import { ActionForm } from '@/components/ActionForm';
import { CATEGORY_LABELS } from '@/lib/format';
import { createClub } from './actions';
import { ClubFields } from './ClubFields';

export const metadata: Metadata = { title: 'Clubs and teams' };

export default async function AdminClubs() {
  await requireUser(['registrar', 'competition_manager'], '/admin/clubs');
  const list = await clubs();
  return (
    <div className="stack">
      <h1>Clubs and teams</h1>
      <p className="muted">
        A club is the organisation; its teams are what play in competitions, one or more per category. Players register with a team for a season, so a club&rsquo;s history
        stays with the club when players move on.
      </p>
      <div className="panel scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Club</th>
              <th>Location</th>
              <th>Teams</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/clubs/${c.id}`}>{c.name}</Link>
                </td>
                <td>{[c.city, c.state].filter(Boolean).join(', ')}</td>
                <td className="small">{c.teams.map((t) => `${t.code} (${CATEGORY_LABELS[t.category]})`).join(', ') || 'None yet'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="panel">
        <h2>Add a club</h2>
        <ActionForm action={createClub} submit="Add club">
          <ClubFields />
        </ActionForm>
      </section>
    </div>
  );
}
