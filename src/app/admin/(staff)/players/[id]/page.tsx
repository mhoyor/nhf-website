import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { playerById, playerCareer, seasons, teamOptions } from '@/lib/queries';
import { playerRegistrations } from '@/lib/admin-queries';
import { ActionForm } from '@/components/ActionForm';
import { CATEGORY_LABELS, lagosDay } from '@/lib/format';
import { recordLeaving, registerPlayer, savePlayerPhoto, setRegistrationStatus, transferPlayer, updatePlayer } from '../actions';
import { PlayerFields } from '../PlayerFields';

export const metadata: Metadata = { title: 'Player' };

export default async function AdminPlayer({ params }: { params: Promise<{ id: string }> }) {
  const playerId = Number((await params).id);
  await requireUser(['registrar'], `/admin/players/${playerId}`);
  if (!Number.isInteger(playerId) || playerId <= 0) notFound();
  const p = await playerById(playerId);
  if (!p) notFound();
  const [regs, career, allSeasons, teams] = await Promise.all([playerRegistrations(p.id), playerCareer(p.id), seasons(), teamOptions()]);
  const eligibleTeams = teams.filter((t) => (p.gender === 'female' ? /^(women|girls)/.test(t.category) : /^(men|boys)/.test(t.category)));
  const active = regs.filter((r) => !r.leftOn && (r.status === 'approved' || r.status === 'pending'));
  const back = `/admin/players/${p.id}`;

  return (
    <div className="stack">
      <div className="row between">
        <div>
          <p className="eyebrow">{p.nhfNumber}</p>
          <h1>
            {p.firstName} {p.lastName}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {career.apps} appearances · {career.goals} goals · {career.clubs} clubs · {career.seasons} seasons
          </p>
        </div>
        <Link href={`/match-centre/players/${p.id}`}>Public page</Link>
      </div>

      <section className="panel">
        <h2>Registrations</h2>
        {regs.length ? (
          <div className="scroll">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Season</th>
                  <th>Team</th>
                  <th className="n">#</th>
                  <th>Dates</th>
                  <th className="n">Apps</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {regs.map((r) => (
                  <tr key={r.id} className={r.status === 'rejected' || r.status === 'withdrawn' ? 'dim' : undefined}>
                    <td>{r.seasonName}</td>
                    <td>
                      {r.teamName}
                      <div className="small muted">
                        {r.clubName} · {CATEGORY_LABELS[r.category]}
                      </div>
                    </td>
                    <td className="n">{r.shirtNumber ?? ''}</td>
                    <td className="small">
                      {r.joinedOn}
                      {r.leftOn ? ` to ${r.leftOn}` : ' onwards'}
                    </td>
                    <td className="n">{r.apps}</td>
                    <td>{r.status === 'approved' ? <span className="badge">Approved</span> : r.status === 'pending' ? <span className="badge warn">Pending</span> : <span className="badge off">{r.status}</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      {r.status === 'pending' && (
                        <form action={setRegistrationStatus} style={{ display: 'inline' }}>
                          <input type="hidden" name="registration" value={r.id} />
                          <input type="hidden" name="back" value={back} />
                          <button className="btn sm" name="status" value="approved">
                            Approve
                          </button>{' '}
                          <button className="btn sm danger" name="status" value="rejected">
                            Reject
                          </button>
                        </form>
                      )}
                      {r.status === 'approved' && r.apps === 0 && (
                        <form action={setRegistrationStatus} style={{ display: 'inline' }}>
                          <input type="hidden" name="registration" value={r.id} />
                          <input type="hidden" name="back" value={back} />
                          <button className="btn sm" name="status" value="withdrawn">
                            Withdraw
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty">Not registered with any team yet.</p>
        )}
      </section>

      <div className="grid2">
        <section className="panel">
          <h2>Register for a season</h2>
          <ActionForm action={registerPlayer.bind(null, p.id)} submit="Register">
            <div className="fields">
              <label className="field">
                Season
                <select name="season" defaultValue={String(allSeasons.find((s) => s.isCurrent)?.id ?? '')}>
                  {allSeasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Team
                <select name="team" required defaultValue="">
                  <option value="" disabled>
                    Choose…
                  </option>
                  {eligibleTeams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({CATEGORY_LABELS[t.category]})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Shirt
                <input name="shirt" type="number" min={1} max={99} />
              </label>
              <label className="field">
                From
                <input name="joinedOn" type="date" />
                <small>Defaults to the season start, or today</small>
              </label>
            </div>
            <label className="check">
              <input type="checkbox" name="approve" defaultChecked /> Approve now (documents checked)
            </label>
          </ActionForm>
        </section>

        {active.length > 0 && (
          <section className="panel">
            <h2>Transfer</h2>
            <p className="small muted">The current registration ends the day before the transfer date. Goals and appearances up to then stay with the old club.</p>
            <ActionForm action={transferPlayer.bind(null, p.id)} submit="Record transfer">
              <div className="fields">
                <label className="field">
                  Leaving
                  <select name="from" defaultValue={String(active[0].id)}>
                    {active.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.teamName} · {r.seasonName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Joining
                  <select name="team" required defaultValue="">
                    <option value="" disabled>
                      Choose…
                    </option>
                    {eligibleTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({CATEGORY_LABELS[t.category]})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Transfer date
                  <input name="on" type="date" required defaultValue={lagosDay()} />
                </label>
                <label className="field">
                  New shirt
                  <input name="shirt" type="number" min={1} max={99} />
                </label>
              </div>
              <label className="check">
                <input type="checkbox" name="approve" defaultChecked /> Approve now
              </label>
            </ActionForm>
          </section>
        )}

        {active.length > 0 && (
          <section className="panel">
            <h2>Record leaving</h2>
            <p className="small muted">For a player who leaves a team without joining another one.</p>
            <ActionForm action={recordLeaving.bind(null, p.id)} submit="Save leaving date">
              <div className="fields">
                <label className="field">
                  Registration
                  <select name="registration" defaultValue={String(active[0].id)}>
                    {active.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.teamName} · {r.seasonName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  Last day
                  <input name="leftOn" type="date" required defaultValue={lagosDay()} />
                </label>
              </div>
            </ActionForm>
          </section>
        )}
      </div>

      <div className="grid2">
        <section className="panel">
          <h2>Details</h2>
          <ActionForm action={updatePlayer.bind(null, p.id)} submit="Save details">
            <PlayerFields p={p} />
          </ActionForm>
        </section>

        <section className="panel">
          <h2>Headshot</h2>
          <div className="row" style={{ alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            {p.photoUrl ? <img className="thumb" src={p.photoUrl} alt="" style={{ width: 96, aspectRatio: '4 / 5', objectPosition: '50% 20%' }} /> : <span className="thumb" style={{ width: 96, aspectRatio: '4 / 5', display: 'block' }} />}
            <p className="small muted grow" style={{ flexBasis: 220 }}>
              A head-and-shoulders photo, upright (4 by 5), up to 3 MB. It shows on the player’s page and in club squads.
              {p.isMinor || !p.dateOfBirth ? ' This player is under 18 or has no date of birth on record: a guardian’s consent date is needed first.' : ''}
              {p.photoUrl && !p.publicPhotoUrl ? ' Not shown in public yet: no guardian’s consent date.' : ''}
            </p>
          </div>
          <ActionForm action={savePlayerPhoto.bind(null, p.id)} submit="Save headshot">
            <label className="field">
              Photo
              <input name="photo" type="file" accept="image/jpeg,image/png,image/webp" />
            </label>
            {p.photoUrl && (
              <label className="check">
                <input type="checkbox" name="removePhoto" /> Remove the current headshot
              </label>
            )}
          </ActionForm>
        </section>
      </div>
    </div>
  );
}
