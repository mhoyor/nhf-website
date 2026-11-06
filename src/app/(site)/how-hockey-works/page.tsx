import type { Metadata } from 'next';
import { SOURCES } from '@/content/national';
import { Cta, PageHead, Photo, rv } from '@/components/site';
import { PitchStory } from '@/components/PitchStory';
import { FlipCard } from '@/components/interactive';

export const metadata: Metadata = {
  title: 'How hockey works',
  description: 'Never watched hockey? The pitch, the circle, penalty corners, strokes, cards and the shoot-out, played out on an animated pitch as you scroll.',
};

const KIT: [string, string, string][] = [
  ['Stick', 'A wooden or composite stick with a flat face on one side. Only that side may play the ball.', '<path d="M44 4 22 50q-3 8-11 6l-3-1" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>'],
  ['Ball', 'Hard and smooth, about the size of a tennis ball.', '<circle cx="32" cy="32" r="16" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="27" cy="28" r="2" fill="currentColor"/><circle cx="36" cy="31" r="2" fill="currentColor"/><circle cx="30" cy="37" r="2" fill="currentColor"/>'],
  ['Shin guards', 'Worn by every player under the socks.', '<path d="M22 8h20v34c0 8-4 14-10 14s-10-6-10-14z" fill="none" stroke="currentColor" stroke-width="4"/><path d="M26 18h12M26 26h12" stroke="currentColor" stroke-width="3"/>'],
  ['Mouthguard', 'Protects teeth: strongly advised for all players.', '<path d="M10 26c0-8 10-12 22-12s22 4 22 12c0 10-10 18-22 18S10 36 10 26z" fill="none" stroke="currentColor" stroke-width="4"/>'],
  ['Goalkeeper kit', 'Helmet, body armour, leg guards, kickers and hand protectors.', '<circle cx="32" cy="22" r="12" fill="none" stroke="currentColor" stroke-width="4"/><path d="M24 22h16M28 16v12M36 16v12" stroke="currentColor" stroke-width="2.5"/><path d="M18 58c2-14 8-20 14-20s12 6 14 20" fill="none" stroke="currentColor" stroke-width="4"/>'],
  ['Turf shoes', 'Studded or dimpled shoes made for artificial turf.', '<path d="M8 40h34l14 6v6H8z" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/><path d="M14 52v4M24 52v4M34 52v4M44 52v4" stroke="currentColor" stroke-width="3"/>'],
];

const GLOSS: [string, string][] = [
  ['Circle or D', 'The shooting circle in front of each goal. Goals only count from inside it.'],
  ['FG', 'Field goal: scored in open play.'],
  ['PC', 'Penalty corner: the set piece for defending fouls in the circle.'],
  ['PS', 'Penalty stroke: one shot from the spot against the goalkeeper.'],
  ['Drag flick', 'A slinging shot used at penalty corners to lift the ball at speed.'],
  ['Reverse stick', 'Turning the stick over to play the ball on the left, still with the flat face.'],
  ['Self-pass', 'Restarting play by dribbling the ball yourself instead of passing.'],
  ['23', 'The 23-metre area in front of each goal, where many restarts are taken.'],
];

export default function HowHockeyWorks() {
  return (
    <div className="wrap page">
      <PageHead
        eyebrow="Play hockey"
        title="Hockey in two minutes"
        lede="Never watched a match? Scroll down: the pitch below plays out each rule as you read."
        photo={{ slot: 'explain-hero' }}
      >
        <div className="btnrow" style={{ marginTop: 8 }}>
          <span className="tagp">11 a side</span>
          <span className="tagp">4 × 15 min</span>
          <span className="tagp">Goals from the circle</span>
          <span className="tagp">Green, yellow, red cards</span>
        </div>
      </PageHead>
      <PitchStory />
      <section>
        <div className="sec-head">
          <h2>Three cards</h2>
          <span className="small muted">Tap a card to turn it over</span>
        </div>
        <div className="flips">
          <FlipCard tone="g" front="Green" frontText="Warning, then two minutes off" back="2 min" backText="The team plays with one player fewer for two minutes." />
          <FlipCard tone="y" front="Yellow" frontText="A temporary suspension" back="5+ min" backText="At least five minutes off, often ten for serious fouls." />
          <FlipCard tone="r" front="Red" frontText="Off for good" back="Off" backText="The player leaves the match, and further sanctions may follow." />
        </div>
      </section>
      <section>
        <h2>What you need</h2>
        <div className="kit">
          {KIT.map(([t, d, svg], i) => {
            const r = rv(0.04 * (i % 3));
            return (
              <div key={t} className={r.className} style={r.style}>
                <svg viewBox="0 0 64 64" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svg }} />
                <b>{t}</b>
                <span>{d}</span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="cols even">
        <div className="stack">
          <h2>Hockey and Hockey5s</h2>
          <div className="panel">
            <div className="scroll">
              <table className="tbl compare">
                <thead>
                  <tr>
                    <th></th>
                    <th>Hockey</th>
                    <th>Hockey5s</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Players</td>
                    <td>11 a side, including a goalkeeper</td>
                    <td>5 a side, including a goalkeeper</td>
                  </tr>
                  <tr>
                    <td>Pitch</td>
                    <td>91.4 × 55 m</td>
                    <td>Up to 55 × 42 m, with boards along the sides</td>
                  </tr>
                  <tr>
                    <td>Match</td>
                    <td>4 quarters of 15 minutes</td>
                    <td>2 halves of 10 minutes</td>
                  </tr>
                  <tr>
                    <td>Scoring</td>
                    <td>From inside the shooting circle</td>
                    <td>From anywhere: there is no circle</td>
                  </tr>
                  <tr>
                    <td>Set pieces</td>
                    <td>Penalty corners and strokes</td>
                    <td>No penalty corners; fouls lead to a one-on-one challenge</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <p className="src">
            Hockey5s source:{' '}
            <a href={SOURCES.h5s} target="_blank" rel="noopener noreferrer">
              Olympics.com
            </a>
          </p>
        </div>
        <div className="stack">
          <h2>Words you will hear</h2>
          <div className="gloss">
            {GLOSS.map(([t, d]) => (
              <div key={t}>
                <b>{t}</b>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="campaign" style={{ minHeight: 360 }}>
        <Photo slot="act-2" />
        <div className="camp-in">
          <h2>Watch it live</h2>
          <p>The Match Centre shows every goal, card and quarter as it happens, with the codes explained above.</p>
          <div className="btnrow">
            <Cta href="/match-centre" kind="light">
              Open the Match Centre
            </Cta>
            <Cta href="/match-centre/clubs" kind="ghost-light">
              Find a club
            </Cta>
          </div>
        </div>
      </section>
    </div>
  );
}
