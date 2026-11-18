import { UPGRADES, SHIFTS } from './levels.js';
import { EDITIONS, posterMarkup } from './posters.js';
import { commissionObjective, runLabel } from './commissions.js';
import { workshopPlan, collectionBuild, buildLedger } from './workshop.js';

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
  const commissionBonus = results.reduce((sum, result) => sum + (result.commissionBonus || 0), 0);
  const score = final ? state.stats?.campaignScore : state.stats?.score;
  return `<div class="score-breakdown" aria-label="Score breakdown"><span><small>PRINTS + COMBOS</small><b>${number((score || 0) - timeBonus - qualityBonus - commissionBonus)}</b></span><span><small>TIME</small><b>+${number(timeBonus)}</b></span><span><small>PROOFS</small><b>+${number(qualityBonus)}</b></span><span><small>CLIENT BONUS</small><b>+${number(commissionBonus)}</b></span></div>`;
}

function upgradeCards(state) {
  return `<div class="upgrade-heading"><b>Build your workshop.</b><span>One free upgrade · then choose your next client</span></div><div class="upgrade-grid">${state.upgradeOffers.map(id => UPGRADES.find(item => item.id === id)).map(item =>
    `<button class="upgrade-card upgrade-${item.id}" data-action="upgrade" data-choice="${item.id}"><span class="upgrade-label"><i aria-hidden="true">${item.icon}</i>${escapeHtml(item.title.toUpperCase())}</span><b class="upgrade-benefit">${escapeHtml(item.benefit)}</b><span class="upgrade-detail">${escapeHtml(item.description)}</span><span class="upgrade-select">Install ${state.upgrades[item.id] ? 'level 2' : 'upgrade'} <span aria-hidden="true">↗</span></span></button>`
  ).join('')}</div>`;
}

function installedUpgrades(state) {
  const installed = UPGRADES.filter(item => state.upgrades[item.id] > 0);
  return `<div class="installed-upgrades"><small>YOUR WORKSHOP</small>${installed.length ? installed.map(item => `<span>${item.icon} ${escapeHtml(item.title)}${state.upgrades[item.id] > 1 ? ' II' : ''}</span>`).join('') : '<span>Standard press · Crossfeed unlocks after shift 1</span>'}</div>`;
}

function commissionCards(state) {
  if (state.mode === 'daily') {
    const commission = state.commissionChoices.find(item => item.id === state.pendingCommission);
    return `<div class="daily-route"><b>Next daily client: ${escapeHtml(commission.name)}</b><p>${escapeHtml(commission.rule)} ${escapeHtml(commissionObjective(commission))} for +${commission.bonus}.</p></div>`;
  }
  return `<div class="upgrade-heading"><b>Who will you print for?</b><span>Both complete your collection · mastery earns a client bonus</span></div><div class="commission-grid">${state.commissionChoices.map(client =>
    `<button class="commission-card ${state.pendingCommission === client.id ? 'is-picked' : ''}" data-action="commission" data-choice="${client.id}" aria-pressed="${state.pendingCommission === client.id}"><span class="client-name"><i aria-hidden="true">${client.icon}</i>${escapeHtml(client.name)}</span><b>${escapeHtml(client.title)}</b><span class="client-rule">${escapeHtml(client.rule)}</span><span class="client-objective">${escapeHtml(commissionObjective(client))} <strong>+${client.bonus}</strong></span><span class="client-select">${state.pendingCommission === client.id ? 'Commission selected ✓' : 'Choose this commission ↗'}</span></button>`
  ).join('')}</div>`;
}

