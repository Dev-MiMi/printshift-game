import { createGame, advance, applyAction } from './simulation.js';
import { createRenderer, hitTest } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createInterface } from './interface.js';
import { recipeSymbols } from './recipes.js';
import { dailySeed } from './commissions.js';
import { loadProgress, rememberCollection, nextCollectionSeed } from './progress.js';

const canvas = document.getElementById('game');
let state = createGame({ seed: nextCollectionSeed(Date.now() >>> 0) });
let progress = loadProgress();
const today = dailySeed();
state.progress = progress;
state.dailySeed = today;
let preferences = { muted: false, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches };
try { preferences = { ...preferences, ...JSON.parse(localStorage.getItem('printshift-preferences') || '{}') }; } catch {}
const audio = createAudio();
const renderer = createRenderer(canvas);
function consume(events) {
  renderer.acceptEvents(events);
  for (const event of events) {
    audio.event(event);
    if (event.type === 'combo') ui.toast(event.combo + ' prints in a row! The press is singing.', 'good');
    if (event.type === 'commission-complete') ui.toast(event.name + ' commission mastered! +' + event.bonus, 'good');
    if (event.type === 'transfer-blocked') ui.toast(event.reason, 'bad');
    if (event.type === 'proof-recovered') ui.toast('A proof point recovered. Keep your streak.', 'good');
    if (event.type === 'spoil') {
      const inkWrong = event.actualMask !== event.targetMask;
      const stampWrong = state.level.stamps && event.actualStamp !== event.targetStamp;
      const explanation = inkWrong && stampWrong ? 'Match both ink and stamp.'
        : inkWrong ? `Needed ${recipeSymbols(event.targetMask)}. Extra ink cannot be removed.`
        : `Needed the ${event.targetStamp} stamp. Change it before the finish press.`;
      ui.toast('Proof lost · ' + explanation, 'bad');
    }
    if (event.type === 'shift-complete' || event.type === 'victory') {
      progress = rememberCollection(progress, state);
      state.progress = progress;
      document.getElementById('status').textContent = 'Shift delivered. Score ' + state.stats.score + '. ' + state.stage;
    }
  }
}
function onAction(action) {
  void audio.unlock();
  if (action.type === 'start' || action.type === 'restart') {
    const mode = action.mode || state.mode;
    action = { ...action, mode, seed: mode === 'daily' ? today : mode === 'practice' ? 20261116 : nextCollectionSeed(state.seed) };
  }
  consume(applyAction(state, action));
  state.progress = progress;
  state.dailySeed = today;
  ui.update(state, preferences);
  renderer.render(state, 0, preferences);
}
const ui = createInterface({ onAction, onPreference(key, value) {
  preferences = { ...preferences, [key]: value };
  audio.setMuted(preferences.muted);
  try { localStorage.setItem('printshift-preferences', JSON.stringify(preferences)); } catch {}
  ui.update(state, preferences);
} });
// Read-only inspection for browser play-tests. It cannot change state or skip play.
if (new URLSearchParams(location.search).has('inspect')) {
  Object.defineProperty(window, 'printshiftInspect', { value: () => JSON.parse(JSON.stringify(state)), writable: false });
}
audio.setMuted(preferences.muted);
createInput(canvas, onAction, () => state, hitTest);
let lastFrame = 0;
function frame(now) {
  const delta = lastFrame ? Math.min(.1, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  consume(advance(state, delta));
  renderer.render(state, delta, preferences);
  ui.update(state, preferences);
  audio.update(state);
  requestAnimationFrame(frame);
}
ui.update(state, preferences);
renderer.render(state, 0, preferences);
requestAnimationFrame(frame);
