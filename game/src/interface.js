import { UPGRADES, SHIFTS } from './levels.js';
import { EDITIONS, posterMarkup } from './posters.js';

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const number = value => Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-US');
const stampGlyph = stamp => stamp === 'diamond' ? '◆' : stamp === 'star' ? '★' : '●';

function button(label, type, options = {}) {
  const { secondary = false, attributes = '', disabled = false } = options;
  return `<button class="${secondary ? 'button button-secondary' : 'button'}" data-action="${type}" ${attributes} ${disabled ? 'disabled' : ''}>${label}</button>`;
}

function heading(kicker, title, subtitle = '') {
  return `<p class="eyebrow">${escapeHtml(kicker)}</p><h1>${escapeHtml(title)}</h1>${subtitle ? `<p class="panel-intro">${escapeHtml(subtitle)}</p>` : ''}`;
}

function editionPoster(specimen, { grade = '', className = 'edition-poster' } = {}) {
  const index = Math.max(0, Math.min(EDITIONS.length - 1, specimen.edition || 0));
  const edition = EDITIONS[index];
  return `<figure class="${className}"><div class="poster-art">${posterMarkup({ ...specimen, edition: index })}</div><figcaption><span class="poster-number">${String(index + 1).padStart(2, '0')}</span><b>${escapeHtml(edition.name)}</b>${grade ? `<small>${escapeHtml(grade)}</small>` : ''}</figcaption></figure>`;
}

function previewPosters() {
  return `<div class="recipe-posters" aria-label="Three original editions you can print">${[{ edition: 0, mask: 1, stamp: 'circle' }, { edition: 2, mask: 6, stamp: 'diamond' }, { edition: 4, mask: 7, stamp: 'star' }].map(specimen => editionPoster(specimen)).join('')}</div>`;
}

function scoreBreakdown(state, final = false) {
  const results = final ? state.history || [] : [state.history?.at(-1)].filter(Boolean);
  const timeBonus = results.reduce((sum, result) => sum + (result.timeBonus || 0), 0);
  const qualityBonus = results.reduce((sum, result) => sum + (result.qualityBonus || 0), 0);
  const score = final ? state.stats?.campaignScore : state.stats?.score;
  return `<div class="score-breakdown" aria-label="Score breakdown"><span><small>PRINTS + COMBOS</small><b>${number((score || 0) - timeBonus - qualityBonus)}</b></span><span><small>TIME BONUS</small><b>+${number(timeBonus)}</b></span><span><small>PROOF BONUS</small><b>+${number(qualityBonus)}</b></span></div>`;
}

function upgradeCards(state) {
  const benefits = {
    quality: { label: 'PROOF PAPER', benefit: '+1 proof point', detail: 'An extra safety point in every remaining shift.', icon: '✓' },
    brake: { label: 'PRECISION BRAKE', benefit: '+0.4s braking', detail: 'Brake again 1.5 seconds sooner.', icon: 'Ⅱ' },
    combo: { label: 'SIGNATURE FINISH', benefit: '+20% combo bonus', detail: 'Earn more from consecutive good prints.', icon: '✳' },
  };
  return `<div class="upgrade-heading"><b>Choose your next advantage.</b><span>Pick one free upgrade · lasts for all remaining shifts</span></div><div class="upgrade-grid">${UPGRADES.map(item => {
    const benefit = benefits[item.id];
    return `<button class="upgrade-card upgrade-${item.id}" data-action="upgrade" data-choice="${item.id}"><span class="upgrade-label"><i aria-hidden="true">${benefit.icon}</i>${benefit.label}</span><b class="upgrade-benefit">${benefit.benefit}</b><span class="upgrade-detail">${benefit.detail}</span><span class="upgrade-select">Choose upgrade <span aria-hidden="true">↗</span></span></button>`;
  }).join('')}</div>`;
}

