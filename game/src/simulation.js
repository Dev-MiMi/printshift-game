import { SHIFTS, UPGRADES, upgradeOffers, shiftGrade } from './levels.js';
import { INKS, INK_STATIONS, SHIP_X, STAMP_X, STAMPS, nextRandom, recipeMatches } from './recipes.js';
import { commissionOffers, makeCommission, commissionOrder, recordCommissionPrint } from './commissions.js';
import { EXHIBITIONS, PRESS_KITS, createExhibition, exhibitionOrder, feedExhibition, waitForTurn, turnFolio, recordExhibitionPrint } from './exhibition.js';

const STEP = 1 / 60;
const PREVIEW_COUNT = 3;
const MAX_SHEETS = 18;
const freshUpgrades = () => Object.fromEntries(UPGRADES.map(item => [item.id, 0]));

function event(type, details = {}) {
  return { type, ...details };
}

export function createGame({ mode = 'campaign', seed = 20261116 } = {}) {
  const normalizedSeed = Number(seed) >>> 0 || 20261116;
  const state = {
    mode, seed: normalizedSeed, rng: normalizedSeed,
    stage: 'title', previousStage: null, shiftIndex: 0, level: SHIFTS[0],
    lanes: [], sheets: [], incoming: [], routingLane: 0, selectedLane: 0,
    stats: {}, brake: {}, recycle: {}, history: [],
    upgrades: freshUpgrades(),
    upgradeAvailable: false, upgradeChosen: null, upgradeOffers: [], nextSheetId: 1,
    commission: null, commissionChoices: [], pendingCommission: null, orderSequence: 0,
    transfer: {}, lastPrintMask: null, progress: null, exhibition: null, exhibitionKit: null,
    clock: 0, accumulator: 0, spawnClock: 0, completed: false,
    notice: '', failureReason: '', events: [], maxUnlocked: 0,
  };
  prepareShift(state, ['daily', 'exhibition'].includes(mode) ? 2 : 0);
  state.stage = 'title';
  return state;
}

function makeOrder(state) {
  const choices = state.level.recipes;
  let targetMask = choices[Math.floor(nextRandom(state) * choices.length)];
  const last = state.incoming.at(-1);
  const previous = state.incoming.at(-2);
  if (last && previous && last.targetMask === targetMask && previous.targetMask === targetMask) {
    targetMask = choices[(choices.indexOf(targetMask) + 1) % choices.length];
  }
  const targetStamp = state.level.stamps ? STAMPS[Math.floor(nextRandom(state) * STAMPS.length)] : 'circle';
  return exhibitionOrder(state, commissionOrder(state, { targetMask, targetStamp }));
}

function refillPreview(state) {
  while (state.incoming.length < PREVIEW_COUNT) state.incoming.push(makeOrder(state));
}

