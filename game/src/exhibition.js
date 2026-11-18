import { nextRandom, STAMPS, recipeMatches } from './recipes.js';

/** Three production puzzles: synchronize, turn a printed sheet, then combine both. */
export const EXHIBITIONS = Object.freeze([
  { id: 'gallery', title: 'The paired gallery', subtitle: 'Exhibition 01 · Two prints, one frame',
    brief: 'Print four matching pairs. Each feed sends two different orders to neighboring lanes. Ship both clean sheets within three seconds to frame a pair.',
    hint: 'Route the first sheet with 1/2/3; its partner enters the next lane. Set both lanes before the feed. Each completed frame earns +180.',
    paired: true, duplex: false, goal: 4, quota: 8, duration: 85, speed: .12, spawnEvery: 7.8,
    qualityMax: 7, points: 170, theme: 'afternoon', recipes: [1, 2, 3, 4, 5, 6], stamps: true },
  { id: 'folio', title: 'Turn the page', subtitle: 'Exhibition 02 · The two-sided folio',
    brief: 'Print six two-sided folios. A correct front waits at the return rack. Select its lane and press F to turn it onto the neighboring belt. Set the new ink and stamp for its back.',
    hint: 'F turns only a waiting front. Its artwork stays on the other face. The back needs fresh rollers; Q/E can crossfeed it. Each finished folio earns +120.',
    paired: false, duplex: true, goal: 6, quota: 6, duration: 100, speed: .13, spawnEvery: 6.6,
    qualityMax: 7, points: 200, theme: 'evening', recipes: [1, 2, 3, 4, 5, 6, 7], stamps: true },
  { id: 'showcase', title: 'The grand showcase', subtitle: 'Exhibition 03 · Your printing finale',
    brief: 'Frame three pairs of two-sided prints. Two fronts enter together, both return for their backs, and the finished folios must ship within three seconds of one another.',
    hint: 'Plan both return lanes. Turn partners promptly, then prepare their backs together. Save the brake for the final stamp. Each completed frame earns +180.',
    paired: true, duplex: true, goal: 3, quota: 6, duration: 110, speed: .128, spawnEvery: 9.2,
    qualityMax: 8, points: 230, theme: 'night', recipes: [1, 2, 3, 4, 5, 6, 7], stamps: true },
]);

export const PRESS_KITS = Object.freeze([
  { id: 'steady', title: 'The steady hand', icon: 'Ⅱ', description: 'Extra proof paper and longer precision brakes. Learn the new presses with room to recover.', upgrades: { quality: 1, brake: 1 } },
  { id: 'flow', title: 'The paper dancer', icon: '⇅', description: 'Faster crossfeed and paper recovery. Move sheets between lanes and recycle without losing a streak.', upgrades: { transfer: 1, reclaim: 1 } },
  { id: 'signature', title: 'The signature press', icon: '✳', description: 'Stronger clean combos and repeat-ink batch rewards. Risk fewer safety tools for a higher score.', upgrades: { combo: 1, batch: 1 } },
]);

export const RETURN_X = .91;
export const PAIR_WINDOW = 3;

export function createExhibition(index) {
  const venue = EXHIBITIONS[index];
  return { ...venue, index, completed: 0, waitingPairs: {}, nextPairId: 1,
    framed: [], turns: 0, bonus: 0, missedPairs: 0 };
}

export function exhibitionOrder(state, order) {
  if (!state.exhibition) return order;
  const choices = state.level.recipes;
  const anotherMask = mask => {
    const options = choices.filter(value => value !== mask);
    return options[Math.floor(nextRandom(state) * options.length)];
  };
  const stamp = () => STAMPS[Math.floor(nextRandom(state) * STAMPS.length)];
  return { ...order, backMask: state.exhibition.duplex ? anotherMask(order.targetMask) : null,
    backStamp: stamp(), partnerMask: state.exhibition.paired ? anotherMask(order.targetMask) : null,
    partnerStamp: stamp(), partnerBackMask: state.exhibition.duplex ? anotherMask(order.targetMask) : null,
    partnerBackStamp: stamp() };
}

export function feedExhibition(state, order, firstId) {
  const tour = state.exhibition;
  const pairId = tour.paired ? tour.nextPairId++ : null;
  const base = { pairId, side: tour.duplex ? 'front' : null, frontPrint: null, awaitingFlip: false };
  const sheets = [{ ...order, ...base, id: firstId, lane: state.routingLane }];
  if (tour.paired) sheets.push({ ...base, id: firstId + 1, lane: (state.routingLane + 1) % 3,
    targetMask: order.partnerMask, targetStamp: order.partnerStamp,
    backMask: order.partnerBackMask, backStamp: order.partnerBackStamp, priority: false });
  return sheets;
}

export function waitForTurn(sheet) {
  if (sheet.side !== 'front' || sheet.awaitingFlip || sheet.x < RETURN_X || !recipeMatches(sheet, true)) return false;
  sheet.awaitingFlip = true;
  sheet.x = RETURN_X;
  return true;
}

export function turnFolio(state) {
  const sheet = state.sheets.filter(item => item.lane === state.selectedLane && item.awaitingFlip).sort((a, b) => a.id - b.id)[0];
  if (!sheet) return { type: 'turn-blocked', reason: 'Select a lane with a correct front waiting at the return rack.' };
  const lane = (sheet.lane + 1) % 3;
  if (state.sheets.some(item => item !== sheet && item.lane === lane && item.x < .13)) return { type: 'turn-blocked', reason: 'The return lane needs a gap at its feed. Wait a moment or crossfeed that sheet.' };
  const from = sheet.lane;
  sheet.frontPrint = { edition: state.shiftIndex, mask: sheet.inkMask, stamp: sheet.stamp };
  Object.assign(sheet, { side: 'back', targetMask: sheet.backMask, targetStamp: sheet.backStamp,
    lane, x: .025, inkMask: 0, processedMask: 0, stamp: null, stamped: false, awaitingFlip: false });
  state.selectedLane = lane;
  state.exhibition.turns++;
  return { type: 'turn', id: sheet.id, from, lane, mask: sheet.frontPrint.mask };
}

export function recordExhibitionPrint(state, sheet) {
  const tour = state.exhibition;
  if (!tour) return [];
  const events = [];
  if (tour.duplex) {
    tour.bonus += 120;
    state.stats.score += 120;
    events.push({ type: 'folio-complete', bonus: 120, id: sheet.id });
  }
  if (!tour.paired) { tour.completed++; return events; }
  const first = tour.waitingPairs[sheet.pairId];
  if (!first) tour.waitingPairs[sheet.pairId] = { time: state.clock, specimen: { edition: state.shiftIndex, mask: sheet.inkMask, stamp: sheet.stamp } };
  else {
    delete tour.waitingPairs[sheet.pairId];
    if (state.clock - first.time <= PAIR_WINDOW + .0001) {
      tour.completed++;
      tour.bonus += 180;
      state.stats.score += 180;
      tour.framed.push([first.specimen, { edition: state.shiftIndex, mask: sheet.inkMask, stamp: sheet.stamp }]);
      tour.framed = tour.framed.slice(-3);
      events.push({ type: 'pair-complete', bonus: 180, completed: tour.completed, goal: tour.goal });
    } else {
      tour.missedPairs++;
      events.push({ type: 'pair-missed', reason: 'Both prints are good. Ship the next partners within three seconds for a frame.' });
    }
  }
  return events;
}

export function exhibitionGoal(tour) {
  return tour.paired ? `Frame ${tour.goal} ${tour.duplex ? 'two-sided ' : ''}pairs` : `Ship ${tour.goal} two-sided folios`;
}
