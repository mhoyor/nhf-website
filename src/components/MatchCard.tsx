// Match cards, fixture rows and knockout ties, in the prototype's Match Centre design.
import Link from 'next/link';
import type { MatchRow } from '@/lib/queries';
import { describeSlot } from '@/lib/competition';
import { CATEGORY_LABELS, fmtDate, fmtTime, isLive, lagosDay, matchClock } from '@/lib/format';
import { Crest } from './Team';

type Score = Pick<MatchRow, 'status' | 'homeScore' | 'awayScore' | 'homeShootout' | 'awayShootout'>;

export function winnerSide(m: Score): 'home' | 'away' | null {
  if (m.status !== 'final' || m.homeScore === null || m.awayScore === null) return null;
  if (m.homeScore !== m.awayScore) return m.homeScore > m.awayScore ? 'home' : 'away';
  if (m.homeShootout !== null && m.awayShootout !== null) return m.homeShootout > m.awayShootout ? 'home' : 'away';
  return null;
}

const started = (s: string) => s !== 'scheduled' && s !== 'postponed';

const UNCONFIRMED = 'Unconfirmed: entered by the scorer, still being checked against the scoresheet';

/** A small ring by a score that has not been confirmed yet; explained once by UnconfirmedNote. */
export function Unconfirmed() {
  return (
    <span className="unc" title={UNCONFIRMED}>
      <span className="sr">, unconfirmed</span>
    </span>
  );
}

export function UnconfirmedNote({ matches }: { matches: Pick<MatchRow, 'status' | 'confirmedAt'>[] }) {
  if (!matches.some((m) => m.status === 'final' && !m.confirmedAt)) return null;
  return (
    <p className="unc-note">
      <span className="unc" aria-hidden="true" />
      {UNCONFIRMED}.
    </p>
  );
}

export function Chip({ m }: { m: Pick<MatchRow, 'status' | 'period' | 'scheduledAt' | 'confirmedAt'> }) {
  switch (m.status) {
    case 'live':
      return (
        <span className="chip live">
          <span className="dot" />
          Live
        </span>
      );
    case 'shootout':
      return (
        <span className="chip live">
          <span className="dot" />
          Shoot-out
        </span>
      );
    case 'break':
      return <span className="chip brk">{m.period >= 4 ? 'Full time' : m.period === 2 ? 'Half-time' : 'Break'}</span>;
    case 'final':
      return m.confirmedAt ? (
        <span className="chip ft">FT</span>
      ) : (
        <span className="chip ft">
          FT
          <Unconfirmed />
        </span>
      );
    case 'postponed':
      return <span className="chip pend">Postponed</span>;
    case 'abandoned':
      return <span className="chip pend">Abandoned</span>;
    default:
      return <span className="chip sch">{fmtTime(m.scheduledAt)}</span>;
  }
}

function sideName(m: MatchRow, side: 'home' | 'away', labels?: Map<string, string>) {
  const name = side === 'home' ? m.homeName : m.awayName;
  const slot = side === 'home' ? m.homeSlot : m.awaySlot;
  return name ?? describeSlot(slot, (r) => labels?.get(r.toUpperCase()));
}

const dayLabel = (d: Date) => (lagosDay(d) === lagosDay() ? 'Today' : fmtDate(d));
/** A competition's name without its year, for lists already inside a season. */
export const shortComp = (name: string) => name.replace(/ 20\d\d$/, '');

/** A card for grids of today's and live matches. */
export function MatchCard({ m, labels }: { m: MatchRow; labels?: Map<string, string> }) {
  const w = winnerSide(m);
  const row = (side: 'home' | 'away') => {
    const known = side === 'home' ? m.homeTeamId : m.awayTeamId;
    return (
      <div className={`mc-row${w === side ? ' win' : ''}`}>
        <Crest code={side === 'home' ? m.homeCode : m.awayCode} colour={side === 'home' ? m.homeColour : m.awayColour} src={side === 'home' ? m.homeCrest : m.awayCrest} size="sm" />
        <span className={`nm${known ? '' : ' tbd'}`}>{sideName(m, side, labels)}</span>
        <span className="sc">{started(m.status) ? (side === 'home' ? m.homeScore : m.awayScore) ?? 0 : ''}</span>
      </div>
    );
  };
  return (
    <Link className={`mc${m.status === 'live' || m.status === 'shootout' ? ' is-live' : ''}`} href={`/match-centre/matches/${m.id}`}>
      <div className="mc-top">
        <span className="eyebrow">
          {CATEGORY_LABELS[m.category]} · {m.label}
        </span>
        <Chip m={m} />
      </div>
      {row('home')}
      {row('away')}
      <div className="mc-foot">
        <span>{m.homeShootout !== null ? `${m.homeShootout}–${m.awayShootout} on shoot-out` : shortComp(m.competitionName)}</span>
        {isLive(m.status) && <span className={m.status === 'break' ? 'is-brk' : undefined}>{matchClock(m.status, m.period, m.periodStartedAt)}</span>}
        {!isLive(m.status) && !started(m.status) && <span>{dayLabel(m.scheduledAt)}</span>}
      </div>
    </Link>
  );
}

