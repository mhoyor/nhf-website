// One PostgreSQL pool per server process. Column names come back in camelCase,
// bigint ids as numbers, and dates (no time) as 'YYYY-MM-DD' strings.
import postgres from 'postgres';

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as { __nhfSql?: Sql };

function create(): Sql {
  return postgres(process.env.DATABASE_URL || 'postgres://localhost:5432/nhf', {
    max: Number(process.env.DATABASE_POOL_SIZE || 10),
    idle_timeout: 30,
    connect_timeout: 10,
    transform: postgres.camel,
    types: {
      // Named so they do not replace the driver's own date and timestamp parsers.
      int8AsNumber: { to: 20, from: [20], serialize: (x: number) => String(x), parse: (x: string) => Number(x) },
      dateAsText: { to: 1082, from: [1082], serialize: (x: string) => x, parse: (x: string) => x },
    },
    connection: { application_name: 'nhf-match-centre', TimeZone: 'Africa/Lagos' },
  });
}

// The pool connects on first query, so importing this file during `next build` is safe.
export const sql: Sql = globalForDb.__nhfSql ?? create();
if (process.env.NODE_ENV !== 'production') globalForDb.__nhfSql = sql;

/** Turn a database error into something an admin can act on. */
export function dbMessage(e: unknown): string {
  const err = e as { code?: string; message?: string; constraint_name?: string; detail?: string };
  const known: Record<string, string> = {
    registrations_one_active: 'This player already has an active registration in this category for the season. Record a transfer instead.',
    registrations_shirt_unique: 'That shirt number is already taken in this team for the season.',
    match_squads_shirt: 'Two players in one team have the same shirt number.',
    teams_code_key: 'That team code is already used.',
    clubs_slug_key: 'Another club already uses that web address.',
    competitions_slug_key: 'Another competition already uses that web address.',
    players_nhf_number_key: 'That NHF number belongs to another player.',
    users_email_key: 'There is already a user with that email address.',
    seasons_name_key: 'Another season already has that name.',
    seasons_check: 'The season must end after it starts.',
  };
  if (err?.constraint_name && known[err.constraint_name]) return known[err.constraint_name];
  if (err?.code === '23514' || err?.code === 'P0001') return err.message ?? 'The database refused the change.';
  if (err?.code === '23505') return 'That would create a duplicate.';
  if (err?.code === '23503') return 'That record is still in use, or refers to something that does not exist.';
  console.error(e);
  return 'Something went wrong saving this. Nothing was changed.';
}
