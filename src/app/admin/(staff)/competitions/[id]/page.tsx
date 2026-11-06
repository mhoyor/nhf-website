import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { competitionById, competitionMatches } from '@/lib/queries';
import { describeSlot } from '@/lib/competition';
import { CATEGORY_LABELS, fmtDate, fmtTime, param, STATUS_LABELS } from '@/lib/format';
import { ActionForm } from '@/components/ActionForm';
import { deleteCompetition, setPublished } from '../actions';

export const metadata: Metadata = { title: 'Competition' };

export default async function AdminCompetition({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const compId = Number((await params).id);
  const user = await requireUser(['competition_manager', 'scorer'], `/admin/competitions/${compId}`);
  const sp = await searchParams;
  if (!Number.isInteger(compId) || compId <= 0) notFound();
  const c = await competitionById(compId);
  if (!c) notFound();
  const matches = await competitionMatches(c.id);
  const labels = new Map(matches.filter((m) => m.ref).map((m) => [m.ref!.toUpperCase(), m.label]));
  const manager = can(user, 'competition_manager');

  return (
    <div className="stack">
      <div>
        <p className="eyebrow">
          Season {c.seasonName} · {CATEGORY_LABELS[c.category]}
        </p>
        <h1>{c.name}</h1>
        <p className="muted">
          {c.played} of {c.matches} played · <Link href={`/match-centre/competitions/${c.slug}`}>Public page</Link>
        </p>
      </div>
      {param(sp.created) && <div className="note ok">Competition created with {c.matches} fixtures.</div>}
      {manager && (
        <form action={setPublished} className={`note ${c.published ? 'ok' : 'warn'} row between`}>
          <input type="hidden" name="competition" value={c.id} />
          <input type="hidden" name="published" value={c.published ? 'false' : 'true'} />
          <span>{c.published ? 'Published: everyone can see this competition.' : 'Not published: only staff can see this competition.'}</span>
          <button className="btn sm" type="submit">
            {c.published ? 'Hide from the public' : 'Publish'}
          </button>
        </form>
      )}
      <div className="panel scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Match</th>
              <th>Home</th>
              <th className="n">Score</th>
              <th>Away</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m.id}>
                <td className="small" style={{ whiteSpace: 'nowrap' }}>
                  {fmtDate(m.scheduledAt)} {fmtTime(m.scheduledAt)}
                </td>
                <td className="small">
                  {m.label}
                  {m.ref && <span className="code"> {m.ref}</span>}
                </td>
                <td>{m.homeName ?? <i className="muted">{describeSlot(m.homeSlot, (r) => labels.get(r.toUpperCase()))}</i>}</td>
                <td className="n num">
                  {m.homeScore !== null ? `${m.homeScore}–${m.awayScore}` : ''}
                  {m.homeShootout !== null ? ` (${m.homeShootout}–${m.awayShootout})` : ''}
                </td>
                <td>{m.awayName ?? <i className="muted">{describeSlot(m.awaySlot, (r) => labels.get(r.toUpperCase()))}</i>}</td>
                <td>
                  {STATUS_LABELS[m.status]}
                  {m.status === 'final' && !m.confirmedAt && <span className="badge warn" style={{ marginLeft: 6 }}>Unconfirmed</span>}
                </td>
                <td style={{ whiteSpace: 'nowrap' }}>
                  <Link className="btn sm" href={`/admin/matches/${m.id}`}>
                    Result
                  </Link>{' '}
                  {m.homeTeamId && m.status !== 'final' && (
                    <Link className="btn sm" href={`/score/${m.id}`}>
                      Live
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {manager && (
        <section className="panel">
          <h2>Delete competition</h2>
          <p className="small muted">Only possible while no match has a result or team sheet. To keep a competition out of view, hide it instead.</p>
          <ActionForm action={deleteCompetition} submit="Delete competition" danger>
            <input type="hidden" name="competition" value={c.id} />
            <label className="field">
              Type delete to confirm
              <input name="confirm" autoComplete="off" />
            </label>
          </ActionForm>
        </section>
      )}
    </div>
  );
}
