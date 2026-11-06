import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { lineups, liveSnapshot, matchById, type EventView, type LineupRow, type LiveSnapshot, type MatchRow } from '@/lib/queries';
import { can, currentUser } from '@/lib/auth';
import { describeSlot } from '@/lib/competition';
import { CATEGORY_LABELS, fmtDate, fmtTime, publicName } from '@/lib/format';
import { Crest } from '@/components/Team';
import { CardIcon } from '@/components/CardIcon';
import { LiveScore } from './LiveScore';

type Props = { params: Promise<{ id: string }> };

async function load(idRaw: string) {
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) return null;
  return matchById(id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = await load((await params).id);
  if (!m) return { title: 'Match' };
  const score = m.status === 'final' ? ` ${m.homeScore}–${m.awayScore} ` : ' v ';
  return { title: `${m.homeName ?? describeSlot(m.homeSlot)}${score}${m.awayName ?? describeSlot(m.awaySlot)}` };
}

const nameOf = (e: EventView) => (e.firstName && e.lastName ? publicName({ firstName: e.firstName, lastName: e.lastName, isMinor: e.isMinor }) : null);

export default async function MatchPage({ params }: Props) {
  const m = await load((await params).id);
  if (!m) notFound();
  const user = await currentUser();
  const staff = can(user, 'competition_manager', 'scorer', 'media');
  if (!m.published && !staff) notFound();

  const snap: LiveSnapshot = (await liveSnapshot(m.id, nameOf)) ?? {
    id: m.id, status: m.status, period: m.period, periodStartedAt: null, homeScore: m.homeScore, awayScore: m.awayScore,
    homeShootout: m.homeShootout, awayShootout: m.awayShootout, confirmed: !!m.confirmedAt, events: [],
  };
  const squads = await lineups(m.id);
  const meta = [m.competitionName, m.label + (m.groupCode && m.groupCode !== 'L' ? ` · Group ${m.groupCode}` : ''), `${fmtDate(m.scheduledAt)}, ${fmtTime(m.scheduledAt)} WAT`, m.venueName]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="wrap page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/match-centre">Match Centre</Link>
        <span>/</span>
        <Link href={`/match-centre/competitions/${m.competitionSlug}`}>{m.competitionName}</Link>
        <span>/</span>
        <span>{m.label}</span>
      </nav>
      <LiveScore
        initial={snap}
        meta={meta}
        home={{ teamId: m.homeTeamId, name: m.homeName ?? describeSlot(m.homeSlot), code: m.homeCode, colour: m.homeColour, href: m.homeClubSlug ? `/match-centre/clubs/${m.homeClubSlug}` : null, crest: m.homeCrest }}
        away={{ teamId: m.awayTeamId, name: m.awayName ?? describeSlot(m.awaySlot), code: m.awayCode, colour: m.awayColour, href: m.awayClubSlug ? `/match-centre/clubs/${m.awayClubSlug}` : null, crest: m.awayCrest }}
      />
      <section>
        <h2>Line-ups</h2>
        <div className="lineups">
          <Roster m={m} side="home" rows={squads.filter((s) => s.teamId === m.homeTeamId)} />
          <Roster m={m} side="away" rows={squads.filter((s) => s.teamId === m.awayTeamId)} />
        </div>
      </section>
      <section className="panel pad">
        <div className="facts">
          <div>
            <span>Competition</span>
            <b>
              <Link href={`/match-centre/competitions/${m.competitionSlug}`}>{m.competitionName}</Link>
            </b>
          </div>
          <div>
            <span>Category</span>
            <b>{CATEGORY_LABELS[m.category]}</b>
          </div>
          <div>
            <span>Date</span>
            <b>
              {fmtDate(m.scheduledAt)}, {fmtTime(m.scheduledAt)} WAT
            </b>
          </div>
          {m.venueName && (
            <div>
              <span>Venue</span>
              <b>{m.venueName}</b>
            </div>
          )}
          {m.placeWinner && (
            <div>
              <span>Decides</span>
              <b>
                Places {m.placeWinner} and {m.placeLoser}
              </b>
            </div>
          )}
        </div>
        {staff && (
          <div className="btnrow" style={{ marginTop: 14 }}>
            {can(user, 'scorer') && (
              <Link className="btn sm" href={`/score/${m.id}`}>
                Open live scorer
              </Link>
            )}
            {can(user, 'competition_manager') && (
              <Link className="btn sm" href={`/admin/matches/${m.id}`}>
                Enter or correct result
              </Link>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function Roster({ m, side, rows }: { m: MatchRow; side: 'home' | 'away'; rows: LineupRow[] }) {
  const name = side === 'home' ? m.homeName : m.awayName;
  const slug = side === 'home' ? m.homeClubSlug : m.awayClubSlug;
  return (
    <div className="stack" style={{ gap: 6 }}>
      <div className="lu-head">
        <Crest code={side === 'home' ? m.homeCode : m.awayCode} colour={side === 'home' ? m.homeColour : m.awayColour} src={side === 'home' ? m.homeCrest : m.awayCrest} />
        <div>
          <b>{name ? slug ? <Link href={`/match-centre/clubs/${slug}`}>{name}</Link> : name : describeSlot(side === 'home' ? m.homeSlot : m.awaySlot)}</b>
          <div className="small muted">{rows.length ? `Match squad · ${rows.length} players` : 'Team sheet not entered yet'}</div>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="panel">
          <div className="scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Player</th>
                  <th className="c">Goals</th>
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
                {rows.map((r) => {
                  const roles = [r.isCaptain ? 'C' : '', r.isGoalkeeper ? 'GK' : ''].filter(Boolean);
                  return (
                    <tr key={r.playerId}>
                      <td className="num">{r.shirtNumber ?? ''}</td>
                      <td>
                        <Link href={`/match-centre/players/${r.playerId}`}>{publicName(r)}</Link>
                        {roles.length > 0 && <span className="role">({roles.join(', ')})</span>}
                      </td>
                      <td className="c">{r.goals || ''}</td>
                      <td className="c">{r.green || ''}</td>
                      <td className="c">{r.yellow || ''}</td>
                      <td className="c">{r.red || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
