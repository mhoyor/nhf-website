import Link from 'next/link';
import type { Metadata } from 'next';
import { nationalTeam, SOURCES } from '@/content/national';
import { currentSeason, seasonScorers, competitions } from '@/lib/queries';
import { PageHead } from '@/components/site';
import { Honours, ResultsTable } from '@/components/national';
import { ScorersTable } from '@/components/mc-blocks';

export const metadata: Metadata = { title: 'Stats and records' };

export default async function StatsPage() {
  const men = nationalTeam('men')!;
  const women = nationalTeam('women')!;
  const season = await currentSeason();
  const [menTop, womenTop, comps] = season
    ? await Promise.all([seasonScorers(season.id, 8, 'men'), seasonScorers(season.id, 8, 'women'), competitions(season.id)])
    : [[], [], []];
  const played = comps.reduce((s, c) => s + c.played, 0);
  return (
    <div className="wrap page">
      <PageHead
        eyebrow="Stats and records"
        title="FIH rankings and records"
        lede="Where Nigeria stands in the world, what its teams have won, and who is scoring at home this season. Rankings checked 4 November 2026."
        photo={{ slot: 'stats-hero' }}
      />
      <div className="rank-tiles">
        <div>
          <b>{men.rank}</b>
          <h3>Senior men</h3>
          <span>{men.points} points · 4th in Africa after South Africa (13), Egypt (17) and Ghana (33)</span>
        </div>
        <div>
          <b>{women.rank}</b>
          <h3>Senior women</h3>
          <span>{women.points} points · last ranked match 18 October 2025</span>
        </div>
        <div>
          <b>14</b>
          <h3>Hockey5s men</h3>
          <span>3rd in Africa after Egypt and Kenya</span>
        </div>
      </div>
      <p className="src">
        Sources:{' '}
        <a href={SOURCES.fihMen} target="_blank" rel="noopener noreferrer">
          FIH, men
        </a>
        ,{' '}
        <a href={SOURCES.fihWomen} target="_blank" rel="noopener noreferrer">
          FIH, women
        </a>
        ,{' '}
        <a href={SOURCES.fih5s} target="_blank" rel="noopener noreferrer">
          FIH Hockey5s
        </a>
      </p>

      <section id="domestic" className="stack">
        <div className="sec-head">
          <h2>Domestic leaders {season?.name}</h2>
          <Link className="more" href="/match-centre/players">
            Search every player
          </Link>
        </div>
        <p className="small muted">
          From the Match Centre: {played} matches entered this season. Goals are counted from every published competition and add up across clubs for players who
          moved.
        </p>
        <div className="cols even">
          <div className="stack">
            <h3>Men</h3>
            <ScorersTable rows={menTop} empty="No men’s goals recorded this season yet." />
          </div>
          <div className="stack">
            <h3>Women</h3>
            <ScorersTable rows={womenTop} empty="No women’s goals recorded this season yet." />
          </div>
        </div>
      </section>

      <section id="honours" className="cols even">
        <div className="stack">
          <h2>Honours: men</h2>
          <Honours items={men.honours} />
        </div>
        <div className="stack">
          <h2>Honours: women</h2>
          <Honours items={women.honours} />
        </div>
      </section>
      <section>
        <h2>Recent results: senior men</h2>
        <ResultsTable team={men} />
      </section>
      <section>
        <h2>Recent results: senior women</h2>
        <ResultsTable team={women} />
      </section>
      <div className="empty">Next: the full tournament archive since 1974, head-to-head records by opponent and a ranking history chart.</div>
    </div>
  );
}
