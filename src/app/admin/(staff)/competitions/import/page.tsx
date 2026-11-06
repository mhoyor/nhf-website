import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { seasons, teamOptions } from '@/lib/queries';
import { CATEGORIES } from '@/lib/format';
import { FIXTURE_TEMPLATE } from '@/lib/csv';
import { importCompetition } from '../actions';
import { ImportForm } from '../FixtureForms';

export const metadata: Metadata = { title: 'Upload fixtures' };

export default async function ImportFixtures() {
  await requireUser(['competition_manager'], '/admin/competitions/import');
  const [all, teams] = await Promise.all([seasons(), teamOptions()]);
  return (
    <div className="stack">
      <h1>Upload fixtures</h1>
      <p className="muted">
        For tournaments the builder does not cover, such as a qualifier with quarter-finals or a festival with cross-over matches. Start from the example below or from a
        spreadsheet saved as CSV. Every row is checked before anything is created, and problems are listed by row number.
      </p>
      <ImportForm
        action={importCompetition}
        template={FIXTURE_TEMPLATE}
        seasons={all.map((s) => ({ id: s.id, name: s.name, isCurrent: s.isCurrent }))}
        categories={CATEGORIES}
        teams={teams.map((t) => ({ code: t.code, name: t.name, category: t.category }))}
      />
    </div>
  );
}