function prepareShift(state, index, commissionId = null) {
  state.shiftIndex = state.mode === 'practice' ? 0 : Math.max(0, Math.min(SHIFTS.length - 1, index));
  state.level = state.mode === 'practice' ? {
    ...SHIFTS[0], title: 'Find your rhythm', subtitle: 'Practice · No pressure',
    brief: 'A slower run to learn the press. Ship five good prints using the cyan and magenta lanes, then try the five-shift campaign.',
    hint: 'Click an ink roller to switch it. Click a lane to choose where the next blank sheet enters.',
    duration: 90, quota: 5, speed: 0.082, spawnEvery: 6, qualityMax: 8,
  } : { ...SHIFTS[state.shiftIndex] };
  state.exhibition = state.mode === 'exhibition' ? createExhibition(state.shiftIndex - 2) : null;
  if (state.exhibition) state.level = { ...state.level, ...EXHIBITIONS[state.exhibition.index] };
  state.commission = null;
  if (!state.exhibition && state.mode !== 'practice' && state.shiftIndex > 0) {
    const id = commissionId || commissionOffers(state.seed, state.shiftIndex, state.level)[0].id;
    state.commission = makeCommission(id, state.seed, state.shiftIndex, state.level);
    const client = state.commission;
    state.level = { ...state.level,
      duration: state.level.duration + client.extraTime,
      quota: state.level.quota + client.extraQuota,
      speed: state.level.speed * client.speedFactor,
      spawnEvery: state.level.spawnEvery * client.spawnFactor,
      qualityMax: state.level.qualityMax + client.extraProof };
  }
  state.rng = (state.seed ^ Math.imul(state.shiftIndex + 1, 2654435761)) >>> 0 || 1;
  state.lanes = state.level.lanePresets.map((inkMask, lane) => ({ inkMask, stamp: STAMPS[lane], pulse: 0 }));
  state.sheets = [];
  state.incoming = [];
  state.routingLane = 0;
  state.selectedLane = 0;
  const qualityMax = state.level.qualityMax + state.upgrades.quality;
  state.stats = {
    score: 0, campaignScore: state.history.reduce((sum, shift) => sum + shift.score, 0),
    shipped: 0, spoiled: 0, recycled: 0, combo: 0, bestCombo: 0,
    quality: qualityMax, qualityMax, timeRemaining: state.level.duration,
    quota: state.level.quota, earned: 0, elapsed: 0,
    specimen: null, commissionBonus: 0, batchBonus: 0, transfers: 0, frontSpecimen: null,
    timeExtension: 0, priorityShipped: 0,
  };
  state.brake = { remaining: 0, cooldown: 0, ready: true, duration: 2.2 + state.upgrades.brake * 0.4 };
  state.recycle = { cooldown: 0, ready: true };
  state.transfer = { cooldown: 0, ready: true, enabled: state.mode !== 'practice' && state.shiftIndex > 0 };
  state.lastPrintMask = null;
  state.orderSequence = 0;
  state.clock = 0;
  state.accumulator = 0;
  state.spawnClock = 1.5;
  state.completed = false;
  state.notice = '';
  state.failureReason = '';
  state.events = [];
  state.upgradeAvailable = false;
  state.upgradeChosen = null;
  state.upgradeOffers = [];
  state.commissionChoices = [];
  state.pendingCommission = null;
  refillPreview(state);
}

export function beginShift(state, index = state.shiftIndex, commissionId = null) {
  prepareShift(state, index, commissionId);
  state.stage = 'brief';
  state.previousStage = null;
  const events = [event('brief', { index: state.shiftIndex })];
  state.events = events;
  return events;
}

function finishShift(state, events) {
  state.completed = true;
  const timeBonus = Math.ceil(state.stats.timeRemaining) * 5;
  const qualityBonus = state.stats.quality * 35;
  state.stats.score += timeBonus + qualityBonus;
  state.stats.earned = timeBonus + qualityBonus;
  const result = {
    index: state.shiftIndex, title: state.level.title,
    score: state.stats.score, shipped: state.stats.shipped, spoiled: state.stats.spoiled,
    recycled: state.stats.recycled, bestCombo: state.stats.bestCombo,
    quality: state.stats.quality, qualityMax: state.stats.qualityMax,
    seconds: Math.round(state.stats.elapsed), grade: shiftGrade(state.stats),
    timeBonus, qualityBonus,
    specimen: state.stats.specimen,
    commission: state.commission ? { id: state.commission.id, name: state.commission.name, completed: state.commission.completed, progress: state.commission.progress, target: state.commission.target } : null,
    commissionBonus: state.stats.commissionBonus, batchBonus: state.stats.batchBonus,
    transfers: state.stats.transfers,
    exhibition: state.exhibition ? { id: state.exhibition.id, title: state.exhibition.title, completed: state.exhibition.completed, goal: state.exhibition.goal, turns: state.exhibition.turns, bonus: state.exhibition.bonus, framed: state.exhibition.framed, frontSpecimen: state.stats.frontSpecimen } : null,
  };
  state.history = [...state.history.filter(item => item.index < state.shiftIndex), result];
  state.stats.campaignScore = state.history.reduce((sum, shift) => sum + shift.score, 0);
  state.maxUnlocked = Math.max(state.maxUnlocked, Math.min(SHIFTS.length - 1, state.shiftIndex + 1));
  state.upgradeAvailable = state.mode !== 'practice' && state.shiftIndex < SHIFTS.length - 1;
  if (state.upgradeAvailable) {
    state.upgradeOffers = upgradeOffers(state.seed, state.shiftIndex, state.upgrades);
    state.commissionChoices = state.exhibition ? [] : commissionOffers(state.seed, state.shiftIndex + 1, SHIFTS[state.shiftIndex + 1]);
    // Daily runs have the same client route for everyone that day.
    state.pendingCommission = state.mode === 'daily' ? state.commissionChoices[0].id : null;
  }
  state.stage = state.mode === 'practice' || state.shiftIndex === SHIFTS.length - 1 ? 'victory' : 'shift-complete';
  events.push(event(state.stage, { result, score: state.stats.campaignScore }));
}

