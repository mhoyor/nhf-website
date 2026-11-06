'use client';

import { useActionState, useMemo, useState } from 'react';
import { goalsOf, validateTally, type TallyLine } from '@/lib/tally';
import { Messages } from '@/components/ActionForm';
import { CardIcon } from '@/components/CardIcon';
import type { FormState } from '@/lib/forms';

export type RosterLine = TallyLine & { name: string; position: string | null };

interface Props {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  home: { id: number; name: string };
  away: { id: number; name: string };
  knockout: boolean;
  initial: { home: number; away: number; homeShootout: number | null; awayShootout: number | null };
  lines: RosterLine[];
  canConfirm: boolean;
}

const COUNTS = ['fg', 'pc', 'ps', 'green', 'yellow', 'red'] as const;
type CountKey = (typeof COUNTS)[number];

export function TallyForm({ action, home, away, knockout, initial, lines: initialLines, canConfirm }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const [lines, setLines] = useState(initialLines);
  const [score, setScore] = useState({ home: initial.home, away: initial.away });
  const [so, setSo] = useState<{ home: string; away: string }>({
    home: initial.homeShootout === null ? '' : String(initial.homeShootout),
    away: initial.awayShootout === null ? '' : String(initial.awayShootout),
  });

  const credited = (teamId: number) => lines.filter((l) => l.teamId === teamId && l.played).reduce((s, l) => s + goalsOf(l), 0);

  const update = (playerId: number, patch: Partial<RosterLine>) => {
    const me = lines.find((l) => l.playerId === playerId);
    if (!me) return;
    const changed = { ...me, ...patch };
    // A goal or card means the player played.
    if (COUNTS.some((k) => changed[k] > 0)) changed.played = true;
    const next = lines.map((l) => {
      if (l.playerId === playerId) return changed;
      // One captain per team.
      if (patch.captain && l.teamId === me.teamId) return { ...l, captain: false };
      return l;
    });
    setLines(next);
    // The team score is never below the goals credited to its players.
    const side = me.teamId === home.id ? 'home' : 'away';
    const c = next.filter((l) => l.teamId === me.teamId && l.played).reduce((s, l) => s + goalsOf(l), 0);
    if (c > score[side]) setScore({ ...score, [side]: c });
  };

  const check = useMemo(
    () =>
      validateTally(
        {
          homeTeamId: home.id,
          awayTeamId: away.id,
          knockout,
          homeScore: score.home,
          awayScore: score.away,
          homeShootout: so.home === '' ? null : Number(so.home),
          awayShootout: so.away === '' ? null : Number(so.away),
          lines,
        },
        (pid) => lines.find((l) => l.playerId === pid)?.name ?? `Player ${pid}`,
      ),
    [lines, score, so, home.id, away.id, knockout],
  );

  const shown: FormState = state.errors || state.ok ? state : { errors: check.errors, warnings: check.warnings };

  return (
    <form action={formAction} className="stack" style={{ gap: 18 }}>
      <div className="panel">
        <h2>Score</h2>
        <div className="row" style={{ gap: 20, alignItems: 'end' }}>
          <label className="field">
            {home.name}
            <input name="score.home" type="number" min={0} max={30} value={score.home} onChange={(e) => setScore({ ...score, home: Number(e.target.value || 0) })} />
          </label>
          <label className="field">
            {away.name}
            <input name="score.away" type="number" min={0} max={30} value={score.away} onChange={(e) => setScore({ ...score, away: Number(e.target.value || 0) })} />
          </label>
          {knockout && (
            <>
              <label className="field">
                Shoot-out {home.name}
                <input name="so.home" type="number" min={0} max={50} value={so.home} onChange={(e) => setSo({ ...so, home: e.target.value })} placeholder="–" />
              </label>
              <label className="field">
                Shoot-out {away.name}
                <input name="so.away" type="number" min={0} max={50} value={so.away} onChange={(e) => setSo({ ...so, away: e.target.value })} placeholder="–" />
              </label>
            </>
          )}
        </div>
        <p className="small muted" style={{ margin: '10px 0 0' }}>
          Credited to players: {home.name} {credited(home.id)} of {score.home}, {away.name} {credited(away.id)} of {score.away}. Goals not credited to anyone are
          saved without a scorer and listed on the dashboard.
        </p>
      </div>

      {[home, away].map((team) => (
        <TeamSheet key={team.id} team={team} lines={lines.filter((l) => l.teamId === team.id)} update={update} setAll={(played) => setLines((ls) => ls.map((l) => (l.teamId === team.id && !COUNTS.some((k) => l[k] > 0) ? { ...l, played } : l)))} />
      ))}

      <Messages state={shown} />
      <div className="sticky-bar">
        {canConfirm ? (
          <label className="check">
            <input type="checkbox" name="confirm" defaultChecked />
            Confirm this result (checked against the scoresheet)
          </label>
        ) : (
          <span className="small muted">A competition manager will confirm this result.</span>
        )}
        <button className="btn primary" type="submit" disabled={pending || check.errors.length > 0}>
          {pending ? 'Saving…' : 'Save result'}
        </button>
      </div>
    </form>
  );
}

