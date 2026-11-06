import Link from 'next/link';
import type { Metadata } from 'next';
import { competitions, currentSeason, latestResults, liveAndToday, seasonScorers, upcoming } from '@/lib/queries';
import { FixtureList, MatchGrid } from '@/components/MatchCard';
import { McHead } from '@/components/McHead';
import { CompetitionCards, ScorersTable } from '@/components/mc-blocks';
import { fmtDate, lagosDay } from '@/lib/format';

export const metadata: Metadata = { title: 'Match Centre' };

export default async function MatchCentreHome() {
  const season = await currentSeason();
  const [today, results, next, comps, scorers] = await Promise.all([
    liveAndToday(),
    latestResults(8),
    upcoming(8),
    competitions(season?.id ?? null),
    season ? seasonScorers(season.id, 10) : Promise.resolve([]),
  ]);
  return (
    <div className="wrap page">
      <McHead active="live" eyebrow={fmtDate(lagosDay())} title="Live and today" />
      <section>
        <MatchGrid matches={today} empty="No matches today. Fixtures and results are below." />
        <p className="small muted">Scores, goals and cards update on every screen as the scorer enters them at the pitch.</p>
      </section>
      <section className="cols">
        <div className="stack">
          <div className="sec-head">
            <h2>Latest results</h2>
            <Link className="more" href="/match-centre/competitions">
              All competitions
            </Link>
          </div>
          <FixtureList matches={results} empty="No results yet." grouped />
        </div>
        <div className="stack">
          <h2>Top scorers {season?.name}</h2>
          <ScorersTable rows={scorers} empty="No goals recorded this season yet." />
        </div>
      </section>
      <section>
        <h2>Coming up</h2>
        <FixtureList matches={next} empty="No fixtures published yet." grouped />
      </section>
      <section>
        <h2>Competitions {season?.name}</h2>
        <CompetitionCards list={comps} empty="No competitions published for this season yet." />
      </section>
    </div>
  );
}
