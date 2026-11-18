/** Each shift adds one new idea while retaining time to inspect incoming orders. */
export const SHIFTS = Object.freeze([
  {
    title: 'First impressions', subtitle: 'Shift 01 · The neighborhood run',
    brief: 'Ship seven good prints. Match the ink letters on each order: C means cyan, M means magenta. Route the next paper to a ready lane.',
    hint: 'Click a roller or use C/M/Y to toggle the selected lane. Click a lane to route the next order there.',
    duration: 60, quota: 7, speed: 0.108, spawnEvery: 4.5,
    recipes: [1, 2], stamps: false, qualityMax: 5, points: 100,
    lanePresets: [1, 2, 0], theme: 'morning',
  },
  {
    title: 'Color comes alive', subtitle: 'Shift 02 · The festival posters',
    brief: 'Violet is C + M. Jade is C + Y. Coral is M + Y. Layers combine, so set the rollers before the paper reaches them.',
    hint: 'Read the next order cards and prepare a lane. Space slows every belt briefly when the workshop gets busy.',
    duration: 65, quota: 9, speed: 0.115, spawnEvery: 4.0,
    recipes: [1, 2, 4, 3, 5, 6], stamps: false, qualityMax: 5, points: 130,
    lanePresets: [3, 5, 6], theme: 'noon',
  },
  {
    title: 'Make your mark', subtitle: 'Shift 03 · The special edition',
    brief: 'Every order now needs a matching final stamp. Choose circle, diamond, or star on its lane before the sheet reaches the stamp press.',
    hint: 'S cycles the selected lane’s stamp. Its shape must match the outline on the order card.',
    duration: 70, quota: 10, speed: 0.120, spawnEvery: 3.8,
    recipes: [1, 2, 3, 4, 5, 6], stamps: true, qualityMax: 6, points: 160,
    lanePresets: [3, 5, 6], theme: 'afternoon',
  },
  {
    title: 'The rush job', subtitle: 'Shift 04 · The evening dispatch',
    brief: 'The courier is waiting. Midnight uses all three inks, and orders arrive faster. A mistake breaks your combo; a clean run earns a generous bonus.',
    hint: 'Keep one lane ready for a recurring recipe. Recycle a doomed sheet before it reaches dispatch.',
    duration: 75, quota: 12, speed: 0.128, spawnEvery: 3.4,
    recipes: [1, 3, 4, 5, 6, 7], stamps: true, qualityMax: 6, points: 190,
    lanePresets: [3, 5, 7], theme: 'evening',
  },
  {
    title: 'The master edition', subtitle: 'Shift 05 · Your signature collection',
    brief: 'One final run of fifteen perfect orders. Every recipe and stamp is in play. Balance three lanes and bring the workshop’s signature collection home.',
    hint: 'Plan two orders ahead. Brakes buy thinking time, but changing a roller also affects other sheets on its lane.',
    duration: 85, quota: 15, speed: 0.135, spawnEvery: 3.1,
    recipes: [1, 2, 3, 4, 5, 6, 7], stamps: true, qualityMax: 7, points: 220,
    lanePresets: [3, 5, 7], theme: 'night',
  },
]);

export const UPGRADES = Object.freeze([
  { id: 'quality', title: 'Extra proof paper', description: 'One extra proof point in every remaining shift.', short: '+1 proof', icon: '✓', benefit: 'Room for one mistake', strategy: 'A safety net for rush commissions.' },
  { id: 'brake', title: 'Precision brake', description: 'Brakes last 0.4 seconds longer and cool down 1.5 seconds sooner.', short: 'Better brakes', icon: 'Ⅱ', benefit: 'More thinking time', strategy: 'Set several lanes while the belts slow.' },
  { id: 'combo', title: 'Signature finish', description: 'Consecutive good prints earn 20% more combo bonus.', short: 'Better combos', icon: '✳', benefit: 'Reward a clean streak', strategy: 'A strong match for Corner Books.' },
  { id: 'transfer', title: 'Crossfeed carriage', description: 'Moving paper between lanes cools down 1.5 seconds sooner.', short: 'Faster crossfeed', icon: '⇅', benefit: 'Move, then layer', strategy: 'Use Q/E to send unfinished paper to a ready lane.' },
  { id: 'reclaim', title: 'Paper recovery', description: 'Recycling keeps your combo; every second recycle restores one proof point. A second upgrade restores on every recycle.', short: 'Recover proofs', icon: '♲', benefit: 'Save a troubled run', strategy: 'Recovery costs time, but preserves your streak.' },
  { id: 'batch', title: 'Batch memory', description: 'Ship the same ink recipe twice in a row for +60 points and 0.6 seconds per upgrade.', short: 'Reward repeat inks', icon: '▤', benefit: 'Keep a favorite lane', strategy: 'Pairs and spot-color commissions reward planning.' },
]);

export function upgradeOffers(seed, index, upgrades) {
  if (index === 0) return ['transfer', 'brake', 'quality'];
  const choices = UPGRADES.filter(item => (upgrades[item.id] || 0) < 2).map(item => item.id);
  let random = (seed ^ Math.imul(index + 1, 374761393)) >>> 0;
  for (let i = choices.length - 1; i > 0; i--) {
    random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
    const j = random % (i + 1);
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices.slice(0, 3);
}

export function shiftGrade(stats) {
  const ratio = stats.spoiled / Math.max(1, stats.shipped + stats.spoiled);
  if (stats.spoiled === 0) return 'FLAWLESS';
  if (ratio <= 0.15) return 'EXCELLENT';
  if (ratio <= 0.30) return 'WELL PRINTED';
  return 'DELIVERED';
}