function lessons(state) {
  const needsStamp = state.level?.stamps;
  return `<div class="lesson-grid"><div><span class="step-number">1</span><b>Read the order</b><p>Ink letters show exactly which layers the paper needs.</p></div><div><span class="step-number">2</span><b>Set & route</b><p>Switch the rollers, then route the next sheet to a prepared lane.</p></div><div><span class="step-number">3</span><b>${needsStamp ? 'Stamp & ship' : 'Ship good prints'}</b><p>${needsStamp ? 'Match the final stamp. Good orders build a score combo.' : 'The finished ink must match. Wrong prints use proof paper.'}</p></div></div>`;
}

function resultMetrics(state, final = false) {
  const stats = state.stats || {};
  const history = state.history || [];
  const shipped = final ? history.reduce((total, shift) => total + (shift.shipped || 0), 0) : stats.shipped;
  const score = final ? stats.campaignScore || history.reduce((total, shift) => total + (shift.score || 0), 0) : stats.score;
  return `<div class="result-metrics"><div><small>${final ? 'COLLECTION SCORE' : 'SHIFT SCORE'}</small><strong>${number(score)}</strong></div><div><small>GOOD PRINTS</small><strong>${number(shipped)}</strong></div><div><small>BEST COMBO</small><strong>${number(final ? Math.max(0, ...history.map(shift => shift.bestCombo || 0)) : stats.bestCombo)}<em>×</em></strong></div></div>`;
}

function controlsMarkup(state) {
  const lane = state.selectedLane || 0;
  const mask = state.lanes?.[lane]?.inkMask || 0;
  const stamp = state.lanes?.[lane]?.stamp || 'circle';
  const playing = state.stage === 'play';
  const blocked = playing ? '' : 'disabled';
  const brake = state.brake || {};
  const recycle = state.recycle || {};
  const brakeLabel = brake.remaining > 0 ? 'Slowing' : brake.ready ? 'Brake' : `${Math.ceil(brake.cooldown || 0)}s`;
  return `<div class="routing-controls"><small>ROUTE NEXT SHEET</small><div class="lane-switches">${[0, 1, 2].map(index => `<button class="lane-key ${state.routingLane === index ? 'is-selected' : ''}" data-action="route" data-lane="${index}" aria-pressed="${state.routingLane === index}" ${blocked}><kbd>${index + 1}</kbd> Lane ${index + 1}</button>`).join('')}</div></div><div class="ink-controls"><small>LANE ${lane + 1} ROLLERS</small><div class="ink-switches">${['C', 'M', 'Y'].map((ink, index) => `<button class="ink-key ink-${ink.toLowerCase()} ${mask & (1 << index) ? 'is-on' : ''}" data-action="toggle-ink" data-lane="${lane}" data-ink="${index}" aria-pressed="${Boolean(mask & (1 << index))}" ${blocked}><kbd>${ink}</kbd><span>${['●', '◆', '▲'][index]}</span></button>`).join('')}${state.level?.stamps ? `<button class="tool-key stamp-key" data-action="cycle-stamp" data-lane="${lane}" ${blocked}><kbd>S</kbd><span>${stampGlyph(stamp)}</span></button>` : ''}</div></div><div class="utility-controls"><button class="tool-key brake-key ${brake.remaining > 0 ? 'is-active' : ''}" data-action="brake" ${!playing || !brake.ready ? 'disabled' : ''}><kbd>SPACE</kbd>${brakeLabel}</button><button class="tool-key" data-action="recycle" ${!playing || !recycle.ready ? 'disabled' : ''}><kbd>R</kbd>${recycle.ready ? 'Recycle' : `${Math.ceil(recycle.cooldown || 0)}s`}</button><button class="tool-key" data-action="pause" ${blocked}><kbd>P</kbd>Pause</button></div>`;
}

