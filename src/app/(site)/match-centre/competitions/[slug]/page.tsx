import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { competitionBySlug, competitionMatches, discipline, standings, topScorers, type MatchRow, type StandingRow } from '@/lib/queries';
import { can, currentUser } from '@/lib/auth';
import { FixtureRow, Tie, UnconfirmedNote, winnerSide } from '@/components/MatchCard';
import { StandingsTable, type FormLetter } from '@/components/Standings';
import { McHead } from '@/components/McHead';
import { Crest } from '@/components/Team';
import { CardIcon } from '@/components/CardIcon';
import { formatLabel } from '@/components/mc-blocks';
import { CATEGORY_LABELS, fmtDate, lagosDay, publicName } from '@/lib/format';
import { ordinal, parseSlot } from '@/lib/competition';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await competitionBySlug((await params).slug);
  return { title: c?.name ?? 'Competition' };
}

const isMedal = (m: MatchRow) => /^(SF|QF|F$|P3$)/.test(m.ref ?? '') || (m.placeWinner !== null && m.placeWinner <= 3);

export default async function CompetitionPage({ params }: Props) {
  const { slug } = await params;
  const user = await currentUser();
  const comp = await competitionBySlug(slug, can(user, 'competition_manager', 'media'));
  if (!comp) notFound();
  const [table, matches, scorers, cards] = await Promise.all([standings(comp.id), competitionMatches(comp.id), topScorers(comp.id, 12), discipline(comp.id)]);

  const labels = new Map(matches.filter((m) => m.ref).map((m) => [m.ref!.toUpperCase(), m.label]));
  const cls = matches.filter((m) => m.stage === 'classification');
  const stage1 = matches.filter((m) => m.stage !== 'classification');

  // Which table positions feed medal matches (q1) or placing matches (q2).
  const qualify: Record<string, Record<number, 'q1' | 'q2'>> = {};
  for (const m of cls)
    for (const raw of [m.homeSlot, m.awaySlot]) {
      const s = raw ? parseSlot(raw) : null;
      if (s?.kind !== 'pos') continue;
      const q = (qualify[s.group] ??= {});
      if (isMedal(m)) q[s.pos] = 'q1';
      else q[s.pos] ??= 'q2';
    }
  // Form: the last results of each team, oldest first.
  const form: Record<number, FormLetter[]> = {};
  for (const m of stage1.filter((x) => x.status === 'final')) {
    const w = winnerSide(m);
    for (const side of ['home', 'away'] as const) {
      const t = side === 'home' ? m.homeTeamId : m.awayTeamId;
      if (t) (form[t] ??= []).push(w === null ? 'D' : w === side ? 'W' : 'L');
    }
  }
  const groups = new Map<string, StandingRow[]>();
  for (const r of table) groups.set(r.groupCode, [...(groups.get(r.groupCode) ?? []), r]);

  const medal = cls.filter(isMedal);
  const ko = medal.filter((m) => m.placeWinner === null);
  const finals = medal.filter((m) => m.placeWinner !== null).sort((a, b) => a.placeWinner! - b.placeWinner!);
  const placing = cls.filter((m) => !isMedal(m));
  const placings = cls
    .filter((m) => m.status === 'final' && m.placeWinner)
    .flatMap((m) => {
      const homeWon = winnerSide(m) === 'home';
      return [
        { place: m.placeWinner!, name: homeWon ? m.homeName : m.awayName, code: homeWon ? m.homeCode : m.awayCode, colour: homeWon ? m.homeColour : m.awayColour, crest: homeWon ? m.homeCrest : m.awayCrest },
        { place: m.placeLoser ?? m.placeWinner! + 1, name: homeWon ? m.awayName : m.homeName, code: homeWon ? m.awayCode : m.homeCode, colour: homeWon ? m.awayColour : m.homeColour, crest: homeWon ? m.awayCrest : m.homeCrest },
      ];
    })
    .sort((a, b) => a.place - b.place);

  const rounds = new Map<string, MatchRow[]>();
  for (const m of stage1) {
    const k = comp.format === 'league' ? `Matchday ${m.round ?? '?'}` : fmtDate(lagosDay(m.scheduledAt));
    rounds.set(k, [...(rounds.get(k) ?? []), m]);
  }
  const anyQ2 = Object.values(qualify).some((q) => Object.values(q).includes('q2'));

  return (
    <div className="wrap page">
      <McHead
        active="competitions"
        eyebrow={`${comp.seasonName} · ${CATEGORY_LABELS[comp.category]}`}
        title={comp.name}
        extra={<span className="chip fmt">{formatLabel(comp)}</span>}
      >
        <p className="lede">
          {comp.played} of {comp.matches} matches played
          {comp.firstMatch && ` · ${fmtDate(comp.firstMatch)} to ${fmtDate(comp.lastMatch ?? comp.firstMatch)}`}
          {!comp.published && ' · not published: only staff can see this'}
        </p>
      </McHead>

      {placings.length > 0 && (
        <section>
          <h2>Final standings</h2>
          <div className="panel">
            <table className="tbl">
              <tbody>
                {placings.map((p) => (
                  <tr key={p.place}>
                    <td style={{ width: 60 }}>
                      <b>{ordinal(p.place)}</b>
                    </td>
                    <td>
                      <span className="team">
                        <Crest code={p.code} colour={p.colour} src={p.crest} size="sm" />
                        {p.name}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="cols">
        <div className="stack">
          <h2>{comp.format === 'league' ? 'League table' : 'Group stage'}</h2>
          {[...groups].map(([code, rows]) => (
            <div key={code} className="stack" style={{ gap: 6 }}>
              {code !== 'L' && (
                <div className="sec-head">
                  <h3>Group {code}</h3>
                  <span className="small muted">
                    {rows.reduce((s, r) => s + r.played, 0) / 2} played{rows[0]?.complete ? ' · final' : ''}
                  </span>
                </div>
              )}
              <StandingsTable rows={rows} qualify={qualify[code]} form={form} />
            </div>
          ))}
          {!groups.size && <div className="empty">The table appears once fixtures are added.</div>}
          {cls.length > 0 && (
            <div className="legend">
              <span>
                <i style={{ background: 'var(--green)' }} />
                Into the semi-finals or final
              </span>
              {anyQ2 && (
                <span>
                  <i style={{ background: 'var(--q2)' }} />
                  Placing matches
                </span>
              )}
            </div>
          )}
          <p className="small muted">
            Win 3 points, draw 1. Ties are broken on goal difference, then goals scored.
            {cls.length > 0 && ' Classification teams fill in by themselves once a group is complete.'}
          </p>
        </div>
        <div className="stack">
          <h2>Top scorers</h2>
          {scorers.length ? (
            <div className="panel">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Club</th>
                    <th className="r" title="Penalty corners">PC</th>
                    <th className="r" title="Penalty strokes">PS</th>
                    <th className="r">Goals</th>
                  </tr>
                </thead>
                <tbody>
                  {scorers.map((s) => (
                    <tr key={`${s.playerId}-${s.teamCode}`}>
                      <td>
                        <Link href={`/match-centre/players/${s.playerId}`}>{publicName(s)}</Link>
                      </td>
                      <td>
                        <Link className="team" href={`/match-centre/clubs/${s.clubSlug}`}>
                          <span className="small">{s.teamCode}</span>
                        </Link>
                      </td>
                      <td className="r">{s.pc}</td>
                      <td className="r">{s.ps}</td>
                      <td className="r pts">{s.goals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty">No goals recorded yet.</div>
          )}
          {cards.length > 0 && (
            <>
              <h2>Cards</h2>
              <div className="panel">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Player</th>
                      <th>Club</th>
                      <th className="c">
                        <CardIcon c="green" label="Green cards" />
                      </th>
                      <th className="c">
                        <CardIcon c="yellow" label="Yellow cards" />
                      </th>
                      <th className="c">
                        <CardIcon c="red" label="Red cards" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {cards.map((d) => (
                      <tr key={`${d.playerId}-${d.teamCode}`}>
                        <td>
                          <Link href={`/match-centre/players/${d.playerId}`}>{publicName(d)}</Link>
                        </td>
                        <td className="small">{d.teamCode}</td>
                        <td className="c">{d.green || ''}</td>
                        <td className="c">{d.yellow || ''}</td>
                        <td className="c">{d.red || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {cls.length > 0 && (
        <section>
          <h2>Classification</h2>
          {medal.length > 0 && (
            <div className="bracket">
              {ko.length > 0 && (
                <div className="bcol">
                  <h3>{ko.length > 2 ? 'Quarter and semi-finals' : 'Semi-finals'}</h3>
                  {ko.map((m) => (
                    <Tie key={m.id} m={m} labels={labels} />
                  ))}
                </div>
              )}
              {finals.length > 0 && (
                <div className="bcol">
                  <h3>Medal matches</h3>
                  {finals.map((m) => (
                    <Tie key={m.id} m={m} labels={labels} />
                  ))}
                </div>
              )}
            </div>
          )}
          {placing.length > 0 && (
            <div className="bcol">
              <h3>Placing matches</h3>
              <div className="bracket">
                {placing.map((m) => (
                  <Tie key={m.id} m={m} labels={labels} />
                ))}
              </div>
            </div>
          )}
          <p className="small muted">A classification match level after four quarters goes straight to a shoot-out. Winners and losers move into their next match as soon as a result is final.</p>
        </section>
      )}

      <section>
        <h2>{comp.format === 'league' ? 'Fixtures and results' : 'Group matches'}</h2>
        {[...rounds].map(([k, list]) => (
          <div key={k} className="round">
            <h3>
              {k}
              {comp.format === 'league' && (
                <span className="muted small" style={{ fontFamily: 'var(--body)', fontWeight: 500, textTransform: 'none' }}>
                  {' '}
                  {fmtDate(list[0].scheduledAt)}
                </span>
              )}
            </h3>
            {list.map((m) => (
              <FixtureRow key={m.id} m={m} meta={comp.format === 'league' ? 'date' : 'label'} />
            ))}
          </div>
        ))}
        {cls.length > 0 && (
          <div className="round">
            <h3>Classification matches</h3>
            {cls.map((m) => (
              <FixtureRow key={m.id} m={m} labels={labels} />
            ))}
          </div>
        )}
        {!rounds.size && <div className="empty">No fixtures yet.</div>}
        <UnconfirmedNote matches={matches} />
      </section>
    </div>
  );
}
