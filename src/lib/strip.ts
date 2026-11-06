import { liveAndToday } from './queries';
import { fmtTime, matchClock } from './format';
import type { StripMatch } from '@/components/LiveStrip';

export async function stripMatches(): Promise<StripMatch[]> {
  const rows = await liveAndToday();
  return rows.slice(0, 12).map((m) => ({
    id: m.id,
    home: m.homeCode ?? 'TBD',
    away: m.awayCode ?? 'TBD',
    homeScore: m.homeScore,
    awayScore: m.awayScore,
    status: m.status,
    time: fmtTime(m.scheduledAt),
    clock: m.status === 'final' ? 'FT' : matchClock(m.status, m.period, m.periodStartedAt),
  }));
}
