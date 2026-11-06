'use client';

import Link from 'next/link';
import { Fragment, useEffect, useState } from 'react';
import type { LiveSnapshot } from '@/lib/queries';
import { GOAL_LABELS, isLive, matchClock } from '@/lib/format';
import { CardIcon } from '@/components/CardIcon';

export interface SideInfo {
  teamId: number | null;
  name: string;
  code: string | null;
  colour: string | null;
  href: string | null;
  crest?: string | null;
}

const CARD_LABELS: Record<string, string> = { green: 'Green card, 2 min', yellow: 'Yellow card, 5 min', red: 'Red card' };

function Crest({ s, size }: { s: SideInfo; size?: 'sm' | 'lg' }) {
  if (!s.code) return <span className={`crest tbd${size ? ` ${size}` : ''}`}>?</span>;
  if (s.crest) return <img className={`crest img${size ? ` ${size}` : ''}`} src={s.crest} alt="" aria-hidden="true" />;
  return (
    <span className={`crest${size ? ` ${size}` : ''}`} style={{ ['--c' as string]: s.colour ?? 'var(--green)' }} aria-hidden="true">
      {s.code.slice(0, 3)}
    </span>
  );
}

// Time within the quarter; the protocol's quarter rows already say which quarter.
const evTime = (period: number | null, sec: number | null) => {
  if (sec === null || sec === undefined) return '';
  const within = Math.max(0, Math.min(899, sec - ((period ?? 1) - 1) * 900));
  return `${String(Math.floor(within / 60)).padStart(2, '0')}:${String(within % 60).padStart(2, '0')}`;
};

/**
 * Scoreboard, quarter-by-quarter score and the match protocol. Updates arrive as
 * server-sent events; if those are cut, it polls every 20 seconds.
 */
