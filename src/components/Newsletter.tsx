'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import type { FormState } from '@/lib/forms';
import { Stick } from './site';

export function Newsletter({ action }: { action: (prev: FormState, form: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <section className="newsletter reveal">
      <div className="stack" style={{ gap: 10 }}>
        <h2>Get the latest news</h2>
        <p>Call-ups, results and match alerts by email.</p>
      </div>
      <form action={formAction} noValidate>
        <label htmlFor="nl-email">
          Email address
          <input id="nl-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
        </label>
        <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" style={{ position: 'absolute', left: '-9999px' }} />
        <button className="btn primary" type="submit" disabled={pending}>
          <Stick />
          <span>{pending ? 'Signing up…' : 'Sign up'}</span>
        </button>
        {state.ok && (
          <p role="status" style={{ width: '100%', color: 'var(--ink)', fontWeight: 600 }}>
            {state.ok}
          </p>
        )}
        {state.errors && (
          <p role="alert" className="err" style={{ width: '100%' }}>
            {state.errors[0]}
          </p>
        )}
      </form>
      <div className="wa">
        <b>WhatsApp channel</b>
        <span>Results and call-ups on the phone most fans already use.</span>
        <Link className="more" href="/alerts">
          How it will work
        </Link>
      </div>
    </section>
  );
}
