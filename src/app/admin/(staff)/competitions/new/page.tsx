import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { seasons, teamOptions, venueOptions } from '@/lib/queries';
import { CATEGORIES } from '@/lib/format';
import { buildCompetition } from '../actions';
import { BuilderForm } from '../FixtureForms';

export const metadata: Metadata = { title: 'New competition' };

export default async function NewCompetition() {
  await requireUser(['competition_manager'], '/admin/competitions/new');
  const [all, teams, venues] = await Promise.all([seasons(), teamOptions(), venueOptions()]);
  return (
    <div className="stack">
      <h1>New competition</h1>
      <p className="muted">
        Pick the teams and the format, and the fixtures are drawn up for you: a round robin for the league or each group, then semi-finals or place matches whose
        teams are filled in automatically from the tables and results. For any other format, upload the fixtures as a CSV file instead.
      </p>
      <BuilderForm
        action={buildCompetition}
        seasons={all.map((s) => ({ id: s.id, name: s.name, isCurrent: s.isCurrent }))}
        categories={CATEGORIES}
        teams={teams.map((t) => ({ id: t.id, name: t.name, category: t.category, clubName: t.clubName }))}
        venues={venues}
      />
    </div>
  );
}
