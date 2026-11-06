'use server';

import { sql, dbMessage } from '@/lib/db';
import { audit, requireUser, type User } from '@/lib/auth';
import { REF_RE, type Op, type SyncResult } from './ops';
import { mayScore, scorerState } from './state';

const LEASE = '3 minutes';

/** Take or renew the one-device lock on a match. */
async function lock(user: User, matchId: number, device: string, force: boolean): Promise<string | null> {
  const rows = await sql<{ userId: number }[]>`
    insert into scorer_locks (match_id, user_id, device, expires_at)
    values (${matchId}, ${user.id}, ${device}, now() + ${LEASE}::interval)
    on conflict (match_id) do update set user_id = excluded.user_id, device = excluded.device, expires_at = excluded.expires_at
     where scorer_locks.expires_at < now() or (scorer_locks.user_id = ${user.id} and scorer_locks.device = ${device}) or ${force}
    returning user_id`;
  if (rows.length) return null;
  const [holder] = await sql<{ name: string }[]>`select u.name from scorer_locks l join users u on u.id = l.user_id where l.match_id = ${matchId}`;
  return holder?.name ?? 'another device';
}

export async function claimLock(matchId: number, device: string, force = false): Promise<{ ok: true } | { ok: false; holder: string }> {
  const user = await requireUser(['scorer', 'competition_manager'], `/score/${matchId}`);
  if (!REF_RE.test(device) || !(await mayScore(user, matchId))) return { ok: false, holder: 'the assigned scorer' };
  const holder = await lock(user, matchId, device, force);
  if (force && !holder) await audit(user.id, 'scorer_takeover', 'match', matchId, { device });
  return holder ? { ok: false, holder } : { ok: true };
}

export async function releaseLock(matchId: number, device: string): Promise<void> {
  const user = await requireUser(['scorer', 'competition_manager']);
  await sql`delete from scorer_locks where match_id = ${matchId} and user_id = ${user.id} and device = ${device}`;
}

function clampTime(at: string): string {
  const t = Date.parse(at);
  const now = Date.now();
  if (!Number.isFinite(t) || t > now + 60_000 || t < now - 6 * 3600_000) return new Date(now).toISOString();
  return new Date(t).toISOString();
}

const n = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi ? v : null);

/**
 * Apply queued scorer operations in order. Each one runs in its own savepoint, so one
 * refused operation (say, a goal for a player not on the team sheet) does not block the rest.
 */
