'use client';

import { useActionState, useState } from 'react';
import { Messages } from '@/components/ActionForm';
import type { FormState } from '@/lib/forms';

export function PlayerImportForm({
  action,
  template,
  seasons,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  template: string;
  seasons: { id: number; name: string; isCurrent: boolean }[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [csv, setCsv] = useState(template);
  return (
    <form action={formAction} className="panel stack" style={{ gap: 14 }}>
      <div className="fields">
        <label className="field">
          Season
          <select name="season" defaultValue={String(seasons.find((s) => s.isCurrent)?.id ?? seasons[0]?.id ?? '')}>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Open a CSV file
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) setCsv(await f.text());
            }}
          />
        </label>
      </div>
      <label className="field">
        Players as CSV
        <textarea name="csv" rows={12} value={csv} onChange={(e) => setCsv(e.target.value)} spellCheck={false} />
        <small>Columns: nhf_number (empty for a new player), first_name, last_name, gender, date_of_birth (YYYY-MM-DD), position (GK, DF, MF, FW), team (code), shirt.</small>
      </label>
      <label className="check">
        <input type="checkbox" name="approve" /> Approve these registrations now (documents already checked)
      </label>
      <Messages state={state} />
      <div className="row">
        <button className="btn" type="submit" name="intent" value="preview" disabled={pending}>
          {pending ? 'Checking…' : 'Check the list'}
        </button>
        <button className="btn primary" type="submit" name="intent" value="create" disabled={pending || state.data !== 'previewed'}>
          Add players
        </button>
      </div>
    </form>
  );
}