function failShift(state, reason, events) {
  state.stage = 'failure';
  state.notice = reason;
  state.failureReason = reason;
  events.push(event('failure', { reason }));
}

function shipSheet(state, sheet, events) {
  if (recipeMatches(sheet, state.level.stamps)) {
    state.stats.shipped++;
    state.stats.combo++;
    state.stats.bestCombo = Math.max(state.stats.bestCombo, state.stats.combo);
    const multiplier = 1 + Math.min(5, state.stats.combo - 1) * (0.12 + state.upgrades.combo * 0.024);
    let points = Math.round(state.level.points * multiplier);
    if (sheet.priority) { points += 40; state.stats.priorityShipped++; }
    if (state.upgrades.batch > 0 && state.lastPrintMask === sheet.inkMask) {
      const bonus = 60 * state.upgrades.batch;
      points += bonus;
      state.stats.batchBonus += bonus;
      state.stats.timeExtension = Math.min(8, state.stats.timeExtension + .6 * state.upgrades.batch);
      events.push(event('batch', { bonus, mask: sheet.inkMask }));
    }
    state.lastPrintMask = sheet.inkMask;
    state.stats.score += points;
    state.stats.specimen = { edition: state.shiftIndex, mask: sheet.inkMask, stamp: sheet.stamp };
    events.push(event('ship', { lane: sheet.lane, id: sheet.id, edition: state.shiftIndex, mask: sheet.inkMask, stamp: sheet.stamp, points, combo: state.stats.combo, priority: sheet.priority }));
    if (recordCommissionPrint(state, sheet)) {
      state.stats.commissionBonus = state.commission.bonus;
      state.stats.score += state.commission.bonus;
      events.push(event('commission-complete', { name: state.commission.name, bonus: state.commission.bonus }));
    }
    if (state.exhibition) {
      if (sheet.frontPrint) state.stats.frontSpecimen = sheet.frontPrint;
      events.push(...recordExhibitionPrint(state, sheet));
    }
    if (state.stats.combo > 1 && state.stats.combo % 5 === 0) events.push(event('combo', { combo: state.stats.combo }));
    if (state.stats.shipped >= state.stats.quota && (!state.exhibition || state.exhibition.completed >= state.exhibition.goal)) finishShift(state, events);
  } else {
    state.stats.spoiled++;
    state.stats.combo = 0;
    state.lastPrintMask = null;
    state.stats.quality--;
    events.push(event('spoil', { lane: sheet.lane, id: sheet.id, targetMask: sheet.targetMask, actualMask: sheet.inkMask, targetStamp: sheet.targetStamp, actualStamp: sheet.stamp }));
    if (state.stats.quality <= 0) failShift(state, 'The proof paper is gone. The workshop needs another try.', events);
  }
}

