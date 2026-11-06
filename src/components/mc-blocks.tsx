// Match Centre blocks shared by the Match Centre, the home page and the stats page.
import Link from 'next/link';
import type { CompetitionRow, SeasonScorerRow } from '@/lib/queries';
import { CATEGORY_LABELS, publicName } from '@/lib/format';
import { Crest } from './Team';

export function formatLabel(c: Pick<CompetitionRow, 'format' | 'legs'>): string {
  return c.format === 'groups' ? 'Groups and classification' : c.legs === 2 ? 'League · home and away' : 'League · single round robin';
}

export function CompetitionCards({ list, empty }: { list: CompetitionRow[]; empty: string }) {
  if (!list.length) return <div className="empty">{empty}</div>;
  return (
    <div className="club-grid">
      {list.map((c) => (
        <Link key={c.id} className="club-card" href={`/match-centre/competitions/${c.slug}`}>
          <div className="stack" style={{ gap: 6 }}>
            <span className="eyebrow">
              {CATEGORY_LABELS[c.category]} · {c.seasonName}
            </span>
            <b>{c.name}</b>
            <span className="small muted">{formatLabel(c)}</span>
            <span className="small muted">
              {c.played} of {c.matches} matches played
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Top scorers. `compact` (for narrow columns) keeps player, club and goals only. */
export function ScorersTable({ rows, empty, showCategory, compact }: { rows: SeasonScorerRow[]; empty: string; showCategory?: boolean; compact?: boolean }) {
  if (!rows.length) return <div className="empty">{empty}</div>;
  return (
    <div className="panel">
      <div className="scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Player</th>
              <th>Club</th>
              {!compact && <th className="r">Matches</th>}
              {!compact && (
                <th className="r" title="Penalty-corner goals">
                  PC
                </th>
              )}
              <th className="r">Goals</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.playerId}>
                <td>
                  <Link href={`/match-centre/players/${s.playerId}`}>{publicName(s)}</Link>
                  {showCategory && (compact ? <span className="small muted" style={{ display: 'block' }}>{CATEGORY_LABELS[s.category]}</span> : <span className="small muted"> · {CATEGORY_LABELS[s.category]}</span>)}
                </td>
                <td>
                  <Link className="team" href={`/match-centre/clubs/${s.clubSlug}`}>
                    <Crest code={s.teamCode} colour={s.colour} size="sm" />
                    <span className="small">{s.teamCode}</span>
                  </Link>
                </td>
                {!compact && <td className="r">{s.apps}</td>}
                {!compact && <td className="r">{s.pc}</td>}
                <td className="r pts">{s.goals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
