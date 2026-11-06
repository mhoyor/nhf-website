'use client';

import { useEffect, useRef, useState } from 'react';
import { STEPS } from '@/content/story';

const PL_A: [number, number][] = [[70, 320], [230, 150], [210, 270], [210, 370], [230, 490], [400, 200], [380, 320], [400, 440], [620, 170], [650, 320], [620, 470]];
const PL_B: [number, number][] = [[930, 320], [820, 180], [800, 285], [800, 355], [820, 460], [690, 240], [700, 400], [560, 320], [450, 150], [470, 300], [450, 480]];

/**
 * The scroll story from the prototype: an animated pitch that plays out each rule
 * as the reader scrolls past its step.
 */
export function PitchStory() {
  const root = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const $ = (id: string) => el.querySelector<SVGElement | HTMLElement>(`#${id}`);
    let tok = 0;
    let cur = -1;
    const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
    const sp = (id: string, x: number | null, y: number | null, op?: number) => {
      const e = $(id);
      if (!e) return;
      if (x !== null) e.style.transform = `translate(${x}px,${y}px)`;
      if (op !== undefined) e.style.opacity = String(op);
    };
    const zones = (list: string[]) => el.querySelectorAll('.hl-zone').forEach((z) => z.classList.toggle('on', list.includes(z.id)));
    const flash = (t: string) => {
      const f = $('flash');
      if (!f) return;
      f.textContent = t;
      f.classList.remove('go');
      void f.getBoundingClientRect();
      f.classList.add('go');
    };
    const showAll = (op: number) => {
      PL_A.forEach((p, i) => sp(`pA${i}`, p[0], p[1], op));
      PL_B.forEach((p, i) => sp(`pB${i}`, p[0], p[1], op));
    };
    const ballPath = async (pts: [number, number][], ms: number, tk: number) => {
      for (const [x, y] of pts) {
        if (tk !== tok) return false;
        sp('ball', x, y);
        await wait(ms);
      }
      return tk === tok;
    };
    const SCENES: ((tk: number) => Promise<void>)[] = [
      async () => {
        showAll(0);
        zones(['hz-outline']);
        sp('ball', 500, 320);
      },
      async () => {
        showAll(1);
        zones([]);
        sp('ball', 500, 320);
      },
      async (tk) => {
        showAll(1);
        zones([]);
        while (tk === tok) {
          sp('ball', 380, 320);
          await wait(700);
          if (!(await ballPath([[400, 200], [620, 170], [650, 320], [620, 470], [400, 440], [380, 320]], 950, tk))) return;
          if (RM) return;
          await wait(500);
        }
      },
      async (tk) => {
        showAll(1);
        zones(['hz-circle']);
        while (tk === tok) {
          sp('ball', 730, 170);
          await wait(900);
          if (!(await ballPath([[957, 300]], 800, tk))) return;
          flash('No goal');
          await wait(1500);
          if (tk !== tok) return;
          sp('ball', 860, 260);
          await wait(1000);
          if (!(await ballPath([[957, 318]], 700, tk))) return;
          flash('Goal!');
          if (RM) return;
          await wait(1900);
        }
      },
      async (tk) => {
        zones(['hz-circle', 'hz-pc']);
        const att = [[800, 250], [795, 320], [800, 390], [840, 300]];
        const def = [[945, 300], [945, 340], [945, 280], [945, 360]];
        PL_A.forEach((p, i) => {
          if (i >= 7) sp(`pA${i}`, att[i - 7][0], att[i - 7][1], 1);
          else if (i === 6) sp('pA6', 962, 214, 1);
          else sp(`pA${i}`, p[0], p[1], 0.3);
        });
        PL_B.forEach((_, i) => {
          if (i === 0) sp('pB0', 950, 320, 1);
          else if (i <= 4) sp(`pB${i}`, def[i - 1][0], def[i - 1][1], 1);
          else sp(`pB${i}`, 540, 120 + i * 60, 0.3);
        });
        while (tk === tok) {
          sp('ball', 957, 201.7);
          await wait(1100);
          if (!(await ballPath([[800, 320]], 800, tk))) return;
          await wait(450);
          if (!(await ballPath([[957, 328]], 600, tk))) return;
          flash('PC goal');
          if (RM) return;
          await wait(2000);
        }
      },
      async (tk) => {
        zones(['hz-spot', 'hz-23']);
        PL_A.forEach((_, i) => sp(`pA${i}`, i === 9 ? 870 : 640, i === 9 ? 320 : 80 + i * 44, i === 9 ? 1 : 0.3));
        PL_B.forEach((_, i) => sp(`pB${i}`, i === 0 ? 952 : 690, i === 0 ? 320 : 100 + i * 44, i === 0 ? 1 : 0.3));
        while (tk === tok) {
          sp('ball', 892, 320);
          await wait(1200);
          if (!(await ballPath([[958, 306]], 500, tk))) return;
          flash('Stroke!');
          if (RM) return;
          await wait(1800);
        }
      },
      async (tk) => {
        showAll(1);
        zones([]);
        sp('ball', 500, 320);
        while (tk === tok) {
          sp('pB5', 690, 240, 1);
          await wait(900);
          if (tk !== tok) return;
          flash('Green card');
          sp('pB5', 500, 624, 1);
          if (RM) return;
          await wait(2600);
        }
      },
      async (tk) => {
        zones(['hz-23']);
        PL_A.forEach((_, i) => sp(`pA${i}`, i === 9 ? 728 : 560, i === 9 ? 320 : 330, i === 9 ? 1 : 0));
        PL_B.forEach((_, i) => sp(`pB${i}`, i === 0 ? 950 : 560, 320, i === 0 ? 1 : 0));
        const tm = $('stage-timer');
        $('stage')?.classList.add('show-timer');
        while (tk === tok) {
          sp('ball', 742, 320);
          sp('pA9', 728, 320, 1);
          sp('pB0', 950, 320, 1);
          let t = 8;
          if (tm) tm.textContent = String(t);
          await wait(800);
          for (const [x, y] of [[800, 300], [860, 345], [905, 300]]) {
            if (tk !== tok) return;
            sp('ball', x + 12, y);
            sp('pA9', x, y, 1);
            t -= 1;
            if (tm) tm.textContent = String(t);
            await wait(800);
          }
          if (tk !== tok) return;
          sp('pB0', 925, 332, 1);
          if (!(await ballPath([[958, 312]], 500, tk))) return;
          flash('Goal!');
          if (RM) return;
          await wait(2000);
        }
      },
    ];
    const run = (i: number) => {
      if (i === cur || !SCENES[i]) return;
      cur = i;
      tok++;
      const tk = tok;
      $('stage')?.classList.remove('show-timer');
      const lab = $('stage-label');
      if (lab) lab.textContent = STEPS[i]?.label ?? '';
      setStep(i);
      SCENES[i](tk).catch(() => {});
    };
    run(0);
    if (!('IntersectionObserver' in window)) return () => void tok++;
    const io = new IntersectionObserver(
      (es) => es.forEach((en) => {
        if (en.isIntersecting) run(Number((en.target as HTMLElement).dataset.step));
      }),
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    );
    el.querySelectorAll('.step').forEach((s) => io.observe(s));
    return () => {
      tok++;
      io.disconnect();
    };
  }, []);

  const stripes = Array.from({ length: 10 }, (_, i) => i).filter((i) => i % 2);
  return (
    <section className="scrolly" ref={root}>
      <div className="steps">
        {STEPS.map((s, i) => (
          <div key={s.title} className={`step${i === step ? ' on' : ''}`} data-step={i}>
            <div>
              <span className="n">
                {String(i + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="stage" id="stage">
        <svg viewBox="0 0 1000 640" role="img" aria-label="Animated hockey pitch that follows the steps of the story">
          {stripes.map((i) => (
            <rect key={i} x={i * 100} y="0" width="100" height="640" fill="var(--green-900)" opacity=".2" />
          ))}
          <rect className="hl-zone" id="hz-outline" x="43" y="45" width="914" height="550" fill="none" stroke="var(--accent)" strokeWidth="8" />
          <path className="hl-zone" id="hz-circle" d="M957 155.4 A146.3 146.3 0 0 0 810.7 301.7 L810.7 338.3 A146.3 146.3 0 0 0 957 484.6 Z" fill="var(--accent)" fillOpacity=".28" stroke="var(--accent)" strokeWidth="5" />
          <line className="hl-zone" id="hz-23" x1="728" y1="45" x2="728" y2="595" stroke="var(--accent)" strokeWidth="8" />
          <circle className="hl-zone" id="hz-spot" cx="892.2" cy="320" r="22" fill="var(--accent)" fillOpacity=".5" />
          <circle className="hl-zone" id="hz-pc" cx="957" cy="201.7" r="22" fill="var(--accent)" fillOpacity=".6" />
          <g fill="none" stroke="var(--on-dark)" strokeWidth="3.5" strokeOpacity=".85">
            <rect x="43" y="45" width="914" height="550" />
            <line x1="500" y1="45" x2="500" y2="595" />
            <line x1="272" y1="45" x2="272" y2="595" />
            <line x1="728" y1="45" x2="728" y2="595" />
            <path d="M43 155.4 A146.3 146.3 0 0 1 189.3 301.7 L189.3 338.3 A146.3 146.3 0 0 1 43 484.6" />
            <path d="M957 155.4 A146.3 146.3 0 0 0 810.7 301.7 L810.7 338.3 A146.3 146.3 0 0 0 957 484.6" />
            <path d="M43 105.4 A196.3 196.3 0 0 1 239.3 301.7 L239.3 338.3 A196.3 196.3 0 0 1 43 534.6" strokeDasharray="12 10" strokeOpacity=".5" />
            <path d="M957 105.4 A196.3 196.3 0 0 0 760.7 301.7 L760.7 338.3 A196.3 196.3 0 0 0 957 534.6" strokeDasharray="12 10" strokeOpacity=".5" />
            <rect x="29" y="301.7" width="14" height="36.6" />
            <rect x="957" y="301.7" width="14" height="36.6" />
            <line x1="957" y1="201.7" x2="969" y2="201.7" />
          </g>
          <circle cx="107.8" cy="320" r="4" fill="var(--on-dark)" />
          <circle cx="892.2" cy="320" r="4" fill="var(--on-dark)" />
          {PL_B.map((p, i) => (
            <g key={`b${i}`} className="pl" id={`pB${i}`} style={{ transform: `translate(${p[0]}px,${p[1]}px)`, opacity: 0 }}>
              <circle r="14" fill="var(--flag-white)" stroke="var(--green-900)" strokeWidth="2" />
              {i === 0 && <circle r="6" fill="var(--accent)" />}
            </g>
          ))}
          {PL_A.map((p, i) => (
            <g key={`a${i}`} className="pl" id={`pA${i}`} style={{ transform: `translate(${p[0]}px,${p[1]}px)`, opacity: 0 }}>
              <circle r="14" fill="var(--green)" stroke="var(--flag-white)" strokeWidth="3" />
              <text y="5" textAnchor="middle" style={{ fontFamily: 'var(--body)', fontWeight: 700, fontSize: 13 }} fill="var(--green-ink)">
                {i + 1}
              </text>
            </g>
          ))}
          <g className="ball" id="ball" style={{ transform: 'translate(500px,320px)' }}>
            <circle r="8" fill="var(--accent)" stroke="var(--green-900)" strokeWidth="2.5" />
          </g>
          <text id="flash" x="500" y="330" textAnchor="middle" style={{ fontFamily: 'var(--display)', fontSize: 120 }} fill="var(--flag-white)" stroke="var(--green-900)" strokeWidth="3" paintOrder="stroke" />
        </svg>
        <span className="label" id="stage-label">
          The pitch
        </span>
        <span className="timer" id="stage-timer">
          8
        </span>
      </div>
    </section>
  );
}
