import type { PlayerRow } from '@/lib/queries';
import { POSITION_LABELS } from '@/lib/format';

export function PlayerFields({ p }: { p?: PlayerRow }) {
  return (
    <div className="fields">
      <label className="field">
        First name
        <input name="firstName" required maxLength={60} defaultValue={p?.firstName} />
      </label>
      <label className="field">
        Last name
        <input name="lastName" required maxLength={60} defaultValue={p?.lastName} />
      </label>
      <label className="field">
        Other names
        <input name="otherNames" maxLength={80} defaultValue={p?.otherNames ?? ''} />
      </label>
      <label className="field">
        Gender
        <select name="gender" defaultValue={p?.gender ?? ''} required>
          <option value="" disabled>
            Choose…
          </option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </label>
      <label className="field">
        Date of birth
        <input name="dateOfBirth" type="date" defaultValue={p?.dateOfBirth ?? ''} />
        <small>Needed for youth teams. Never shown on public pages.</small>
      </label>
      <label className="field">
        Position
        <select name="position" defaultValue={p?.position ?? ''}>
          <option value="">Not set</option>
          {Object.entries(POSITION_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        NHF number
        <input name="nhfNumber" defaultValue={p?.nhfNumber ?? ''} placeholder="Issued automatically" pattern="NHF-[0-9]{4,8}" />
      </label>
      <label className="field">
        Guardian consent received
        <input name="guardianConsentOn" type="date" defaultValue={p?.guardianConsentOn ?? ''} />
        <small>For players under 18</small>
      </label>
    </div>
  );
}
