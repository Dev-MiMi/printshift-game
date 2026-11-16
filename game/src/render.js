import { INKS, INK_STATIONS, RECIPE_COLORS, STAMP_X, recipeName, recipeSymbols } from './recipes.js';

export const BOARD = Object.freeze({ left: 130, right: 1050, width: 920, lanes: [265, 400, 535] });
const COLORS = { navy: '#172b4d', cream: '#fbf4dc', paper: '#fffbec', steel: '#c8d1cb', red: '#ef7259', teal: '#247f87' };
const inkX = index => BOARD.left + BOARD.width * INK_STATIONS[index];
const stampX = BOARD.left + BOARD.width * STAMP_X;

export function hitTest(x, y, state) {
  if (!['play', 'brief'].includes(state.stage)) return null;
  for (let lane = 0; lane < 3; lane++) {
    const center = BOARD.lanes[lane];
    if (x > 36 && x < 122 && y > center - 54 && y < center + 63) return { type: 'route', lane };
    for (let ink = 0; ink < 3; ink++) if (Math.abs(x - inkX(ink)) < 38 && Math.abs(y - (center - 39)) < 28) return { type: 'toggle-ink', lane, ink };
    if (state.level.stamps && Math.abs(x - stampX) < 40 && Math.abs(y - (center - 39)) < 28) return { type: 'cycle-stamp', lane };
  }
  return null;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const texture = document.createElement('canvas');
  texture.width = texture.height = 18;
  const textureContext = texture.getContext('2d');
  textureContext.fillStyle = '#efe6cc';
  textureContext.beginPath();
  textureContext.arc(12, 13, .65, 0, Math.PI * 2);
  textureContext.fill();
  const paperTexture = ctx.createPattern(texture, 'repeat');
  const effects = [];
  const prints = [];
  let clock = 0;
  function rounded(x, y, width, height, radius = 8) {
    ctx.beginPath(); ctx.roundRect(x, y, width, height, radius);
  }
  function box(x, y, width, height, fill, stroke, radius = 8) {
    rounded(x, y, width, height, radius); ctx.fillStyle = fill; ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); }
  }
  function label(text, x, y, size = 12, color = COLORS.navy, font = 'monospace', align = 'left') {
    ctx.fillStyle = color; ctx.font = `700 ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y);
  }
  function glyph(shape, x, y, radius, color, outline = false) {
    ctx.beginPath();
    if (shape === 'diamond') { ctx.moveTo(x, y - radius); ctx.lineTo(x + radius, y); ctx.lineTo(x, y + radius); ctx.lineTo(x - radius, y); ctx.closePath(); }
    else if (shape === 'star') {
      for (let point = 0; point < 10; point++) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const length = point % 2 ? radius * .46 : radius;
        const px = x + Math.cos(angle) * length, py = y + Math.sin(angle) * length;
        if (point === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    } else ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (outline) { ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke(); } else { ctx.fillStyle = color; ctx.fill(); }
  }
  function rosette(x, y, radius, mask, stamp = 'circle') {
    ctx.save(); ctx.translate(x, y); ctx.rotate(-.07);
    ctx.fillStyle = RECIPE_COLORS[mask];
    for (let petal = 0; petal < 8; petal++) {
      const angle = petal * Math.PI / 4;
      ctx.beginPath(); ctx.ellipse(Math.cos(angle) * radius * .42, Math.sin(angle) * radius * .42, radius * .54, radius * .30, angle, 0, Math.PI * 2); ctx.fill();
    }
    glyph(stamp || 'circle', 0, 0, radius * .35, mask ? COLORS.paper : '#d2d1bd');
    ctx.restore();
  }
  function paperCard(x, y, mask, target, stamp, targetStamp, selected, identifier, needsStamp) {
    ctx.save();
    box(x - 35, y - 34 + 4, 70, 77, 'rgba(23,43,77,.14)', null, 3);
    box(x - 35, y - 34, 70, 77, COLORS.paper, selected ? COLORS.teal : '#bdc4b6', 3);
    label('ORDER ' + String(identifier).padStart(2, '0'), x, y - 22, 7, '#556375', 'monospace', 'center');
    rosette(x, y + 1, 19, mask, stamp);
    label(recipeSymbols(target), x, y + 30, 10, COLORS.navy, 'monospace', 'center');
    INKS.forEach((ink, index) => {
      const xx = x - 15 + index * 15;
      if (target & ink.bit) { ctx.beginPath(); ctx.arc(xx, y - 9, 3, 0, Math.PI * 2); ctx.fillStyle = ink.color; ctx.fill(); }
    });
    if (needsStamp) glyph(targetStamp, x + 23, y + 1, 6, COLORS.navy, true);
    ctx.restore();
  }
  function drawBackdrop(state, reducedMotion) {
    ctx.fillStyle = COLORS.cream; ctx.fillRect(0, 0, 1200, 760);
    ctx.fillStyle = paperTexture;
    ctx.fillRect(0, 103, 1200, 560);
    box(17, 109, 1166, 548, '#e5e7d2', '#d1d5bf', 15);
    box(27, 120, 1146, 74, '#f5efdb', '#d3d2bd', 9);
    label('ON THE ORDER RACK', 48, 141, 11, '#596564');
    label('NEXT SHEET →', 48, 166, 13);
    state.incoming?.forEach((order, index) => {
      const x = 257 + index * 161;
      box(x - 67, 132, 137, 51, COLORS.paper, index === 0 ? COLORS.teal : '#d7d5c3', 5);
      box(x - 54, 143, 29, 29, RECIPE_COLORS[order.targetMask], null, 4);
      glyph(order.targetStamp, x - 39, 157, 9, COLORS.paper, false);
      label(recipeName(order.targetMask).toUpperCase(), x - 15, 149, 10);
      label(recipeSymbols(order.targetMask), x - 15, 166, 11, '#60706e');
    });
    const barWidth = 143, portion = Math.max(0, Math.min(1, (state.spawnClock || 0) / (state.level.spawnEvery || 4)));
    label('FEEDER', 782, 147, 10, '#68716b');
    box(782, 163, barWidth, 7, '#d9dcca', null, 3);
    box(782, 163, barWidth * (1 - portion), 7, COLORS.teal, null, 3);
    label('PRESS CO.', 1060, 146, 22, COLORS.navy, 'Georgia', 'center');
    label('EST. THIS MORNING', 1060, 170, 9, '#697167', 'monospace', 'center');
    for (let lane = 0; lane < 3; lane++) {
      const y = BOARD.lanes[lane], chosen = state.routingLane === lane;
      box(32, y - 57, 1136, 122, chosen ? '#d5e6d7' : '#e9e8d5', chosen ? '#77a7a0' : '#ccd1bb', 10);
      box(45, y - 44, 65, 102, chosen ? COLORS.navy : '#f6efdb', chosen ? null : '#bdc8b8', 8);
      label('LANE', 77, y - 21, 10, chosen ? COLORS.cream : '#68766c', 'monospace', 'center');
      label(String(lane + 1).padStart(2, '0'), 77, y + 6, 27, chosen ? COLORS.cream : COLORS.navy, 'monospace', 'center');
      label(chosen ? 'FEED →' : 'ROUTE', 77, y + 39, 9, chosen ? '#88cfcb' : COLORS.navy, 'monospace', 'center');
      box(126, y - 2, 986, 51, '#71867f', '#49635f', 8);
      box(134, y + 4, 968, 36, '#9aaba0', null, 4);
      ctx.save(); ctx.beginPath(); ctx.rect(134, y + 4, 968, 36); ctx.clip();
      ctx.strokeStyle = '#788e82'; ctx.lineWidth = 1;
      const motion = reducedMotion ? 0 : (clock * 27) % 27;
      for (let x = 110 + motion; x < 1130; x += 27) { ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x - 13, y + 40); ctx.stroke(); }
      ctx.restore();
      for (let ink = 0; ink < 3; ink++) {
        const x = inkX(ink), enabled = Boolean(state.lanes[lane]?.inkMask & INKS[ink].bit), info = INKS[ink];
        box(x - 26, y - 18, 52, 64, '#465b61', null, 6);
        box(x - 24, y - 14, 48, 25, enabled ? info.color : '#849c96', '#30454e', 5);
        box(x - 29, y - 56, 58, 35, enabled ? info.color : '#f9f1dc', '#2a445a', 8);
        label(info.short, x, y - 38, 18, enabled ? COLORS.navy : '#899188', 'monospace', 'center');
        ctx.beginPath(); ctx.arc(x + 21, y - 61, 4, 0, Math.PI * 2); ctx.fillStyle = enabled ? '#247f87' : '#b5b6a4'; ctx.fill();
        label(enabled ? 'ON' : 'OFF', x, y + 58, 8, enabled ? COLORS.navy : '#728174', 'monospace', 'center');
      }
      box(stampX - 28, y - 18, 56, 64, '#51615e', null, 6);
      box(stampX - 27, y - 56, 54, 35, state.level.stamps ? '#faeab6' : '#d6d9c4', '#52655c', 8);
      glyph(state.lanes[lane]?.stamp || 'circle', stampX, y - 38, 10, state.level.stamps ? COLORS.navy : '#9ea592', true);
      label(state.level.stamps ? 'STAMP' : 'LATER', stampX, y + 58, 8, '#68776b', 'monospace', 'center');
      box(1073, y - 23, 57, 68, '#e9bc70', '#b5965c', 5);
      ctx.strokeStyle = '#c39f66'; ctx.beginPath(); ctx.moveTo(1076, y + 9); ctx.lineTo(1127, y + 9); ctx.moveTo(1100, y - 18); ctx.lineTo(1100, y + 43); ctx.stroke();
      label('SHIP', 1101, y - 35, 9, COLORS.navy, 'monospace', 'center');
    }
    label('LAYER INK →', 163, 621, 11, '#6d776b');
    label('C', inkX(0), 621, 13, '#247f87', 'monospace', 'center');
    label('M', inkX(1), 621, 13, '#a84d69', 'monospace', 'center');
    label('Y', inkX(2), 621, 13, '#9d7d28', 'monospace', 'center');
    label('FINISH', stampX, 621, 11, '#6d776b', 'monospace', 'center');
    label('PACK & SEND', 1058, 621, 11, '#6d776b', 'monospace', 'center');
  }
  function acceptEvents(events) {
    for (const event of events) {
      if (['ship', 'spoil', 'ink', 'stamp', 'recycle'].includes(event.type)) effects.push({ ...event, age: 0 });
      if (event.type === 'ship') { prints.push({ mask: event.mask, stamp: event.stamp }); if (prints.length > 6) prints.shift(); }
    }
    if (effects.length > 40) effects.splice(0, effects.length - 40);
  }
  function render(state, seconds = 0, preferences = {}) {
    clock += preferences.reducedMotion || state.stage !== 'play' ? 0 : seconds;
    drawBackdrop(state, preferences.reducedMotion);
    for (const sheet of state.sheets || []) {
      const x = BOARD.left + BOARD.width * sheet.x, y = BOARD.lanes[sheet.lane] + 13;
      paperCard(x, y, sheet.inkMask, sheet.targetMask, sheet.stamp, sheet.targetStamp, state.selectedLane === sheet.lane, sheet.id, state.level.stamps);
    }
    for (let index = effects.length - 1; index >= 0; index--) {
      const effect = effects[index]; effect.age += seconds;
      if (effect.age > .85) { effects.splice(index, 1); continue; }
      const y = BOARD.lanes[effect.lane ?? 0];
      ctx.globalAlpha = Math.max(0, 1 - effect.age / .85);
      if (effect.type === 'ship' || effect.type === 'spoil') {
        const good = effect.type === 'ship';
        label(good ? '+' + effect.points : 'PROOF LOST', 1026, y - 44 - (preferences.reducedMotion ? 0 : effect.age * 30), good ? 21 : 11, good ? '#207d70' : '#bf563e', 'monospace', 'center');
        if (good && !preferences.reducedMotion) for (let p = 0; p < 6; p++) { ctx.fillStyle = RECIPE_COLORS[effect.mask]; ctx.fillRect(1033 + Math.sin(p * 2.4) * effect.age * 60, y + Math.cos(p * 2.4) * effect.age * 65, 5, 7); }
      }
      ctx.globalAlpha = 1;
    }
    if (state.brake.remaining > 0) {
      box(917, 117, 236, 25, '#e5f5ea', '#6ca58d', 5);
      label('PRECISION BRAKE · ' + state.brake.remaining.toFixed(1) + 's', 1035, 130, 10, '#317960', 'monospace', 'center');
    }
  }
  return { render, acceptEvents, glyph, rosette };
}
