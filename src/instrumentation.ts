// Runs once when the server starts: brings the database up to date (src/lib/migrate.ts) and,
// while there is no administrator yet, prepares the setup code for /setup.
// Set NHF_AUTO_MIGRATE=false to manage the database by hand instead.
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NHF_AUTO_MIGRATE === 'false') return;
  const { migrate, prepareSetupCode, friendlyDbError } = await import('./lib/migrate');
  try {
    await migrate();
    await prepareSetupCode();
  } catch (e) {
    // The site still starts, so /setup and /api/health can show what is wrong.
    console.error(`[nhf] Database setup did not finish. ${friendlyDbError(e)}`);
  }
}
