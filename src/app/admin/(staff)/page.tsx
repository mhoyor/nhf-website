import Link from 'next/link';
import { can, requireUser } from '@/lib/auth';
import { dashboard, setupProgress, type TodoMatch } from '@/lib/admin-queries';
import { fmtDate, fmtTime, param, plural } from '@/lib/format';

export default async function Dashboard({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const [d, setup] = await Promise.all([dashboard(), setupProgress()]);
  const steps = [
    { done: setup.currentSeason, label: 'Add the current season', href: '/admin/seasons' },
    { done: setup.venues > 0, label: 'Add the venues', href: '/admin/venues' },
    { done: setup.clubs > 0, label: 'Add the clubs and their teams, colours and crests', href: '/admin/clubs' },
    { done: setup.staff > 1, label: 'Give your colleagues their accounts', href: '/admin/users' },
    { done: setup.competitions > 0, label: 'Create the first competition', href: '/admin/competitions/new' },
  ];
  const welcome = Boolean(param(sp.welcome));
  const tiles = [
    { n: d.counts.overdue, label: 'matches waiting for a result', show: can(user, 'competition_manager', 'scorer') },
    { n: d.counts.unconfirmed, label: 'results to confirm', show: can(user, 'competition_manager') },
    { n: d.counts.unattributed, label: 'goals without a scorer', show: can(user, 'competition_manager') },
    { n: d.counts.noSquad, label: 'missing team sheets', show: can(user, 'competition_manager') },
    { n: d.counts.pending, label: 'registrations to approve', show: can(user, 'registrar') },
  ].filter((t) => t.show);

  return (
    <div className="stack">
      <h1>Dashboard</h1>
      {param(sp.denied) && <div className="note warn">Your account does not have access to that page. Ask an administrator if you need it.</div>}
      {can(user, 'admin') && (welcome || steps.some((s) => !s.done)) && (
        <section className="panel pad stack" aria-labelledby="gs">
          <h2 id="gs">{welcome ? `Welcome, ${user.name.split(' ')[0]}` : 'Getting started'}</h2>
          <p className="small muted">
            {welcome ? 'Your administrator account is ready. ' : ''}These steps get the Match Centre ready for its first competition. This box goes away once they are done.
          </p>
          <ul className="todo">
            {steps.map((s) => (
              <li key={s.href}>
                <span>
                  {s.done ? '✓ ' : ''}
                  {s.label}
                </span>
                {s.done ? (
                  <span className="badge">Done</span>
                ) : (
                  <Link className="btn sm" href={s.href}>
                    Open
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {tiles.length > 0 && (
        <div className="tiles">
          {tiles.map((t) => (
            <div key={t.label} className="tile">
              <b>{t.n}</b>
              <span>{t.label}</span>
            </div>
          ))}
        </div>
      )}
      {can(user, 'competition_manager', 'scorer') && (
        <Todo title="Waiting for a result" rows={d.overdue} empty="Every past match has a result." href={(m) => `/admin/matches/${m.matchId}`} />
      )}
      {can(user, 'competition_manager') && (
        <>
          <Todo
            title="Results to confirm"
            note="Results entered from the live scorer appear as unconfirmed until a competition manager checks them against the scoresheet."
            rows={d.unconfirmed}
            empty="Nothing to confirm."
            href={(m) => `/admin/matches/${m.matchId}`}
          />
          <Todo
            title="Goals without a scorer"
            note="These goals count in the score and the table, but no player has them yet."
            rows={d.unattributed}
            empty="Every goal has a scorer."
            href={(m) => `/admin/matches/${m.matchId}`}
          />
          <Todo
            title="Missing team sheets"
            note="Without a team sheet the players in this match get no appearance."
            rows={d.noSquad}
            empty="Every result has its team sheets."
            href={(m) => `/admin/matches/${m.matchId}`}
          />
        </>
      )}
      {can(user, 'registrar') && d.counts.pending > 0 && (
        <div className="panel row between">
          <span>{plural(d.counts.pending, 'registration')} waiting for approval.</span>
          <Link className="btn primary" href="/admin/registrations">
            Review registrations
          </Link>
        </div>
      )}
    </div>
  );
}

function Todo({ title, note, rows, empty, href }: { title: string; note?: string; rows: TodoMatch[]; empty: string; href: (m: TodoMatch) => string }) {
  return (
    <section className="panel">
      <h2>{title}</h2>
      {note && <p className="small muted">{note}</p>}
      {rows.length ? (
        <ul className="todo">
          {rows.map((m, i) => (
            <li key={`${m.matchId}-${i}`}>
              <span>
                <b>
                  {m.homeName ?? 'TBD'} v {m.awayName ?? 'TBD'}
                </b>{' '}
                <span className="small muted">
                  {m.competitionName} · {m.label} · {fmtDate(m.scheduledAt)} {fmtTime(m.scheduledAt)} · {m.detail}
                </span>
              </span>
              <Link className="btn sm" href={href(m)}>
                Open
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          {empty}
        </p>
      )}
    </section>
  );
}
