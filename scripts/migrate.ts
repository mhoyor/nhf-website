// Brings the database up to date without starting the site: npm run db:migrate
// (The site does the same by itself on every start.)
import { migrate, prepareSetupCode } from '../src/lib/migrate';
import { sql } from '../src/lib/db';

migrate()
  .then(() => prepareSetupCode())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
