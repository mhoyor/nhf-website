import Link from 'next/link';
import type { StandingRow } from '@/lib/queries';
import { Crest } from './Team';

export type FormLetter = 'W' | 'D' | 'L';

/** League or group table. q1 rows go through to the semi-finals or final, q2 rows to placing matches. */
export function StandingsTable({
  rows,
  qualify = {},
  form = {},
  compact,
}: {
  rows: StandingRow[];
  qualify?: Record<number, 'q1' | 'q2'>;
  form?: Record<number, FormLetter[]>;
  compact?: boolean;
}) {
  return (
    <div className="panel">
      <div className="scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>#</th>
              <th>Club</th>
              <th className="r" title="Played">P</th>
              {!compact && (
                <>
                  <th className="r" title="Won">W</th>
                  <th className="r" title="Drawn">D</th>
                  <th className="r" title="Lost">L</th>
                  <th className="r" title="Goals for">GF</th>
                  <th className="r" title="Goals against">GA</th>
                </>
              )}
              <th className="r" title="Goal difference">GD</th>
              <th className="r">Pts</th>
              {!compact && <th>Form</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.teamId} className={qualify[r.pos]}>
                <td>{r.pos}</td>
                <td>
                  <Link className="team" href={`/match-centre/clubs/${r.clubSlug}`}>
                    <Crest code={r.teamCode} colour={r.colour} src={r.crestUrl} size="sm" />
                    {r.teamName}
                  </Link>
                </td>
                <td className="r">{r.played}</td>
                {!compact && (
                  <>
                    <td className="r">{r.won}</td>
                    <td className="r">{r.drawn}</td>
                    <td className="r">{r.lost}</td>
                    <td className="r">{r.goalsFor}</td>
                    <td className="r">{r.goalsAgainst}</td>
                  </>
                )}
                <td className="r">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                <td className="r pts">{r.points}</td>
                {!compact && (
                  <td>
                    <span className="form-w">
                      {(form[r.teamId] ?? []).slice(-5).map((f, i) => (
                        <i key={i} className={f}>
                          {f}
                        </i>
                      ))}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