function commissionSummary(state, final = false) {
  if (state.mode === 'practice') return '';
  const commissions = final ? state.history.map(result => result.commission).filter(Boolean) : [state.commission].filter(Boolean);
  return `<div class="client-results">${commissions.map(client => `<span class="${client.completed ? 'is-mastered' : ''}">${client.completed ? '✓' : '○'} ${escapeHtml(client.name)} <b>${client.completed ? 'MASTERED' : client.progress + '/' + client.target}</b></span>`).join('')}</div>`;
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
  const transfer = state.transfer || {};
  const brakeLabel = brake.remaining > 0 ? 'Slowing' : brake.ready ? 'Brake' : `${Math.ceil(brake.cooldown || 0)}s`;
  return `<div class="routing-controls"><small>ROUTE NEXT SHEET</small><div class="lane-switches">${[0, 1, 2].map(index => `<button class="lane-key ${state.routingLane === index ? 'is-selected' : ''}" data-action="route" data-lane="${index}" aria-pressed="${state.routingLane === index}" ${blocked}><kbd>${index + 1}</kbd> Lane ${index + 1}</button>`).join('')}</div></div><div class="ink-controls"><small>LANE ${lane + 1} ROLLERS</small><div class="ink-switches">${['C', 'M', 'Y'].map((ink, index) => `<button class="ink-key ink-${ink.toLowerCase()} ${mask & (1 << index) ? 'is-on' : ''}" data-action="toggle-ink" data-lane="${lane}" data-ink="${index}" aria-pressed="${Boolean(mask & (1 << index))}" ${blocked}><kbd>${ink}</kbd><span>${['●', '◆', '▲'][index]}</span></button>`).join('')}${state.level?.stamps ? `<button class="tool-key stamp-key" data-action="cycle-stamp" data-lane="${lane}" ${blocked}><kbd>S</kbd><span>${stampGlyph(stamp)}</span></button>` : ''}</div></div><div class="utility-controls">${transfer.enabled ? `<div class="crossfeed-tools" aria-label="Crossfeed the leading paper before the stamp press"><small>${transfer.ready ? 'CROSSFEED' : Math.ceil(transfer.cooldown) + 's'}</small><div><button class="tool-key" data-action="transfer" data-direction="-1" ${!playing || !transfer.ready ? 'disabled' : ''}><kbd>Q</kbd>↑</button><button class="tool-key" data-action="transfer" data-direction="1" ${!playing || !transfer.ready ? 'disabled' : ''}><kbd>E</kbd>↓</button></div></div>` : ''}<button class="tool-key brake-key ${brake.remaining > 0 ? 'is-active' : ''}" data-action="brake" ${!playing || !brake.ready ? 'disabled' : ''}><kbd>SPACE</kbd>${brakeLabel}</button><button class="tool-key" data-action="recycle" ${!playing || !recycle.ready ? 'disabled' : ''}><kbd>R</kbd>${recycle.ready ? 'Recycle' : `${Math.ceil(recycle.cooldown || 0)}s`}</button><button class="tool-key" data-action="pause" ${blocked}><kbd>P</kbd>Pause</button></div>`;
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
    if (target.dataset.direction !== undefined) action.direction = Number(target.dataset.direction);
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
      const progress = state.progress || {};
      return `<section class="panel title-panel"><div class="edition-line"><span>AN ORIGINAL PRINTING WORKSHOP</span><span>FIVE SHIFTS / FOUR CLIENTS / SIX UPGRADES</span></div><h1 class="brand-title">PRINT<span>SHIFT</span><i aria-hidden="true">✳</i></h1><p class="title-tagline">Build your press. Print your own path.</p><p class="panel-intro title-intro">Layer inks, crossfeed paper, and match the final stamp.<br>Choose clients. Build a press. Master commissions. Beat your last collection.</p>${previewPosters()}<div class="title-records"><span>PERSONAL BEST <b>${number(progress.bestCampaign)}</b></span><span>CLIENTS MASTERED <b>${progress.masteredClients?.length || 0}/4</b></span>${button('Your print archive ↗', 'collection', { secondary: true, attributes: 'data-compact="true"' })}</div><div class="panel-actions mode-actions">${button('Start five-shift campaign <span aria-hidden="true">↗</span>', 'start', { attributes: 'data-mode="campaign"' })}${button('Daily challenge', 'start', { secondary: true, attributes: 'data-mode="daily"' })}${button('Practice', 'start', { secondary: true, attributes: 'data-mode="practice"' })}</div><div class="title-foot"><p>Fresh orders each collection <span>·</span> Offline <span>·</span> Daily ${state.dailySeed || ''}</p>${preferencesMarkup()}</div></section>`;
    }
    if (stage === 'collection') {
      const progress = state.progress || {};
      const collected = progress.editions || [];
      return `<section class="panel archive-panel">${heading('YOUR LOCAL PRINT ARCHIVE', 'Keep what you make.', 'Completed shifts save real prints here. Master all four clients and collect different color editions.')}<div class="archive-stats"><span><b>${number(progress.collections)}</b> collections</span><span><b>${collected.length}</b> color editions</span><span><b>${progress.masteredClients?.length || 0}/4</b> clients mastered</span></div><div class="archive-grid">${EDITIONS.map((edition, index) => {
        const copies = collected.filter(item => item.edition === index);
        return `<div>${editionPoster(copies.at(-1) || { edition: index, mask: 0, stamp: null }, { grade: copies.length ? copies.length + ' COLOR EDITION' + (copies.length > 1 ? 'S' : '') : 'NOT PRINTED', className: 'collection-card' })}</div>`;
      }).join('')}</div>${buildLedger(progress)}<div class="panel-actions">${button('Print another collection', 'start', { attributes: 'data-mode="campaign"' })}${button('Back to title', 'title', { secondary: true })}</div></section>`;
    }
    if (stage === 'brief') {
      const crossfeedLesson = state.transfer.enabled ? ' Q/E moves the leading paper up/down a lane before the stamp. Ink already printed stays on it.' : '';
      const clientBrief = state.commission ? `<div class="brief-client"><b>${escapeHtml(state.commission.name)}</b><span>${escapeHtml(state.commission.rule)}</span><strong>${escapeHtml(commissionObjective(state.commission))} · +${state.commission.bonus}</strong></div>` : '';
      return `<section class="panel brief-panel">${heading(state.mode === 'practice' ? 'THE APPRENTICE DESK' : state.mode === 'daily' ? runLabel(state) + ' · THREE MASTER SHIFTS' : level.subtitle, level.title, state.shiftIndex === 0 || state.mode === 'practice' ? level.brief : `Ship ${stats.quota} good prints. ${level.stamps ? 'Match each recipe and finishing stamp.' : 'Match the ink layers on each order.'}`)}<div class="brief-target"><span class="target-seal" aria-hidden="true">✓</span><div><small>YOUR ORDER BOOK</small><strong>Ship ${stats.quota || level.quota} good prints</strong><p>${state.mode === 'practice' ? 'A gentler pace to learn the press.' : `${Math.ceil(level.duration)} seconds · ${stats.qualityMax || level.qualityMax} proof-paper points`}</p></div></div>${clientBrief}${state.shiftIndex === 0 || state.mode === 'practice' ? lessons(state) : installedUpgrades(state)}<p class="tip-line"><b>Press tip</b> ${escapeHtml(level.hint + crossfeedLesson)}</p><div class="panel-actions">${button('Start printing <span aria-hidden="true">→</span>', 'begin')}${button('Back to workshop', 'title', { secondary: true })}</div>${preferencesMarkup()}</section>`;
    }
    if (stage === 'paused') {
      return `<section class="panel pause-panel">${heading('THE PRESS IS RESTING', 'Take a breather.', 'Your paper and clock are paused.')}<div class="pause-summary"><strong>${number(stats.shipped)} / ${number(stats.quota)}</strong><span>good prints this shift</span></div><p class="tip-line">Route with <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd>, switch inks with <kbd>C</kbd> <kbd>M</kbd> <kbd>Y</kbd>, brake with <kbd>Space</kbd>.${level.stamps ? ' Stamp with S.' : ''}${state.transfer.enabled ? ' Q/E crossfeeds unfinished paper.' : ''}</p>${installedUpgrades(state)}<div class="panel-actions">${button('Back to the press', 'resume')}${button('Retry this shift', 'retry', { secondary: true })}</div>${button('Return to title', 'title', { secondary: true, attributes: 'data-compact="true"' })}${preferencesMarkup()}</section>`;
    }
    if (stage === 'shift-complete') {
      if (state.mode === 'campaign') return workshopPlan(state);
      const result = state.history?.[state.history.length - 1];
      const edition = EDITIONS[state.shiftIndex] || EDITIONS[0];
      const nextSection = state.upgradeAvailable ? upgradeCards(state) : commissionCards(state);
      return `<section class="panel result-panel"><div class="shift-result-heading">${editionPoster(result?.specimen || { edition: state.shiftIndex, mask: 0 }, { className: 'result-specimen' })}<div><div class="result-stamp">${escapeHtml(result?.grade || 'DELIVERED')}</div>${heading(`SHIFT ${String(state.shiftIndex + 1).padStart(2, '0')} / 05 DELIVERED`, 'Fresh off the press.', `${edition.name} is ready for the courier.`)}</div></div>${resultMetrics(state)}${scoreBreakdown(state)}${commissionSummary(state)}${installedUpgrades(state)}${nextSection}<div class="panel-actions">${button('Next shift <span aria-hidden="true">→</span>', 'next', { disabled: !state.pendingCommission || state.upgradeAvailable })}${button('Retry for a cleaner run', 'retry', { secondary: true })}</div></section>`;
    }
    if (stage === 'victory') {
      const practice = state.mode === 'practice';
      const daily = state.mode === 'daily';
      const best = daily ? state.progress?.dailyBests?.[state.seed] : state.progress?.bestCampaign;
      return `<section class="panel victory-panel"><div class="result-stamp">${practice ? 'APPRENTICE APPROVED' : daily ? 'DAILY CHALLENGE COMPLETE' : 'COLLECTION COMPLETE'}</div>${heading(practice ? 'THE RHYTHM IS YOURS' : daily ? runLabel(state) : 'ALL FIVE SHIFTS DELIVERED', practice ? 'You’ve got the knack.' : 'Made by your hands.', practice ? 'Match the inks. Prepare the lane. Ship good prints.' : daily ? 'Three master shifts. One shared daily order book.' : 'Five original editions, printed and delivered.')} ${resultMetrics(state, true)}${scoreBreakdown(state, true)}${state.mode === 'campaign' ? collectionBuild(state) : commissionSummary(state, true)}${practice ? previewPosters() : `<div class="collection-row" aria-label="Your printed editions">${(state.history || []).map(item => editionPoster(item.specimen || { edition: item.index, mask: 0 }, { grade: item.grade, className: 'collection-card' })).join('')}</div>`}<div class="panel-actions">${practice ? button('Start five-shift campaign', 'start', { attributes: 'data-mode="campaign"' }) : button(daily ? 'Replay today’s challenge' : 'Print a new collection', 'restart')}${button('Back to title', 'title', { secondary: true })}</div><p class="result-note">${practice ? 'Ready for all five shifts? Your first real order starts gently.' : `PERSONAL BEST ${number(best)} · ${daily ? 'Same seed, a different upgrade strategy.' : 'Build saved. Try new clients and tools next collection.'}`}</p></section>`;
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
    const nextScreen = [stage, state.mode, state.shiftIndex, state.upgradeAvailable, state.upgradeChosen, state.pendingCommission, state.notice, stats.score, state.seed, state.progress?.collections, preferences.muted, preferences.reducedMotion].join('|');
    if (nextScreen !== screenSignature) {
      screenSignature = nextScreen;
      overlay.innerHTML = renderScreen(state);
      overlay.hidden = stage === 'play';
      overlay.className = `screen-overlay screen-${stage}`;
      if (status && stage !== 'play') status.textContent = overlay.textContent.replace(/\s+/g, ' ').trim();
    }
    const nextControls = [stage, state.selectedLane, state.routingLane, ...(state.lanes || []).flatMap(lane => [lane.inkMask, lane.stamp]), state.level?.stamps, state.brake?.remaining > 0, state.brake?.ready, Math.ceil(state.brake?.cooldown || 0), state.recycle?.ready, Math.ceil(state.recycle?.cooldown || 0), state.transfer?.enabled, state.transfer?.ready, Math.ceil(state.transfer?.cooldown || 0)].join('|');
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
