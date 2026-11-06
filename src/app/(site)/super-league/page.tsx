import type { Metadata } from 'next';
import { SUPER_LEAGUE } from '@/content/superleague';
import { SOURCES } from '@/content/national';
import { competitionsNamed } from '@/lib/queries';
import { Cta, PageHead } from '@/components/site';
import { CompetitionCards } from '@/components/mc-blocks';

export const metadata: Metadata = { title: 'Nigeria Hockey Super League' };

const Chips = ({ list }: { list: { name: string; code: string; note: string }[] }) => (
  <div className="clubs-chips">
    {list.map((c) => (
      <span key={c.code} className="cchip">
        <span className="mono">{c.code}</span>
        {c.name}
        {c.note ? <span className="small muted"> · {c.note}</span> : null}
      </span>
    ))}
  </div>
);

export default async function SuperLeague() {
  const live = await competitionsNamed('%super league%');
  return (
    <div className="wrap page">
      <PageHead
        eyebrow="Competitions"
        title="Nigeria Hockey Super League"
        lede="The national club championship for men and women, played as a week-long tournament on the national hockey pitch in Abuja."
      />
      <section className="stack">
        <div className="sec-head">
          <h2>In the Match Centre</h2>
        </div>
        <CompetitionCards list={live} empty="The next Super League will appear here with live scores, tables and every player’s goals as soon as NHF publishes the fixtures." />
      </section>
      <section className="hsl-grid">
        <div className="poster">
          <img src="/img/hsl-2026-match-day-2.jpg" alt="Super League 2026 Match Day 2 graphic with the crests of six women’s clubs" width={399} height={501} />
        </div>
        <div className="stack" style={{ gap: 16 }}>
          <h2>2026 season</h2>
          <div className="facts">
            <div>
              <span>Dates</span>
              <b>26 June – 5 July 2026</b>
            </div>
            <div>
              <span>Venue</span>
              <b>Moshood Abiola National Stadium, Abuja</b>
            </div>
          </div>
          <h3>Women’s clubs</h3>
          <Chips list={SUPER_LEAGUE.women} />
          <h3>Men</h3>
          <Chips list={SUPER_LEAGUE.men} />
          <div className="panel">
            <div className="scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>2026 results reported so far</th>
                    <th></th>
                    <th className="r">Score</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {SUPER_LEAGUE.results2026.map((r, i) => (
                    <tr key={i}>
                      <td className="muted">{r.when}</td>
                      <td>{r.home}</td>
                      <td className="r">
                        <b>{r.score}</b>
                      </td>
                      <td>{r.away}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="src">
            Sources:{' '}
            <a href={SOURCES.gazette} target="_blank" rel="noopener noreferrer">
              Peoples Gazette (NAN)
            </a>
            ,{' '}
            <a href={SOURCES.africasport} target="_blank" rel="noopener noreferrer">
              Africasport
            </a>
          </p>
        </div>
      </section>
      <section>
        <h2>2025 finals</h2>
        <p className="lede">23 men’s and women’s teams played in Abuja from 1 to 9 November 2025.</p>
        <div className="panel">
          <div className="scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Match</th>
                  <th>Winner</th>
                  <th className="r">Score</th>
                  <th>Opponent</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {SUPER_LEAGUE.finals2025.map((f) => (
                  <tr key={f.match}>
                    <td>
                      <b>{f.match}</b>
                    </td>
                    <td>{f.winner}</td>
                    <td className="r">
                      <b>{f.score}</b>
                    </td>
                    <td>{f.opponent}</td>
                    <td className="small muted">{f.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="champ">
          <div>
            <span>Africa Cup for Club Champions, Harare, January 2026</span>
            <b>Four qualifiers</b>
            <span>Kada Stars, Kada Queens, Police Machine, Plateau Queens</span>
          </div>
          <div>
            <span>Club crests</span>
            <b>To come from the clubs</b>
            <span>Monograms stand in until each club sends its crest</span>
          </div>
        </div>
        <p className="src">
          Source:{' '}
          <a href={SOURCES.bsn} target="_blank" rel="noopener noreferrer">
            BSN Sports
          </a>
        </p>
      </section>
      <section className="newsletter dark">
        <div className="stack" style={{ gap: 10 }}>
          <p className="eyebrow">
            For NHF staff
          </p>
          <h2>Publish the next season here</h2>
          <p>
            Build the Super League in the admin as groups plus semi-finals and placing matches, or upload the fixtures from a CSV file. Scorers then enter goals and cards
            live from the pitch.
          </p>
        </div>
        <div className="btnrow">
          <Cta href="/admin/competitions/new" kind="light">
            Competition admin
          </Cta>
          <Cta href="/admin" kind="ghost-light">
            Staff sign-in
          </Cta>
        </div>
      </section>
    </div>
  );
}