/**
 * One line of a fixture list: when, home, score or kick-off, away. `meta` says what the
 * when column repeats: under a round heading that already gives the date, only the round
 * label ('label'); under a matchday heading, only the date ('date').
 */
export function FixtureRow({ m, labels, meta = 'both' }: { m: MatchRow; labels?: Map<string, string>; meta?: 'both' | 'date' | 'label' }) {
  const live = isLive(m.status);
  return (
    <Link className="frow" href={`/match-centre/matches/${m.id}`}>
      <span className="when">
        {live ? (
          <span>
            <Chip m={m} /> {matchClock(m.status, m.period, m.periodStartedAt)}
          </span>
        ) : meta !== 'label' ? (
          <b>{dayLabel(m.scheduledAt)}</b>
        ) : null}
        {meta !== 'date' && <span>{m.label}</span>}
      </span>
      <span className={`t h${m.homeTeamId ? '' : ' tbd'}`}>
        <span>{sideName(m, 'home', labels)}</span>
        <Crest code={m.homeCode} colour={m.homeColour} src={m.homeCrest} size="sm" />
      </span>
      <span className="sc">
        {started(m.status) ? (
          <>
            {m.homeScore ?? 0}–{m.awayScore ?? 0}
            {m.homeShootout !== null && (
              <small>
                {m.homeShootout}–{m.awayShootout} SO
              </small>
            )}
            {m.status === 'final' && !m.confirmedAt && <Unconfirmed />}
          </>
        ) : (
          <span className="muted" style={{ fontSize: 16 }}>
            {m.status === 'postponed' ? 'P–P' : fmtTime(m.scheduledAt)}
          </span>
        )}
      </span>
      <span className={`t${m.awayTeamId ? '' : ' tbd'}`}>
        <Crest code={m.awayCode} colour={m.awayColour} src={m.awayCrest} size="sm" />
        <span>{sideName(m, 'away', labels)}</span>
      </span>
    </Link>
  );
}

/** A knockout match in the classification bracket. */
export function Tie({ m, labels }: { m: MatchRow; labels?: Map<string, string> }) {
  const w = winnerSide(m);
  const tr = (side: 'home' | 'away') => {
    const known = side === 'home' ? m.homeTeamId : m.awayTeamId;
    const so = side === 'home' ? m.homeShootout : m.awayShootout;
    return (
      <div className={`tr${w === side ? ' win' : ''}`}>
        <Crest code={side === 'home' ? m.homeCode : m.awayCode} colour={side === 'home' ? m.homeColour : m.awayColour} src={side === 'home' ? m.homeCrest : m.awayCrest} size="sm" />
        <span className={known ? undefined : 'tbd'}>{sideName(m, side, labels)}</span>
        <b>
          {started(m.status) ? (side === 'home' ? m.homeScore : m.awayScore) ?? 0 : ''}
          {so !== null && <small> ({so})</small>}
        </b>
      </div>
    );
  };
  return (
    <Link className="tie" href={`/match-centre/matches/${m.id}`}>
      <div className="lab">
        <span>{m.label}</span>
        <span>{started(m.status) ? <Chip m={m} /> : `${dayLabel(m.scheduledAt)} ${fmtTime(m.scheduledAt)}`}</span>
      </div>
      {tr('home')}
      {tr('away')}
    </Link>
  );
}

export function MatchGrid({ matches, empty }: { matches: MatchRow[]; empty: string }) {
  if (!matches.length) return <div className="empty">{empty}</div>;
  return (
    <div className="mc-grid">
      {matches.map((m) => (
        <MatchCard key={m.id} m={m} />
      ))}
    </div>
  );
}

/** Matches in groups by competition (in the order they come), each under the competition's name. */
export function byCompetition<T extends Pick<MatchRow, 'competitionSlug'>>(matches: T[]): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const m of matches) groups.set(m.competitionSlug, [...(groups.get(m.competitionSlug) ?? []), m]);
  return [...groups];
}

/** A fixture list; with `grouped`, one block per competition so rows do not repeat its name. */
export function FixtureList({ matches, empty, labels, grouped }: { matches: MatchRow[]; empty: string; labels?: Map<string, string>; grouped?: boolean }) {
  if (!matches.length) return <div className="empty">{empty}</div>;
  return (
    <div className="stack" style={{ gap: 12 }}>
      {grouped ? (
        byCompetition(matches).map(([slug, list]) => (
          <div key={slug} className="round">
            <h3 className="grp">
              <Link href={`/match-centre/competitions/${slug}`}>{shortComp(list[0].competitionName)}</Link>
            </h3>
            {list.map((m) => (
              <FixtureRow key={m.id} m={m} labels={labels} />
            ))}
          </div>
        ))
      ) : (
        <div className="round">
          {matches.map((m) => (
            <FixtureRow key={m.id} m={m} labels={labels} />
          ))}
        </div>
      )}
      <UnconfirmedNote matches={matches} />
    </div>
  );
}
