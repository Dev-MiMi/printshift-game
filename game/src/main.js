import { createGame, advance, applyAction } from './simulation.js';
import { createRenderer, hitTest } from './render.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createInterface } from './interface.js';

const canvas = document.getElementById('game');
let state = createGame();
let preferences = { muted: false, reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches };
try { preferences = { ...preferences, ...JSON.parse(localStorage.getItem('printshift-preferences') || '{}') }; } catch {}
const audio = createAudio();
const renderer = createRenderer(canvas);
function consume(events) {
  renderer.acceptEvents(events);
  for (const event of events) {
    audio.event(event);
    if (event.type === 'combo') ui.toast(event.combo + ' prints in a row! The press is singing.', 'good');
    if (event.type === 'spoil') ui.toast('A proof was lost. Match its ink letters before dispatch.', 'bad');
    if (event.type === 'shift-complete' || event.type === 'victory') document.getElementById('status').textContent = 'Shift delivered. Score ' + state.stats.score + '. ' + state.stage;
  }
}
function onAction(action) {
  void audio.unlock();
  if (action.type === 'start' && action.mode && action.mode !== state.mode) state = createGame({ mode: action.mode });
  consume(applyAction(state, action));
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
