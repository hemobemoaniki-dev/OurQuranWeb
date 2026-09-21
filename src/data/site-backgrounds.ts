export type SiteBackgroundCategory = "Islamic" | "Nature";

const SOLAR_EMBER = require("../../assets/reader/solar-ember.jpg");
const MOONLIT_ORCHID = require("../../assets/reader/moonlit-orchid.jpg");
const SAPPHIRE_TIDE = require("../../assets/reader/sapphire-tide.jpg");
const EMERALD_DUSK = require("../../assets/reader/emerald-dusk.jpg");
const SAKURA_MIST = require("../../assets/reader/sakura-mist.jpg");

export const SITE_BACKGROUNDS = [
  { id: "golden-sanctuary", name: "Golden Sanctuary", category: "Islamic", source: require("../../assets/images/sanctuary-wallpaper.webp"), position: "center", opacity: 1, warmth: "gold" },
  { id: "moonlit-minaret", name: "Moonlit Minaret", category: "Islamic", source: MOONLIT_ORCHID, position: "center", opacity: 0.54, warmth: "violet" },
  { id: "sapphire-mihrab", name: "Sapphire Mihrab", category: "Islamic", source: SAPPHIRE_TIDE, position: "center", opacity: 0.55, warmth: "blue" },
  { id: "emerald-courtyard", name: "Emerald Courtyard", category: "Islamic", source: EMERALD_DUSK, position: "center", opacity: 0.56, warmth: "green" },
  { id: "rose-lantern-hall", name: "Rose Lantern Hall", category: "Islamic", source: SAKURA_MIST, position: "center", opacity: 0.52, warmth: "rose" },
  { id: "midnight-masjid", name: "Midnight Masjid", category: "Islamic", source: MOONLIT_ORCHID, position: "top", opacity: 0.48, warmth: "blue" },
  { id: "amber-archway", name: "Amber Archway", category: "Islamic", source: SOLAR_EMBER, position: "top", opacity: 0.5, warmth: "gold" },
  { id: "blue-dome", name: "Blue Dome", category: "Islamic", source: SAPPHIRE_TIDE, position: "top", opacity: 0.5, warmth: "blue" },
  { id: "garden-mosque", name: "Garden Mosque", category: "Islamic", source: EMERALD_DUSK, position: "top", opacity: 0.5, warmth: "green" },
  { id: "dawn-prayer-hall", name: "Dawn Prayer Hall", category: "Islamic", source: SAKURA_MIST, position: "top", opacity: 0.5, warmth: "rose" },

  { id: "desert-ember", name: "Desert Ember", category: "Nature", source: SOLAR_EMBER, position: "bottom", opacity: 0.5, warmth: "gold" },
  { id: "moonlit-valley", name: "Moonlit Valley", category: "Nature", source: MOONLIT_ORCHID, position: "bottom", opacity: 0.48, warmth: "violet" },
  { id: "sapphire-lake", name: "Sapphire Lake", category: "Nature", source: SAPPHIRE_TIDE, position: "bottom", opacity: 0.5, warmth: "blue" },
  { id: "emerald-forest", name: "Emerald Forest", category: "Nature", source: EMERALD_DUSK, position: "bottom", opacity: 0.52, warmth: "green" },
  { id: "sakura-dawn", name: "Sakura Dawn", category: "Nature", source: SAKURA_MIST, position: "bottom", opacity: 0.48, warmth: "rose" },
  { id: "golden-dunes", name: "Golden Dunes", category: "Nature", source: SOLAR_EMBER, position: "left", opacity: 0.46, warmth: "gold" },
  { id: "alpine-night", name: "Alpine Night", category: "Nature", source: MOONLIT_ORCHID, position: "left", opacity: 0.46, warmth: "blue" },
  { id: "ocean-mist", name: "Ocean Mist", category: "Nature", source: SAPPHIRE_TIDE, position: "right", opacity: 0.48, warmth: "blue" },
  { id: "cedar-grove", name: "Cedar Grove", category: "Nature", source: EMERALD_DUSK, position: "right", opacity: 0.5, warmth: "green" },
  { id: "rose-horizon", name: "Rose Horizon", category: "Nature", source: SAKURA_MIST, position: "right", opacity: 0.46, warmth: "rose" },
] as const;

export type SiteBackgroundId = typeof SITE_BACKGROUNDS[number]["id"];
export type SiteBackground = typeof SITE_BACKGROUNDS[number];

export const DEFAULT_SITE_BACKGROUND: SiteBackgroundId = "golden-sanctuary";

export function siteBackground(value: unknown): SiteBackground {
  return SITE_BACKGROUNDS.find((item) => item.id === value) ?? SITE_BACKGROUNDS[0];
}
