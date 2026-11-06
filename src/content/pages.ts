// Pages on the roadmap. Each shows what it will hold until its content is written.
export interface PlannedPage { title: string; group: string; phase: number; items: string[] }
export const PLANNED: Record<string, PlannedPage> = {
  "calendar": {
    "title": "Season calendar",
    "group": "matches",
    "phase": 1,
    "items": [
      "Every NHF competition and national team date in one list",
      "Downloadable PDF and phone calendar files",
      "Filters by competition, team and state"
    ]
  },
  "venues": {
    "title": "Venues and tickets",
    "group": "matches",
    "phase": 2,
    "items": [
      "Pitches used for NHF competitions, with maps",
      "Ticket information for finals and internationals",
      "Turf status and booking contacts"
    ]
  },
  "watch": {
    "title": "Where to watch",
    "group": "matches",
    "phase": 3,
    "items": [
      "TV and streaming partners",
      "Live streams of domestic finals",
      "Highlights after each match day"
    ]
  },
  "championships": {
    "title": "National championships",
    "group": "matches",
    "phase": 2,
    "items": [
      "Senior and age-group national championships",
      "Formats, dates and entry rules",
      "Past winners"
    ]
  },
  "school-leagues": {
    "title": "Schools and universities",
    "group": "matches",
    "phase": 2,
    "items": [
      "School and university leagues by state",
      "How schools enter a team",
      "Results and champions"
    ]
  },
  "regulations": {
    "title": "Rules and regulations",
    "group": "matches",
    "phase": 1,
    "items": [
      "FIH Rules of Hockey and Hockey5s rules",
      "NHF competition regulations",
      "Plain-language guides, starting with How hockey works"
    ]
  },
  "disciplinary": {
    "title": "Disciplinary decisions",
    "group": "matches",
    "phase": 1,
    "items": [
      "Published decisions and suspensions",
      "How to appeal",
      "The disciplinary code"
    ]
  },
  "u21": {
    "title": "Junior U21",
    "group": "teams",
    "phase": 1,
    "items": [
      "Men’s and women’s U21 squads",
      "Fixtures and results",
      "Pathway from U18 to the senior teams"
    ]
  },
  "selection": {
    "title": "Selection and call-ups",
    "group": "teams",
    "phase": 1,
    "items": [
      "Selection policy and criteria",
      "Latest call-ups and camps",
      "Trial dates"
    ]
  },
  "history": {
    "title": "Tournament history since 1974",
    "group": "teams",
    "phase": 1,
    "items": [
      "Every tournament Nigeria has played, searchable by year and opponent",
      "Final placings and squads where known",
      "Sources for each record"
    ]
  },
  "h2h": {
    "title": "Head-to-head records",
    "group": "teams",
    "phase": 1,
    "items": [
      "Nigeria’s record against every opponent",
      "Biggest wins and closest matches",
      "Filter by men, women and age group"
    ]
  },
  "schools": {
    "title": "Schools programme",
    "group": "play",
    "phase": 2,
    "items": [
      "Equipment and coaching support for schools",
      "How a school joins",
      "Teacher training sessions"
    ]
  },
  "girls": {
    "title": "Girls in hockey",
    "group": "play",
    "phase": 2,
    "items": [
      "Programmes for girls and young women",
      "Female coaches and umpires",
      "Stories from players"
    ]
  },
  "grassroots": {
    "title": "Grassroots clinics",
    "group": "play",
    "phase": 2,
    "items": [
      "Free taster sessions by state",
      "Clinic calendar",
      "How to host a clinic"
    ]
  },
  "facilities": {
    "title": "Facilities and turf",
    "group": "play",
    "phase": 2,
    "items": [
      "Hockey pitches in Nigeria and their status",
      "Facility development plans",
      "Booking contacts"
    ]
  },
  "diaspora": {
    "title": "Diaspora talent form",
    "group": "play",
    "phase": 1,
    "items": [
      "Players of Nigerian heritage abroad can register interest",
      "Eligibility rules",
      "Video links and contact details, reviewed by the technical team"
    ]
  },
  "inclusive": {
    "title": "Inclusive hockey",
    "group": "play",
    "phase": 2,
    "items": [
      "Adapted formats and para hockey",
      "Partner organisations",
      "How to get involved"
    ]
  },
  "strategy": {
    "title": "Strategic plan",
    "group": "play",
    "phase": 1,
    "items": [
      "NHF’s goals for the next four years",
      "Targets for clubs, players and rankings",
      "Progress reports"
    ]
  },
  "states": {
    "title": "State associations",
    "group": "clubs",
    "phase": 1,
    "items": [
      "Contacts for the 36 states and the FCT",
      "State competitions",
      "How state associations affiliate"
    ]
  },
  "affiliation": {
    "title": "Affiliation and fees",
    "group": "clubs",
    "phase": 2,
    "items": [
      "How a club affiliates to NHF",
      "Fees, payable in naira online",
      "Documents a club needs"
    ]
  },
  "transfers": {
    "title": "Transfers and eligibility",
    "group": "clubs",
    "phase": 2,
    "items": [
      "Transfer windows and forms",
      "Eligibility for national competitions",
      "International clearance"
    ]
  },
  "coaching": {
    "title": "Coaching courses",
    "group": "clubs",
    "phase": 2,
    "items": [
      "Course dates and levels",
      "Links to the FIH Academy",
      "The coaches register"
    ]
  },
  "umpiring": {
    "title": "Umpiring",
    "group": "clubs",
    "phase": 2,
    "items": [
      "Umpire courses and grades",
      "The national umpiring panel",
      "How to start umpiring"
    ]
  },
  "appointments": {
    "title": "Appointments and panels",
    "group": "clubs",
    "phase": 2,
    "items": [
      "Umpire and technical officer appointments by match",
      "Panels for each competition",
      "Feedback forms"
    ]
  },
  "press": {
    "title": "Press releases",
    "group": "news",
    "phase": 1,
    "items": [
      "Official NHF statements",
      "Squad announcements",
      "Archive by year"
    ]
  },
  "accreditation": {
    "title": "Media accreditation",
    "group": "news",
    "phase": 1,
    "items": [
      "Apply for accreditation for NHF events",
      "Rules for photographers and broadcasters",
      "Contact for the media officer"
    ]
  },
  "brand": {
    "title": "Logo and brand pack",
    "group": "news",
    "phase": 1,
    "items": [
      "The NHF logo in all formats",
      "Colours and typefaces",
      "Rules for partners using the brand"
    ]
  },
  "statutes": {
    "title": "Statutes and policies",
    "group": "about",
    "phase": 1,
    "items": [
      "NHF statutes",
      "Code of ethics",
      "Policies on safeguarding, anti-doping and integrity"
    ]
  },
  "reports": {
    "title": "Annual reports and accounts",
    "group": "about",
    "phase": 1,
    "items": [
      "Annual reports",
      "Audited accounts",
      "Congress minutes"
    ]
  },
  "safeguarding": {
    "title": "Safeguarding and anti-doping",
    "group": "about",
    "phase": 1,
    "items": [
      "How to report a concern, confidentially",
      "The safeguarding officer",
      "Anti-doping education and rules"
    ]
  },
  "partners": {
    "title": "Our partners",
    "group": "about",
    "phase": 1,
    "items": [
      "Partners by tier",
      "Partner stories",
      "How partners support Nigerian hockey"
    ]
  },
  "sponsorship": {
    "title": "Sponsorship packages",
    "group": "about",
    "phase": 1,
    "items": [
      "Packages for national teams and the Super League",
      "Audience figures",
      "Commercial contact"
    ]
  },
  "alerts": {
    "title": "WhatsApp alerts",
    "group": "about",
    "phase": 1,
    "items": [
      "A WhatsApp channel for results and call-ups",
      "Email newsletter",
      "Choose which teams to follow"
    ]
  },
  "login": {
    "title": "Log in for clubs and players",
    "group": "clubs",
    "phase": 2,
    "items": [
      "Club secretaries manage registrations",
      "Players see their registration card and history",
      "Scorers and competition managers reach their tools"
    ]
  }
};
