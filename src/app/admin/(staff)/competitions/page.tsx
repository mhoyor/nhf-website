import Link from 'next/link';
import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { competitions, currentSeason, seasonByName, seasons } from '@/lib/queries';
import { CATEGORY_LABELS, param } from '@/lib/format';

export const metadata: Metadata = { title: 'Competitions' };

export default async function AdminCompetitions({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser(['competition_manager', 'scorer']);
  const sp = await searchParams;
  const all = await seasons();
  const season = (param(sp.season) && (await seasonByName(param(sp.season)))) || (await currentSeason());
  const list = await competitions(season?.id ?? null, true);
  return (
    <div className="stack">
      <div className="row between">
        <h1>Competitions</h1>
        {can(user, 'competition_manager') && (
          <div className="row">
            <Link className="btn primary" href="/admin/competitions/new">
              New competition
            </Link>
            <Link className="btn" href="/admin/competitions/import">
              Upload fixtures (CSV)
            </Link>
          </div>
        )}
      </div>
      <nav className="tabs" aria-label="Seasons">
        {all.map((s) => (
          <Link key={s.id} href={`/admin/competitions?season=${s.name}`} aria-current={s.id === season?.id ? 'page' : undefined}>
            {s.name}
          </Link>
        ))}
      </nav>
      {list.length ? (
        <div className="panel scroll">
          <table className="tbl">
            <thead>
              <tr>
                <th>Competition</th>
                <th>Category</th>
                <th className="n">Played</th>
                <th>Visible</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/admin/competitions/${c.id}`}>{c.name}</Link>
                  </td>
                  <td>{CATEGORY_LABELS[c.category]}</td>
                  <td className="n">
                    {c.played}/{c.matches}
                  </td>
                  <td>{c.published ? <span className="badge">Published</span> : <span className="badge warn">Staff only</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="empty">No competitions for {season?.name ?? 'this season'} yet.</p>
      )}
    </div>
  );
}
