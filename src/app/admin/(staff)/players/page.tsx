import Link from 'next/link';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { adminFindPlayers } from '@/lib/admin-queries';
import { clubById, currentSeason, clubSquad } from '@/lib/queries';
import { ActionForm } from '@/components/ActionForm';
import { intParam, param } from '@/lib/format';
import { createPlayer } from './actions';
import { PlayerFields } from './PlayerFields';

export const metadata: Metadata = { title: 'Players' };

export default async function AdminPlayers({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(['registrar'], '/admin/players');
  const sp = await searchParams;
  const q = param(sp.q).trim().slice(0, 80);
  const clubId = intParam(sp.club);
  const [club, season] = await Promise.all([clubId ? clubById(clubId) : Promise.resolve(null), currentSeason()]);
  const list = club ? [] : await adminFindPlayers(q, q ? 100 : 30);
  const squad = club && season ? await clubSquad(club.id, season.id) : [];

  return (
    <div className="stack">
      <div className="row between">
        <h1>Players</h1>
        <Link className="btn" href="/admin/players/import">
          Upload a player list (CSV)
        </Link>
      </div>
      <form className="panel filters" action="/admin/players">
        <label className="field w">
          Name or NHF number
          <input name="q" defaultValue={q} />
        </label>
        <button className="btn" type="submit">
          Find
        </button>
      </form>

      {club ? (
        <section className="panel">
          <h2>
            {club.name} · {season?.name}
          </h2>
          <table className="tbl">
            <tbody>
              {squad.map((r) => (
                <tr key={`${r.playerId}-${r.teamId}-${r.joinedOn}`} className={r.leftOn ? 'dim' : undefined}>
                  <td>{r.teamName}</td>
                  <td className="n">{r.shirtNumber ?? ''}</td>
                  <td>
                    <Link href={`/admin/players/${r.playerId}`}>
                      {r.firstName} {r.lastName}
                    </Link>
                  </td>
                  <td>{r.status === 'pending' ? <span className="badge warn">Pending</span> : r.leftOn ? `Left ${r.leftOn}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : (
        <section className="panel">
          <h2>{q ? `Results for “${q}”` : 'Recently added'}</h2>
          {list.length ? (
            <div className="scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>NHF number</th>
                    <th>Born</th>
                    <th>Latest registration</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <Link href={`/admin/players/${p.id}`}>
                          {p.firstName} {p.lastName}
                        </Link>
                        {p.position && <span className="muted small"> {p.position}</span>}
                      </td>
                      <td className="code">{p.nhfNumber}</td>
                      <td className="small">{p.dateOfBirth ?? ''}</td>
                      <td className="small">{p.current ?? 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty">No players found.</p>
          )}
        </section>
      )}

      <section className="panel">
        <h2>Add a player</h2>
        <p className="small muted">Check the player is not already in the register first: a returning player keeps their NHF number and history.</p>
        <ActionForm action={createPlayer} submit="Add player">
          <PlayerFields />
          <label className="check">
            <input type="checkbox" name="confirmDuplicate" /> This is a different person from any player with the same name and date of birth
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
