import Link from 'next/link';
import type { ReactNode } from 'react';
import { featuredNews, latestNews } from '@/lib/news';
import { currentSeason, latestResults, liveAndToday, seasonScorers, upcoming, type MatchRow } from '@/lib/queries';
import { Arrow, Cta, Highlighted, Photo, relDate, rv } from '@/components/site';
import { Headline, NewsTile } from '@/components/news-blocks';
import { byCompetition, Chip, shortComp, Unconfirmed, UnconfirmedNote } from '@/components/MatchCard';
import { Crest } from '@/components/Team';
import { ScorersTable } from '@/components/mc-blocks';
import { Newsletter } from '@/components/Newsletter';
import { SUPER_LEAGUE } from '@/content/superleague';
import { SOURCES } from '@/content/national';
import { describeSlot } from '@/lib/competition';
import { fmtDate, fmtTime, isLive, lagosDay } from '@/lib/format';
import { signUpNewsletter } from './actions';

// The home page is a run of full-width bands that alternate light and dark:
// hero (dark) · entry links · news · Match Centre (grey) · This is hockey (dark) ·
// Team Nigeria · Super League (light green) · get involved (dark block) and newsletter.

const name = (m: MatchRow, side: 'home' | 'away') => (side === 'home' ? m.homeName ?? describeSlot(m.homeSlot) : m.awayName ?? describeSlot(m.awaySlot));
const shortDay = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });

function Agenda({ matches }: { matches: MatchRow[] }) {
  const r = rv(0.08);
  return (
    <aside className={`agenda ${r.className}`} style={r.style}>
      <h3>Agenda</h3>
      {matches.map((m) => {
        const d = new Date(m.scheduledAt);
        return (
          <Link key={m.id} className="ag" href={`/match-centre/matches/${m.id}`}>
            <span className="d">
              {Number(lagosDay(d).slice(8))}
              <small>{d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'Africa/Lagos' }).toLowerCase()}</small>
            </span>
            <span>
              <b>
                {name(m, 'home')} v {name(m, 'away')}
              </b>
              <span>
                {m.label} · {fmtTime(m.scheduledAt)}
              </span>
            </span>
          </Link>
        );
      })}
      {!matches.length && <p className="note">No fixtures in the next ten days.</p>}
      <Link className="btn" href="/match-centre/competitions">
        Fixtures
      </Link>
    </aside>
  );
}

function Promo() {
  const r = rv(0.14);
  return (
    <Link className={`promo ${r.className}`} style={r.style} href="/how-hockey-works">
      <svg className="wm" viewBox="0 0 200 200" aria-hidden="true">
        <path d="M120 10 L70 150 Q58 182 26 172" fill="none" stroke="var(--accent-ink)" strokeWidth="22" strokeLinecap="round" />
        <circle cx="150" cy="170" r="20" fill="var(--accent-ink)" />
      </svg>
      <h3>New to hockey? The game in two minutes</h3>
      <div className="row">
        <p>Rules, pitch and scoring, step by step</p>
        <span className="go">
          <Arrow />
        </span>
      </div>
    </Link>
  );
}

/** A compact match line: the first column (time, status or date), both teams, both scores. */
function MiniRow({ m, first }: { m: MatchRow; first: ReactNode }) {
  const sched = m.status === 'scheduled' || m.status === 'postponed';
  return (
    <Link className="trow" href={`/match-centre/matches/${m.id}`}>
      <span className="tt">{first}</span>
      <span className="stack" style={{ gap: 4, minWidth: 0 }}>
        <span className={`tm${m.homeTeamId ? '' : ' tbd'}`}>
          <Crest code={m.homeCode} colour={m.homeColour} src={m.homeCrest} size="sm" />
          <span>{name(m, 'home')}</span>
        </span>
        <span className={`tm${m.awayTeamId ? '' : ' tbd'}`}>
          <Crest code={m.awayCode} colour={m.awayColour} src={m.awayCrest} size="sm" />
          <span>{name(m, 'away')}</span>
        </span>
      </span>
      <span className="sc">
        {sched ? (
          ''
        ) : (
          <>
            {m.homeScore ?? 0}
            <br />
            {m.awayScore ?? 0}
          </>
        )}
      </span>
    </Link>
  );
}

