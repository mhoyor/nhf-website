import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { seasons } from '@/lib/queries';
import { PLAYER_TEMPLATE } from '@/lib/csv';
import { importPlayerList } from '../actions';
import { PlayerImportForm } from './PlayerImportForm';

export const metadata: Metadata = { title: 'Upload players' };

export default async function ImportPlayersPage() {
  await requireUser(['registrar'], '/admin/players/import');
  const all = await seasons();
  return (
    <div className="stack">
      <h1>Upload a player list</h1>
      <p className="muted">
        A club&rsquo;s list for the season, one player per row. Players with an NHF number are matched to the register so they keep their history; players without one
        are added and given the next number. Each row also registers the player with the team for the season.
      </p>
      <PlayerImportForm action={importPlayerList} template={PLAYER_TEMPLATE} seasons={all.map((s) => ({ id: s.id, name: s.name, isCurrent: s.isCurrent }))} />
    </div>
  );
}
