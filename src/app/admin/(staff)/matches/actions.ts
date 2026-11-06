'use server';

import { revalidatePath } from 'next/cache';
import { sql, dbMessage } from '@/lib/db';
import { audit, can, requireUser } from '@/lib/auth';
import { matchById } from '@/lib/queries';
import { matchRoster } from '@/lib/admin-queries';
import { tallyFromForm, tallyToEvents, validateTally } from '@/lib/tally';
import { isIsoDate, isTime, lagosTimestamp } from '@/lib/competition';
import { bool, date, fail, id, text, type FormState } from '@/lib/forms';

function refresh(matchId: number) {
  revalidatePath(`/admin/matches/${matchId}`);
  revalidatePath(`/match-centre/matches/${matchId}`);
}

/**
 * Save a whole result from the team sheet: who played, each player's goals and cards,
 * any shoot-out. Earlier goals and cards are voided (kept for the audit trail) and
 * replaced. The score is worked out by the database from the goals.
 */
export async function saveResult(matchId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['competition_manager', 'scorer'], `/admin/matches/${matchId}`);
  const m = await matchById(matchId);
  if (!m) return fail('This match no longer exists.');
  if (!m.homeTeamId || !m.awayTeamId) return fail('The teams for this match are not known yet.');
  const roster = await matchRoster(matchId);
  const tally = tallyFromForm(form, { homeTeamId: m.homeTeamId, awayTeamId: m.awayTeamId, knockout: m.knockout }, roster);
  const names = new Map(roster.map((r) => [r.playerId, `${r.firstName} ${r.lastName}`]));
  const check = validateTally(tally, (pid) => names.get(pid) ?? `Player ${pid}`);
  if (check.errors.length) return { errors: check.errors, warnings: check.warnings };
  const confirm = can(user, 'competition_manager') && bool(form, 'confirm');
  const { squads, events } = tallyToEvents(tally);

  try {
    await sql.begin(async (tx) => {
      await tx`select id from matches where id = ${matchId} for update`;
      // Reopen a final match first, so the checks on a final knockout result do not
      // fire half-way through replacing its goals.
      await tx`update matches set status = 'live' where id = ${matchId} and status = 'final'`;
      await tx`update match_events set voided_at = now(), voided_by = ${user.id}, void_reason = 'Result re-entered'
                where match_id = ${matchId} and kind in ('goal', 'card') and voided_at is null`;
      await tx`delete from match_squads where match_id = ${matchId}`;
      if (squads.length) {
        await tx`insert into match_squads ${tx(
          squads.map((s) => ({
            matchId,
            teamId: s.teamId,
            playerId: s.playerId,
            registrationId: 0, // filled in by the database from the player's registration
            shirtNumber: s.shirt,
            isCaptain: s.captain,
            isGoalkeeper: s.goalkeeper,
          })),
        )}`;
      }
      if (events.length) {
        await tx`insert into match_events ${tx(
          events.map((e) => ({ matchId, teamId: e.teamId, playerId: e.playerId, kind: e.kind, goalType: e.goalType, card: e.card, enteredBy: user.id })),
        )}`;
      }
      await tx`update matches
                  set status = 'final', period = 4, result_source = coalesce(result_source, 'manual'),
                      home_shootout = ${tally.homeShootout}, away_shootout = ${tally.awayShootout},
                      confirmed_by = ${confirm ? user.id : null}, confirmed_at = case when ${confirm} then now() end
                where id = ${matchId}`;
    });
  } catch (e) {
    return { errors: [dbMessage(e)], warnings: check.warnings };
  }
  await audit(user.id, 'result_saved', 'match', matchId, {
    score: [tally.homeScore, tally.awayScore],
    shootout: tally.homeShootout === null ? null : [tally.homeShootout, tally.awayShootout],
    players: squads.length,
    confirmed: confirm,
  });
  refresh(matchId);
  return {
    ok: confirm ? 'Result saved and confirmed. Tables, scorers and player totals are updated.' : 'Result saved. It shows as unconfirmed until a competition manager confirms it.',
    warnings: check.warnings,
  };
}

export async function confirmResult(form: FormData): Promise<void> {
  const user = await requireUser(['competition_manager']);
  const matchId = id(form, 'match');
  if (!matchId) return;
  await sql`update matches set confirmed_by = ${user.id}, confirmed_at = now() where id = ${matchId} and status = 'final'`;
  await audit(user.id, 'result_confirmed', 'match', matchId);
  refresh(matchId);
}

export async function setMatchStatus(matchId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['competition_manager']);
  const status = text(form, 'status', 20);
  if (!['scheduled', 'postponed', 'abandoned'].includes(status)) return fail('Choose a status.');
  try {
    await sql.begin(async (tx) => {
      if (status === 'scheduled') {
        // Back to the start: goals and cards are voided, the team sheets cleared.
        await tx`update match_events set voided_at = now(), voided_by = ${user.id}, void_reason = 'Match reset'
                  where match_id = ${matchId} and voided_at is null`;
        await tx`delete from match_squads where match_id = ${matchId}`;
      }
      await tx`update matches set status = ${status}::match_status, confirmed_by = null, confirmed_at = null where id = ${matchId}`;
    });
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'match_status', 'match', matchId, { status });
  refresh(matchId);
  return { ok: status === 'scheduled' ? 'The match is back to scheduled, with no score.' : `The match is marked ${status}.` };
}

export async function rescheduleMatch(matchId: number, _prev: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser(['competition_manager']);
  const day = date(form, 'date');
  const time = text(form, 'time', 5);
  const venue = id(form, 'venue');
  const label = text(form, 'label', 40);
  if (!day || !isIsoDate(day)) return fail('Enter the date as YYYY-MM-DD.');
  if (!isTime(time)) return fail('Enter the time as HH:MM.');
  if (!label) return fail('Give the match a label, such as Matchday 3 or Final.');
  try {
    await sql`update matches set scheduled_at = ${lagosTimestamp(day, time)}::timestamptz, venue_id = ${venue}, label = ${label} where id = ${matchId}`;
  } catch (e) {
    return fail(dbMessage(e));
  }
  await audit(user.id, 'match_rescheduled', 'match', matchId, { day, time, venue, label });
  refresh(matchId);
  return { ok: 'Saved.' };
}
