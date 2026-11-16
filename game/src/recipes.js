/** Press geometry and readable color/symbol metadata, shared by the game modules. */
export const INK_STATIONS = Object.freeze([0.30, 0.50, 0.70]);
export const STAMP_X = 0.82;
export const SHIP_X = 0.96;
export const INKS = Object.freeze([
  { bit: 1, name: 'Cyan', short: 'C', symbol: '●', color: '#31b9d4' },
  { bit: 2, name: 'Magenta', short: 'M', symbol: '◆', color: '#ed5b85' },
  { bit: 4, name: 'Yellow', short: 'Y', symbol: '▲', color: '#f2c64e' },
]);
export const STAMPS = Object.freeze(['circle', 'diamond', 'star']);
export const RECIPE_COLORS = Object.freeze([
  '#f9f2d9', '#31b9d4', '#ed5b85', '#7965bd',
  '#f2c64e', '#51b890', '#ed8550', '#303b53',
]);
export const RECIPE_NAMES = Object.freeze([
  'Paper', 'Cyan', 'Magenta', 'Violet', 'Yellow', 'Jade', 'Coral', 'Midnight',
]);

export function recipeName(mask) {
  return RECIPE_NAMES[mask & 7];
}

export function recipeColor(mask) {
  return RECIPE_COLORS[mask & 7];
}

export function recipeSymbols(mask) {
  return INKS.filter(ink => mask & ink.bit).map(ink => ink.short).join(' + ');
}

export function stampName(stamp) {
  return stamp === 'diamond' ? 'Diamond' : stamp === 'star' ? 'Star' : 'Circle';
}

export function recipeMatches(sheet, needsStamp) {
  return sheet.inkMask === sheet.targetMask && (!needsStamp || sheet.stamp === sheet.targetStamp);
}

/** A tiny seeded generator; replaying identical input produces identical workshop state. */
export function nextRandom(state) {
  let value = state.rng >>> 0;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  state.rng = value >>> 0;
  return state.rng / 4294967296;
}
