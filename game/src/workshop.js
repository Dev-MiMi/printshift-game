import { SHIFTS, UPGRADES } from './levels.js';
import { CLIENTS, commissionObjective } from './commissions.js';
import { createGame, beginShift } from './simulation.js';
import { EDITIONS, posterMarkup } from './posters.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const count = value => Math.max(0, Math.round(Number(value) || 0)).toLocaleString('en-US');
const MATCHES = Object.freeze({ books: ['combo', 'batch', 'reclaim'], parade: ['transfer', 'brake'], courier: ['quality', 'brake', 'transfer'], archive: ['batch', 'quality'] });

/** Preview the next client's real first orders without touching the player's run. */
export function previewCommission(state, client) {
  const preview = createGame({ seed: state.seed });
  preview.upgrades = { ...state.upgrades };
  beginShift(preview, state.shiftIndex + 1, client.id);
  return { orders: preview.incoming, level: preview.level, quota: preview.stats.quota, proofs: preview.stats.qualityMax };
}

export function upgradeFits(clientId, upgradeId) {
  return (MATCHES[clientId] || []).includes(upgradeId);
}

function routeMarkup(history, currentIndex) {
  return `<div class="workshop-route" aria-label="Your five-shift collection">${SHIFTS.map((shift, index) => {
    const result = history.find(item => item.index === index);
    return `<span class="${result ? 'is-delivered' : index === currentIndex ? 'is-next' : ''}"><i>${result ? '✓' : String(index + 1).padStart(2, '0')}</i><b>${escape(EDITIONS[index].name)}</b><small>${result ? escape(result.commission?.name || 'First impressions') : index === currentIndex ? 'YOUR NEXT CLIENT' : 'NEW COMMISSION'}</small></span>`;
  }).join('')}</div>`;
}

function clientCard(state, client) {
  const plan = previewCommission(state, client), selected = state.pendingCommission === client.id;
  const feed = client.pattern === 'rush' ? 'Fast feed' : client.pattern === 'pairs' ? 'Paired inks' : client.pattern === 'palette' ? 'Rotating colors' : 'Recurring spot color';
  const fit = UPGRADES.filter(item => upgradeFits(client.id, item.id)).slice(0, 2).map(item => item.title).join(' + ');
  return `<button class="plan-client ${selected ? 'is-picked' : ''}" data-action="commission" data-choice="${client.id}" aria-pressed="${selected}"><span class="plan-client-heading"><b>${client.icon} ${escape(client.name)}</b><strong>+${client.bonus}</strong></span><span class="plan-client-body"><span class="plan-orders" aria-label="Actual first three orders">${plan.orders.map(order => `<span>${posterMarkup({ edition: state.shiftIndex + 1, mask: order.targetMask, stamp: plan.level.stamps ? order.targetStamp : null })}<small>${order.priority ? 'PRIORITY' : 'ORDER'}</small></span>`).join('')}</span><span class="plan-client-detail"><b>${escape(feed)} · ${plan.quota} prints</b><span>${Math.ceil(plan.level.duration)}s · ${plan.proofs} proof points</span><span>${escape(commissionObjective(client))}</span></span></span><span class="plan-fit">Pairs with ${escape(fit)}</span><span class="plan-choice">${selected ? 'Client selected ✓' : 'Choose this order book ↗'}</span></button>`;
}

function upgradeRow(state, id) {
  const item = UPGRADES.find(upgrade => upgrade.id === id), chosen = state.upgradeChosen === id;
  const fits = upgradeFits(state.pendingCommission, id);
  return `<button class="plan-upgrade ${chosen ? 'is-installed' : ''} ${fits ? 'is-match' : ''}" data-action="upgrade" data-choice="${id}" ${state.upgradeAvailable ? '' : 'disabled'}><i>${item.icon}</i><span><b>${escape(item.title)}${state.upgrades[id] > 1 ? ' II' : ''}</b><span>${escape(item.description)}</span><small>${chosen ? 'INSTALLED FOR THE NEXT SHIFTS ✓' : fits ? 'MATCHES YOUR SELECTED CLIENT' : escape(item.strategy)}</small></span></button>`;
}

/** One planning desk keeps both real decisions visible before the next shift. */
export function workshopPlan(state) {
  const result = state.history.at(-1), next = state.commissionChoices.find(client => client.id === state.pendingCommission);
  return `<section class="panel workshop-panel"><div class="workshop-heading"><div><p class="eyebrow">SHIFT ${state.shiftIndex + 1} DELIVERED · YOUR PRESS, YOUR PATH</p><h1>Build the next shift.</h1></div><div class="workshop-receipt"><b>${count(state.stats.score)} POINTS</b><span>${count(state.stats.shipped)} good prints · ${escape(result.grade)}</span></div></div>${routeMarkup(state.history, state.shiftIndex + 1)}<div class="planning-desk"><div><div class="plan-heading"><b>1 · Choose your next client</b><span>A different order pattern. A different way to master it.</span></div><div class="plan-clients">${state.commissionChoices.map(client => clientCard(state, client)).join('')}</div></div><div><div class="plan-heading"><b>2 · Build your press</b><span>One upgrade · carries through the remaining shifts</span></div><div class="plan-upgrades">${state.upgradeOffers.map(id => upgradeRow(state, id)).join('')}</div><div class="plan-next"><b>${next ? escape(next.name) + ' is next.' : 'Which workshop will you build?'}</b><span>${next ? escape(next.rule) : 'Choose a client to highlight matching upgrades.'}</span></div></div></div><div class="workshop-footer"><p>${state.upgradeAvailable ? 'Install one upgrade' : 'Upgrade installed ✓'} · ${next ? 'Client selected ✓' : 'Choose one client'}<br>Next collection brings fresh commissions and upgrade offers.</p><div class="panel-actions"><button class="button" data-action="next" ${!next || state.upgradeAvailable ? 'disabled' : ''}>Start shift ${state.shiftIndex + 2} →</button><button class="button button-secondary" data-action="retry">Retry this shift</button></div></div></section>`;
}

export function collectionBuild(state) {
  const upgrades = UPGRADES.filter(item => state.upgrades[item.id] > 0);
  return `<div class="completed-build"><div><small>YOUR CLIENT ROUTE</small><span>${state.history.filter(result => result.commission).map(result => `<b>${result.commission.completed ? '✓' : '○'} ${escape(result.commission.name)}</b>`).join('<i>→</i>')}</span></div><div><small>YOUR PRESS</small><span>${upgrades.map(item => `<b>${item.icon} ${escape(item.title)}${state.upgrades[item.id] > 1 ? ' II' : ''}</b>`).join('')}</span></div></div>`;
}

export function buildLedger(progress) {
  const builds = (progress.builds || []).filter(build => build.mode === 'campaign').slice(-3).reverse();
  return `<div class="build-ledger"><div class="plan-heading"><b>Your recent workshops</b><span>Compare the clients and tools behind each collection.</span></div>${builds.length ? builds.map(build => `<div class="build-record"><strong>${count(build.score)}<small>${build.spoiled ? build.spoiled + ' spoils' : 'FLAWLESS'}</small></strong><div><b>${build.clients.map(id => escape(CLIENTS.find(client => client.id === id)?.name || '')).join(' → ')}</b><span>${UPGRADES.filter(item => build.upgrades[item.id]).map(item => escape(item.short) + (build.upgrades[item.id] > 1 ? ' II' : '')).join(' · ')}</span></div></div>`).join('') : '<p>Finish a collection to save its clients, tools and score.</p>'}</div>`;
}
