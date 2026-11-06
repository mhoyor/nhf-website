'use client';

import type { ReactNode } from 'react';

/** A select that submits its GET form when changed. The form still has a button for people without JavaScript. */
export function AutoSubmitSelect({ name, defaultValue, label, children }: { name: string; defaultValue: string; label: string; children: ReactNode }) {
  return (
    <label className="field">
      {label}
      <select name={name} defaultValue={defaultValue} onChange={(e) => e.currentTarget.form?.requestSubmit()}>
        {children}
      </select>
    </label>
  );
}
