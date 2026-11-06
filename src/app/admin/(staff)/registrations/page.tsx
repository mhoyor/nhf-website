import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { pendingRegistrations } from '@/lib/admin-queries';
import { ageOn, CATEGORY_LABELS, lagosDay } from '@/lib/format';
import { setRegistrationStatus } from '../players/actions';

export const metadata: Metadata = { title: 'Registrations' };

export default async function RegistrationsPage() {
  await requireUser(['registrar'], '/admin/registrations');
  const rows = await pendingRegistrations();
  const today = lagosDay();
  return (
    <div className="stack">
      <h1>Registrations to approve</h1>
      <p className="muted">A player can only be picked for a match once their registration is approved. Check the player&rsquo;s documents, and guardian consent for under-18s.</p>
      {rows.length ? (
        <form action={setRegistrationStatus} className="panel stack">
          <div className="scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>
                    <span className="sr-only">Select</span>
                  </th>
                  <th>Player</th>
                  <th>Team</th>
                  <th>Season</th>
                  <th className="n">#</th>
                  <th>Age</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input type="checkbox" name="registration" value={r.id} defaultChecked aria-label={`Select ${r.firstName} ${r.lastName}`} />
                    </td>
                    <td>
                      <Link href={`/admin/players/${r.playerId}`}>
                        {r.firstName} {r.lastName}
                      </Link>
                      <div className="small muted">{r.nhfNumber}</div>
                    </td>
                    <td>
                      {r.teamName}
                      <div className="small muted">{CATEGORY_LABELS[r.category]}</div>
                    </td>
                    <td>{r.seasonName}</td>
                    <td className="n">{r.shirtNumber ?? ''}</td>
                    <td>{r.dateOfBirth ? ageOn(r.dateOfBirth, today) : <span className="badge warn">No date of birth</span>}</td>
                    <td className="small">{lagosDay(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="row">
            <button className="btn primary" type="submit" name="status" value="approved">
              Approve selected
            </button>
            <button className="btn danger" type="submit" name="status" value="rejected">
              Reject selected
            </button>
          </div>
        </form>
      ) : (
        <p className="empty">Nothing waiting. New registrations from player pages and CSV uploads appear here.</p>
      )}
    </div>
  );
}