export function LiveScore({ initial, home, away, meta }: { initial: LiveSnapshot; home: SideInfo; away: SideInfo; meta: string }) {
  const [snap, setSnap] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [polling, setPolling] = useState(false);

  useEffect(() => {
    if (initial.status === 'final' && initial.confirmed) return;
    let es: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | null = null;
    let failures = 0;
    const startPolling = () => {
      if (poll) return;
      setPolling(true);
      poll = setInterval(async () => {
        try {
          const r = await fetch(`/api/live/${initial.id}?poll=1`, { cache: 'no-store' });
          if (r.ok) setSnap((await r.json()) as LiveSnapshot);
        } catch {
          /* offline; try again next time */
        }
      }, 20_000);
    };
    if ('EventSource' in window) {
      es = new EventSource(`/api/live/${initial.id}`);
      es.addEventListener('snapshot', (ev) => {
        failures = 0;
        setSnap(JSON.parse((ev as MessageEvent<string>).data) as LiveSnapshot);
      });
      es.onerror = () => {
        failures++;
        if (failures >= 3 && es) {
          es.close();
          es = null;
          startPolling();
        }
      };
    } else startPolling();
    return () => {
      es?.close();
      if (poll) clearInterval(poll);
    };
  }, [initial.id, initial.status, initial.confirmed]);

  useEffect(() => {
    if (!isLive(snap.status)) return;
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, [snap.status]);

  const started = snap.status !== 'scheduled' && snap.status !== 'postponed';
  const events = snap.events;
  const quarters = { home: [0, 0, 0, 0], away: [0, 0, 0, 0] };
  for (const e of events) if (e.kind === 'goal' && e.period && e.period <= 4) quarters[e.teamId === home.teamId ? 'home' : 'away'][e.period - 1]++;
  const maxQ = snap.status === 'final' || snap.status === 'shootout' ? 4 : Math.max(1, snap.period || 1);
  const shown = snap.status === 'final' ? 4 : snap.period;

  const status =
    snap.status === 'live' ? (
      <>
        <span className="chip live">
          <span className="dot" />
          Live
        </span>
        <span data-clock="">{matchClock(snap.status, snap.period, snap.periodStartedAt, now)}</span>
      </>
    ) : snap.status === 'break' || snap.status === 'shootout' ? (
      <span className="chip brk">{matchClock(snap.status, snap.period, snap.periodStartedAt, now)}</span>
    ) : snap.status === 'final' ? (
      <>
        <span className="chip ft">Final result</span>
        {!snap.confirmed && <span>Unconfirmed: being checked against the scoresheet</span>}
      </>
    ) : (
      <span className="chip sch">{snap.status === 'postponed' ? 'Postponed' : snap.status === 'abandoned' ? 'Abandoned' : 'Kick-off'}</span>
    );

  let hs = 0;
  let as = 0;
  return (
    <>
      <div className="board" aria-live="polite">
        <div className="tm">
          <Crest s={home} size="lg" />
          {home.href ? <Link href={home.href}>{home.name}</Link> : <span className="tn tbd">{home.name}</span>}
        </div>
        <div className="score">
          {started ? `${snap.homeScore ?? 0}–${snap.awayScore ?? 0}` : 'v'}
          {snap.homeShootout !== null && (
            <small>
              {snap.homeShootout}–{snap.awayShootout} on shoot-out
            </small>
          )}
        </div>
        <div className="tm">
          <Crest s={away} size="lg" />
          {away.href ? <Link href={away.href}>{away.name}</Link> : <span className="tn tbd">{away.name}</span>}
        </div>
        <div className="state">{status}</div>
        <div className="meta">
          {meta}
          {polling && ' · updating every 20 seconds'}
        </div>
      </div>

      {started && (
        <div className="panel">
          <div className="scroll">
            <table className="tbl qgrid">
              <thead>
                <tr>
                  <th>Team</th>
                  {[1, 2, 3, 4].map((q) => (
                    <th key={q}>Q{q}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {(['home', 'away'] as const).map((side) => (
                  <tr key={side}>
                    <td>
                      <span className="team">
                        <Crest s={side === 'home' ? home : away} size="sm" />
                        {(side === 'home' ? home : away).name}
                      </span>
                    </td>
                    {quarters[side].map((g, i) => (
                      <td key={i}>{i < shown ? g : ''}</td>
                    ))}
                    <td className="tot">{side === 'home' ? snap.homeScore ?? 0 : snap.awayScore ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <section>
        <h2>Match protocol</h2>
        {!started && !events.length ? (
          <div className="empty">No events yet. The protocol fills in live once the scorer starts the match.</div>
        ) : (
          <div className="panel">
            <div className="scroll">
              <table className="tbl proto">
                <thead>
                  <tr>
                    <th>Team</th>
                    <th>Time</th>
                    <th>Player</th>
                    <th>Action</th>
                    <th className="r">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: maxQ }, (_, i) => i + 1).map((q) => {
                    const inQ = events.filter((e) => e.period === q);
                    return (
                      <Fragment key={q}>
                        <tr className="sep">
                          <td colSpan={5}>Quarter {q}</td>
                        </tr>
                        {!inQ.length && (
                          <tr>
                            <td colSpan={5} className="muted small">
                              No goals or cards
                            </td>
                          </tr>
                        )}
                        {inQ.map((e) => {
                          const side = e.teamId === home.teamId ? home : away;
                          if (e.kind === 'goal') {
                            if (side === home) hs++;
                            else as++;
                          }
                          return (
                            <tr key={e.id}>
                              <td>
                                <span className="team">
                                  <Crest s={side} size="sm" />
                                  <span className="hide-sm">{side.code}</span>
                                  <span className="sr">{side.name}</span>
                                </span>
                              </td>
                              <td className="t">{evTime(e.period, e.matchSecond)}</td>
                              <td>
                                {e.shirt !== null && <span className="muted">{e.shirt} </span>}
                                {e.playerId && e.name ? <Link href={`/match-centre/players/${e.playerId}`}>{e.name}</Link> : <span className="muted">Scorer not recorded</span>}
                              </td>
                              <td>
                                {e.kind === 'goal' ? (
                                  <>
                                    <span className="code" title={GOAL_LABELS[e.goalType ?? 'FG']}>{e.goalType}</span> <span className="hide-sm">{GOAL_LABELS[e.goalType ?? 'FG']}</span>
                                  </>
                                ) : (
                                  <>
                                    <CardIcon c={e.card ?? 'green'} decorative /> <span className="hide-sm">{CARD_LABELS[e.card ?? 'green']}</span>
                                  </>
                                )}
                              </td>
                              <td className="r s">{e.kind === 'goal' ? `${hs}–${as}` : ''}</td>
                            </tr>
                          );
                        })}
                      </Fragment>
                    );
                  })}
                  {snap.homeShootout !== null && (
                    <>
                      <tr className="sep">
                        <td colSpan={5}>Shoot-out</td>
                      </tr>
                      <tr>
                        <td colSpan={4}>{(snap.homeShootout > (snap.awayShootout ?? 0) ? home : away).name} win the shoot-out</td>
                        <td className="r s">
                          {snap.homeShootout}–{snap.awayShootout}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </>
  );
}