/** DOM controls only: the same simulation action is used by keyboard and mouse. */
export function createInterface({ onAction = () => {}, onPreference = () => {} } = {}) {
  const hud = document.querySelector('#hud');
  const overlay = document.querySelector('#overlay');
  const controls = document.querySelector('#controls');
  const notice = document.querySelector('#toast');
  const status = document.querySelector('#status');
  if (!hud || !overlay || !controls || !notice) throw new Error('PRINTSHIFT needs its HUD, overlay, controls and toast containers.');
  let currentState = null;
  let currentPreferences = {};
  let hudSignature = '';
  let screenSignature = '';
  let controlSignature = '';
  let toastHandle = null;

  function handleClick(event) {
    const target = event.target.closest('button');
    if (!target || target.disabled) return;
    if (target.dataset.preference) {
      const key = target.dataset.preference;
      onPreference(key, !currentPreferences[key]);
      return;
    }
    if (!target.dataset.action) return;
    const action = { type: target.dataset.action };
    if (target.dataset.lane !== undefined) action.lane = Number(target.dataset.lane);
    if (target.dataset.ink !== undefined) action.ink = Number(target.dataset.ink);
    if (target.dataset.choice) action.choice = target.dataset.choice;
    if (target.dataset.mode) action.mode = target.dataset.mode;
    onAction(action);
  }

  for (const element of [hud, overlay, controls]) element.addEventListener('click', handleClick);

  function preferencesMarkup() {
    return `<div class="preference-row"><button class="preference-button" data-preference="muted" aria-pressed="${Boolean(currentPreferences.muted)}">${currentPreferences.muted ? 'Sound off' : 'Sound on'}</button><span aria-hidden="true">·</span><button class="preference-button" data-preference="reducedMotion" aria-pressed="${Boolean(currentPreferences.reducedMotion)}">${currentPreferences.reducedMotion ? 'Calm motion' : 'Full motion'}</button></div>`;
  }

  function renderScreen(state) {
    const stage = state.stage;
    if (stage === 'play') return '';
    const stats = state.stats || {};
    const level = state.level || SHIFTS[0];
    if (stage === 'title') {
      return `<section class="panel title-panel"><div class="edition-line"><span>AN ORIGINAL PRINTING WORKSHOP</span><span>FIVE EDITIONS / ONE COLLECTION</span></div><h1 class="brand-title">PRINT<span>SHIFT</span><i aria-hidden="true">✳</i></h1><p class="title-tagline">Match every order. Master all five shifts.</p><p class="panel-intro title-intro">Mix inks, route paper, and match the final stamp.<br>Finish before the courier leaves; keep your proof paper intact.</p>${previewPosters()}<div class="panel-actions">${button('Start five-shift campaign <span aria-hidden="true">↗</span>', 'start', { attributes: 'data-mode="campaign"' })}${button('Practice the press', 'start', { secondary: true, attributes: 'data-mode="practice"' })}</div><div class="title-foot"><p>Mouse + keyboard <span>·</span> Play offline</p>${preferencesMarkup()}</div></section>`;
    }
    if (stage === 'brief') {
      return `<section class="panel brief-panel">${heading(state.mode === 'practice' ? 'THE APPRENTICE DESK' : level.subtitle, level.title, level.brief)}<div class="brief-target"><span class="target-seal" aria-hidden="true">✓</span><div><small>YOUR ORDER BOOK</small><strong>Ship ${stats.quota || level.quota} good prints</strong><p>${state.mode === 'practice' ? 'A gentler pace to learn the press.' : `${Math.ceil(level.duration)} seconds · ${stats.qualityMax || level.qualityMax} proof-paper points`}</p></div></div>${lessons(state)}<p class="tip-line"><b>Press tip</b> ${escapeHtml(level.hint)}</p><div class="panel-actions">${button('Start printing <span aria-hidden="true">→</span>', 'begin')}${button('Back to workshop', 'title', { secondary: true })}</div>${preferencesMarkup()}</section>`;
    }
    if (stage === 'paused') {
      return `<section class="panel pause-panel">${heading('THE PRESS IS RESTING', 'Take a breather.', 'Your paper and clock are paused.')}<div class="pause-summary"><strong>${number(stats.shipped)} / ${number(stats.quota)}</strong><span>good prints this shift</span></div><p class="tip-line">Route with <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>, switch inks with <kbd>C</kbd> <kbd>M</kbd> <kbd>Y</kbd>, brake with <kbd>Space</kbd>.${level.stamps ? ' Stamp with S.' : ''}</p><div class="panel-actions">${button('Back to the press', 'resume')}${button('Retry this shift', 'retry', { secondary: true })}</div>${button('Return to title', 'title', { secondary: true, attributes: 'data-compact="true"' })}${preferencesMarkup()}</section>`;
    }
    if (stage === 'shift-complete') {
      const result = state.history?.[state.history.length - 1];
      const upgrade = UPGRADES.find(item => item.id === state.upgradeChosen);
      const edition = EDITIONS[state.shiftIndex] || EDITIONS[0];
      const upgradeSection = state.upgradeAvailable ? upgradeCards(state) : `<p class="upgrade-picked">${upgrade ? `Upgrade installed: <b>${escapeHtml(upgrade.title)}</b>` : 'The next order book is ready.'}<span>${SHIFTS.length - state.shiftIndex - 1} shifts left to complete your collection.</span></p>`;
      return `<section class="panel result-panel"><div class="shift-result-heading">${editionPoster(result?.specimen || { edition: state.shiftIndex, mask: 0 }, { className: 'result-specimen' })}<div><div class="result-stamp">${escapeHtml(result?.grade || 'DELIVERED')}</div>${heading(`SHIFT ${String(state.shiftIndex + 1).padStart(2, '0')} / 05 DELIVERED`, 'Fresh off the press.', `${edition.name} is ready for the courier.`)}</div></div>${resultMetrics(state)}${scoreBreakdown(state)}${upgradeSection}<div class="panel-actions">${button('Next shift <span aria-hidden="true">→</span>', 'next')}${button('Retry for a cleaner run', 'retry', { secondary: true })}</div></section>`;
    }
    if (stage === 'victory') {
      const practice = state.mode === 'practice';
      return `<section class="panel victory-panel"><div class="result-stamp">${practice ? 'APPRENTICE APPROVED' : 'COLLECTION COMPLETE'}</div>${heading(practice ? 'THE RHYTHM IS YOURS' : 'ALL FIVE SHIFTS DELIVERED', practice ? 'You’ve got the knack.' : 'Made by your hands.', practice ? 'Match the inks. Prepare the lane. Ship good prints.' : 'Five original editions, printed and delivered.')} ${resultMetrics(state, true)}${scoreBreakdown(state, true)}${practice ? previewPosters() : `<div class="collection-row" aria-label="Your five printed editions">${(state.history || []).map((item, index) => editionPoster(item.specimen || { edition: index, mask: 0 }, { grade: item.grade, className: 'collection-card' })).join('')}</div>`}<div class="panel-actions">${practice ? button('Start five-shift campaign', 'start', { attributes: 'data-mode="campaign"' }) : button('Print another collection', 'restart')}${button('Back to title', 'title', { secondary: true })}</div><p class="result-note">${practice ? 'Ready for all five shifts? Your first real order starts gently.' : 'Replay for a cleaner collection, longer combos, and different upgrades.'}</p></section>`;
    }
    return `<section class="panel failure-panel"><div class="result-stamp stamp-coral">REPRINT REQUESTED</div>${heading('EVERY MAKER LEARNS', 'Back to the proof desk.', state.failureReason || state.notice || 'This order book needs another try.')} ${resultMetrics(state)}<div class="failure-tip"><b>Make your next run count.</b><p>Read two orders ahead. A roller changes every sheet passing it, so prepare a lane before routing paper. Use the brake to regain your rhythm.</p></div><div class="panel-actions">${button('Retry this shift', 'retry')}${button('Back to title', 'title', { secondary: true })}</div><p class="result-note">Your earlier completed shifts stay in the collection.</p></section>`;
  }

  function update(state, preferences = {}) {
    currentState = state;
    currentPreferences = preferences;
    const stats = state.stats || {};
    const time = Math.ceil(Math.max(0, stats.timeRemaining || 0));
    const seconds = `${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
    const stage = state.stage;
    const signature = [stage, state.shiftIndex, stats.score, stats.campaignScore, stats.shipped, stats.quota, stats.quality, stats.qualityMax, stats.combo, seconds, preferences.muted].join('|');
    if (signature !== hudSignature) {
      hudSignature = signature;
      hud.innerHTML = `<div class="hud-brand"><span class="brand-mark" aria-hidden="true">✳</span><div><b>PRINTSHIFT</b><small>${stage === 'title' ? 'THE INDEPENDENT PRESS' : state.mode === 'practice' ? 'APPRENTICE PRACTICE' : `SHIFT ${String(state.shiftIndex + 1).padStart(2, '0')} / 05`}</small></div></div><div class="hud-stat printed-stat"><small>GOOD PRINTS</small><strong>${number(stats.shipped)}<span> / ${number(stats.quota)}</span></strong></div><div class="hud-stat"><small>SCORE <i class="combo-pill ${stats.combo > 1 ? 'has-combo' : ''}">${stats.combo > 1 ? `${stats.combo}× COMBO` : ''}</i></small><strong>${number(stats.score)}</strong></div><div class="hud-stat quality-stat"><small>PROOF PAPER</small><strong class="quality-pips" aria-label="${stats.quality || 0} of ${stats.qualityMax || 0} quality points">${Array.from({ length: Math.min(12, stats.qualityMax || 0) }, (_, index) => `<i class="${index < (stats.quality || 0) ? 'is-full' : ''}"></i>`).join('')}</strong></div><div class="hud-stat timer-stat ${time <= 15 && stage === 'play' ? 'is-urgent' : ''}"><small>TIME LEFT</small><strong>${seconds}</strong></div><button class="sound-button" data-preference="muted" aria-label="${preferences.muted ? 'Turn sound on' : 'Mute sound'}" aria-pressed="${Boolean(preferences.muted)}">${preferences.muted ? '♪̸' : '♪'}</button>`;
    }
    const nextScreen = [stage, state.mode, state.shiftIndex, state.upgradeAvailable, state.upgradeChosen, state.notice, stats.score, preferences.muted, preferences.reducedMotion].join('|');
    if (nextScreen !== screenSignature) {
      screenSignature = nextScreen;
      overlay.innerHTML = renderScreen(state);
      overlay.hidden = stage === 'play';
      overlay.className = `screen-overlay screen-${stage}`;
      if (status && stage !== 'play') status.textContent = overlay.textContent.replace(/\s+/g, ' ').trim();
    }
    const nextControls = [stage, state.selectedLane, state.routingLane, ...(state.lanes || []).flatMap(lane => [lane.inkMask, lane.stamp]), state.level?.stamps, state.brake?.remaining > 0, state.brake?.ready, Math.ceil(state.brake?.cooldown || 0), state.recycle?.ready, Math.ceil(state.recycle?.cooldown || 0)].join('|');
    if (nextControls !== controlSignature) {
      controlSignature = nextControls;
      controls.innerHTML = controlsMarkup(state);
    }
    document.querySelector('#app')?.classList.toggle('reduced-motion', Boolean(preferences.reducedMotion));
  }

  function toast(message, tone = 'good') {
    if (toastHandle) clearTimeout(toastHandle);
    notice.textContent = message;
    notice.className = `toast toast-${tone} is-visible`;
    if (status) status.textContent = message;
    toastHandle = setTimeout(() => {
      notice.classList.remove('is-visible');
      toastHandle = null;
    }, 1700);
  }

  function destroy() {
    for (const element of [hud, overlay, controls]) element.removeEventListener('click', handleClick);
    if (toastHandle) clearTimeout(toastHandle);
    currentState = null;
  }

  return { update, toast, destroy };
}
