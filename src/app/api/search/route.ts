// Site search: pages, news, competitions, clubs and players.
import { sql } from '@/lib/db';
import { searchNews } from '@/lib/news';
import { SEARCH_PAGES } from '@/content/nav';
import { PLANNED } from '@/content/pages';
import { NATIONAL_TEAMS } from '@/content/national';
import { publicName } from '@/lib/format';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Hit {
  t: string;
  h: string;
  k: string;
}

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim().slice(0, 60);
  if (q.length < 2) return Response.json([]);
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const match = (s: string) => words.every((w) => s.toLowerCase().includes(w));
  const like = `%${q.toLowerCase()}%`;

  const pages: Hit[] = [
    ...SEARCH_PAGES.filter(([t]) => match(t)).map(([t, h]) => ({ t, h, k: 'Page' })),
    ...NATIONAL_TEAMS.filter((n) => match(`nigeria ${n.name} national team`)).map((n) => ({ t: `Nigeria ${n.name}`, h: `/national-teams/${n.slug}`, k: 'National team' })),
    ...Object.entries(PLANNED)
      .filter(([, p]) => match(p.title))
      .map(([k, p]) => ({ t: p.title, h: `/${k}`, k: 'Page' })),
  ];
  const [news, comps, clubs, players] = await Promise.all([
    searchNews(q, 6),
    sql<{ slug: string; name: string; seasonName: string }[]>`
      select c.slug, c.name, s.name as season_name from competitions c join seasons s on s.id = c.season_id
       where c.published and lower(c.name) like ${like} order by s.starts_on desc limit 5`,
    sql<{ slug: string; name: string }[]>`
      select distinct c.slug, c.name from clubs c left join teams t on t.club_id = c.id
       where lower(c.name) like ${like} or lower(coalesce(c.short_name, '')) like ${like} or lower(t.name) like ${like} or lower(t.code) = lower(${q})
       order by c.name limit 6`,
    sql<{ id: number; firstName: string; lastName: string; isMinor: boolean; team: string | null }[]>`
      select p.id, p.first_name, p.last_name, coalesce(p.date_of_birth > current_date - interval '18 years', false) as is_minor,
             (select t.name from registrations r join teams t on t.id = r.team_id join seasons se on se.id = r.season_id
               where r.player_id = p.id and r.status = 'approved' order by se.starts_on desc, r.joined_on desc limit 1) as team
        from players p
       where lower(p.first_name || ' ' || p.last_name) like ${like} or lower(p.last_name || ' ' || p.first_name) like ${like} or upper(p.nhf_number) = upper(${q})
       order by p.last_name, p.first_name limit 8`,
  ]);
  const hits: Hit[] = [
    ...pages.slice(0, 6),
    ...news.map((n) => ({ t: n.title, h: `/news/${n.slug}`, k: 'News' })),
    ...comps.map((c) => ({ t: c.name, h: `/match-centre/competitions/${c.slug}`, k: `Competition ${c.seasonName}` })),
    ...clubs.map((c) => ({ t: c.name, h: `/match-centre/clubs/${c.slug}`, k: 'Club' })),
    ...players.map((p) => ({ t: publicName(p) + (p.team ? ` · ${p.team}` : ''), h: `/match-centre/players/${p.id}`, k: 'Player' })),
  ];
  return Response.json(hits.slice(0, 24), { headers: { 'Cache-Control': 'no-store' } });
}
