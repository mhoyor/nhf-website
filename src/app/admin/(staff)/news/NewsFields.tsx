import type { NewsPost } from '@/lib/news';
import { lagosDay } from '@/lib/format';

const lines = (p: [string, string][] | undefined) => (p ?? []).map(([a, b]) => `${a} | ${b}`).join('\n');

export function NewsFields({ n }: { n?: NewsPost }) {
  return (
    <div className="stack editor" style={{ gap: 16 }}>
      <div className="fields">
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          Headline
          <input name="title" required maxLength={140} defaultValue={n?.title} placeholder="Nigeria’s U18 girls take bronze in Nairobi" />
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          Summary
          <textarea name="summary" rows={2} maxLength={400} defaultValue={n?.summary} />
          <small>One or two sentences. Shown on news tiles and under the headline.</small>
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}>
          Story
          <textarea className="body" name="body" defaultValue={n?.body} />
          <small>Leave a blank line between paragraphs.</small>
        </label>
        <label className="field">
          Date
          <input name="publishedOn" type="date" required defaultValue={n?.publishedOn ?? lagosDay()} />
          <small>A future date keeps the story hidden until that day.</small>
        </label>
        <label className="field">
          Show the date as
          <input name="dateText" maxLength={40} defaultValue={n?.dateText ?? ''} placeholder="Optional, e.g. March 2024" />
        </label>
        <label className="field">
          Tags
          <input name="tags" maxLength={200} defaultValue={n?.tags.join(', ')} placeholder="U18, Hockey5s Youth Africa Cup" />
          <small>Separated by commas</small>
        </label>
        <label className="field">
          Section
          <input name="section" maxLength={40} defaultValue={n?.section ?? ''} placeholder="The first tag if empty" />
        </label>
        <label className="field">
          Web address
          <input name="slug" maxLength={80} defaultValue={n?.slug} placeholder="From the headline" />
          <small>/news/{n?.slug ?? '…'}</small>
        </label>
      </div>

      <fieldset className="panel pad" style={{ margin: 0 }}>
        <legend className="small" style={{ fontWeight: 700 }}>
          Photo
        </legend>
        <div className="row" style={{ alignItems: 'flex-start', gap: 16 }}>
          {n?.photoUrl && <img className="thumb" src={n.photoUrl} alt="" style={{ objectPosition: n.photoPosition }} />}
          <div className="fields grow">
            <label className="field">
              {n?.photoUrl ? 'Replace the photo' : 'Upload a photo'}
              <input type="file" name="photo" accept="image/jpeg,image/png,image/webp" />
              <small>JPEG, PNG or WebP, up to 6 MB. Landscape photos work best.</small>
            </label>
            <label className="field">
              Describe the photo
              <input name="photoAlt" maxLength={200} defaultValue={n?.photoAlt ?? ''} placeholder="For people using screen readers" />
            </label>
            <label className="field">
              Credit
              <input name="photoCredit" maxLength={120} defaultValue={n?.photoCredit ?? ''} placeholder="Photo: …" />
            </label>
            <label className="field">
              Focus point
              <input name="photoPosition" maxLength={9} defaultValue={n?.photoPosition ?? '50% 50%'} />
              <small>Across and down, e.g. 50% 30% keeps faces in view</small>
            </label>
            {n?.photoUrl && (
              <label className="field check-field">
                <input type="checkbox" name="removePhoto" /> Remove the photo
              </label>
            )}
          </div>
        </div>
      </fieldset>

      <fieldset className="panel pad" style={{ margin: 0 }}>
        <legend className="small" style={{ fontWeight: 700 }}>
          Home page and sources
        </legend>
        <div className="fields">
          <label className="field check-field" style={{ gridColumn: '1 / -1' }}>
            <input type="checkbox" name="featured" defaultChecked={n?.featured} /> Lead story on the home page (replaces the current one)
          </label>
          <label className="field">
            Short headline for the home page
            <input name="heroTitle" maxLength={80} defaultValue={n?.heroTitle ?? ''} placeholder="Double *bronze* in Nairobi" />
            <small>Put a word between * to colour it</small>
          </label>
          <label className="field">
            Highlights
            <textarea name="highlights" rows={3} defaultValue={lines(n?.highlights)} placeholder={'U18 girls · bronze match | 4–3 v Ghana'} />
            <small>One per line: label | result</small>
          </label>
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            Sources
            <textarea name="sources" rows={3} defaultValue={lines(n?.sources)} placeholder={'Report title | https://…'} />
            <small>One per line: title | web address</small>
          </label>
        </div>
      </fieldset>

      <label className="field" style={{ maxWidth: 280 }}>
        Status
        <select name="status" defaultValue={n?.status ?? 'draft'}>
          <option value="draft">Draft: staff only</option>
          <option value="published">Published</option>
        </select>
      </label>
    </div>
  );
}
