import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { matchById } from '@/lib/queries';
import { matchRoster } from '@/lib/admin-queries';
import { describeSlot } from '@/lib/competition';
import { fmtDate, fmtTime } from '@/lib/format';
import { mayScore, scorerState } from './state';
import { Scorer } from './Scorer';

export const metadata: Metadata = { title: 'Live scorer', robots: { index: false } };

export default async function ScorePage({ params }: { params: Promise<{ id: string }> }) {
  const matchId = Number((await params).id);
  const user = await requireUser(['scorer', 'competition_manager'], `/score/${matchId}`);
  if (!Number.isInteger(matchId) || matchId <= 0) notFound();
  const m = await matchById(matchId);
  if (!m) notFound();
  if (!(await mayScore(user, matchId))) {
    return (
      <div className="scorer">
        <p className="note warn">Another scorer is assigned to this match. Ask the competition manager if you should be scoring it.</p>
      </div>
    );
  }
  if (!m.homeTeamId || !m.awayTeamId) {
    return (
      <div className="scorer stack">
        <h1>Not ready</h1>
        <p className="note warn">
          The teams are not known yet ({describeSlot(m.homeSlot)} v {describeSlot(m.awaySlot)}). They are filled in when the earlier results are final.
        </p>
      </div>
    );
  }
  const [roster, state] = await Promise.all([matchRoster(matchId), scorerState(matchId)]);
  return (
    <>
      <div className="scorer" style={{ paddingBottom: 0 }}>
        <p className="small muted" style={{ margin: 0 }}>
          {m.competitionName} · {m.label} · {fmtDate(m.scheduledAt)} {fmtTime(m.scheduledAt)} · <Link href={`/match-centre/matches/${m.id}`}>Public page</Link>
        </p>
      </div>
      <Scorer
        matchId={m.id}
        knockout={m.knockout}
        home={{ id: m.homeTeamId, name: m.homeName!, code: m.homeCode, colour: m.homeColour }}
        away={{ id: m.awayTeamId, name: m.awayName!, code: m.awayCode, colour: m.awayColour }}
        roster={roster.map((r) => ({ playerId: r.playerId, teamId: r.teamId, shirt: r.shirt, name: `${r.firstName} ${r.lastName}`, short: r.lastName, position: r.position }))}
        initial={state}
      />
    </>
  );
}
