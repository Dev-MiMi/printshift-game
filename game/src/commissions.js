import { nextRandom, recipeName } from './recipes.js';

/** Clients change both the order sequence and an optional mastery objective. */
export const CLIENTS = Object.freeze([
  { id: 'books', name: 'Corner Books', title: 'The neighborhood reprint', icon: '▤', pattern: 'pairs',
    rule: 'Inks arrive in pairs. Hold a clean streak.', goal: 'streak', target: 6, bonus: 360,
    spawnFactor: 1.06, speedFactor: .98, extraTime: 4, extraQuota: 0, extraProof: 0 },
  { id: 'parade', name: 'Parade Studio', title: 'A color for every voice', icon: '✳', pattern: 'palette',
    rule: 'A rotating palette. Prepare different lanes.', goal: 'palette', target: 4, bonus: 420,
    spawnFactor: 1, speedFactor: 1, extraTime: 0, extraQuota: 0, extraProof: 0 },
  { id: 'courier', name: 'Nightline Dispatch', title: 'The priority delivery', icon: '↗', pattern: 'rush',
    rule: 'Faster feed. Every third order is priority.', goal: 'priority', target: 3, bonus: 500,
    spawnFactor: .88, speedFactor: 1.02, extraTime: 3, extraQuota: 1, extraProof: 0 },
  { id: 'archive', name: 'Fern Archive', title: 'The spot-color edition', icon: '❧', pattern: 'spot',
    rule: 'A recurring spot color, with changing stamps.', goal: 'spot', target: 3, bonus: 380,
    spawnFactor: 1.04, speedFactor: 1, extraTime: 0, extraQuota: 0, extraProof: 1 },
]);

function shuffled(values, seed) {
  const result = [...values], random = { rng: seed >>> 0 || 1 };
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(nextRandom(random) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function commissionOffers(seed, index, level) {
  const order = shuffled(CLIENTS, seed ^ Math.imul(index + 5, 2246822519));
  return order.slice(0, 2).map(client => makeCommission(client.id, seed, index, level));
}

export function makeCommission(id, seed, index, level) {
  const client = CLIENTS.find(item => item.id === id) || CLIENTS[0];
  const salt = CLIENTS.indexOf(client) + 1;
  const palette = shuffled(level.recipes, seed ^ Math.imul(index + salt, 3266489917));
  return { ...client, palette, spotMask: palette[0],
    target: client.goal === 'palette' ? Math.min(client.target, palette.length) : client.target,
    progress: 0, completed: false, colors: [], priorityShipped: 0 };
}

export function commissionObjective(commission) {
  if (!commission) return 'Ship the order book';
  if (commission.goal === 'streak') return `Ship ${commission.target} clean prints in a row`;
  if (commission.goal === 'palette') return `Ship ${commission.target} different ink recipes`;
  if (commission.goal === 'priority') return `Ship ${commission.target} priority orders`;
  return `Ship ${commission.target} ${recipeName(commission.spotMask)} spot-color prints`;
}

export function commissionOrder(state, randomOrder) {
  const commission = state.commission;
  const index = state.orderSequence++;
  if (!commission) return { ...randomOrder, priority: false };
  const palette = commission.palette;
  let targetMask = randomOrder.targetMask;
  if (commission.pattern === 'pairs') targetMask = palette[Math.floor(index / 2) % palette.length];
  if (commission.pattern === 'palette') targetMask = palette[index % palette.length];
  if (commission.pattern === 'spot' && index % 3 === 0) targetMask = commission.spotMask;
  return { ...randomOrder, targetMask, priority: commission.pattern === 'rush' && index % 3 === 0 };
}

export function recordCommissionPrint(state, sheet) {
  const commission = state.commission;
  if (!commission || commission.completed) return false;
  if (commission.goal === 'streak') commission.progress = Math.max(commission.progress, state.stats.combo);
  if (commission.goal === 'palette') {
    if (!commission.colors.includes(sheet.inkMask)) commission.colors.push(sheet.inkMask);
    commission.progress = commission.colors.length;
  }
  if (commission.goal === 'priority' && sheet.priority) commission.progress++;
  if (commission.goal === 'spot' && sheet.inkMask === commission.spotMask) commission.progress++;
  commission.progress = Math.min(commission.target, commission.progress);
  if (commission.progress < commission.target) return false;
  commission.completed = true;
  return true;
}

/** The UTC day is reproducible and also works without a network connection. */
export function dailySeed(date = new Date()) {
  return Number(date.toISOString().slice(0, 10).replaceAll('-', '')) >>> 0;
}

export function runLabel(state) {
  return state.mode === 'daily' ? `DAILY ${state.seed}` : `COLLECTION ${state.seed.toString(36).toUpperCase()}`;
}
