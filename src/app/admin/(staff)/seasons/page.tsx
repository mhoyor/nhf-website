import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { seasonsForAdmin } from '@/lib/admin-queries';
import { ActionForm } from '@/components/ActionForm';
import { fmtDate, param, plural } from '@/lib/format';
import { createSeason, deleteSeason, setCurrentSeason, updateSeason } from './actions';

export const metadata: Metadata = { title: 'Seasons' };

function SeasonFields({ s }: { s?: { name: string; startsOn: string; endsOn: string } }) {
  return (
    <div className="fields">
      <label className="field">
        Name
        <input name="name" required defaultValue={s?.name} placeholder="2027" maxLength={20} />
      </label>
      <label className="field">
        First day
        <input name="startsOn" type="date" required defaultValue={s?.startsOn} />
      </label>
      <label className="field">
        Last day
        <input name="endsOn" type="date" required defaultValue={s?.endsOn} />
      </label>
    </div>
  );
}

export default async function AdminSeasons({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(['competition_manager', 'registrar'], '/admin/seasons');
  const sp = await searchParams;
  const list = await seasonsForAdmin();
  const year = new Date().getFullYear();
  const next = list.some((s) => s.name === String(year)) ? year + 1 : year;
  return (
    <div className="stack">
      <h1>Seasons</h1>
      <p className="muted">
        Competitions and registrations belong to a season. The current season is the one the website shows first, and the default when registering players.
      </p>
      {param(sp.current) && <div className="note ok">Current season changed.</div>}
      {param(sp.deleted) && <div className="note ok">Season deleted.</div>}
      {!list.some((s) => s.isCurrent) && list.length > 0 && <div className="note warn">No season is marked current. Choose one below.</div>}

      {list.length ? (
        <div className="stack" style={{ gap: 10 }}>
          {list.map((s) => (
            <details key={s.id} className="panel" open={list.length === 1}>
              <summary className="row between" style={{ padding: '6px 0' }}>
                <span>
                  <b>{s.name}</b> <span className="muted small">
                    {fmtDate(s.startsOn)} to {fmtDate(s.endsOn)} · {plural(s.competitions, 'competition')} · {plural(s.registrations, 'registration')}
                  </span>
                </span>
                {s.isCurrent ? <span className="badge">Current</span> : null}
              </summary>
              <div className="stack" style={{ marginTop: 12 }}>
                <ActionForm action={updateSeason.bind(null, s.id)} submit="Save season">
                  <SeasonFields s={s} />
                </ActionForm>
                {!s.isCurrent && (
                  <form action={setCurrentSeason}>
                    <input type="hidden" name="season" value={s.id} />
                    <button className="btn" type="submit">
                      Make {s.name} the current season
                    </button>
                  </form>
                )}
                {s.competitions === 0 && s.registrations === 0 && (
                  <ActionForm action={deleteSeason.bind(null, s.id)} submit="Delete season" danger>
                    <label className="check">
                      <input type="checkbox" name="sure" /> Yes, delete {s.name}: it has no competitions or registrations
                    </label>
                  </ActionForm>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="empty">No seasons yet. Add the current one below.</div>
      )}

      <section className="panel">
        <h2>Add a season</h2>
        <ActionForm action={createSeason} submit="Add season">
          <SeasonFields s={{ name: String(next), startsOn: `${next}-01-01`, endsOn: `${next}-12-31` }} />
          <label className="check">
            <input type="checkbox" name="current" defaultChecked={!list.some((s) => s.isCurrent)} /> Make it the current season
          </label>
        </ActionForm>
      </section>
    </div>
  );
}
