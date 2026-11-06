// Server-side helpers for the scorer page and its actions. Not a 'use server' file,
// so none of this can be called directly from a browser.
import { sql } from '@/lib/db';
import { can, type User } from '@/lib/auth';
import type { ScorerState } from './ops';

/** Competition managers can score any match; scorers any match with no assigned scorer, or one assigned to them. */
export async function mayScore(user: User, matchId: number): Promise<boolean> {
  if (can(user, 'competition_manager')) return true;
  if (!can(user, 'scorer')) return false;
  const [{ assigned, mine }] = await sql<{ assigned: number; mine: number }[]>`
    select count(*) as assigned, count(*) filter (where user_id = ${user.id}) as mine from scorer_assignments where match_id = ${matchId}`;
  return assigned === 0 || mine > 0;
}

export async function scorerState(matchId: number): Promise<ScorerState> {
  const [m] = await sql<{ status: string; period: number; periodStartedAt: Date | null; homeScore: number | null; awayScore: number | null; homeShootout: number | null; awayShootout: number | null }[]>`
    select status::text as status, period, period_started_at, home_score, away_score, home_shootout, away_shootout from matches where id = ${matchId}`;
  const events = await sql<ScorerState['events']>`
    select coalesce(client_ref, 'db-' || id) as ref, team_id, player_id, kind::text as kind, goal_type::text as goal_type, card::text as card, period,
           match_second as second
      from match_events where match_id = ${matchId} and voided_at is null and kind in ('goal', 'card')
     order by period nulls last, match_second nulls last, id`;
  const squads = await sql<{ teamId: number; playerIds: number[] }[]>`
    select team_id, array_agg(player_id order by shirt_number nulls last) as player_ids from match_squads where match_id = ${matchId} group by team_id`;
  return {
    status: m.status,
    period: m.period,
    periodStartedAt: m.periodStartedAt ? new Date(m.periodStartedAt).toISOString() : null,
    homeScore: m.homeScore ?? 0,
    awayScore: m.awayScore ?? 0,
    homeShootout: m.homeShootout,
    awayShootout: m.awayShootout,
    events: [...events],
    squads: Object.fromEntries(squads.map((s) => [s.teamId, s.playerIds])),
  };
}

