import Link from 'next/link';
import type { Metadata } from 'next';
import { clubOptions, searchPlayers, seasonByName, seasons } from '@/lib/queries';
import { McHead } from '@/components/McHead';
import { CATEGORIES, CATEGORY_LABELS, intParam, param, publicName } from '@/lib/format';

export const metadata: Metadata = { title: 'Players' };

const PAGE = 50;

export default async function PlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const q = param(sp.q).trim().slice(0, 80);
  const seasonName = param(sp.season);
  const club = intParam(sp.club);
  const category = CATEGORIES.includes(param(sp.category)) ? param(sp.category) : '';
  const page = intParam(sp.page) ?? 1;
  const [allSeasons, allClubs, season] = await Promise.all([seasons(), clubOptions(), seasonName ? seasonByName(seasonName) : Promise.resolve(null)]);
  const filtered = !!(q || season || club || category);
  const rows = filtered
    ? await searchPlayers({ q, seasonId: season?.id ?? null, clubId: club, category: category || null, limit: PAGE + 1, offset: (page - 1) * PAGE })
    : [];
  const more = rows.length > PAGE;
  const shown = rows.slice(0, PAGE);
  const link = (p: number) => {
    const u = new URLSearchParams();
    if (q) u.set('q', q);
    if (seasonName) u.set('season', seasonName);
    if (club) u.set('club', String(club));
    if (category) u.set('category', category);
    if (p > 1) u.set('page', String(p));
    return `/match-centre/players?${u}`;
  };

  return (
    <div className="wrap page">
      <McHead active="players" title="Players">
        <p className="lede">Search by name or NHF number, or pick a season and a club to see who was registered there. A player who moves keeps one record, with every club they have played for.</p>
      </McHead>
      <form className="panel pad filterbar" action="/match-centre/players" role="search">
        <label className="field w">
          Name or NHF number
          <input name="q" defaultValue={q} placeholder="For example Okafor or NHF-24010" />
        </label>
        <label className="field">
          Season
          <select name="season" defaultValue={seasonName}>
            <option value="">All seasons</option>
            {allSeasons.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Club
          <select name="club" defaultValue={club ? String(club) : ''}>
            <option value="">All clubs</option>
            {allClubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Category
          <select name="category" defaultValue={category}>
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <button className="btn primary" type="submit">
          Search
        </button>
      </form>

      {!filtered ? (
        <div className="empty">Search by name, or pick a season and club to see who was registered there.</div>
      ) : shown.length ? (
        <div className="panel pad">
          <p className="small muted" style={{ marginBottom: 8 }}>
            One row per club and season a player was registered for. Appearances and goals are for that club in that season.
          </p>
          <div className="scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Season</th>
                  <th>Team</th>
                  <th className="r">#</th>
                  <th className="r">Apps</th>
                  <th className="r">Goals</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((r) => (
                  <tr key={`${r.playerId}-${r.seasonId}-${r.teamId}`}>
                    <td>
                      <Link href={`/match-centre/players/${r.playerId}`}>{publicName(r)}</Link>
                      <div className="small muted">
                        {r.nhfNumber}
                        {r.playerPosition ? ` · ${r.playerPosition}` : ''}
                      </div>
                    </td>
                    <td>{r.seasonName}</td>
                    <td>
                      {r.teamName}
                      <div className="small muted">{r.clubName}</div>
                    </td>
                    <td className="r">{r.shirtNumber ?? ''}</td>
                    <td className="r">{r.apps}</td>
                    <td className="r pts">{r.goals}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            {page > 1 ? <Link href={link(page - 1)}>Previous</Link> : <span />}
            <span className="small muted">Page {page}</span>
            {more ? <Link href={link(page + 1)}>Next</Link> : <span />}
          </div>
        </div>
      ) : (
        <div className="empty">No players match. Try fewer words or another season.</div>
      )}
    </div>
  );
}
