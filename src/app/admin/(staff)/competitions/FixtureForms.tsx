'use client';

import { useActionState, useState, type ReactNode } from 'react';
import { Messages } from '@/components/ActionForm';
import type { FormState } from '@/lib/forms';
import { describeSlot } from '@/lib/competition';
import { CATEGORY_LABELS, slugify } from '@/lib/format';
import type { PreviewFixture } from './actions';

type Action = (prev: FormState, form: FormData) => Promise<FormState>;

interface Common {
  seasons: { id: number; name: string; isCurrent: boolean }[];
  categories: string[];
}

function MetaFields({ seasons, categories, category, setCategory }: Common & { category: string; setCategory: (c: string) => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  return (
    <div className="fields">
      <label className="field">
        Name
        <input
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (!slugTouched) setSlug(slugify(e.target.value));
          }}
          placeholder="Hockey Super League 2026 Women"
        />
      </label>
      <label className="field">
        Web address
        <input
          name="slug"
          value={slug}
          onChange={(e) => {
            setSlugTouched(true);
            setSlug(e.target.value);
          }}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          title="Lower-case letters, numbers and dashes"
        />
        <small>/competitions/{slug || '…'}</small>
      </label>
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
        Category
        <select name="category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function Preview({ rows }: { rows: PreviewFixture[] }) {
  const labels = new Map(rows.filter((r) => r.ref).map((r) => [r.ref!.toUpperCase(), r.label]));
  const side = (s: string) => (/^([A-HL]\d+|[WL]:)/.test(s) ? <i className="muted">{describeSlot(s, (r) => labels.get(r.toUpperCase()))}</i> : s);
  return (
    <div className="panel">
      <h2>Preview</h2>
      <div className="scroll">
        <table className="tbl">
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Match</th>
              <th>Home</th>
              <th>Away</th>
              <th>Venue</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                <td>{r.time}</td>
                <td>
                  {r.label}
                  {r.ref && <span className="code"> {r.ref}</span>}
                </td>
                <td>{side(r.home)}</td>
                <td>{side(r.away)}</td>
                <td className="small">{r.venue ?? ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Shell({ action, children, extra }: { action: Action; children: (category: string) => ReactNode; extra: Common }) {
  const [state, formAction, pending] = useActionState(action, {});
  const [category, setCategory] = useState(extra.categories[0] ?? 'men');
  const rows = Array.isArray(state.data) ? (state.data as PreviewFixture[]) : null;
  return (
    <form action={formAction} className="stack">
      <section className="panel stack" style={{ gap: 16 }}>
        <MetaFields {...extra} category={category} setCategory={setCategory} />
        {children(category)}
        <label className="check">
          <input type="checkbox" name="published" /> Publish straight away (otherwise only staff can see it until you publish)
        </label>
        <Messages state={state} />
        <div className="row">
          <button className="btn" type="submit" name="intent" value="preview" disabled={pending}>
            {pending ? 'Working…' : 'Preview fixtures'}
          </button>
          <button className="btn primary" type="submit" name="intent" value="create" disabled={pending || !rows}>
            Create competition
          </button>
          {!rows && <span className="small muted">Preview first, then create.</span>}
        </div>
      </section>
      {rows && <Preview rows={rows} />}
    </form>
  );
}

export function BuilderForm({ action, teams, venues, ...extra }: Common & { action: Action; teams: { id: number; name: string; category: string; clubName: string }[]; venues: { id: number; name: string }[] }) {
  const [format, setFormat] = useState<'league' | 'groups'>('league');
  return (
    <Shell action={action} extra={extra}>
      {(category) => {
        const list = teams.filter((t) => t.category === category);
        return (
          <>
            <div className="fields">
              <label className="field">
                Format
                <select name="format" value={format} onChange={(e) => setFormat(e.target.value as 'league' | 'groups')}>
                  <option value="league">League: every team plays every other team</option>
                  <option value="groups">Groups, then classification matches</option>
                </select>
              </label>
              <label className="field">
                Legs
                <select name="legs" defaultValue="1">
                  <option value="1">Once</option>
                  <option value="2">Home and away</option>
                </select>
              </label>
              <label className="field">
                After the {format === 'league' ? 'league' : 'groups'}
                <select name="classification" defaultValue={format === 'groups' ? 'semis' : 'none'} key={format}>
                  <option value="none">Nothing: the table is final</option>
                  <option value="semis">Semi-finals, final and 3rd place{format === 'groups' ? ', then place matches' : ''}</option>
                  <option value="places">Place matches (1st v 2nd, 3rd v 4th…)</option>
                </select>
              </label>
            </div>
            <fieldset className="panel" style={{ margin: 0 }}>
              <legend className="small">Teams taking part ({CATEGORY_LABELS[category]})</legend>
              {list.length === 0 ? (
                <p className="muted" style={{ margin: 0 }}>
                  No {CATEGORY_LABELS[category]} teams yet. Add teams to clubs first.
                </p>
              ) : (
                <div className="grid3" style={{ gap: 8 }}>
                  {list.map((t) =>
                    format === 'league' ? (
                      <label key={t.id} className="check">
                        <input type="checkbox" name={`team.${t.id}`} value="L" defaultChecked /> {t.name}
                      </label>
                    ) : (
                      <label key={t.id} className="field" style={{ gridTemplateColumns: '1fr auto', alignItems: 'center', fontWeight: 500 }}>
                        {t.name}
                        <select name={`team.${t.id}`} defaultValue="" aria-label={`Group for ${t.name}`}>
                          <option value="">Not taking part</option>
                          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((g) => (
                            <option key={g} value={g}>
                              Group {g}
                            </option>
                          ))}
                        </select>
                      </label>
                    ),
                  )}
                </div>
              )}
            </fieldset>
            <div className="fields">
              <label className="field">
                First match day
                <input type="date" name="firstDay" required />
              </label>
              <label className="field">
                Days between match days
                <input type="number" name="daysBetween" min={1} max={28} defaultValue={7} />
                <small>7 for weekly league rounds, 1 for a tournament</small>
              </label>
              <label className="field">
                Kick-off times (WAT)
                <input name="kickoffs" defaultValue="09:30, 12:00, 14:30, 17:00" />
                <small>Used in turn on each match day</small>
              </label>
              <label className="field">
                Venue
                <select name="venue" defaultValue={String(venues[0]?.id ?? '')}>
                  <option value="">To be confirmed</option>
                  {venues.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        );
      }}
    </Shell>
  );
}

export function ImportForm({ action, template, teams, ...extra }: Common & { action: Action; template: string; teams: { code: string; name: string; category: string }[] }) {
  const [csv, setCsv] = useState(template);
  return (
    <Shell action={action} extra={extra}>
      {(category) => (
        <>
          <label className="field">
            Fixtures as CSV
            <textarea name="csv" rows={14} value={csv} onChange={(e) => setCsv(e.target.value)} spellCheck={false} />
            <small>
              Columns: ref, date (YYYY-MM-DD), time (HH:MM, Nigerian time), stage (league, group or class), group (A–H), label, home, away, venue, places (such as 1-2).
              Home and away are team codes, or for class rows a placeholder such as A1 (winner of group A), L3 (3rd in the league), W:SF1 or L:SF1.
            </small>
          </label>
          <label className="field">
            Or open a CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setCsv(await f.text());
              }}
            />
          </label>
          <details>
            <summary className="small">Team codes for {CATEGORY_LABELS[category]}</summary>
            <p className="small">
              {teams
                .filter((t) => t.category === category)
                .map((t) => `${t.code} ${t.name}`)
                .join(' · ') || 'No teams in this category yet.'}
            </p>
          </details>
        </>
      )}
    </Shell>
  );
}
