// National teams: FIH rankings, honours and recent results, checked 4 November 2026.
// Edit here until national team matches are kept in the Match Centre database.

export const SOURCES = {
  "fihMen": "https://www.fih.hockey/outdoor-rankings/nigeria-men-hockey-rankings-49",
  "fihWomen": "https://www.fih.hockey/outdoor-rankings/nigeria-women-hockey-rankings-49",
  "fih5s": "https://www.fih.hockey/hockey5s-rankings",
  "fihMember": "https://www.fih.hockey/about-fih/ourmembers/dynamic/nigeria",
  "yacM": "https://tms.fih.ch/competitions/1936",
  "yacW": "https://tms.fih.ch/competitions/1937",
  "mozzart": "https://www.mozzartsport.co.ke/other-sports/news/kenya-crowned-mens-hockey-youth-africa-cup-champions-as-women-also-qualify-for-world-cup/67936",
  "acn25m": "https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations",
  "acn25w": "https://en.wikipedia.org/wiki/2025_Women%27s_Hockey_Africa_Cup_of_Nations",
  "acn22m": "https://en.wikipedia.org/wiki/2022_Men%27s_Hockey_Africa_Cup_of_Nations",
  "h5wc": "https://tms.fih.ch/competitions/1558/reports/matches",
  "oq23m": "https://en.wikipedia.org/wiki/2023_Men%27s_African_Olympic_Qualifier",
  "oq23w": "https://en.wikipedia.org/wiki/2023_Women%27s_African_Olympic_Qualifier",
  "wikiMen": "https://en.wikipedia.org/wiki/Nigeria_men%27s_national_field_hockey_team",
  "wikiWomen": "https://en.wikipedia.org/wiki/Nigeria_women%27s_national_field_hockey_team",
  "afhf": "https://www.africahockey.org/fih-world-rankings-update-following-hockey-world-cup-2026/",
  "gazette": "https://gazettengr.com/delta-queens-confident-team-will-reach-hockey-super-league-final/",
  "africasport": "https://www.africasport.net/article/others/hockey-super-league-returns-to-abuja-with-focus",
  "bsn": "https://bsnsports.com.ng/post/Kada-Stars--Kada-Queens-Retain-Titles-at-2025-National-Hockey-Super-League",
  "bsnU18": "https://bsnsports.com.ng/post/U18-Youth-Africa-Cup--Nigeria-Hold-South-Africa-In-Thrilling-14-Goal-Thriller",
  "leadership": "https://leadership.ng/nigeria-hockey-targets-global-revival-as-super-league-2026-begins-with-renewed-hope-international-backing/",
  "h5s": "https://olympics.com/en/news/hockey5s-rules-how-to-play"
} as const;

export type Result = { date: string; competition: string; opponent: string; for: number; against: number; source: string; note?: string };
export interface NationalTeam { slug: string; name: string; rank: number | null; points?: string; note: string; source: string; honours: string[]; results: Result[] }

export const RANKINGS_CHECKED = '2026-11-04';

