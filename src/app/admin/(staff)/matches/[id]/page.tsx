import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { can, requireUser } from '@/lib/auth';
import { matchById, venueOptions } from '@/lib/queries';
import { matchRoster, storedEvents, storedSquads } from '@/lib/admin-queries';
import { tallyFromRows } from '@/lib/tally';
import { describeSlot } from '@/lib/competition';
import { fmtDate, fmtTime, lagosDay, STATUS_LABELS } from '@/lib/format';
import { ActionForm } from '@/components/ActionForm';
import { TallyForm, type RosterLine } from './TallyForm';
import { confirmResult, rescheduleMatch, saveResult, setMatchStatus } from '../actions';

export const metadata: Metadata = { title: 'Match result' };

export default async function AdminMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const matchId = Number((await params).id);
  const user = await requireUser(['competition_manager', 'scorer'], `/admin/matches/${matchId}`);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();
  const m = await matchById(matchId);
  if (!m) notFound();
  const manager = can(user, 'competition_manager');
  const [roster, squads, events, venues] = await Promise.all([matchRoster(matchId), storedSquads(matchId), storedEvents(matchId), venueOptions()]);

  const teamsKnown = m.homeTeamId !== null && m.awayTeamId !== null;
  const rebuilt = tallyFromRows(
    roster.map((r) => ({ playerId: r.playerId, teamId: r.teamId, shirt: r.shirt })),
    squads,
    events,
  );
  const byId = new Map(roster.map((r) => [r.playerId, r]));
  const lines: RosterLine[] = rebuilt.map((l) => ({ ...l, name: `${byId.get(l.playerId)!.firstName} ${byId.get(l.playerId)!.lastName}`, position: byId.get(l.playerId)!.position }));
  const started = m.status !== 'scheduled' && m.status !== 'postponed';

  return (
    <div className="stack">
      <div>
        <p className="eyebrow">
          <Link href={`/admin/competitions/${m.competitionId}`}>{m.competitionName}</Link> · {m.label}
        </p>
        <h1>
          {m.homeName ?? describeSlot(m.homeSlot)} v {m.awayName ?? describeSlot(m.awaySlot)}
        </h1>
        <p className="muted">
          {fmtDate(m.scheduledAt)}, {fmtTime(m.scheduledAt)} · {m.venueName ?? 'Venue to be confirmed'} · {STATUS_LABELS[m.status]}
          {m.status === 'final' && (m.confirmedAt ? ' · confirmed' : ' · not confirmed yet')}
          {' · '}
          <Link href={`/match-centre/matches/${m.id}`}>Public page</Link>
          {' · '}
          <Link href={`/score/${m.id}`}>Live scorer</Link>
        </p>
      </div>

      {m.status === 'final' && !m.confirmedAt && manager && (
        <form action={confirmResult} className="note warn row between">
          <input type="hidden" name="match" value={m.id} />
          <span>
            This result was saved as {m.homeScore}–{m.awayScore}
            {m.homeShootout !== null ? ` (shoot-out ${m.homeShootout}–${m.awayShootout})` : ''} and is waiting for confirmation.
          </span>
          <button className="btn primary sm" type="submit">
            Confirm as it is
          </button>
        </form>
      )}

      {!teamsKnown ? (
        <div className="note warn">
          The teams are not known yet: this match takes {describeSlot(m.homeSlot)} and {describeSlot(m.awaySlot)}. They are filled in automatically when the earlier
          results are final.
        </div>
      ) : (
        <TallyForm
          action={saveResult.bind(null, m.id)}
          home={{ id: m.homeTeamId!, name: m.homeName! }}
          away={{ id: m.awayTeamId!, name: m.awayName! }}
          knockout={m.knockout}
          initial={{ home: m.homeScore ?? 0, away: m.awayScore ?? 0, homeShootout: m.homeShootout, awayShootout: m.awayShootout }}
          lines={lines}
          canConfirm={manager}
        />
      )}

      {manager && (
        <div className="grid2">
          <section className="panel">
            <h2>Date, time and venue</h2>
            <ActionForm action={rescheduleMatch.bind(null, m.id)} submit="Save">
              <div className="fields">
                <label className="field">
                  Date
                  <input type="date" name="date" defaultValue={lagosDay(m.scheduledAt)} required />
                </label>
                <label className="field">
                  Time (WAT)
                  <input type="time" name="time" defaultValue={fmtTime(m.scheduledAt)} required />
                </label>
                <label className="field">
                  Venue
                  <select name="venue" defaultValue={String(venues.find((v) => v.name === m.venueName)?.id ?? '')}>
                    <option value="">To be confirmed</option>
                    {venues.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Label
                  <input name="label" defaultValue={m.label} maxLength={40} required />
                </label>
              </div>
            </ActionForm>
          </section>
          <section className="panel">
            <h2>Status</h2>
            <p className="small muted">Postpone or abandon a match, or put it back to scheduled. Going back to scheduled clears its score, goals, cards and team sheets.</p>
            <ActionForm action={setMatchStatus.bind(null, m.id)} submit="Change status" danger={started}>
              <label className="field">
                New status
                <select name="status" defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  <option value="postponed">Postponed</option>
                  <option value="abandoned">Abandoned</option>
                  <option value="scheduled">Back to scheduled</option>
                </select>
              </label>
            </ActionForm>
          </section>
        </div>
      )}
    </div>
  );
}
