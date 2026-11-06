import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { clubBySlug, clubPlayersOverTheYears, clubResults, clubSquad, currentSeason, seasonByName, seasons, type SquadRow } from '@/lib/queries';
import { FixtureList } from '@/components/MatchCard';
import { Crest } from '@/components/Team';
import { CATEGORY_LABELS, fmtDate, param, POSITION_LABELS, publicName } from '@/lib/format';

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = await clubBySlug((await params).slug);
  return { title: c?.name ?? 'Club' };
}

export default async function ClubPage({ params, searchParams }: Props) {
  const [{ slug }, sp] = await Promise.all([params, searchParams]);
  const club = await clubBySlug(slug);
  if (!club) notFound();
  const [all, current] = await Promise.all([seasons(), currentSeason()]);
  const season = (param(sp.season) && (await seasonByName(param(sp.season)))) || current;
  const [squad, results, alumni] = await Promise.all([
    season ? clubSquad(club.id, season.id) : Promise.resolve([] as SquadRow[]),
    season ? clubResults(club.id, season.id) : Promise.resolve([]),
    clubPlayersOverTheYears(club.id, current?.id ?? null),
  ]);
  const byTeam = new Map<number, SquadRow[]>();
  for (const r of squad) byTeam.set(r.teamId, [...(byTeam.get(r.teamId) ?? []), r]);
  const played = results.filter((m) => m.status === 'final').reverse();
  const next = results.filter((m) => m.status !== 'final');
  const lead = club.teams[0];

  return (
    <div className="wrap page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/match-centre">Match Centre</Link>
        <span>/</span>
        <Link href="/match-centre/clubs">Clubs</Link>
        <span>/</span>
        <span>{club.name}</span>
      </nav>
      <section className="phead">
        <div className="hero-id">
          <Crest code={lead?.code ?? club.name} colour={lead?.colour ?? null} src={club.crestUrl} size="xl" />
          <div className="stack" style={{ gap: 8 }}>
            <p className="eyebrow">{[club.city, club.state].filter(Boolean).join(', ') || 'Club'}</p>
            <h1>{club.name}</h1>
            <div className="tags">
              {club.teams.map((t) => (
                <span key={t.id} className="tagp">
                  {t.name} · {CATEGORY_LABELS[t.category]}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="facts" style={{ color: 'var(--on-dark-muted)' }}>
          {club.foundedYear && (
            <div>
              <span>Founded</span>
              <b style={{ color: 'var(--on-dark)' }}>{club.foundedYear}</b>
            </div>
          )}
          <div>
            <span>Players over the years</span>
            <b style={{ color: 'var(--on-dark)' }}>{alumni.length}</b>
          </div>
          {club.website && (
            <div>
              <span>Website</span>
              <b>
                <a href={club.website} rel="noopener noreferrer" target="_blank" style={{ color: 'var(--on-dark)' }}>
                  {club.website.replace(/^https?:\/\//, '')}
                </a>
              </b>
            </div>
          )}
        </div>
      </section>

      <section>
        <div className="sec-head">
          <h2>Squads {season?.name}</h2>
          <div className="seg" role="group" aria-label="Season">
            {all.map((s) => (
              <Link key={s.id} href={`/match-centre/clubs/${club.slug}?season=${s.name}`} aria-current={s.id === season?.id ? 'true' : undefined}>
                {s.name}
              </Link>
            ))}
          </div>
        </div>
        {club.teams.length === 0 && <div className="empty">This club has no teams yet.</div>}
        <div className="cols even">
          {club.teams.map((t) => {
            const rows = byTeam.get(t.id) ?? [];
            return (
              <div key={t.id} className="stack" style={{ gap: 6 }}>
                <div className="lu-head">
                  <Crest code={t.code} colour={t.colour} src={club.crestUrl} />
                  <div>
                    <b>{t.name}</b>
                    <div className="small muted">
                      {CATEGORY_LABELS[t.category]} · {rows.filter((r) => !r.leftOn).length} players
                    </div>
                  </div>
                </div>
                {rows.length ? (
                  <div className="panel">
                    <div className="scroll">
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Player</th>
                            <th>Pos</th>
                            <th className="r">Apps</th>
                            <th className="r">Goals</th>
                            <th className="r">Cards</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr key={`${r.playerId}-${r.joinedOn}`} className={r.leftOn ? 'dim' : undefined}>
                              <td className="num">{r.shirtNumber ?? ''}</td>
                              <td>
                                <Link className="who" href={`/match-centre/players/${r.playerId}`}>
                                  {rows.some((x) => x.photoUrl) && (r.photoUrl ? <img className="avatar" src={r.photoUrl} alt="" loading="lazy" /> : <span className="avatar" aria-hidden="true" />)}
                                  {publicName(r)}
                                </Link>
                                {r.leftOn && <span className="small muted"> · left {fmtDate(r.leftOn)}</span>}
                                {r.movedIn && <span className="small muted"> · joined {fmtDate(r.joinedOn)}</span>}
                                {r.status === 'pending' && (
                                  <span className="chip pend" style={{ marginLeft: 6 }}>
                                    Pending
                                  </span>
                                )}
                              </td>
                              <td title={r.playerPosition ? POSITION_LABELS[r.playerPosition] : undefined}>{r.playerPosition ?? ''}</td>
                              <td className="r">{r.apps}</td>
                              <td className="r pts">{r.goals}</td>
                              <td className="r">{r.cards}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="empty">No players registered for {season?.name}.</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="cols even">
        <div className="stack">
          <h2>Results {season?.name}</h2>
          <FixtureList matches={played} empty="No results this season." grouped />
        </div>
        <div className="stack">
          <h2>Fixtures</h2>
          <FixtureList matches={next} empty="No upcoming fixtures." grouped />
        </div>
      </section>

      <section>
        <div className="sec-head">
          <h2>Players over the years</h2>
          <span className="small muted">Appearances and goals for {club.name} only</span>
        </div>
        {alumni.length ? (
          <div className="panel">
            <div className="scroll">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Player</th>
                    <th>Seasons</th>
                    <th className="r">Apps</th>
                    <th className="r">Goals</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {alumni.map((a) => (
                    <tr key={a.playerId}>
                      <td>
                        <Link href={`/match-centre/players/${a.playerId}`}>{publicName(a)}</Link>
                      </td>
                      <td>{a.firstSeason === a.lastSeason ? a.firstSeason : `${a.firstSeason}–${a.lastSeason}`}</td>
                      <td className="r">{a.apps}</td>
                      <td className="r pts">{a.goals}</td>
                      <td>{a.stillHere ? <span className="chip ok">Current</span> : <span className="chip ft">Former</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="empty">No registrations yet.</div>
        )}
      </section>
    </div>
  );
}
