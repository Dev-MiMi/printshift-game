/** Local keepsakes only: no account, network or competitive score service. */
const STORAGE_KEY = 'printshift-workshop-v3';
const emptyProgress = () => ({ version: 1, collections: 0, bestCampaign: 0, dailyBests: {}, editions: [], masteredClients: [], builds: [] });
const upgradeIds = ['quality', 'brake', 'combo', 'transfer', 'reclaim', 'batch'];
const clientIds = ['books', 'parade', 'courier', 'archive'];

function validBuild(build) {
  return build && build.mode === 'campaign' && Number.isSafeInteger(build.seed) && build.seed > 0 && build.seed <= 4294967295
    && Number.isSafeInteger(build.score) && build.score >= 0 && Number.isSafeInteger(build.spoiled) && build.spoiled >= 0
    && Array.isArray(build.clients) && build.clients.length === 4 && build.clients.every(id => clientIds.includes(id))
    && build.upgrades && upgradeIds.every(id => Number.isInteger(build.upgrades[id]) && build.upgrades[id] >= 0 && build.upgrades[id] <= 2);
}

export function loadProgress(storage) {
  try {
    storage ??= globalThis.localStorage;
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (!saved || saved.version !== 1) return emptyProgress();
    const progress = emptyProgress();
    progress.collections = Math.max(0, Math.floor(Number(saved.collections) || 0));
    progress.bestCampaign = Math.max(0, Math.floor(Number(saved.bestCampaign) || 0));
    progress.editions = (Array.isArray(saved.editions) ? saved.editions : []).filter(item => Number.isInteger(item.edition) && item.edition >= 0 && item.edition < 5 && Number.isInteger(item.mask) && item.mask > 0 && item.mask < 8 && ['circle', 'diamond', 'star'].includes(item.stamp)).slice(-35);
    progress.masteredClients = (Array.isArray(saved.masteredClients) ? saved.masteredClients : []).filter(id => ['books', 'parade', 'courier', 'archive'].includes(id));
    progress.builds = (Array.isArray(saved.builds) ? saved.builds : []).filter(validBuild).slice(-6).map(build => ({ mode: 'campaign', seed: build.seed, score: build.score, spoiled: build.spoiled, clients: [...build.clients], upgrades: Object.fromEntries(upgradeIds.map(id => [id, build.upgrades[id]])) }));
    for (const [day, score] of Object.entries(saved.dailyBests || {}).slice(-14)) {
      if (/^\d{8}$/.test(day) && Number.isSafeInteger(score) && score >= 0) progress.dailyBests[day] = score;
    }
    return progress;
  } catch { return emptyProgress(); }
}

export function rememberCollection(progress, state, storage) {
  const next = { ...progress, dailyBests: { ...progress.dailyBests }, editions: [...progress.editions], masteredClients: [...progress.masteredClients], builds: [...(progress.builds || [])] };
  if (state.mode === 'practice') return next;
  for (const result of state.history) {
    const specimen = result.specimen;
    if (specimen && !next.editions.some(item => item.edition === specimen.edition && item.mask === specimen.mask && item.stamp === specimen.stamp)) next.editions.push({ ...specimen, grade: result.grade });
    if (result.commission?.completed && !next.masteredClients.includes(result.commission.id)) next.masteredClients.push(result.commission.id);
  }
  next.editions = next.editions.slice(-35);
  if (state.stage === 'victory') {
    if (state.mode === 'campaign') {
      next.collections++;
      next.bestCampaign = Math.max(next.bestCampaign, state.stats.campaignScore);
      const build = { mode: 'campaign', seed: state.seed, score: state.stats.campaignScore, spoiled: state.history.reduce((sum, result) => sum + result.spoiled, 0), clients: state.history.filter(result => result.commission).map(result => result.commission.id), upgrades: { ...state.upgrades } };
      if (validBuild(build)) next.builds = [...next.builds, build].slice(-6);
    } else if (state.mode === 'daily') {
      next.dailyBests[state.seed] = Math.max(next.dailyBests[state.seed] || 0, state.stats.campaignScore);
      next.dailyBests = Object.fromEntries(Object.entries(next.dailyBests).sort().slice(-14));
    }
  }
  try { (storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* The game remains playable when storage is unavailable. */ }
  return next;
}

export function nextCollectionSeed(seed) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0 || 1;
}
