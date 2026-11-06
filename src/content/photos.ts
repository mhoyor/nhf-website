// Photos used on the website. Swap a file in public/img, or point a slot at another file.
export interface Photo { src: string; position: string; credit: string; alt?: string }
export const PHOTOS: Record<string, Photo> = {
  "hero": {
    "src": "/img/u18-team-bronze.jpg",
    "position": "50% 26%",
    "credit": "Photo: National Sports Commission"
  },
  "news-u18-double-bronze": {
    "src": "/img/u18-team-bronze.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "news-u18-girls-bronze": {
    "src": "/img/u18-girls-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "news-u18-boys-bronze": {
    "src": "/img/u18-boys-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "news-african-games-medals": {
    "src": "/img/women-team.jpg",
    "position": "50% 40%",
    "credit": "File photo, credit to confirm",
    "alt": "Nigeria’s women’s squad (file photo)"
  },
  "news-hsl-2026": {
    "src": "/img/hsl-2026-match-day-2.jpg",
    "position": "50% 16%",
    "credit": "Graphic: Super League 2026"
  },
  "team-women": {
    "src": "/img/women-team.jpg",
    "position": "50% 45%",
    "credit": "Photo supplied, credit to confirm"
  },
  "team-u18": {
    "src": "/img/u18-team-bronze.jpg",
    "position": "50% 30%",
    "credit": "Photo: National Sports Commission"
  },
  "team-u18g": {
    "src": "/img/u18-girls-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "team-u18b": {
    "src": "/img/u18-boys-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "campaign": {
    "src": "/img/u18-girls-stick.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "act-1": {
    "src": "/img/u18-girls-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "act-2": {
    "src": "/img/u18-boys-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "act-3": {
    "src": "/img/u18-girls-stick.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "act-4": {
    "src": "/img/u18-boys-close.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "act-5": {
    "src": "/img/u18-medals-detail.jpg",
    "position": "50% 40%",
    "credit": "Photo: National Sports Commission"
  },
  "explain-hero": {
    "src": "/img/u18-girls-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  },
  "stats-hero": {
    "src": "/img/u18-team-bronze.jpg",
    "position": "50% 25%",
    "credit": "Photo: National Sports Commission"
  },
  "gallery-hero": {
    "src": "/img/u18-boys-action.jpg",
    "position": "50% 50%",
    "credit": "Photo: National Sports Commission"
  }
};

export const GALLERY: { src: string; caption: string }[] = [
  {
    "src": "/img/u18-team-bronze.jpg",
    "caption": "Nigeria’s U18 girls and boys with their bronze medals, Nairobi, August 2026"
  },
  {
    "src": "/img/u18-girls-action.jpg",
    "caption": "U18 girls v Ghana, bronze-medal match, won 4–3"
  },
  {
    "src": "/img/u18-boys-action.jpg",
    "caption": "U18 boys v Uganda, third-place match, won 15–2"
  },
  {
    "src": "/img/u18-medals-detail.jpg",
    "caption": "Bronze medals and the team plaque"
  },
  {
    "src": "/img/women-team.jpg",
    "caption": "Nigeria women’s squad"
  },
  {
    "src": "/img/hsl-2026-match-day-2.jpg",
    "caption": "Super League 2026, Match Day 2"
  }
];

export const creditFor = (src: string) =>  (/u18-/.test(src) ? 'Photo: National Sports Commission' : /women-team/.test(src) ? 'Photo supplied, credit to confirm' : /hsl-/.test(src) ? 'Graphic: Super League 2026' : '');
