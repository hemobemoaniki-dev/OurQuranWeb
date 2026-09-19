export const READER_THEMES = [
  { id: 'moonlit-orchid', name: 'Moonlit Orchid', base: '#080D23', accent: '#EDADF5', end: '#9076DC', glass: 'rgba(15,18,45,0.48)', border: '#B58ACC' },
  { id: 'solar-ember', name: 'Solar Ember', base: '#24140B', accent: '#FFE785', end: '#EF9A38', glass: 'rgba(43,24,12,0.48)', border: '#CB8C49' },
  { id: 'sapphire-tide', name: 'Sapphire Tide', base: '#031729', accent: '#A0F4D8', end: '#39C5D0', glass: 'rgba(3,27,45,0.48)', border: '#71B9CD' },
  { id: 'emerald-dusk', name: 'Emerald Dusk', base: '#041B1D', accent: '#B4EFC3', end: '#45B598', glass: 'rgba(5,29,30,0.48)', border: '#77AB9A' },
  { id: 'sakura-mist', name: 'Sakura Mist', base: '#30202C', accent: '#FFD0E5', end: '#E88EB1', glass: 'rgba(49,29,43,0.48)', border: '#DAADBC' },
] as const;
export type ReaderThemeId = typeof READER_THEMES[number]['id'];
export type ReaderTheme = typeof READER_THEMES[number];
export function readerTheme(value: unknown): ReaderTheme {
  return READER_THEMES.find(t => t.id === value) ?? READER_THEMES[0];
}
