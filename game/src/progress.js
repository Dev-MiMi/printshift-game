/** Local keepsakes only: no account, network or competitive score service. */
const STORAGE_KEY = 'printshift-workshop-v3';
const emptyProgress = () => ({ version: 1, collections: 0, bestCampaign: 0, bestExhibition: 0, exhibitions: 0, dailyBests: {}, editions: [], masteredClients: [] });

export function loadProgress(storage) {
  try {
    storage ??= globalThis.localStorage;
    const saved = JSON.parse(storage?.getItem(STORAGE_KEY) || 'null');
    if (!saved || saved.version !== 1) return emptyProgress();
    const progress = emptyProgress();
    progress.collections = Math.max(0, Math.floor(Number(saved.collections) || 0));
    progress.bestCampaign = Math.max(0, Math.floor(Number(saved.bestCampaign) || 0));
    progress.bestExhibition = Math.max(0, Math.floor(Number(saved.bestExhibition) || 0));
    progress.exhibitions = Math.max(0, Math.floor(Number(saved.exhibitions) || 0));
    progress.editions = (Array.isArray(saved.editions) ? saved.editions : []).filter(item => Number.isInteger(item.edition) && item.edition >= 0 && item.edition < 5 && Number.isInteger(item.mask) && item.mask > 0 && item.mask < 8 && ['circle', 'diamond', 'star'].includes(item.stamp)).slice(-35);
    progress.masteredClients = (Array.isArray(saved.masteredClients) ? saved.masteredClients : []).filter(id => ['books', 'parade', 'courier', 'archive'].includes(id));
    for (const [day, score] of Object.entries(saved.dailyBests || {}).slice(-14)) {
      if (/^\d{8}$/.test(day) && Number.isSafeInteger(score) && score >= 0) progress.dailyBests[day] = score;
    }
    return progress;
  } catch { return emptyProgress(); }
}

export function rememberCollection(progress, state, storage) {
  const next = { ...progress, dailyBests: { ...progress.dailyBests }, editions: [...progress.editions], masteredClients: [...progress.masteredClients] };
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
    } else if (state.mode === 'daily') {
      next.dailyBests[state.seed] = Math.max(next.dailyBests[state.seed] || 0, state.stats.campaignScore);
      next.dailyBests = Object.fromEntries(Object.entries(next.dailyBests).sort().slice(-14));
    } else if (state.mode === 'exhibition') {
      next.exhibitions = (next.exhibitions || 0) + 1;
      next.bestExhibition = Math.max(next.bestExhibition || 0, state.stats.campaignScore);
    }
  }
  try { (storage ?? globalThis.localStorage)?.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* The game remains playable when storage is unavailable. */ }
  return next;
}

export function nextCollectionSeed(seed) {
  return (Math.imul(seed, 1664525) + 1013904223) >>> 0 || 1;
}
