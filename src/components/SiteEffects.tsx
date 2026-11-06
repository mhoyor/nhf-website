'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Scroll reveal and photo parallax from the prototype, set up again on every page. */
export function SiteEffects() {
  const path = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    root.classList.add('js-reveal');
    const items = [...document.querySelectorAll<HTMLElement>('.reveal:not(.in)')];
    let io: IntersectionObserver | null = null;
    if (reduced || !('IntersectionObserver' in window)) items.forEach((el) => el.classList.add('in'));
    else {
      // Anything already on screen shows straight away, without a jump.
      items.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < innerHeight && r.bottom > 0) el.classList.add('in', 'now');
      });
      io = new IntersectionObserver(
        (entries) => entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('in');
            io?.unobserve(en.target);
          }
        }),
        { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
      );
      items.filter((el) => !el.classList.contains('in')).forEach((el) => io!.observe(el));
    }
    const wide = matchMedia('(min-width: 901px)');
    let frame = 0;
    const parallax = () => {
      frame = 0;
      document.querySelectorAll<HTMLElement>('.plx').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) return;
        const c = r.top + r.height / 2 - innerHeight / 2;
        const ph = el.querySelector<HTMLElement>('.ph');
        if (ph) ph.style.transform = `translate3d(0,${(-c * (Number(el.dataset.speed) || 0.05)).toFixed(1)}px,0)`;
      });
      const hero = document.querySelector<HTMLElement>('.hero > .ph');
      // Only on wide screens, where the photo sits beside the text; on phones it sits above the text.
      if (hero && wide.matches && scrollY < innerHeight * 1.2) hero.style.transform = `translate3d(0,${(scrollY * 0.12).toFixed(1)}px,0)`;
      else if (hero) hero.style.transform = '';
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(parallax);
    };
    if (!reduced) {
      parallax();
      addEventListener('scroll', onScroll, { passive: true });
    }
    return () => {
      io?.disconnect();
      removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [path]);
  return null;
}
