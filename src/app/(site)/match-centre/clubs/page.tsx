import Link from 'next/link';
import type { Metadata } from 'next';
import { clubs } from '@/lib/queries';
import { Crest } from '@/components/Team';
import { McHead } from '@/components/McHead';
import { CATEGORY_LABELS } from '@/lib/format';

export const metadata: Metadata = { title: 'Clubs' };

export default async function ClubsPage() {
  const list = await clubs();
  const states = [...new Set(list.map((c) => c.state).filter(Boolean))].sort() as string[];
  return (
    <div className="wrap page">
      <McHead active="clubs" title="Clubs">
        <p className="lede">
          Each club can enter teams in several categories. Open a club for its squads by season, its results, and everyone who has played for it.
        </p>
      </McHead>
      {states.map((st) => (
        <section key={st}>
          <h2>{st}</h2>
          <div className="club-grid">
            {list
              .filter((c) => c.state === st)
              .map((c) => (
                <Link key={c.id} className="club-card" href={`/match-centre/clubs/${c.slug}`}>
                  <Crest code={c.teams[0]?.code ?? c.shortName ?? c.name} colour={c.teams[0]?.colour ?? null} src={c.crestUrl} size="lg" />
                  <div className="stack" style={{ gap: 4, minWidth: 0 }}>
                    <b>{c.name}</b>
                    <span className="small muted">{c.city}</span>
                    <span className="small">{c.teams.map((t) => CATEGORY_LABELS[t.category] ?? t.category).join(' · ') || 'No teams yet'}</span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      ))}
      {list.some((c) => !c.state) && (
        <section>
          <h2>Other clubs</h2>
          <div className="club-grid">
            {list
              .filter((c) => !c.state)
              .map((c) => (
                <Link key={c.id} className="club-card" href={`/match-centre/clubs/${c.slug}`}>
                  <Crest code={c.teams[0]?.code ?? c.name} colour={c.teams[0]?.colour ?? null} src={c.crestUrl} size="lg" />
                  <b>{c.name}</b>
                </Link>
              ))}
          </div>
        </section>
      )}
      {!list.length && <div className="empty">No clubs added yet.</div>}
    </div>
  );
}
