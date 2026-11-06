// Main menu, footer and quick links. Planned pages live at /<slug> (see pages.ts).

export interface MenuGroup {
  key: string;
  label: string;
  lead: string;
  text: string;
  columns: { title: string; links: [label: string, href: string][] }[];
}

export const MENU: MenuGroup[] = [
  {
    key: 'matches',
    label: 'Matches',
    lead: 'Matches and competitions',
    text: 'Live scores, fixtures, the Super League and the rules every competition is played under.',
    columns: [
      { title: 'Matches', links: [['Live Match Centre', '/match-centre'], ['Fixtures and results', '/match-centre/competitions'], ['Season calendar', '/calendar'], ['Venues and tickets', '/venues'], ['Where to watch', '/watch']] },
      { title: 'Competitions', links: [['Nigeria Hockey Super League', '/super-league'], ['National championships', '/championships'], ['Schools and universities', '/school-leagues'], ['Rules and regulations', '/regulations'], ['Disciplinary decisions', '/disciplinary']] },
    ],
  },
  {
    key: 'teams',
    label: 'National teams',
    lead: 'Team Nigeria',
    text: 'Squads, results and records for every national team, with FIH rankings in Stats and records.',
    columns: [
      { title: 'Teams', links: [['Senior men', '/national-teams/men'], ['Senior women', '/national-teams/women'], ['U18 Hockey5s', '/national-teams/u18'], ['Junior U21', '/u21'], ['Selection and call-ups', '/selection']] },
      { title: 'Stats and records', links: [['FIH rankings', '/stats'], ['Honours and medals', '/stats#honours'], ['Domestic leaders this season', '/stats#domestic'], ['Tournament history since 1974', '/history'], ['Head-to-head by opponent', '/h2h']] },
    ],
  },
  {
    key: 'play',
    label: 'Play hockey',
    lead: 'Start playing',
    text: 'New to hockey? Learn the game, find a club and get the right kit.',
    columns: [
      { title: 'Play', links: [['How hockey works', '/how-hockey-works'], ['Get started', '/get-involved'], ['Find a club', '/match-centre/clubs'], ['Schools programme', '/schools'], ['Girls in hockey', '/girls']] },
      { title: 'Development', links: [['Grassroots clinics', '/grassroots'], ['Facilities and turf', '/facilities'], ['Diaspora talent form', '/diaspora'], ['Inclusive hockey', '/inclusive'], ['Strategic plan', '/strategy']] },
    ],
  },
  {
    key: 'clubs',
    label: 'Clubs and officials',
    lead: 'For clubs and officials',
    text: 'Registration, competition tools, courses and appointments.',
    columns: [
      { title: 'Clubs and states', links: [['Clubs', '/match-centre/clubs'], ['State associations', '/states'], ['Affiliation and fees', '/affiliation'], ['Players and registrations', '/match-centre/players'], ['Transfers and eligibility', '/transfers']] },
      { title: 'Coaches and officials', links: [['Coaching courses', '/coaching'], ['Umpiring', '/umpiring'], ['Appointments and panels', '/appointments'], ['Staff sign-in', '/admin']] },
    ],
  },
  {
    key: 'news',
    label: 'News and media',
    lead: 'News and media',
    text: 'Match reports, photos and everything journalists need.',
    columns: [
      { title: 'News', links: [['Latest news', '/news'], ['Photo gallery', '/gallery'], ['Press releases', '/press']] },
      { title: 'Media', links: [['Media accreditation', '/accreditation'], ['Logo and brand pack', '/brand']] },
    ],
  },
  {
    key: 'about',
    label: 'About NHF',
    lead: 'The federation',
    text: 'Who runs hockey in Nigeria, how, and with whom.',
    columns: [
      { title: 'About', links: [['About NHF', '/about'], ['Board and secretariat', '/about#board'], ['Statutes and policies', '/statutes'], ['Annual reports', '/reports'], ['Safeguarding and anti-doping', '/safeguarding']] },
      { title: 'Partners', links: [['Our partners', '/partners'], ['Sponsorship packages', '/sponsorship'], ['Contact', '/about#contact']] },
    ],
  },
];

export const QUICK_LINKS: [string, string][] = [
  ['Match Centre', '/match-centre'],
  ['Super League', '/super-league'],
  ['Stats and records', '/stats'],
];

export const FOOTER: { title: string; links: [string, string][] }[] = [
  { title: 'Matches', links: [['Match Centre', '/match-centre'], ['Super League', '/super-league'], ['Fixtures and results', '/match-centre/competitions'], ['Season calendar', '/calendar']] },
  { title: 'Teams', links: [['Senior men', '/national-teams/men'], ['Senior women', '/national-teams/women'], ['U18 Hockey5s', '/national-teams/u18'], ['Stats and records', '/stats']] },
  { title: 'Play', links: [['How hockey works', '/how-hockey-works'], ['Find a club', '/match-centre/clubs'], ['Coaching courses', '/coaching'], ['Umpiring', '/umpiring']] },
  { title: 'Media', links: [['News', '/news'], ['Photo gallery', '/gallery'], ['Accreditation', '/accreditation'], ['Brand pack', '/brand']] },
  { title: 'About NHF', links: [['The federation', '/about'], ['Safeguarding', '/safeguarding'], ['Partners', '/partners'], ['WhatsApp alerts', '/alerts']] },
];

/** Pages the site search can find, beside news, clubs, players and competitions from the database. */
export const SEARCH_PAGES: [string, string][] = [
  ['Home', '/'],
  ['How hockey works: pitch, penalty corner, penalty stroke, cards, shoot-out', '/how-hockey-works'],
  ['Hockey5s rules', '/how-hockey-works'],
  ['Match Centre: live scores and today', '/match-centre'],
  ['Fixtures and results', '/match-centre/competitions'],
  ['Clubs', '/match-centre/clubs'],
  ['Players and statistics', '/match-centre/players'],
  ['Super League', '/super-league'],
  ['Stats and records: FIH rankings', '/stats'],
  ['National teams', '/national-teams'],
  ['Senior men', '/national-teams/men'],
  ['Senior women', '/national-teams/women'],
  ['U18 Hockey5s', '/national-teams/u18'],
  ['Photo gallery', '/gallery'],
  ['News', '/news'],
  ['About NHF', '/about'],
  ['Get started', '/get-involved'],
  ['Staff sign-in', '/admin'],
];
