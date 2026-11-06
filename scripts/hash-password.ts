// Make the first administrator account:
//   npm run hash-password -- "admin@nhf.example" "Your Name" "a long password"
// prints an SQL insert to run with psql. After that, add users from /admin/users.
import { hashPassword, passwordProblem } from '../src/lib/passwords';

const [email, name, password] = process.argv.slice(2);
if (!email || !name || !password) {
  console.error('Usage: npm run hash-password -- <email> <name> <password>');
  process.exit(1);
}
const problem = passwordProblem(password);
if (problem) {
  console.error(problem);
  process.exit(1);
}
const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
hashPassword(password).then((hash) => {
  console.log(`insert into users (email, name, password_hash, roles) values (${q(email.toLowerCase())}, ${q(name)}, ${q(hash)}, '{admin}');`);
});
