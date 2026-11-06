import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { clubById, venueOptions } from '@/lib/queries';
import { ActionForm } from '@/components/ActionForm';
import { CATEGORY_LABELS } from '@/lib/format';
import { saveClubCrest, saveTeam, updateClub } from '../actions';
import { ClubFields, TeamFields } from '../ClubFields';
import { Crest } from '@/components/Team';

export const metadata: Metadata = { title: 'Club' };

export default async function AdminClub({ params }: { params: Promise<{ id: string }> }) {
  const clubId = Number((await params).id);
  await requireUser(['registrar', 'competition_manager'], `/admin/clubs/${clubId}`);
  if (!Number.isInteger(clubId) || clubId <= 0) notFound();
  const [club, venues] = await Promise.all([clubById(clubId), venueOptions()]);
  if (!club) notFound();
  return (
    <div className="stack">
      <div className="row between">
        <h1>{club.name}</h1>
        <div className="row">
          <Link href={`/match-centre/clubs/${club.slug}`}>Public page</Link>
          <Link href={`/admin/players?club=${club.id}`}>Players</Link>
        </div>
      </div>
      <div className="grid2">
        <section className="panel">
          <h2>Club details</h2>
          <ActionForm action={updateClub.bind(null, club.id)} submit="Save club">
            <ClubFields club={club} />
          </ActionForm>
        </section>
        <section className="panel">
          <h2>Crest</h2>
          <div className="row" style={{ alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            <Crest code={club.teams[0]?.code ?? club.name} colour={club.teams[0]?.colour ?? null} src={club.crestUrl} size="xl" />
            <p className="small muted grow" style={{ flexBasis: 220 }}>
              The club’s badge, square, on a white or transparent background (PNG works best), up to 2 MB. It replaces the coloured circle with the team code on the club’s
              page, in tables and on match cards.
            </p>
          </div>
          <ActionForm action={saveClubCrest.bind(null, club.id)} submit="Save crest">
            <label className="field">
              Image
              <input name="crest" type="file" accept="image/png,image/jpeg,image/webp" />
            </label>
            {club.crestUrl && (
              <label className="check">
                <input type="checkbox" name="removeCrest" /> Remove the current crest
              </label>
            )}
          </ActionForm>
        </section>
      </div>
      <section className="stack">
        <h2>Teams</h2>
        {club.teams.map((t) => (
          <details key={t.id} className="panel">
            <summary>
              <b>{t.name}</b> <span className="code">{t.code}</span> <span className="muted">{CATEGORY_LABELS[t.category]}</span>
            </summary>
            <div style={{ marginTop: 12 }}>
              <ActionForm action={saveTeam.bind(null, club.id, t.id)} submit="Save team">
                <TeamFields team={t} venues={venues} />
              </ActionForm>
            </div>
          </details>
        ))}
        <div className="panel">
          <h3>Add a team</h3>
          <ActionForm action={saveTeam.bind(null, club.id, null)} submit="Add team">
            <TeamFields venues={venues} />
          </ActionForm>
        </div>
      </section>
    </div>
  );
}