function TodayList({ matches }: { matches: MatchRow[] }) {
  if (!matches.length) return <p className="muted">No matches today.</p>;
  return (
    <div className="tlist">
      {matches.map((m) => (
        <MiniRow
          key={m.id}
          m={m}
          first={isLive(m.status) || m.status === 'final' ? <Chip m={m} /> : m.status === 'postponed' ? 'Postponed' : fmtTime(m.scheduledAt)}
        />
      ))}
    </div>
  );
}

function ResultList({ matches }: { matches: MatchRow[] }) {
  if (!matches.length) return <p className="muted">No results yet this season.</p>;
  return (
    <>
      {byCompetition(matches).map(([slug, list]) => (
        <div key={slug}>
          <h4 className="grp">
            <Link href={`/match-centre/competitions/${slug}`}>{shortComp(list[0].competitionName)}</Link>
          </h4>
          <div className="tlist">
            {list.map((m) => (
              <MiniRow
                key={m.id}
                m={m}
                first={
                  <>
                    {shortDay(m.scheduledAt)}
                    {!m.confirmedAt && <Unconfirmed />}
                  </>
                }
              />
            ))}
          </div>
        </div>
      ))}
      <UnconfirmedNote matches={matches} />
    </>
  );
}

function TeamTile({ slot, label, href, delay }: { slot: string; label: string; href: string; delay: number }) {
  const r = rv(delay);
  return (
    <Link className={`ttile ${r.className}`} style={r.style} href={href}>
      <Photo slot={slot} alt={label} />
      <div className="cap">
        <h3>{label}</h3>
        <span className="go">Results and squad</span>
      </div>
    </Link>
  );
}

