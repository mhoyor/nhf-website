import type { NationalTeam } from '@/content/national';

const fmtIso = (s: string) =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : /^\d{4}-\d{2}$/.test(s) ? new Date(`${s}-15T12:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : s;

export function ResultsTable({ team }: { team: NationalTeam }) {
  return (
    <div className="panel">
      <div className="scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Competition</th>
              <th>Opponent</th>
              <th className="r">Score</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            {team.results.map((x, i) => {
              const res = x.for > x.against ? 'W' : x.for < x.against ? 'L' : 'D';
              return (
                <tr key={i}>
                  <td className="muted" style={{ whiteSpace: 'nowrap' }}>
                    {fmtIso(x.date)}
                  </td>
                  <td>
                    <a href={x.source} target="_blank" rel="noopener noreferrer">
                      {x.competition}
                    </a>
                  </td>
                  <td>{x.opponent}</td>
                  <td className="r">
                    <b>
                      {x.for}–{x.against}
                    </b>
                  </td>
                  <td>
                    <span className="form-w">
                      <i className={res}>{res}</i>
                    </span>
                    {x.note ? <span className="small muted"> {x.note}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Honours({ items }: { items: string[] }) {
  return (
    <div className="panel pad">
      <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((h) => (
          <li key={h}>{h}</li>
        ))}
      </ul>
    </div>
  );
}
