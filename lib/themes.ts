export interface ThemeDef {
  id: string;
  name: string;
  tagline: string;
}

export const THEMES: ThemeDef[] = [
  { id: "current",  name: "Current",  tagline: "Today's look" },
  { id: "daylight", name: "Daylight", tagline: "Bright rooms" },
  { id: "ink",      name: "Ink",      tagline: "Max legibility" },
  { id: "hearth",   name: "Hearth",   tagline: "Evenings" },
  { id: "glass",    name: "Glass",    tagline: "Richest look" },
  { id: "terminal", name: "Terminal", tagline: "Retro-tech" },
  { id: "soft",     name: "Soft",     tagline: "Tactile" },
  { id: "bauhaus",  name: "Bauhaus",  tagline: "High energy" },
  { id: "sage",     name: "Sage",     tagline: "Natural" },
];

export const DEFAULT_THEME = "current";
export const THEME_STORAGE_KEY = "pulsar:theme";

export function isValidTheme(id: string | null): id is string {
  return !!id && THEMES.some(t => t.id === id);
}