function TeamSheet({
  team,
  lines,
  update,
  setAll,
}: {
  team: { id: number; name: string };
  lines: RosterLine[];
  update: (playerId: number, patch: Partial<RosterLine>) => void;
  setAll: (played: boolean) => void;
}) {
  const playing = lines.filter((l) => l.played).length;
  return (
    <section className="panel">
      <div className="row between">
        <h2 style={{ margin: 0 }}>{team.name}</h2>
        <div className="row">
          <span className="small muted">{playing} playing</span>
          <button type="button" className="btn sm" onClick={() => setAll(true)}>
            Tick all
          </button>
          <button type="button" className="btn sm" onClick={() => setAll(false)}>
            Clear
          </button>
        </div>
      </div>
      {lines.length === 0 ? (
        <p className="note warn" style={{ marginTop: 12 }}>
          No players are registered with this team for the match date. Add registrations first, then come back.
        </p>
      ) : (
        <div className="scroll">
          <table className="tbl tally">
            <thead>
              <tr>
                <th>Played</th>
                <th className="n">#</th>
                <th>Player</th>
                <th title="Captain">C</th>
                <th title="Goalkeeper">GK</th>
                <th className="n" title="Field goals">FG</th>
                <th className="n" title="Penalty-corner goals">PC</th>
                <th className="n" title="Penalty-stroke goals">PS</th>
                <th className="n">
                  <CardIcon c="green" label="Green cards" />
                </th>
                <th className="n">
                  <CardIcon c="yellow" label="Yellow cards" />
                </th>
                <th className="n">
                  <CardIcon c="red" label="Red cards" />
                </th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => {
                const k = (f: string) => `p.${l.playerId}.${f}`;
                return (
                  <tr key={l.playerId} className={l.played ? undefined : 'off'}>
                    <td>
                      <input type="checkbox" name={k('played')} checked={l.played} onChange={(e) => update(l.playerId, { played: e.target.checked })} aria-label={`${l.name} played`} />
                    </td>
                    <td className="n">
                      <input
                        className="shirt"
                        type="number"
                        min={1}
                        max={99}
                        name={k('shirt')}
                        value={l.shirt ?? ''}
                        onChange={(e) => update(l.playerId, { shirt: e.target.value === '' ? null : Number(e.target.value) })}
                        aria-label={`${l.name} shirt number`}
                      />
                    </td>
                    <td className="who">
                      {l.name}
                      {l.position && <span className="small muted"> {l.position}</span>}
                    </td>
                    <td>
                      <input type="checkbox" name={k('captain')} checked={l.captain} onChange={(e) => update(l.playerId, { captain: e.target.checked })} aria-label={`${l.name} captain`} />
                    </td>
                    <td>
                      <input type="checkbox" name={k('gk')} checked={l.goalkeeper} onChange={(e) => update(l.playerId, { goalkeeper: e.target.checked })} aria-label={`${l.name} goalkeeper`} />
                    </td>
                    {COUNTS.map((c: CountKey) => (
                      <td key={c} className="n">
                        <input
                          type="number"
                          min={0}
                          max={c === 'red' ? 1 : 30}
                          name={k(c)}
                          value={l[c] || ''}
                          placeholder="0"
                          onChange={(e) => update(l.playerId, { [c]: Math.max(0, Number(e.target.value || 0)) } as Partial<RosterLine>)}
                          aria-label={`${l.name} ${c}`}
                        />
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