function stepWorkshop(state, dt, events) {
  state.clock += dt;
  state.stats.elapsed += dt;
  state.stats.timeRemaining = Math.max(0, state.level.duration + state.stats.timeExtension - state.stats.elapsed);
  state.brake.remaining = Math.max(0, state.brake.remaining - dt);
  state.brake.cooldown = Math.max(0, state.brake.cooldown - dt);
  state.brake.ready = state.brake.cooldown === 0;
  state.recycle.cooldown = Math.max(0, state.recycle.cooldown - dt);
  state.recycle.ready = state.recycle.cooldown === 0;
  state.transfer.cooldown = Math.max(0, state.transfer.cooldown - dt);
  state.transfer.ready = state.transfer.cooldown === 0;
  const beltFactor = state.brake.remaining > 0 ? 0.25 : 1;
  state.spawnClock -= dt * beltFactor;
  if (state.spawnClock <= 0 && state.sheets.length < MAX_SHEETS) {
    const target = state.incoming.shift();
    const batch = state.exhibition ? feedExhibition(state, target, state.nextSheetId) : [{ id: state.nextSheetId, lane: state.routingLane, ...target }];
    state.nextSheetId += batch.length;
    for (const sheet of batch) state.sheets.push({ ...sheet, x: .025, inkMask: 0, stamp: null, processedMask: 0, stamped: false });
    refillPreview(state);
    state.spawnClock += state.level.spawnEvery;
    events.push(event('feed', { lane: state.routingLane, targetMask: target.targetMask, targetStamp: target.targetStamp, paired: Boolean(state.exhibition?.paired) }));
  }
  for (const lane of state.lanes) lane.pulse = Math.max(0, lane.pulse - dt);
  const survivors = [];
  for (let sheetIndex = 0; sheetIndex < state.sheets.length; sheetIndex++) {
    const sheet = state.sheets[sheetIndex];
    if (sheet.awaitingFlip) { survivors.push(sheet); continue; }
    const before = sheet.x;
    sheet.x += state.level.speed * dt * beltFactor;
    const lane = state.lanes[sheet.lane];
    for (let ink = 0; ink < INK_STATIONS.length; ink++) {
      const bit = INKS[ink].bit;
      if (!(sheet.processedMask & bit) && before < INK_STATIONS[ink] && sheet.x >= INK_STATIONS[ink]) {
        sheet.processedMask |= bit;
        if (lane.inkMask & bit) {
          sheet.inkMask |= bit;
          lane.pulse = 0.18;
          events.push(event('print', { lane: sheet.lane, ink, mask: sheet.inkMask, id: sheet.id }));
        }
      }
    }
    if (!sheet.stamped && before < STAMP_X && sheet.x >= STAMP_X) {
      sheet.stamped = true;
      sheet.stamp = lane.stamp;
      if (state.level.stamps) events.push(event('stamp-sheet', { lane: sheet.lane, stamp: sheet.stamp, id: sheet.id }));
    }
    if (state.exhibition?.duplex && waitForTurn(sheet)) events.push(event('return-ready', { lane: sheet.lane, id: sheet.id }));
    if (sheet.x >= SHIP_X) {
      shipSheet(state, sheet, events);
      if (state.stage !== 'play') {
        survivors.push(...state.sheets.slice(sheetIndex + 1));
        break;
      }
    } else survivors.push(sheet);
  }
  state.sheets = survivors;
  if (state.stage === 'play' && state.stats.timeRemaining <= 0) failShift(state, 'The courier has left. Reach the print quota before the shift ends.', events);
}

/** Fixed steps keep collision/order behavior stable under uneven browser frames. */
export function advance(state, seconds) {
  const events = [];
  if (state.stage !== 'play' || !Number.isFinite(seconds) || seconds <= 0) {
    state.events = events;
    return events;
  }
  state.accumulator += Math.min(seconds, 0.25);
  while (state.accumulator + 1e-10 >= STEP && state.stage === 'play') {
    state.accumulator -= STEP;
    stepWorkshop(state, STEP, events);
  }
  state.events = events;
  return events;
}