export default async function Home() {
  const season = await currentSeason();
  const [hero, news, agenda, today, results, scorers] = await Promise.all([
    featuredNews(),
    latestNews(7),
    upcoming(3, 10),
    liveAndToday(),
    latestResults(5),
    season ? seasonScorers(season.id, 5) : Promise.resolve([]),
  ]);
  const rest = news.filter((n) => n.slug !== hero?.slug);
  const [big, second, third, ...heads] = rest;

  return (
    <>
      {hero && (
        <section className="hero" aria-label="Featured story">
          <Photo src={hero.photoUrl} slot={hero.photoUrl ? undefined : 'hero'} alt={hero.photoAlt ?? ''} position={hero.photoPosition} credit={hero.photoCredit} eager />
          <div className="wrap hero-in">
            <div className="meta-row">
              <span className="date">{relDate(hero.publishedOn, hero.dateText)}</span>
              {hero.tags.slice(0, 2).map((t) => (
                <span key={t} className="tagp">
                  {t}
                </span>
              ))}
            </div>
            <h1>
              <Highlighted text={hero.heroTitle || hero.title} />
            </h1>
            <p className="lede">{hero.summary}</p>
            {hero.highlights.length > 0 && (
              <div className="medals">
                {hero.highlights.slice(0, 3).map(([label, value]) => (
                  <div key={label} className="medal">
                    <span className="disc">{/bronze/i.test(hero.title + label) ? 3 : /silver/i.test(label) ? 2 : /gold/i.test(label) ? 1 : '★'}</span>
                    <div>
                      <span>{label}</span>
                      <b>{value}</b>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="btnrow">
              <Cta href={`/news/${hero.slug}`} kind="light">
                Read the story
              </Cta>
              <Cta href="/gallery" kind="ghost-light">
                See the photos
              </Cta>
            </div>
          </div>
        </section>
      )}

      <div className="entry">
        <div className="wrap entry-in">
          <div>
            <h2>All about hockey</h2>
            <div className="links">
              <Link href="/how-hockey-works">How hockey works</Link>
              <Link href="/regulations">Rules</Link>
              <Link href="/stats">Stats and records</Link>
            </div>
          </div>
          <div>
            <h2>Discover hockey</h2>
            <div className="links">
              <Link href="/get-involved">Start playing</Link>
              <Link href="/match-centre/clubs">Find a club</Link>
              <Link href="/schools">Schools</Link>
            </div>
          </div>
          <div>
            <h2>Match Centre</h2>
            <div className="links">
              <Link href="/match-centre">Live and today</Link>
              <Link href="/match-centre/competitions">Fixtures and tables</Link>
              <Link href="/match-centre/players">Players and stats</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="band">
        <div className="wrap">
          <section className="actueel" aria-label="NHF news">
            <div className="col col1">
              <h2 className="big-title reveal">NHF news</h2>
              {big && <NewsTile n={big} big />}
            </div>
            <div className="col col2">
              {second && <NewsTile n={second} delay={0.06} />}
              {third && <NewsTile n={third} delay={0.12} />}
            </div>
            <div className="col col3">
              <Agenda matches={agenda} />
              <Promo />
            </div>
          </section>
          {heads.length > 0 && (
            <section className="reveal" aria-labelledby="more-news">
              <div className="sec-head">
                <h2 id="more-news">More news</h2>
                <Link className="more" href="/news">
                  All news
                </Link>
              </div>
              <div className="hl-row">
                {heads.slice(0, 3).map((n) => (
                  <Headline key={n.slug} n={n} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      <section className="band sunk" aria-labelledby="mc-title">
        <div className="wrap">
          <div className="sec-head reveal">
            <h2 id="mc-title" className="big-title" style={{ fontSize: 'clamp(48px,7vw,100px)' }}>
              Match Centre
            </h2>
            <Link className="more" href="/match-centre">
              Live scores, tables and stats
            </Link>
          </div>
          <div className="mc3">
            <div className="reveal">
              <h3>Today</h3>
              <p className="small muted">{fmtDate(lagosDay())} · live as the scorers enter it</p>
              <TodayList matches={today} />
            </div>
            <div className="reveal" style={{ ['--d' as string]: '0.06s' }}>
              <h3>Latest results</h3>
              <ResultList matches={results} />
            </div>
            <div className="reveal" style={{ ['--d' as string]: '0.12s' }}>
              <h3>Top scorers {season?.name}</h3>
              <ScorersTable rows={scorers} empty="No goals recorded this season yet." showCategory compact />
              <Link className="more" href="/match-centre/players">
                All players
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="action" aria-label="This is hockey">
        <div className="wrap action-in">
          <div className="action-head reveal">
            <h2 className="big-title light">This is hockey</h2>
            <p>Fast, skilful and played eleven a side, or five a side in Hockey5s. If you have never watched a match, start here.</p>
          </div>
          <div className="mosaic">
            {(
              [
                ['m1', 'act-1', 'Nigeria’s U18 girls on the ball against Ghana', 'Speed', 'One of the fastest team sports there is: the ball flies across the turf.', 0.05, 0],
                ['m2', 'act-2', 'Nigeria’s U18 boys under pressure against Uganda', 'Power', 'Strikes, drag-flicks and full-pitch passes.', 0.08, 0.06],
                ['m3', 'act-3', 'Close control with the flat side of the stick', 'Skill', 'Flat side of the stick only.', 0, 0.1],
                ['m4', 'act-4', 'A Nigerian forward shields the ball', 'Grit', '', 0, 0.14],
                ['m5', 'act-5', 'Bronze medals and the team plaque, Nairobi 2026', 'Pride', 'Double bronze for Nigeria’s U18s, August 2026.', 0.04, 0.06],
              ] as [string, string, string, string, string, number, number][]
            ).map(([cls, slot, alt, word, text, speed, delay]) => (
              <figure key={cls} className={`${cls} reveal${speed ? ' plx' : ''}`} data-speed={speed || undefined} style={{ ['--d' as string]: `${delay}s` }}>
                <Photo slot={slot} alt={alt} />
                <figcaption className="word">
                  <b>{word}</b>
                  <span>{text}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="numbers reveal">
            <div>
              <b>11</b>
              <span>players a side, including a goalkeeper</span>
            </div>
            <div>
              <b>4 × 15</b>
              <span>minute quarters</span>
            </div>
            <div>
              <b>14.63 m</b>
              <span>shooting circle: goals only count from inside</span>
            </div>
            <div>
              <b>3</b>
              <span>cards: green, yellow, red</span>
            </div>
          </div>
          <div className="btnrow">
            <Cta href="/how-hockey-works" kind="accent">
              Hockey in two minutes
            </Cta>
            <Cta href="/gallery" kind="ghost-light">
              Photo gallery
            </Cta>
          </div>
        </div>
      </section>

      <div className="band">
        <div className="wrap">
          <section>
            <div className="sec-head reveal">
              <h2 className="big-title" style={{ fontSize: 'clamp(48px,7vw,100px)' }}>
                Team Nigeria
              </h2>
              <Link className="more" href="/national-teams">
                All national teams
              </Link>
            </div>
            <div className="teams4">
              <TeamTile slot="team-men" label="Senior men" href="/national-teams/men" delay={0} />
              <TeamTile slot="team-women" label="Senior women" href="/national-teams/women" delay={0.06} />
              <TeamTile slot="team-u18g" label="U18 girls" href="/national-teams/u18" delay={0.12} />
              <TeamTile slot="team-u18b" label="U18 boys" href="/national-teams/u18" delay={0.18} />
            </div>
          </section>
        </div>
      </div>

      <section className="hsl-band">
        <div className="wrap">
          <Link className="poster reveal" href="/super-league">
            <img src="/img/hsl-2026-match-day-2.jpg" alt="Super League 2026 Match Day 2 graphic with the crests of six women’s clubs" width={399} height={501} loading="lazy" />
          </Link>
          <div className="stack reveal" style={{ gap: 18, ['--d' as string]: '0.1s' }}>
            <p className="eyebrow">Domestic hockey</p>
            <h2>Nigeria Hockey Super League</h2>
            <p className="lede">
              The 2026 Super League was played from 26 June to 5 July on the national hockey pitch at the Moshood Abiola National Stadium, Abuja. Seven clubs contested the
              women’s title.
            </p>
            <div className="clubs-chips">
              {SUPER_LEAGUE.women.map((c) => (
                <span key={c.code} className="cchip">
                  <span className="mono">{c.code}</span>
                  {c.name}
                  {c.note ? <span className="small muted"> · {c.note}</span> : null}
                </span>
              ))}
            </div>
            <div className="champ">
              <div>
                <span>2025 men’s champions</span>
                <b>Kada Stars</b>
                <span>0–0 v Police Machine, won the shoot-out 3–2</span>
              </div>
              <div>
                <span>2025 women’s champions</span>
                <b>Kada Queens</b>
                <span>2–0 v Plateau Queens</span>
              </div>
            </div>
            <div className="btnrow">
              <Cta href="/super-league">About the Super League</Cta>
              <Cta href="/match-centre" kind="">
                Match Centre
              </Cta>
            </div>
            <p className="src">
              Sources:{' '}
              <a href={SOURCES.gazette} target="_blank" rel="noopener noreferrer">
                Peoples Gazette (NAN)
              </a>
              ,{' '}
              <a href={SOURCES.bsn} target="_blank" rel="noopener noreferrer">
                BSN Sports
              </a>
            </p>
          </div>
        </div>
      </section>

      <div className="band">
        <div className="wrap">
          <section className="involve reveal" aria-label="Get involved">
            <div className="campaign">
              <Photo slot="campaign" alt="A Nigerian player controls the ball on the turf" art="campaign" />
              <div className="camp-in">
                <p className="eyebrow">Hockey for everyone</p>
                <h2>Pick up a stick</h2>
                <p>Girls and boys, women and men play hockey across Nigeria. Find a club near you and try a session.</p>
                <div className="btnrow">
                  <Cta href="/match-centre/clubs" kind="light">
                    Find a club
                  </Cta>
                  <Cta href="/get-involved" kind="ghost-light">
                    Start playing
                  </Cta>
                </div>
              </div>
            </div>
            <div className="involve-txt">
              <p className="eyebrow">Coaches and officials</p>
              <h2>Coach it. Umpire it.</h2>
              <p className="lede">Coaching courses and umpiring seminars run alongside the Super League. Develop with NHF and the FIH Academy.</p>
              <div className="btnrow">
                <Cta href="/coaching" kind="light">
                  Coaching courses
                </Cta>
                <Cta href="/umpiring" kind="ghost-light">
                  Umpiring
                </Cta>
              </div>
            </div>
          </section>

          <Newsletter action={signUpNewsletter} />

          <section className="reveal">
            <div className="sec-head">
              <h2 style={{ fontSize: 30 }}>Partners</h2>
              <Link className="more" href="/sponsorship">
                Partner with NHF
              </Link>
            </div>
            <div className="partners">
              {['Lead partner', 'Kit supplier', 'Official partner', 'Official partner', 'Media partner', 'Government partner'].map((p, i) => (
                <div key={i}>{p}</div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
