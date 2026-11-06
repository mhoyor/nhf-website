import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { playerById, playerCareer, playerHistory, playerMatchLog } from '@/lib/queries';
import { can, currentUser } from '@/lib/auth';
import { CATEGORY_LABELS, fmtDate, POSITION_LABELS, publicName } from '@/lib/format';
import { CardIcon } from '@/components/CardIcon';

type Props = { params: Promise<{ id: string }> };

async function load(raw: string) {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? playerById(id) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await load((await params).id);
  return { title: p ? publicName(p) : 'Player' };
}

export default async function PlayerPage({ params }: Props) {
  const p = await load((await params).id);
  if (!p) notFound();
  const [history, career, log, user] = await Promise.all([playerHistory(p.id), playerCareer(p.id), playerMatchLog(p.id), currentUser()]);
  const now = history.find((h) => !h.leftOn) ?? history[0];

  // Totals per club across every season, in the order the player joined them.
  const clubs = new Map<number, { name: string; slug: string; seasons: string[]; apps: number; goals: number }>();
  for (const h of [...history].reverse()) {
    const c = clubs.get(h.clubId) ?? { name: h.clubName, slug: h.clubSlug, seasons: [], apps: 0, goals: 0 };
    if (!c.seasons.includes(h.seasonName)) c.seasons.push(h.seasonName);
    c.apps += h.apps;
    c.goals += h.goals;
    clubs.set(h.clubId, c);
  }
  const fg = history.reduce((s, h) => s + h.fg, 0);
  const ps = history.reduce((s, h) => s + h.ps, 0);

  return (
    <div className="wrap page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/match-centre">Match Centre</Link>
        <span>/</span>
        <Link href="/match-centre/players">Players</Link>
        <span>/</span>
        <span>{publicName(p)}</span>
      </nav>
      <section className="phead">
        <div className="hero-id">
          {p.publicPhotoUrl ? (
            <span className="headshot">
              <img src={p.publicPhotoUrl} alt={`${publicName(p)}`} width={128} height={160} />
              {now?.shirtNumber != null && <b aria-label="Shirt number">{now.shirtNumber}</b>}
            </span>
          ) : (
            <span className="shirt" aria-label="Shirt number">
              {now?.shirtNumber ?? '–'}
            </span>
          )}
          <div className="stack" style={{ gap: 8 }}>
            <p className="eyebrow">
              {p.position ? POSITION_LABELS[p.position] : 'Player'} · {p.nhfNumber}
            </p>
            <h1>{publicName(p)}</h1>
            {now && (
              <p className="lede">
                {now.leftOn ? 'Last registered with ' : 'Plays for '}
                <Link href={`/match-centre/clubs/${now.clubSlug}`} style={{ color: 'var(--on-dark)' }}>
                  {now.clubName}
                </Link>{' '}
                ({now.teamName}, {now.seasonName})
              </p>
            )}
            {can(user, 'registrar') && (
              <p className="small">
                <Link href={`/admin/players/${p.id}`} style={{ color: 'var(--on-dark)' }}>
                  Edit in admin
                </Link>
              </p>
            )}
          </div>
        </div>
      </section>

      <div className="tiles">
        {(
          [
            [career.apps, 'Appearances'],
            [career.goals, 'Goals'],
            [fg, 'Field goals'],
            [career.pcGoals, 'Penalty corners'],
            [ps, 'Penalty strokes'],
            [career.clubs, career.clubs === 1 ? 'Club' : 'Clubs'],
            [career.seasons, career.seasons === 1 ? 'Season' : 'Seasons'],
          ] as [number, string][]
        ).map(([n, l]) => (
          <div key={l} className="tile">
            <b>{n}</b>
            <span>{l}</span>
          </div>
        ))}
      </div>

      <section className="cols">
        <div className="stack">
          <h2>Season by season</h2>
          {history.length ? (
            <div className="panel">
              <div className="scroll">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Season</th>
                      <th>Team</th>
                      <th className="r">#</th>
                      <th>Dates</th>
                      <th className="r">Apps</th>
                      <th className="r" title="Field goals / penalty corners / penalty strokes">FG/PC/PS</th>
                      <th className="r">Goals</th>
                      <th className="r">Cards</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.registrationId}>
                        <td>{h.seasonName}</td>
                        <td>
                          <Link href={`/match-centre/clubs/${h.clubSlug}?season=${h.seasonName}`}>{h.teamName}</Link>
                          <div className="small muted">{CATEGORY_LABELS[h.category]}</div>
                        </td>
                        <td className="r">{h.shirtNumber ?? ''}</td>
                        <td className="small">{h.leftOn ? `${fmtDate(h.joinedOn)} – ${fmtDate(h.leftOn)}` : `from ${fmtDate(h.joinedOn)}`}</td>
                        <td className="r">{h.apps}</td>
                        <td className="r small">
                          {h.fg}/{h.pc}/{h.ps}
                        </td>
                        <td className="r pts">{h.goals}</td>
                        <td className="r">{h.green + h.yellow + h.red}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="empty">Not registered with a club yet.</div>
          )}
        </div>
        <div className="stack">
          <h2>Clubs</h2>
          <div className="panel">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Club</th>
                  <th>Seasons</th>
                  <th className="r">Apps</th>
                  <th className="r">Goals</th>
                </tr>
              </thead>
              <tbody>
                {[...clubs].map(([cid, c]) => (
                  <tr key={cid}>
                    <td>
                      <Link href={`/match-centre/clubs/${c.slug}`}>{c.name}</Link>
                    </td>
                    <td className="small">{c.seasons.join(', ')}</td>
                    <td className="r">{c.apps}</td>
                    <td className="r pts">{c.goals}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th>Career</th>
                  <th></th>
                  <th className="r">{career.apps}</th>
                  <th className="r">{career.goals}</th>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </section>

      <section>
        <h2>Matches</h2>
        {log.length ? (
          <div className="panel">
            <div className="scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Competition</th>
                    <th>For</th>
                    <th>Opponent</th>
                    <th className="r">Result</th>
                    <th className="r">Goals</th>
                    <th className="c">Cards</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((l) => {
                    const so = l.shootoutFor !== null;
                    const res = l.forScore > l.againstScore || (so && (l.shootoutFor ?? 0) > (l.shootoutAgainst ?? 0)) ? 'W' : l.forScore === l.againstScore && !so ? 'D' : 'L';
                    return (
                      <tr key={l.matchId}>
                        <td className="small" style={{ whiteSpace: 'nowrap' }}>
                          {fmtDate(l.scheduledAt)}
                        </td>
                        <td className="small">
                          <Link href={`/match-centre/competitions/${l.competitionSlug}`}>{l.competitionName.replace(/ 20\d\d$/, '')}</Link>
                          <div className="muted">{l.label}</div>
                        </td>
                        <td className="small">{l.teamCode}</td>
                        <td>
                          {l.home ? '' : '@ '}
                          {l.opponentName}
                        </td>
                        <td className="r" style={{ whiteSpace: 'nowrap' }}>
                          <span className="form-w">
                            <i className={res}>{res}</i>
                          </span>{' '}
                          <Link href={`/match-centre/matches/${l.matchId}`}>
                            {l.forScore}–{l.againstScore}
                            {so ? ` (${l.shootoutFor}–${l.shootoutAgainst} SO)` : ''}
                          </Link>
                        </td>
                        <td className="r pts">{l.goals || ''}</td>
                        <td className="c">
                          <span className="ico-row">
                            {Array.from({ length: l.green }, (_, i) => (
                              <CardIcon key={`g${i}`} c="green" />
                            ))}
                            {Array.from({ length: l.yellow }, (_, i) => (
                              <CardIcon key={`y${i}`} c="yellow" />
                            ))}
                            {Array.from({ length: l.red }, (_, i) => (
                              <CardIcon key={`r${i}`} c="red" />
                            ))}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty">No matches recorded yet.</div>
        )}
      </section>
    </div>
  );
}