export async function syncOps(matchId: number, device: string, ops: Op[]): Promise<SyncResult> {
  const user = await requireUser(['scorer', 'competition_manager'], `/score/${matchId}`);
  if (!REF_RE.test(device)) return { ok: false, locked: 'an unknown device' };
  if (!(await mayScore(user, matchId))) return { ok: false, locked: 'the assigned scorer' };
  const holder = await lock(user, matchId, device, false);
  if (holder) return { ok: false, locked: holder };

  const applied: string[] = [];
  const rejected: { ref: string; message: string }[] = [];
  await sql.begin(async (tx) => {
    const [m] = await tx<{ homeTeamId: number; awayTeamId: number; knockout: boolean }[]>`
      select home_team_id, away_team_id, knockout from matches where id = ${matchId} for update`;
    const sideOk = (t: number) => t === m.homeTeamId || t === m.awayTeamId;
    for (const op of ops.slice(0, 100)) {
      if (!op || typeof op.ref !== 'string' || !REF_RE.test(op.ref)) continue;
      try {
        await tx.savepoint(async (sp) => {
          switch (op.type) {
            case 'squad': {
              if (!sideOk(op.teamId)) throw new Error('That team is not in this match.');
              const players = op.players.filter((p) => n(p.playerId, 1, Number.MAX_SAFE_INTEGER)).slice(0, 30);
              const keep = players.map((p) => p.playerId);
              // Players with goals or cards stay on the sheet.
              await sp`delete from match_squads s where s.match_id = ${matchId} and s.team_id = ${op.teamId}
                         and not (s.player_id = any(${keep}::bigint[]))
                         and not exists (select 1 from match_events e where e.match_id = s.match_id and e.player_id = s.player_id and e.voided_at is null)`;
              for (const p of players) {
                await sp`insert into match_squads (match_id, team_id, player_id, registration_id, shirt_number, is_captain, is_goalkeeper)
                         values (${matchId}, ${op.teamId}, ${p.playerId}, 0, ${n(p.shirt, 1, 99)}, ${!!p.captain}, ${!!p.gk})
                         on conflict (match_id, player_id) do update
                           set shirt_number = excluded.shirt_number, is_goalkeeper = excluded.is_goalkeeper,
                               is_captain = match_squads.is_captain or excluded.is_captain`;
              }
              break;
            }
            case 'start': {
              const period = n(op.period, 1, 4);
              if (!period) throw new Error('Unknown quarter.');
              await sp`update matches set status = 'live', period = ${period}, period_started_at = ${clampTime(op.at)}::timestamptz,
                              result_source = 'live', confirmed_by = null, confirmed_at = null
                        where id = ${matchId} and status <> 'final'`;
              await sp`insert into match_events (match_id, kind, period, client_ref, entered_by)
                       values (${matchId}, 'period_start', ${period}, ${op.ref}, ${user.id}) on conflict (client_ref) do nothing`;
              break;
            }
            case 'end': {
              const period = n(op.period, 1, 4);
              if (!period) throw new Error('Unknown quarter.');
              await sp`update matches
                          set status = case when ${period} = 4 and knockout and home_score = away_score then 'shootout'::match_status else 'break'::match_status end
                        where id = ${matchId} and status = 'live' and period = ${period}`;
              await sp`insert into match_events (match_id, kind, period, client_ref, entered_by)
                       values (${matchId}, 'period_end', ${period}, ${op.ref}, ${user.id}) on conflict (client_ref) do nothing`;
              break;
            }
            case 'goal':
            case 'card': {
              if (!sideOk(op.teamId)) throw new Error('That team is not in this match.');
              const second = n(op.second, 0, 3600);
              const period = n(op.period, 1, 4);
              await sp`insert into match_events (match_id, team_id, player_id, kind, goal_type, card, period, match_second, client_ref, entered_by)
                       values (${matchId}, ${op.teamId}, ${op.type === 'card' ? op.playerId : op.playerId ?? null}, ${op.type}::event_kind,
                               ${op.type === 'goal' ? op.goalType : null}::goal_type, ${op.type === 'card' ? op.card : null}::card_colour,
                               ${period}, ${second}, ${op.ref}, ${user.id})
                       on conflict (client_ref) do nothing`;
              break;
            }
            case 'void': {
              if (!REF_RE.test(op.target) && !/^db-\d+$/.test(op.target)) throw new Error('Unknown event.');
              const dbId = op.target.startsWith('db-') ? Number(op.target.slice(3)) : null;
              await sp`update match_events set voided_at = now(), voided_by = ${user.id}, void_reason = 'Undone by scorer'
                        where match_id = ${matchId} and voided_at is null
                          and (client_ref = ${op.target} or id = ${dbId})`;
              break;
            }
            case 'shootout': {
              const h = n(op.home, 0, 50);
              const a = n(op.away, 0, 50);
              if (h === null || a === null) throw new Error('Enter both shoot-out scores.');
              await sp`update matches set home_shootout = ${h}, away_shootout = ${a}, status = 'final', period = 4 where id = ${matchId}`;
              break;
            }
            case 'finish': {
              await sp`update matches set status = 'final', period = 4 where id = ${matchId}`;
              break;
            }
            default:
              throw new Error('Unknown action.');
          }
        });
        applied.push(op.ref);
      } catch (e) {
        rejected.push({ ref: op.ref, message: e instanceof Error && !(e as { code?: string }).code ? e.message : dbMessage(e) });
      }
    }
  });
  if (ops.some((o) => o.type === 'finish' || o.type === 'shootout')) await audit(user.id, 'live_result_submitted', 'match', matchId);
  return { ok: true, applied, rejected, state: await scorerState(matchId) };
}