export const NATIONAL_TEAMS: NationalTeam[] = [
  {
    "slug": "men",
    "name": "Senior men",
    "rank": 35,
    "points": "1,700.42",
    "note": "4th in Africa",
    "source": "https://www.fih.hockey/outdoor-rankings/nigeria-men-hockey-rankings-49",
    "honours": [
      "Africa Cup of Nations bronze: 2022 Accra, 2025 Ismailia",
      "African Games bronze: 1987 Nairobi, 2023 Accra",
      "FIH Hockey5s World Cup 2024: 14th of 16",
      "FIH Hockey5s ranking: 14th in the world, 3rd in Africa"
    ],
    "results": [
      {
        "date": "2025-10-18",
        "competition": "Africa Cup of Nations · 3rd place",
        "opponent": "Kenya",
        "for": 3,
        "against": 1,
        "source": "https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-17",
        "competition": "Africa Cup of Nations",
        "opponent": "South Africa",
        "for": 3,
        "against": 8,
        "source": "https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-15",
        "competition": "Africa Cup of Nations",
        "opponent": "Kenya",
        "for": 1,
        "against": 2,
        "source": "https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-14",
        "competition": "Africa Cup of Nations",
        "opponent": "Zambia",
        "for": 5,
        "against": 1,
        "source": "https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-12",
        "competition": "Africa Cup of Nations",
        "opponent": "Egypt",
        "for": 3,
        "against": 6,
        "source": "https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-11",
        "competition": "Africa Cup of Nations",
        "opponent": "Ghana",
        "for": 2,
        "against": 1,
        "source": "https://en.wikipedia.org/wiki/2025_Men%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2024-01-31",
        "competition": "Hockey5s World Cup · 13th–14th",
        "opponent": "United States",
        "for": 9,
        "against": 10,
        "source": "https://tms.fih.ch/competitions/1558/reports/matches"
      },
      {
        "date": "2024-01-30",
        "competition": "Hockey5s World Cup · 13th–16th",
        "opponent": "Fiji",
        "for": 5,
        "against": 5,
        "source": "https://tms.fih.ch/competitions/1558/reports/matches",
        "note": "Won 2–1 on shoot-out"
      },
      {
        "date": "2023-11-04",
        "competition": "African Olympic Qualifier · 5th place",
        "opponent": "Kenya",
        "for": 4,
        "against": 3,
        "source": "https://en.wikipedia.org/wiki/2023_Men%27s_African_Olympic_Qualifier"
      },
      {
        "date": "2023-11-02",
        "competition": "African Olympic Qualifier · 5th–8th",
        "opponent": "Zambia",
        "for": 5,
        "against": 1,
        "source": "https://en.wikipedia.org/wiki/2023_Men%27s_African_Olympic_Qualifier"
      },
      {
        "date": "2022-01-23",
        "competition": "Africa Cup of Nations · 3rd place",
        "opponent": "Kenya",
        "for": 4,
        "against": 2,
        "source": "https://en.wikipedia.org/wiki/2022_Men%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2022-01-22",
        "competition": "Africa Cup of Nations · Semi-final",
        "opponent": "South Africa",
        "for": 0,
        "against": 7,
        "source": "https://en.wikipedia.org/wiki/2022_Men%27s_Hockey_Africa_Cup_of_Nations"
      }
    ]
  },
  {
    "slug": "women",
    "name": "Senior women",
    "rank": 38,
    "points": "1,311.22",
    "note": "Last ranked match 18 Oct 2025",
    "source": "https://www.fih.hockey/outdoor-rankings/nigeria-women-hockey-rankings-49",
    "honours": [
      "African Games silver: 2003 Abuja, 2023 Accra",
      "Africa Cup of Nations bronze: 2009 Accra, 2017 Ismailia",
      "African Olympic Qualifier 2023: runner-up",
      "FIH World Cup: 11th in 1976, 10th in 1978"
    ],
    "results": [
      {
        "date": "2025-10-18",
        "competition": "Africa Cup of Nations · 3rd place",
        "opponent": "Kenya",
        "for": 0,
        "against": 1,
        "source": "https://en.wikipedia.org/wiki/2025_Women%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-17",
        "competition": "Africa Cup of Nations",
        "opponent": "South Africa",
        "for": 0,
        "against": 5,
        "source": "https://en.wikipedia.org/wiki/2025_Women%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-15",
        "competition": "Africa Cup of Nations",
        "opponent": "Egypt",
        "for": 2,
        "against": 0,
        "source": "https://en.wikipedia.org/wiki/2025_Women%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-12",
        "competition": "Africa Cup of Nations",
        "opponent": "Ghana",
        "for": 1,
        "against": 5,
        "source": "https://en.wikipedia.org/wiki/2025_Women%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2025-10-11",
        "competition": "Africa Cup of Nations",
        "opponent": "Kenya",
        "for": 0,
        "against": 1,
        "source": "https://en.wikipedia.org/wiki/2025_Women%27s_Hockey_Africa_Cup_of_Nations"
      },
      {
        "date": "2023-11-05",
        "competition": "African Olympic Qualifier · Final",
        "opponent": "South Africa",
        "for": 0,
        "against": 9,
        "source": "https://en.wikipedia.org/wiki/2023_Women%27s_African_Olympic_Qualifier"
      },
      {
        "date": "2023-11-03",
        "competition": "African Olympic Qualifier",
        "opponent": "Kenya",
        "for": 1,
        "against": 0,
        "source": "https://en.wikipedia.org/wiki/2023_Women%27s_African_Olympic_Qualifier"
      },
      {
        "date": "2023-11-01",
        "competition": "African Olympic Qualifier",
        "opponent": "Zimbabwe",
        "for": 2,
        "against": 1,
        "source": "https://en.wikipedia.org/wiki/2023_Women%27s_African_Olympic_Qualifier"
      },
      {
        "date": "2023-10-30",
        "competition": "African Olympic Qualifier",
        "opponent": "South Africa",
        "for": 0,
        "against": 4,
        "source": "https://en.wikipedia.org/wiki/2023_Women%27s_African_Olympic_Qualifier"
      }
    ]
  },
  {
    "slug": "u18",
    "name": "U18 Hockey5s",
    "rank": null,
    "note": "Boys and girls",
    "source": "https://tms.fih.ch/competitions/1937",
    "honours": [
      "Hockey5s Youth Africa Cup 2026: bronze for the girls and for the boys",
      "Leading scorer 2026: Ifeoluwa Olaitan, 14 goals",
      "Goalkeeper of the tournament 2026: Emmanuel Yakubu"
    ],
    "results": [
      {
        "date": "2026-08-08",
        "competition": "Youth Africa Cup · girls · 3rd place",
        "opponent": "Ghana",
        "for": 4,
        "against": 3,
        "source": "https://tms.fih.ch/competitions/1937"
      },
      {
        "date": "2026-08-08",
        "competition": "Youth Africa Cup · boys · 3rd place",
        "opponent": "Uganda",
        "for": 15,
        "against": 2,
        "source": "https://tms.fih.ch/competitions/1936"
      },
      {
        "date": "2026-08-08",
        "competition": "Youth Africa Cup · girls",
        "opponent": "Kenya",
        "for": 6,
        "against": 10,
        "source": "https://tms.fih.ch/competitions/1937"
      },
      {
        "date": "2026-08",
        "competition": "Youth Africa Cup · girls",
        "opponent": "South Africa",
        "for": 7,
        "against": 4,
        "source": "https://tms.fih.ch/competitions/1937"
      },
      {
        "date": "2026-08",
        "competition": "Youth Africa Cup · girls",
        "opponent": "Ghana",
        "for": 6,
        "against": 2,
        "source": "https://tms.fih.ch/competitions/1937"
      },
      {
        "date": "2026-08",
        "competition": "Youth Africa Cup · girls",
        "opponent": "Uganda",
        "for": 5,
        "against": 1,
        "source": "https://tms.fih.ch/competitions/1937"
      },
      {
        "date": "2026-08",
        "competition": "Youth Africa Cup · boys",
        "opponent": "South Africa",
        "for": 7,
        "against": 7,
        "source": "https://tms.fih.ch/competitions/1936"
      },
      {
        "date": "2026-08",
        "competition": "Youth Africa Cup · boys",
        "opponent": "Kenya",
        "for": 5,
        "against": 10,
        "source": "https://tms.fih.ch/competitions/1936"
      },
      {
        "date": "2026-08",
        "competition": "Youth Africa Cup · boys",
        "opponent": "Uganda",
        "for": 8,
        "against": 5,
        "source": "https://tms.fih.ch/competitions/1936"
      }
    ]
  }
];

export const nationalTeam = (slug: string) => NATIONAL_TEAMS.find((t) => t.slug === slug);
