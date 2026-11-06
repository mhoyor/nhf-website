// The site sets up its own database. On every start (src/instrumentation.ts) it applies the
// SQL files in db/ that have not run yet, in order, each in one transaction, and records
// them in schema_migrations. A fresh, empty PostgreSQL database becomes a working site
// with nothing but DATABASE_URL set: no psql, nothing to install.
//
// A database loaded by hand with psql before this existed is recognised: files whose
// tables are already there are recorded as found and not run again.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { sql } from './db';

/** In order. A new change to the database is a new file at the end of this list. */
export const MIGRATIONS = ['001_schema.sql', '002_logic.sql', '004_site.sql', '005_site_content.sql', '006_setup.sql', '007_people_media.sql'] as const;
/** Invented clubs, players and results, for a trial site only (NHF_DEMO_DATA=true on an empty database). */
const DEMO = '003_demo_seed.sql';

const LOCK = 7_262_001; // pg_advisory_xact_lock key: one instance migrates at a time
const dbDir = () => path.join(process.cwd(), 'db');

/**
 * How to tell that a file's work is already in the database (loaded with psql before the
 * runner existed). The demo data only ever goes into an empty database.
 */
const FOUND: Record<string, string> = {
  '001_schema.sql': `select to_regclass('public.clubs') is not null as ok`,
  '002_logic.sql': `select to_regclass('public.v_player_career') is not null as ok`,
  '004_site.sql': `select to_regclass('public.news_posts') is not null as ok`,
  '005_site_content.sql': `select exists (select 1 from news_posts) as ok`,
  [DEMO]: `select exists (select 1 from clubs) or exists (select 1 from players) as ok`,
};

/** The file's own begin/commit come off: the runner wraps it in its transaction. */
export function stripTransaction(text: string): string {
  return text.replace(/^\s*begin\s*;\s*$/im, '').replace(/^\s*commit\s*;\s*$(?![\s\S]*^\s*commit\s*;\s*$)/im, '');
}

export interface MigrateResult {
  applied: string[];
  found: string[];
}

export async function migrate(log: (line: string) => void = (l) => console.log(l)): Promise<MigrateResult> {
  const out: MigrateResult = { applied: [], found: [] };
  await sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${LOCK})`;
    await tx`create table if not exists schema_migrations (
               name text primary key, applied_at timestamptz not null default now(), how text not null default 'ran')`;
  });
  const files: string[] = [...MIGRATIONS];
  if (process.env.NHF_DEMO_DATA === 'true') files.splice(3, 0, DEMO); // after the website tables, before content
  for (const name of files) {
    const how = await sql.begin(async (tx) => {
      await tx`select pg_advisory_xact_lock(${LOCK})`;
      if ((await tx`select 1 as x from schema_migrations where name = ${name}`).length) return null;
      const check = FOUND[name];
      if (check && (await tx.unsafe(check))[0]?.ok) {
        await tx`insert into schema_migrations (name, how) values (${name}, 'found')`;
        return 'found' as const;
      }
      const body = stripTransaction(await readFile(path.join(dbDir(), name), 'utf8'));
      await tx.unsafe(body).simple();
      // The demo data's sample administrator has a published password: never usable on a hosted site.
      if (name === DEMO) await tx`update users set is_active = false, password_hash = 'disabled' where email = 'admin@example.org'`;
      await tx`insert into schema_migrations (name, how) values (${name}, 'ran')`;
      return 'ran' as const;
    });
    if (how === 'ran') {
      out.applied.push(name);
      log(`[nhf] Database: applied ${name}${name === DEMO ? ' (invented clubs, players and results for trying the site: not for the live site)' : ''}`);
    } else if (how === 'found') out.found.push(name);
  }
  if (!out.applied.length) log('[nhf] Database: up to date');
  return out;
}

export interface DbStatus {
  ok: boolean;
  error?: string;
  applied: string[];
  pending: string[];
  /** Active administrators: while there are none, /setup creates the first one. */
  admins: number;
}

/** For the setup page and /api/health: can we reach the database, and is it set up? */
export async function dbStatus(): Promise<DbStatus> {
  try {
    const [{ exists }] = await sql<{ exists: boolean }[]>`select to_regclass('public.schema_migrations') is not null as exists`;
    const applied = exists ? (await sql<{ name: string }[]>`select name from schema_migrations order by name`).map((r) => r.name) : [];
    const [{ hasUsers }] = await sql<{ hasUsers: boolean }[]>`select to_regclass('public.users') is not null as has_users`;
    const admins = hasUsers ? await activeAdmins() : 0;
    return { ok: true, applied, pending: MIGRATIONS.filter((m) => !applied.includes(m)), admins };
  } catch (e) {
    return { ok: false, error: friendlyDbError(e), applied: [], pending: [...MIGRATIONS], admins: 0 };
  }
}

export async function activeAdmins(): Promise<number> {
  const [{ n }] = await sql<{ n: number }[]>`select count(*) as n from users where is_active and 'admin' = any (roles)`;
  return Number(n);
}

export function friendlyDbError(e: unknown): string {
  const err = e as { code?: string; message?: string };
  if (!process.env.DATABASE_URL) return 'DATABASE_URL is not set. Add it in your host’s environment settings: it is the connection string of your PostgreSQL database.';
  if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') return `The database server cannot be reached (${err.code}). Check the host name in DATABASE_URL, and that the database is running.`;
  if (err.code === '28P01') return 'The database refused the password in DATABASE_URL.';
  if (err.code === '3D000') return 'The database named in DATABASE_URL does not exist.';
  return `The database returned an error: ${err.message ?? String(e)}`;
}

// ---- The one-time setup code for the first administrator

const normalise = (code: string) => code.toUpperCase().replace(/[^0-9A-Z]/g, '');
const sha = (s: string) => createHash('sha256').update(s).digest();

/**
 * While there is no administrator, the setup page asks for a code, so a stranger who finds a
 * new site first cannot claim it. The code is NHF_SETUP_CODE if set; otherwise a new one is
 * made at each start and written to the server log.
 */
export async function prepareSetupCode(log: (line: string) => void = (l) => console.log(l)): Promise<void> {
  if ((await activeAdmins()) > 0) return;
  if (process.env.NHF_SETUP_CODE) {
    log('[nhf] No administrator yet. Open /setup on this site and enter your setup code (NHF_SETUP_CODE).');
    return;
  }
  const raw = randomBytes(6).toString('hex').toUpperCase(); // 12 characters, 48 bits
  const code = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
  await sql`insert into app_settings (key, value) values ('setup_code', ${sha(normalise(code)).toString('hex')})
            on conflict (key) do update set value = excluded.value, updated_at = now()`;
  log(`[nhf] No administrator yet. Open /setup on this site and enter the setup code ${code}`);
}

export async function setupCodeMatches(code: string): Promise<boolean> {
  const given = sha(normalise(code));
  const fixed = process.env.NHF_SETUP_CODE;
  if (fixed) return timingSafeEqual(given, sha(normalise(fixed)));
  const [row] = await sql<{ value: string }[]>`select value from app_settings where key = 'setup_code'`;
  return !!row && timingSafeEqual(given, Buffer.from(row.value, 'hex'));
}
