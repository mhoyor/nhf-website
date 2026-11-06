'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Card, GoalType, Op, ScorerEvent, ScorerState } from './ops';
import { claimLock, syncOps } from './actions';
import { CardIcon } from '@/components/CardIcon';

interface Team {
  id: number;
  name: string;
  code: string | null;
  colour: string | null;
}
interface Player {
  playerId: number;
  teamId: number;
  shirt: number | null;
  name: string;
  short: string;
  position: string | null;
}

type Mode =
  | { k: 'main' }
  | { k: 'sheet'; teamId: number; picked: number[] }
  | { k: 'goal'; teamId: number }
  | { k: 'goalType'; teamId: number; playerId: number | null }
  | { k: 'card'; teamId: number }
  | { k: 'cardColour'; teamId: number; playerId: number }
  | { k: 'finish' }
  | { k: 'shootout'; home: string; away: string };

const QUARTER = 900; // seconds

function newRef(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `r${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
function load<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}
function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the queue still lives in memory */
  }
}

/** The server's state with the operations still waiting to be sent applied on top. */
function project(server: ScorerState, queue: Op[], homeId: number, awayId: number, knockout: boolean): ScorerState {
  const s: ScorerState = { ...server, events: [...server.events], squads: { ...server.squads } };
  const score = (t: number) => s.events.filter((e) => e.kind === 'goal' && e.teamId === t).length;
  for (const op of queue) {
    switch (op.type) {
      case 'squad':
        s.squads[op.teamId] = op.players.map((p) => p.playerId);
        break;
      case 'start':
        s.status = 'live';
        s.period = op.period;
        s.periodStartedAt = op.at;
        break;
      case 'end':
        s.status = op.period === 4 && knockout && score(homeId) === score(awayId) ? 'shootout' : 'break';
        break;
      case 'goal':
        s.events.push({ ref: op.ref, teamId: op.teamId, playerId: op.playerId, kind: 'goal', goalType: op.goalType, card: null, period: op.period, second: op.second });
        break;
      case 'card':
        s.events.push({ ref: op.ref, teamId: op.teamId, playerId: op.playerId, kind: 'card', goalType: null, card: op.card, period: op.period, second: op.second });
        break;
      case 'void':
        s.events = s.events.filter((e) => e.ref !== op.target);
        break;
      case 'shootout':
        s.homeShootout = op.home;
        s.awayShootout = op.away;
        s.status = 'final';
        break;
      case 'finish':
        s.status = 'final';
        break;
    }
  }
  s.homeScore = score(homeId);
  s.awayScore = score(awayId);
  return s;
}

const clock = (sec: number) => `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;

export function Scorer({ matchId, knockout, home, away, roster, initial }: { matchId: number; knockout: boolean; home: Team; away: Team; roster: Player[]; initial: ScorerState }) {
  const qKey = `nhf-score-queue-${matchId}`;
  const [server, setServer] = useState(initial);
  const [queue, setQueue] = useState<Op[]>([]);
  const queueRef = useRef<Op[]>([]);
  const [ready, setReady] = useState(false);
  const [device, setDevice] = useState('');
  const [net, setNet] = useState<'ok' | 'sending' | 'offline'>('ok');
  const [holder, setHolder] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>({ k: 'main' });
  const [armed, setArmed] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const sending = useRef(false);

  useEffect(() => {
    let d = load<string>('nhf-device', '');
    if (!d) {
      d = newRef();
      store('nhf-device', d);
    }
    setDevice(d);
    const q = load<Op[]>(qKey, []);
    queueRef.current = q;
    setQueue(q);
    setReady(true);
  }, [qKey]);

  useEffect(() => {
    queueRef.current = queue;
    if (ready) store(qKey, queue);
  }, [queue, ready, qKey]);

  // One device scores a match at a time; the lease is renewed every minute.
  useEffect(() => {
    if (!device) return;
    let stopped = false;
    const tick = async () => {
      try {
        const r = await claimLock(matchId, device);
        if (!stopped) setHolder(r.ok ? null : r.holder);
      } catch {
        /* offline: keep scoring, the queue waits */
      }
    };
    void tick();
    const t = setInterval(tick, 60_000);
    return () => {
      stopped = true;
      clearInterval(t);
    };
  }, [device, matchId]);

  const flush = useCallback(async () => {
    if (sending.current || !device || holder) return;
    const batch = queueRef.current.slice(0, 50);
    if (!batch.length) return;
    sending.current = true;
    setNet('sending');
    try {
      const r = await syncOps(matchId, device, batch);
      if (!r.ok) {
        setHolder(r.locked);
        setNet('ok');
        return;
      }
      const done = new Set([...r.applied, ...r.rejected.map((x) => x.ref)]);
      setQueue((q) => q.filter((op) => !done.has(op.ref)));
      setServer(r.state);
      if (r.rejected.length) setNotice(`Not saved: ${r.rejected.map((x) => x.message).join(' ')}`);
      setNet('ok');
    } catch {
      setNet('offline');
    } finally {
      sending.current = false;
    }
  }, [device, holder, matchId]);

  useEffect(() => {
    if (queue.length && net !== 'offline') void flush();
  }, [queue, net, flush]);

  useEffect(() => {
    if (net !== 'offline') return;
    const t = setTimeout(() => void flush(), 5000);
    const online = () => void flush();
    window.addEventListener('online', online);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', online);
    };
  }, [net, flush]);

  // Keep the screen on while scoring, where the browser allows it.
  useEffect(() => {
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    const get = async () => {
      try {
        if (nav.wakeLock && document.visibilityState === 'visible') lock = await nav.wakeLock.request('screen');
      } catch {
        /* not allowed here */
      }
    };
    void get();
    document.addEventListener('visibilitychange', get);
    return () => {
      document.removeEventListener('visibilitychange', get);
      void lock?.release().catch(() => {});
    };
  }, []);

  const view = useMemo(() => project(server, queue, home.id, away.id, knockout), [server, queue, home.id, away.id, knockout]);

  useEffect(() => {
    if (view.status !== 'live') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [view.status]);

  const elapsed = view.status === 'live' && view.periodStartedAt ? Math.max(0, Math.floor((now - Date.parse(view.periodStartedAt)) / 1000)) : 0;
  const second = Math.max(0, (view.period - 1) * QUARTER + Math.min(elapsed, QUARTER - 1));
  const push = (op: Op) => {
    setNotice(null);
    setQueue((q) => [...q, op]);
    setMode({ k: 'main' });
    setArmed(null);
  };

  const team = (id: number) => (id === home.id ? home : away);
  const byId = new Map(roster.map((p) => [p.playerId, p]));
  const squadOf = (teamId: number) =>
    (view.squads[teamId] ?? [])
      .map((id) => byId.get(id))
      .filter((p): p is Player => !!p)
      .sort((a, b) => (a.shirt ?? 999) - (b.shirt ?? 999));
  const rosterOf = (teamId: number) => roster.filter((p) => p.teamId === teamId).sort((a, b) => (a.shirt ?? 999) - (b.shirt ?? 999));
  const label = (e: ScorerEvent) => (e.playerId ? (byId.get(e.playerId)?.name ?? 'Player') : 'Scorer not recorded');

  const notStarted = view.status === 'scheduled' || view.status === 'postponed';
  const statusText =
    view.status === 'live'
      ? `Q${view.period} · ${clock(Math.min(elapsed, 99 * 60))}`
      : view.status === 'break'
        ? view.period >= 4
          ? 'End of Q4'
          : view.period === 2
            ? 'Half time'
            : `End of Q${view.period}`
        : view.status === 'shootout'
          ? 'Shoot-out'
          : view.status === 'final'
            ? 'Full time'
            : 'Not started';

  return (
    <div className="scorer stack" style={{ gap: 12 }}>
      {holder && (
        <div className="note warn">
          This match is being scored on {holder}&rsquo;s device. Your entries are kept on this phone and not sent.{' '}
          <button
            className="btn sm"
            type="button"
            onClick={async () => {
              try {
                const r = await claimLock(matchId, device, true);
                setHolder(r.ok ? null : r.holder);
              } catch {
                setNet('offline');
              }
            }}
          >
            Take over scoring
          </button>
        </div>
      )}

      <div className="board">
        <div className="tm">
          <span className="crest lg" style={{ ['--c' as string]: home.colour ?? 'var(--green)' }}>
            {(home.code ?? '').slice(0, 3)}
          </span>
          <span className="tn">{home.name}</span>
        </div>
        <div className="score">
          {view.homeScore}–{view.awayScore}
          {view.homeShootout !== null && (
            <small>
              {view.homeShootout}–{view.awayShootout} on shoot-out
            </small>
          )}
        </div>
        <div className="tm">
          <span className="crest lg" style={{ ['--c' as string]: away.colour ?? 'var(--green)' }}>
            {(away.code ?? '').slice(0, 3)}
          </span>
          <span className="tn">{away.name}</span>
        </div>
        <div className="state">
          {view.status === 'live' ? (
            <span className="chip live">
              <span className="dot" />
              {statusText}
            </span>
          ) : (
            <span className="chip brk">{statusText}</span>
          )}
        </div>
      </div>

      {notice && (
        <div className="note err" role="alert">
          {notice}{' '}
          <button className="linkbtn" type="button" onClick={() => setNotice(null)}>
            Dismiss
          </button>
        </div>
      )}

      {mode.k === 'main' && (
        <>
          {(notStarted || view.status === 'break') && (
            <div className="panel">
              <h3>Team sheets</h3>
              <div className="bigbtns" style={{ marginTop: 0 }}>
                {[home, away].map((t) => (
                  <button
                    key={t.id}
                    className="btn"
                    type="button"
                    onClick={() => setMode({ k: 'sheet', teamId: t.id, picked: (view.squads[t.id]?.length ? view.squads[t.id] : rosterOf(t.id).map((p) => p.playerId)).slice() })}
                  >
                    {t.name}: {squadOf(t.id).length || 'no'} players
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bigbtns">
            {notStarted && (
              <button className="btn primary" type="button" style={{ gridColumn: '1 / -1' }} onClick={() => push({ ref: newRef(), type: 'start', period: 1, at: new Date().toISOString() })}>
                Start Q1
              </button>
            )}
            {view.status === 'live' && (
              <>
                <button className="btn primary" type="button" onClick={() => setMode({ k: 'goal', teamId: home.id })}>
                  Goal {home.name}
                </button>
                <button className="btn primary" type="button" onClick={() => setMode({ k: 'goal', teamId: away.id })}>
                  Goal {away.name}
                </button>
                <button className="btn" type="button" onClick={() => setMode({ k: 'card', teamId: home.id })}>
                  Card {home.name}
                </button>
                <button className="btn" type="button" onClick={() => setMode({ k: 'card', teamId: away.id })}>
                  Card {away.name}
                </button>
                <button className="btn" type="button" style={{ gridColumn: '1 / -1' }} onClick={() => push({ ref: newRef(), type: 'end', period: view.period, at: new Date().toISOString() })}>
                  End Q{view.period}
                </button>
              </>
            )}
            {view.status === 'break' && view.period < 4 && (
              <button
                className="btn primary"
                type="button"
                style={{ gridColumn: '1 / -1' }}
                onClick={() => push({ ref: newRef(), type: 'start', period: view.period + 1, at: new Date().toISOString() })}
              >
                Start Q{view.period + 1}
              </button>
            )}
            {view.status === 'break' && view.period >= 4 && (
              <button className="btn primary" type="button" style={{ gridColumn: '1 / -1' }} onClick={() => setMode({ k: 'finish' })}>
                Finish match
              </button>
            )}
            {view.status === 'shootout' && (
              <button className="btn primary" type="button" style={{ gridColumn: '1 / -1' }} onClick={() => setMode({ k: 'shootout', home: '', away: '' })}>
                Enter shoot-out result
              </button>
            )}
          </div>

          {view.status === 'final' && (
            <p className="note ok">Result sent. It shows on the Match Centre straight away, marked unconfirmed until a competition manager checks it.</p>
          )}

          <div className="panel">
            <h3>Goals and cards</h3>
            {view.events.length ? (
              <ol className="timeline">
                {[...view.events].reverse().map((e) => {
                  const pending = queue.some((op) => op.ref === e.ref);
                  return (
                    <li key={e.ref} style={{ gridTemplateColumns: '52px 1fr auto' }}>
                      <span className="min">{e.second !== null ? `${Math.floor(e.second / 60) + 1}′` : ''}</span>
                      <span>
                        {e.kind === 'goal' ? <span className="goalball" /> : <CardIcon c={e.card ?? 'green'} />} <b>{team(e.teamId).code}</b> {label(e)}
                        {e.goalType && e.goalType !== 'FG' ? ` (${e.goalType})` : ''}
                        {pending && <span className="small muted"> · waiting to send</span>}
                      </span>
                      {view.status !== 'final' && (
                        <button
                          className={`btn sm${armed === e.ref ? ' danger' : ''}`}
                          type="button"
                          onClick={() => {
                            if (armed !== e.ref) return setArmed(e.ref);
                            if (pending) {
                              setQueue((q) => q.filter((op) => op.ref !== e.ref));
                              setArmed(null);
                            } else push({ ref: newRef(), type: 'void', target: e.ref });
                          }}
                        >
                          {armed === e.ref ? 'Tap again to remove' : 'Remove'}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                None yet.
              </p>
            )}
          </div>
        </>
      )}

      {mode.k === 'sheet' && (
        <div className="panel stack" style={{ gap: 12 }}>
          <h3>Who is playing for {team(mode.teamId).name}?</h3>
          <div className="shirts">
            {rosterOf(mode.teamId).map((p) => {
              const on = mode.picked.includes(p.playerId);
              return (
                <button
                  key={p.playerId}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setMode({ ...mode, picked: on ? mode.picked.filter((x) => x !== p.playerId) : [...mode.picked, p.playerId] })}
                >
                  <b>{p.shirt ?? '–'}</b>
                  <span>{p.short}</span>
                </button>
              );
            })}
          </div>
          {rosterOf(mode.teamId).length === 0 && <p className="note warn">No players are registered with this team for today.</p>}
          <div className="bigbtns">
            <button className="btn" type="button" onClick={() => setMode({ k: 'main' })}>
              Cancel
            </button>
            <button
              className="btn primary"
              type="button"
              onClick={() =>
                push({
                  ref: newRef(),
                  type: 'squad',
                  teamId: mode.teamId,
                  players: mode.picked.map((id) => ({ playerId: id, shirt: byId.get(id)?.shirt ?? null, gk: byId.get(id)?.position === 'GK', captain: false })),
                })
              }
            >
              Save {mode.picked.length} players
            </button>
          </div>
        </div>
      )}

      {(mode.k === 'goal' || mode.k === 'card') && (
        <div className="panel stack" style={{ gap: 12 }}>
          <h3>
            {mode.k === 'goal' ? 'Goal' : 'Card'} for {team(mode.teamId).name}: who?
          </h3>
          <div className="shirts">
            {squadOf(mode.teamId).map((p) => (
              <button
                key={p.playerId}
                type="button"
                onClick={() => setMode(mode.k === 'goal' ? { k: 'goalType', teamId: mode.teamId, playerId: p.playerId } : { k: 'cardColour', teamId: mode.teamId, playerId: p.playerId })}
              >
                <b>{p.shirt ?? '–'}</b>
                <span>{p.short}</span>
              </button>
            ))}
          </div>
          {squadOf(mode.teamId).length === 0 && <p className="note warn">Save the team sheet first to pick players.</p>}
          <div className="bigbtns">
            <button className="btn" type="button" onClick={() => setMode({ k: 'main' })}>
              Cancel
            </button>
            {mode.k === 'goal' && (
              <button className="btn" type="button" onClick={() => setMode({ k: 'goalType', teamId: mode.teamId, playerId: null })}>
                Not sure who scored
              </button>
            )}
          </div>
        </div>
      )}

      {mode.k === 'goalType' && (
        <div className="panel stack" style={{ gap: 12 }}>
          <h3>
            {mode.playerId ? byId.get(mode.playerId)?.name : 'Goal'}: how was it scored?
          </h3>
          <div className="bigbtns" style={{ gridTemplateColumns: '1fr' }}>
            {(
              [
                ['FG', 'Field goal'],
                ['PC', 'Penalty corner'],
                ['PS', 'Penalty stroke'],
              ] as [GoalType, string][]
            ).map(([g, text]) => (
              <button
                key={g}
                className="btn primary"
                type="button"
                onClick={() => push({ ref: newRef(), type: 'goal', teamId: mode.teamId, playerId: mode.playerId, goalType: g, period: Math.max(1, view.period), second })}
              >
                {text}
              </button>
            ))}
            <button className="btn" type="button" onClick={() => setMode({ k: 'main' })}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode.k === 'cardColour' && (
        <div className="panel stack" style={{ gap: 12 }}>
          <h3>{byId.get(mode.playerId)?.name}: which card?</h3>
          <div className="bigbtns" style={{ gridTemplateColumns: '1fr' }}>
            {(['green', 'yellow', 'red'] as Card[]).map((c) => (
              <button
                key={c}
                className="btn"
                type="button"
                onClick={() => push({ ref: newRef(), type: 'card', teamId: mode.teamId, playerId: mode.playerId, card: c, period: Math.max(1, view.period), second })}
              >
                <CardIcon c={c} decorative /> {c[0].toUpperCase() + c.slice(1)} card
              </button>
            ))}
            <button className="btn" type="button" onClick={() => setMode({ k: 'main' })}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode.k === 'finish' && (
        <div className="panel stack" style={{ gap: 12 }}>
          <h3>
            Finish at {home.name} {view.homeScore} – {view.awayScore} {away.name}?
          </h3>
          {knockout && view.homeScore === view.awayScore && <p className="note warn">This knockout match is level: it needs a shoot-out instead.</p>}
          <div className="bigbtns">
            <button className="btn" type="button" onClick={() => setMode({ k: 'main' })}>
              Not yet
            </button>
            {knockout && view.homeScore === view.awayScore ? (
              <button className="btn primary" type="button" onClick={() => setMode({ k: 'shootout', home: '', away: '' })}>
                Enter shoot-out
              </button>
            ) : (
              <button className="btn primary" type="button" onClick={() => push({ ref: newRef(), type: 'finish' })}>
                Yes, full time
              </button>
            )}
          </div>
        </div>
      )}

      {mode.k === 'shootout' && (
        <div className="panel stack" style={{ gap: 12 }}>
          <h3>Shoot-out result</h3>
          <div className="fields">
            <label className="field">
              {home.name}
              <input inputMode="numeric" type="number" min={0} max={50} value={mode.home} onChange={(e) => setMode({ ...mode, home: e.target.value })} />
            </label>
            <label className="field">
              {away.name}
              <input inputMode="numeric" type="number" min={0} max={50} value={mode.away} onChange={(e) => setMode({ ...mode, away: e.target.value })} />
            </label>
          </div>
          {mode.home !== '' && mode.home === mode.away && <p className="note warn">A shoot-out cannot end level: keep going until there is a winner.</p>}
          <div className="bigbtns">
            <button className="btn" type="button" onClick={() => setMode({ k: 'main' })}>
              Cancel
            </button>
            <button
              className="btn primary"
              type="button"
              disabled={mode.home === '' || mode.away === '' || mode.home === mode.away}
              onClick={() => push({ ref: newRef(), type: 'shootout', home: Number(mode.home), away: Number(mode.away) })}
            >
              Save and finish
            </button>
          </div>
        </div>
      )}

      <div className="syncbar" role="status">
        <span>
          {holder && queue.length
            ? `${queue.length} not sent: another device is scoring`
            : net === 'offline'
            ? `Offline: ${queue.length} waiting, kept on this phone`
            : queue.length
              ? `Sending ${queue.length}…`
              : 'All saved'}
        </span>
        {net === 'offline' && (
          <button className="btn sm" type="button" onClick={() => void flush()}>
            Retry now
          </button>
        )}
      </div>
    </div>
  );
}
