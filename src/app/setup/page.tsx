import Link from 'next/link';
import type { Metadata } from 'next';
import { MiniHeader } from '@/components/MiniHeader';
import { ActionForm } from '@/components/ActionForm';
import { dbStatus, MIGRATIONS } from '@/lib/migrate';
import { createFirstAdmin } from './actions';

export const metadata: Metadata = { title: 'First-time setup', robots: { index: false } };

/**
 * First-time setup, in the browser. The site has already set up its database on start; this
 * page shows that it worked and creates the first administrator. Once there is an active
 * administrator, it only links to the sign-in page.
 */
export default async function SetupPage() {
  const s = await dbStatus();
  const ready = s.ok && s.pending.length === 0;
  const fixedCode = Boolean(process.env.NHF_SETUP_CODE);
  return (
    <>
      <MiniHeader title="First-time setup" />
      <div className="wrap page" style={{ maxWidth: 680 }}>
        <div className="stack" style={{ gap: 10 }}>
          <h1>Set up the NHF website</h1>
          <p className="lede">The site sets up its own database when it starts. Check that it worked, then create the first administrator account.</p>
        </div>

        <section className="panel pad stack" aria-labelledby="st">
          <h2 id="st" style={{ fontSize: 26 }}>
            1. Database
          </h2>
          {!s.ok ? (
            <div className="note err">{s.error}</div>
          ) : ready ? (
            <div className="note ok">
              Connected, and up to date: {MIGRATIONS.length} of {MIGRATIONS.length} setup steps done.
            </div>
          ) : (
            <div className="note warn">
              Connected, but {s.pending.length} setup {s.pending.length === 1 ? 'step has' : 'steps have'} not run yet ({s.pending.join(', ')}). Restart the site from your host’s
              dashboard; the steps run on start, and the server log says which ones ran or why one stopped.
            </div>
          )}
        </section>

        <section className="panel pad stack" aria-labelledby="ad">
          <h2 id="ad" style={{ fontSize: 26 }}>
            2. First administrator
          </h2>
          {s.admins > 0 ? (
            <>
              <div className="note ok">This site already has its administrator. Further accounts are added from Admin → Users.</div>
              <div className="row">
                <Link className="btn primary" href="/admin/login">
                  Staff sign-in
                </Link>
              </div>
            </>
          ) : !ready ? (
            <p className="muted">Available once the database is ready.</p>
          ) : (
            <ActionForm action={createFirstAdmin} submit="Create the administrator and sign in">
              <label className="field">
                Setup code
                <input name="code" autoComplete="off" spellCheck={false} required style={{ fontFamily: 'var(--mono)', letterSpacing: '.08em' }} />
                <small>
                  {fixedCode
                    ? 'The code you chose and saved as NHF_SETUP_CODE in your host’s environment settings.'
                    : 'In your host’s server log (Render: the service’s Logs tab), on the newest line that starts “[nhf] No administrator yet”. It changes each time the site restarts.'}
                </small>
              </label>
              <label className="field">
                Your name
                <input name="name" autoComplete="name" required />
              </label>
              <label className="field">
                Email address
                <input name="email" type="email" autoComplete="username" required />
                <small>You sign in with this.</small>
              </label>
              <div className="fields">
                <label className="field">
                  Password
                  <input name="password" type="password" autoComplete="new-password" minLength={10} required />
                  <small>At least 10 characters. A short sentence works well.</small>
                </label>
                <label className="field">
                  Password again
                  <input name="again" type="password" autoComplete="new-password" minLength={10} required />
                </label>
              </div>
            </ActionForm>
          )}
        </section>

        <section className="stack" aria-labelledby="nx">
          <h2 id="nx" style={{ fontSize: 26 }}>
            3. Then, in the admin
          </h2>
          <ol className="steps">
            <li>
              <b>Seasons</b>
              <span className="small muted">Add the current season, such as 2026, and mark it current.</span>
            </li>
            <li>
              <b>Venues</b>
              <span className="small muted">Pitches where matches are played.</span>
            </li>
            <li>
              <b>Clubs and teams</b>
              <span className="small muted">Each club, its teams, colours and crest.</span>
            </li>
            <li>
              <b>Staff</b>
              <span className="small muted">Accounts for competition managers, registrars, scorers and media.</span>
            </li>
          </ol>
        </section>
      </div>
    </>
  );
}
