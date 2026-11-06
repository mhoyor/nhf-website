import type { ClubRow } from '@/lib/queries';
import { CATEGORIES, CATEGORY_LABELS } from '@/lib/format';

const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers',
  'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
];

export function ClubFields({ club }: { club?: ClubRow }) {
  return (
    <div className="fields">
      <label className="field">
        Club name
        <input name="name" required maxLength={100} defaultValue={club?.name} />
      </label>
      <label className="field">
        Short name
        <input name="shortName" maxLength={40} defaultValue={club?.shortName ?? ''} />
      </label>
      <label className="field">
        Web address
        <input name="slug" maxLength={60} defaultValue={club?.slug} placeholder="from the name" />
      </label>
      <label className="field">
        State
        <select name="state" defaultValue={club?.state ?? ''}>
          <option value="">Choose…</option>
          {STATES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      <label className="field">
        City
        <input name="city" maxLength={60} defaultValue={club?.city ?? ''} />
      </label>
      <label className="field">
        Founded
        <input name="foundedYear" type="number" min={1900} max={2100} defaultValue={club?.foundedYear ?? ''} />
      </label>
      <label className="field">
        Website
        <input name="website" type="url" defaultValue={club?.website ?? ''} placeholder="https://" />
      </label>
    </div>
  );
}

export function TeamFields({ team, venues }: { team?: { name: string; code: string; category: string; colour: string | null }; venues: { id: number; name: string }[] }) {
  return (
    <div className="fields">
      <label className="field">
        Team name
        <input name="name" required maxLength={80} defaultValue={team?.name} placeholder="Kada Queens" />
      </label>
      <label className="field">
        Code
        <input name="code" required maxLength={5} defaultValue={team?.code} placeholder="KADW" style={{ textTransform: 'uppercase' }} />
        <small>2–5 letters or digits, used in CSV uploads</small>
      </label>
      <label className="field">
        Category
        <select name="category" defaultValue={team?.category ?? 'women'}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Colour
        <input name="colour" type="color" defaultValue={team?.colour ?? '#008751'} />
      </label>
      <label className="field">
        Home pitch
        <select name="venue" defaultValue="">
          <option value="">None</option>
          {venues.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
