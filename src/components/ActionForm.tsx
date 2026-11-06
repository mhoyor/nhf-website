'use client';

import { useActionState, type ReactNode } from 'react';
import type { FormState } from '@/lib/forms';

export function Messages({ state }: { state: FormState }) {
  return (
    <>
      {state.errors && state.errors.length > 0 && (
        <div className="note err" role="alert">
          {state.errors.length === 1 ? (
            state.errors[0]
          ) : (
            <>
              <b>Please fix {state.errors.length} things:</b>
              <ul>
                {state.errors.slice(0, 40).map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
              {state.errors.length > 40 && <p>…and {state.errors.length - 40} more.</p>}
            </>
          )}
        </div>
      )}
      {state.warnings && state.warnings.length > 0 && (
        <div className="note warn">
          <ul style={{ margin: 0 }}>
            {state.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}
      {state.ok && (
        <div className="note ok" role="status">
          {state.ok}
        </div>
      )}
    </>
  );
}

/** A form backed by a server action that returns FormState. */
export function ActionForm({
  action,
  children,
  submit,
  className = 'stack',
  danger,
}: {
  action: (prev: FormState, form: FormData) => Promise<FormState>;
  children: ReactNode;
  submit: string;
  className?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className={className} style={{ gap: 14 }}>
      {children}
      <Messages state={state} />
      <div className="row">
        <button className={`btn ${danger ? 'danger' : 'primary'}`} type="submit" disabled={pending}>
          {pending ? 'Saving…' : submit}
        </button>
      </div>
    </form>
  );
}
