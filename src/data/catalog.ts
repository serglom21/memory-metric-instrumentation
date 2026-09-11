import { delay } from "../lib/delay";
import { posterDataUrl } from "./posters";

export const LOCALE = {
  id: "en-US",
  label: "English (United States)",
};

export type Episode = {
  id: string;
  name: string;
  durationMin: number;
};

export type Title = {
  id: string;
  title: string;
  year: number;
  synopsis: string;
  genres: string[];
  episodes: Episode[];
};

const ADJECTIVES = [
  "Glass",
  "Night",
  "Quiet",
  "Iron",
  "Hollow",
  "Bright",
  "Cold",
  "Silent",
  "Red",
  "Last",
];
const NOUNS = [
  "Harbor",
  "Circuit",
  "Season",
  "Witness",
  "Current",
  "Signal",
];
const GENRES = ["Drama", "Thriller", "Sci-Fi", "Mystery", "Documentary"];

function makeTitle(index: number): Title {
  const id = String(index + 1);
  const title = `${ADJECTIVES[index % ADJECTIVES.length]} ${NOUNS[Math.floor(index / ADJECTIVES.length)]}`;
  const episodeCount = 8 + (index % 5);
  const episodes: Episode[] = Array.from({ length: episodeCount }, (_, episode) => ({
    id: `${id}-e${episode + 1}`,
    name: `Episode ${episode + 1}`,
    durationMin: 42 + ((index + episode) % 17),
  }));

  return {
    id,
    title,
    year: 2018 + (index % 8),
    genres: [GENRES[index % GENRES.length], GENRES[(index + 2) % GENRES.length]],
    synopsis: `${title} follows a drifting archive of broadcasts that only resolve when someone is watching. Season one is the catalog tile you keep returning to — which is the point of this demo.`,
    episodes,
  };
}

const TITLES: Title[] = Array.from({ length: 60 }, (_, index) => makeTitle(index));

export function getPoster(title: Title): string {
  return posterDataUrl(title.id, title.title, 160, 240);
}

export function getHero(title: Title): string {
  return posterDataUrl(`hero-${title.id}`, title.title, 960, 420);
}

export async function fetchCatalog(): Promise<Title[]> {
  await delay(320);
  return TITLES;
}

export async function fetchTitle(id: string): Promise<Title | undefined> {
  await delay(240);
  return TITLES.find((title) => title.id === id);
}
