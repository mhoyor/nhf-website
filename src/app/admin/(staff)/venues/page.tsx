import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { venuesForAdmin } from '@/lib/admin-queries';
import { ActionForm } from '@/components/ActionForm';
import { param, plural } from '@/lib/format';
import { createVenue, deleteVenue, updateVenue } from './actions';

export const metadata: Metadata = { title: 'Venues' };

const SURFACES = ['Synthetic turf, water-based', 'Synthetic turf, sand-dressed', 'Synthetic turf', 'Grass', 'Indoor'];

function VenueFields({ v }: { v?: { name: string; city: string | null; state: string | null; surface: string | null } }) {
  return (
    <div className="fields">
      <label className="field" style={{ gridColumn: '1 / -1' }}>
        Name
        <input name="name" required defaultValue={v?.name} maxLength={100} />
      </label>
      <label className="field">
        City
        <input name="city" defaultValue={v?.city ?? ''} maxLength={60} />
      </label>
      <label className="field">
        State
        <input name="state" defaultValue={v?.state ?? ''} maxLength={40} placeholder="FCT" />
      </label>
      <label className="field">
        Surface
        <input name="surface" defaultValue={v?.surface ?? ''} list="surfaces" maxLength={60} />
      </label>
    </div>
  );
}

export default async function AdminVenues({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser(['competition_manager', 'registrar'], '/admin/venues');
  const sp = await searchParams;
  const list = await venuesForAdmin();
  return (
    <div className="stack">
      <h1>Venues</h1>
      <p className="muted">Pitches where matches are played. Each fixture can name its venue, and each team can have a home ground.</p>
      {param(sp.deleted) && <div className="note ok">Venue deleted.</div>}
      <datalist id="surfaces">
        {SURFACES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {list.length ? (
        <div className="stack" style={{ gap: 10 }}>
          {list.map((v) => (
            <details key={v.id} className="panel">
              <summary style={{ padding: '6px 0' }}>
                <b>{v.name}</b>{' '}
                <span className="muted small">
                  {[v.city, v.state].filter(Boolean).join(', ') || 'Location not set'} · {plural(v.matches, 'match', 'matches')}
                  {v.homeTeams ? ` · home of ${plural(v.homeTeams, 'team')}` : ''}
                </span>
              </summary>
              <div className="stack" style={{ marginTop: 12 }}>
                <ActionForm action={updateVenue.bind(null, v.id)} submit="Save venue">
                  <VenueFields v={v} />
                </ActionForm>
                {v.matches === 0 && v.homeTeams === 0 && (
                  <ActionForm action={deleteVenue.bind(null, v.id)} submit="Delete venue" danger>
                    <label className="check">
                      <input type="checkbox" name="sure" /> Yes, delete this venue: no matches or teams use it
                    </label>
                  </ActionForm>
                )}
              </div>
            </details>
          ))}
        </div>
      ) : (
        <div className="empty">No venues yet.</div>
      )}

      <section className="panel">
        <h2>Add a venue</h2>
        <ActionForm action={createVenue} submit="Add venue">
          <VenueFields />
        </ActionForm>
      </section>
    </div>
  );
}