function validLane(state, value) {
  const lane = value ?? state.selectedLane;
  return Number.isInteger(lane) && lane >= 0 && lane < state.lanes.length ? lane : null;
}

/** The only mutation entrypoint for controls; invalid or unavailable actions do nothing. */
export function applyAction(state, action) {
  const events = [];
  if (!action || typeof action.type !== 'string') return events;
  if (action.type === 'start' || action.type === 'restart') {
    if (['campaign', 'practice', 'daily', 'exhibition'].includes(action.mode)) state.mode = action.mode;
    if (Number.isSafeInteger(action.seed) && action.seed > 0) state.seed = action.seed >>> 0 || 1;
    state.history = [];
    state.upgrades = freshUpgrades();
    state.nextSheetId = 1;
    state.exhibitionKit = null;
    beginShift(state, ['daily', 'exhibition'].includes(state.mode) ? 2 : 0);
    if (state.mode === 'exhibition') { state.stage = 'setup'; events.push(event('setup')); }
    events.push(event('start'));
  } else if (action.type === 'kit' && state.stage === 'setup' && state.mode === 'exhibition') {
    const kit = PRESS_KITS.find(item => item.id === action.choice);
    if (!kit) return events;
    state.exhibitionKit = kit.id;
    state.upgrades = { ...freshUpgrades(), ...kit.upgrades };
    events.push(...beginShift(state, 2));
    events.push(event('upgrade', { choice: kit.id }));
  } else if (action.type === 'title') {
    state.stage = 'title';
    state.previousStage = null;
    events.push(event('title'));
  } else if (action.type === 'collection' && state.stage === 'title') {
    state.stage = 'collection';
    events.push(event('collection'));
  } else if (action.type === 'begin' && state.stage === 'brief') {
    state.stage = 'play';
    events.push(event('shift-start', { index: state.shiftIndex }));
  } else if (action.type === 'next' && state.stage === 'shift-complete') {
    if ((!state.exhibition && !state.pendingCommission) || state.upgradeAvailable) return events;
    events.push(...beginShift(state, state.shiftIndex + 1, state.pendingCommission));
  } else if (action.type === 'retry' && ['failure', 'paused', 'play', 'shift-complete'].includes(state.stage)) {
    // A completed shift's score and reward belong to that attempt. Replay it
    // from the same incoming orders, keeping only the earlier collection.
    if (state.stage === 'shift-complete' && state.upgradeChosen !== null) {
      const choice = state.upgradeChosen;
      state.upgrades[choice] = Math.max(0, state.upgrades[choice] - 1);
    }
    state.history = state.history.filter(item => item.index < state.shiftIndex);
    events.push(...beginShift(state, state.shiftIndex, state.commission?.id));
  } else if (action.type === 'pause' && state.stage === 'play') {
    state.previousStage = 'play';
    state.stage = 'paused';
    events.push(event('pause'));
  } else if (action.type === 'resume' && state.stage === 'paused') {
    state.stage = state.previousStage || 'play';
    state.previousStage = null;
    events.push(event('resume'));
  } else if (action.type === 'commission' && state.stage === 'shift-complete' && state.mode === 'campaign' && state.commissionChoices.some(item => item.id === action.choice)) {
    state.pendingCommission = action.choice;
    events.push(event('commission-picked', { choice: action.choice }));
  } else if (action.type === 'upgrade' && state.stage === 'shift-complete' && state.upgradeAvailable && state.upgradeOffers.includes(action.choice)) {
    state.upgrades[action.choice]++;
    state.upgradeAvailable = false;
    state.upgradeChosen = action.choice;
    events.push(event('upgrade', { choice: action.choice }));
  } else if (state.stage === 'play') {
    const lane = validLane(state, action.lane);
    if (action.type === 'select-lane' && lane !== null) {
      state.selectedLane = lane;
      events.push(event('select-lane', { lane }));
    } else if (action.type === 'route') {
      const direction = action.direction === -1 ? -1 : 1;
      state.routingLane = action.lane === undefined
        ? (state.routingLane + direction + state.lanes.length) % state.lanes.length
        : lane ?? state.routingLane;
      state.selectedLane = state.routingLane;
      events.push(event('route', { lane: state.routingLane }));
    } else if (action.type === 'toggle-ink' && lane !== null && Number.isInteger(action.ink) && action.ink >= 0 && action.ink < INKS.length) {
      state.selectedLane = lane;
      state.lanes[lane].inkMask ^= INKS[action.ink].bit;
      events.push(event('ink', { lane, ink: action.ink, enabled: Boolean(state.lanes[lane].inkMask & INKS[action.ink].bit) }));
    } else if (action.type === 'cycle-stamp' && lane !== null && state.level.stamps) {
      state.selectedLane = lane;
      const index = STAMPS.indexOf(state.lanes[lane].stamp);
      const direction = action.direction === -1 ? -1 : 1;
      state.lanes[lane].stamp = STAMPS[(index + direction + STAMPS.length) % STAMPS.length];
      events.push(event('stamp', { lane, stamp: state.lanes[lane].stamp }));
    } else if (action.type === 'brake' && state.brake.ready) {
      state.brake.remaining = state.brake.duration;
      state.brake.cooldown = Math.max(5, 12 - state.upgrades.brake * 1.5);
      state.brake.ready = false;
      events.push(event('brake', { duration: state.brake.remaining }));
    } else if (action.type === 'recycle' && state.recycle.ready) {
      const sheet = action.id === undefined
        ? state.sheets.filter(item => item.lane === state.selectedLane).sort((a, b) => b.x - a.x)[0]
        : state.sheets.find(item => item.id === action.id);
      if (sheet) {
        state.sheets = state.sheets.filter(item => item.id !== sheet.id);
        state.stats.recycled++;
        if (!state.upgrades.reclaim) { state.stats.combo = 0; state.lastPrintMask = null; }
        if (state.upgrades.reclaim && state.stats.recycled % Math.max(1, 3 - state.upgrades.reclaim) === 0) {
          state.stats.quality = Math.min(state.stats.qualityMax, state.stats.quality + 1);
          events.push(event('proof-recovered'));
        }
        state.recycle.cooldown = 8;
        state.recycle.ready = false;
        events.push(event('recycle', { id: sheet.id, lane: sheet.lane, x: sheet.x, mask: sheet.inkMask }));
      }
    } else if (action.type === 'turn' && state.exhibition?.duplex) {
      events.push(turnFolio(state));
    } else if (action.type === 'transfer' && state.transfer.enabled && state.transfer.ready) {
      const source = state.selectedLane;
      const direction = action.direction === -1 ? -1 : 1;
      const destination = (source + direction + state.lanes.length) % state.lanes.length;
      const sheet = state.sheets.filter(item => item.lane === source && item.x < STAMP_X).sort((a, b) => b.x - a.x)[0];
      if (sheet) {
        if (state.sheets.some(item => item.lane === destination && Math.abs(item.x - sheet.x) < .10)) {
          events.push(event('transfer-blocked', { reason: 'That lane has paper beside this sheet. Wait for a gap.' }));
        } else {
          sheet.lane = destination;
          state.selectedLane = destination;
          state.transfer.cooldown = Math.max(2, 6 - state.upgrades.transfer * 1.5);
          state.transfer.ready = false;
          state.stats.transfers++;
          events.push(event('transfer', { id: sheet.id, from: source, lane: destination, x: sheet.x }));
        }
      } else events.push(event('transfer-blocked', { reason: 'Select a lane with paper before the stamp press.' }));
    }
  }
  state.events = events;
  return events;
}
