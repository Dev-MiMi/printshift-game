import { INKS, INK_STATIONS, RECIPE_COLORS, STAMP_X, recipeName, recipeSymbols } from './recipes.js';
import { EDITIONS, drawPoster } from './posters.js';
import { commissionObjective, runLabel } from './commissions.js';
import { exhibitionGoal, PAIR_WINDOW } from './exhibition.js';

export const BOARD = Object.freeze({ left: 130, right: 1050, width: 920, lanes: [265, 400, 535] });
const COLORS = { navy: '#172b4d', cream: '#fbf4dc', paper: '#fffbec', steel: '#c8d1cb', red: '#ef7259', teal: '#247f87' };
const inkX = index => BOARD.left + BOARD.width * INK_STATIONS[index];
const stampX = BOARD.left + BOARD.width * STAMP_X;
const ATMOSPHERES = Object.freeze({
  morning: { background: '#fbf4dc', frame: '#e5e7d2', lane: '#e9e8d5', selected: '#d5e6d7', accent: '#247f87' },
  noon: { background: '#fff2da', frame: '#e9dfcd', lane: '#f1e6ce', selected: '#e8e1ec', accent: '#8065a3' },
  afternoon: { background: '#f0f4df', frame: '#dde6d4', lane: '#e8eddc', selected: '#cee3d8', accent: '#427f70' },
  evening: { background: '#f8e9dc', frame: '#e7d6cf', lane: '#ecded6', selected: '#e9d4c5', accent: '#a76552' },
  night: { background: '#e6e9e9', frame: '#d1dde0', lane: '#e2e8e8', selected: '#c9dfdf', accent: '#435c81' },
});

export function hitTest(x, y, state) {
  if (!['play', 'brief'].includes(state.stage)) return null;
  for (const sheet of state.sheets || []) {
    const centerX = Math.max(162, BOARD.left + BOARD.width * sheet.x);
    if (Math.abs(x - centerX) < 45 && Math.abs(y - (BOARD.lanes[sheet.lane] + 20)) < 43) return { type: 'select-lane', lane: sheet.lane };
  }
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
  const posterCache = new Map();
  let clock = 0;
  let currentEdition = 0;
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
  function poster(edition, mask, stamp, x, y, width, height) {
    const key = [edition, mask, stamp || '', width, height].join('|');
    if (!posterCache.has(key)) {
      const image = document.createElement('canvas');
      image.width = Math.ceil(width * 2); image.height = Math.ceil(height * 2);
      drawPoster(image.getContext('2d'), { edition, mask, stamp, width: image.width, height: image.height });
      posterCache.set(key, image);
      if (posterCache.size > 180) posterCache.delete(posterCache.keys().next().value);
    }
    ctx.drawImage(posterCache.get(key), x, y, width, height);
  }
  function paperStatus(sheet, needsStamp) {
    if (sheet.awaitingFlip) return { text: 'F · TURN FRONT', color: '#a56e2b' };
    const wrong = (sheet.inkMask & ~sheet.targetMask) || (sheet.targetMask & sheet.processedMask & ~sheet.inkMask);
    if (wrong) return { text: 'REPRINT', color: '#b75543', bad: true };
    if (sheet.inkMask !== sheet.targetMask) return { text: 'LAYERING', color: '#7b877d' };
    if (needsStamp && !sheet.stamped) return { text: 'STAMP NEXT', color: '#a67c34' };
    if (needsStamp && sheet.stamp !== sheet.targetStamp) return { text: 'WRONG STAMP', color: '#b75543', bad: true };
    return { text: 'READY', color: '#247f87' };
  }
  function paperCard(x, y, sheet, selected, needsStamp, edition) {
    const status = paperStatus(sheet, needsStamp);
    const left = Math.max(117, x - 45), top = y - 41;
    const cardCenter = left + 45;
    ctx.save();
    box(left + 2, top + 4, 90, 86, 'rgba(23,43,77,.17)', null, 3);
    box(left, top, 90, 86, COLORS.paper, status.bad ? status.color : sheet.priority ? '#bd8b30' : selected ? COLORS.teal : '#adb7a7', 3);
    box(left + 4, top + 4, 82, 11, status.bad ? '#f0d6c9' : sheet.side === 'back' ? '#d8e9dc' : '#ecead9', null, 1);
    label(sheet.pairId ? 'PAIR ' + String(sheet.pairId).padStart(2, '0') : sheet.side ? sheet.side.toUpperCase() : sheet.priority ? 'PRIORITY' : 'NO.' + String(sheet.id).padStart(2, '0'), left + 8, top + 10, sheet.priority ? 6.5 : 8, sheet.priority ? '#977123' : '#52646b');
    label(recipeSymbols(sheet.targetMask), left + 82, top + 10, 8.5, COLORS.navy, 'monospace', 'right');
    poster(edition, sheet.inkMask, sheet.stamped ? sheet.stamp : null, left + 5, top + 18, 45, 50);
    if (sheet.frontPrint) {
      box(left + 6, top + 47, 22, 24, '#f7efd6', '#977f4a', 1);
      poster(sheet.frontPrint.edition, sheet.frontPrint.mask, sheet.frontPrint.stamp, left + 7, top + 48, 19, 21);
    }
    if (sheet.side) label(sheet.side === 'front' ? 'A' : 'B', left + 43, top + 65, 8, COLORS.navy);
    label('NEEDS', left + 56, top + 23, 6.5, '#7b8479');
    INKS.forEach((ink, index) => {
      const yy = top + 33 + index * 11;
      const required = Boolean(sheet.targetMask & ink.bit), printed = Boolean(sheet.inkMask & ink.bit);
      ctx.beginPath(); ctx.arc(left + 60, yy, 3, 0, Math.PI * 2);
      ctx.fillStyle = printed ? ink.color : '#e0dfce'; ctx.fill();
      ctx.strokeStyle = required ? '#566b6a' : '#c8cbbb'; ctx.lineWidth = required ? 1.2 : .6; ctx.stroke();
      label(ink.short, left + 69, yy, 8, required ? COLORS.navy : '#b0b4a6');
      if (printed && !required) label('×', left + 81, yy, 9, '#b75543');
    });
    if (needsStamp) {
      glyph(sheet.targetStamp, left + 62, top + 66, 4, '#536976', true);
      label(sheet.stamped && sheet.stamp === sheet.targetStamp ? '✓' : '→', left + 76, top + 66, 9, sheet.stamped && sheet.stamp !== sheet.targetStamp ? '#b75543' : '#247f87');
    }
    label(status.text, cardCenter, top + 78, 8, status.color, 'monospace', 'center');
    ctx.restore();
  }
  function drawBackdrop(state, reducedMotion) {
    const mood = ATMOSPHERES[state.level.theme] || ATMOSPHERES.morning;
    ctx.fillStyle = mood.background; ctx.fillRect(0, 0, 1200, 760);
    ctx.fillStyle = paperTexture;
    ctx.fillRect(0, 103, 1200, 560);
    box(17, 109, 1166, 548, mood.frame, '#bcc8bb', 15);
    box(27, 120, 1146, 74, '#f5efdb', '#d3d2bd', 9);
    label(state.exhibition?.paired ? 'PAIRED ORDERS' : 'THE ORDER BOOK', 45, 138, 10, '#596564');
    label('NEXT →', 45, 161, 17);
    label(state.exhibition?.paired ? 'NEIGHBOR LANES' : 'ROUTE BEFORE FEED', 45, 181, 8, '#68776b');
    state.incoming?.forEach((order, index) => {
      const x = 186 + index * 170;
      box(x, 128, 158, 59, COLORS.paper, index === 0 ? mood.accent : '#d7d5c3', 5);
      if (state.exhibition?.paired || state.exhibition?.duplex) {
        poster(state.shiftIndex, order.targetMask, order.targetStamp, x + 5, 135, 30, 33);
        const partner = state.exhibition.paired;
        poster(state.shiftIndex, partner ? order.partnerMask : order.backMask, partner ? order.partnerStamp : order.backStamp, x + 40, 135, 30, 33);
        label(index === 0 ? 'NEXT ' + (partner ? 'PAIR' : 'FOLIO') : 'AFTER ' + index, x + 80, 140, 8, mood.accent);
        label(recipeName(order.targetMask), x + 80, 153, 8.5);
        label(recipeName(partner ? order.partnerMask : order.backMask), x + 80, 166, 8.5);
        label(partner ? 'A ⇄ B · SHIP TOGETHER' : 'FRONT → F → BACK', x + 79, 179, 7, '#667568', 'monospace', 'center');
      } else {
        poster(state.shiftIndex, order.targetMask, state.level.stamps ? order.targetStamp : null, x + 5, 132, 44, 49);
        label(order.priority ? 'PRIORITY +40' : index === 0 ? 'NEXT ORDER' : 'AFTER ' + index, x + 56, 139, 7.5, order.priority ? '#ac7a2a' : '#788278');
        label(recipeName(order.targetMask).toUpperCase(), x + 56, 153, 11);
        label(recipeSymbols(order.targetMask), x + 56, 169, 11, mood.accent);
        if (state.level.stamps) glyph(order.targetStamp, x + 143, 170, 5, COLORS.navy, true);
      }
    });
    const barWidth = 161, portion = Math.max(0, Math.min(1, (state.spawnClock || 0) / (state.level.spawnEvery || 4)));
    label('FEEDS INTO LANE ' + (state.routingLane + 1), 720, 142, 8, '#68716b');
    box(720, 155, barWidth, 8, '#d9dcca', null, 3);
    box(720, 155, barWidth * (1 - portion), 8, mood.accent, null, 3);
    label(Math.max(0, state.spawnClock).toFixed(1) + 's TO FEED', 720, 178, 9, mood.accent);
    label('FRESH OFF THE PRESS', 919, 134, 8, '#697167');
    for (let index = 0; index < 3; index++) {
      const print = prints[prints.length - 3 + index];
      const x = 922 + index * 71;
      if (print) {
        box(x + 2, 144, 51, 43, '#ddd7c4', null, 2);
        poster(print.edition, print.mask, print.stamp, x + 4, 141, 40, 44);
      } else {
        box(x, 144, 49, 40, '#ebe9d8', '#d4d5c1', 3);
        label('·', x + 24, 163, 24, '#b4bba9', 'Georgia', 'center');
      }
    }
    for (let lane = 0; lane < 3; lane++) {
      const y = BOARD.lanes[lane], chosen = state.routingLane === lane;
      box(32, y - 57, 1136, 122, chosen ? mood.selected : mood.lane, chosen ? '#77a7a0' : '#ccd1bb', 10);
      if (state.selectedLane === lane && !chosen) { ctx.strokeStyle = mood.accent; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(120, y - 42); ctx.lineTo(120, y + 50); ctx.stroke(); }
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
        const pulse = Math.max(0, ...effects.filter(effect => effect.type === 'print' && effect.lane === lane && effect.ink === ink).map(effect => 1 - effect.age / .32));
        if (pulse > 0) { ctx.save(); ctx.globalAlpha = pulse * .7; box(x - 24, y - 14, 48, 25, info.color, null, 5); ctx.restore(); }
      }
      box(stampX - 28, y - 18, 56, 64, '#51615e', null, 6);
      box(stampX - 27, y - 56, 54, 35, state.level.stamps ? '#faeab6' : '#d6d9c4', '#52655c', 8);
      glyph(state.lanes[lane]?.stamp || 'circle', stampX, y - 38, 10, state.level.stamps ? COLORS.navy : '#9ea592', true);
      label(state.level.stamps ? 'STAMP' : 'LATER', stampX, y - 68, 7, '#68776b', 'monospace', 'center');
      box(1073, y - 23, 57, 68, '#e9bc70', '#b5965c', 5);
      ctx.strokeStyle = '#c39f66'; ctx.beginPath(); ctx.moveTo(1076, y + 9); ctx.lineTo(1127, y + 9); ctx.moveTo(1100, y - 18); ctx.lineTo(1100, y + 43); ctx.stroke();
      label(state.exhibition?.duplex ? 'F · RETURN' : 'SHIP', 1101, y - 35, 9, COLORS.navy, 'monospace', 'center');
      if (state.exhibition?.duplex) {
        const waiting = state.sheets.filter(sheet => sheet.lane === lane && sheet.awaitingFlip);
        if (waiting.length) {
          box(1073, y - 23, 57, 68, '#eacb82', '#997133', 5);
          label('F', 1101, y - 5, 24, '#795d2a', 'monospace', 'center');
          label('TURN', 1101, y + 21, 8, '#795d2a', 'monospace', 'center');
        }
        ctx.strokeStyle = '#a89768'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(1105, y + 56); ctx.lineTo(150, y + 56); ctx.lineTo(165, y + 48); ctx.stroke(); ctx.setLineDash([]);
      }
    }
    box(27, 604, 1146, 47, '#f7efdb', '#c4c9b5', 7);
    const client = state.commission;
    if (state.exhibition) {
      const tour = state.exhibition;
      label(tour.title.toUpperCase(), 43, 617, 14, mood.accent);
      label(exhibitionGoal(tour).toUpperCase(), 43, 638, 11, COLORS.navy);
      box(395, 611, 142, 31, '#e8d9ad', '#baa366', 4);
      label(tour.completed + ' / ' + tour.goal + (tour.paired ? ' FRAMES' : ' FOLIOS'), 466, 626, 12, '#796230', 'monospace', 'center');
      const waiting = Object.values(tour.waitingPairs).find(item => state.clock - item.time <= PAIR_WINDOW);
      label(waiting ? 'PAIR WINDOW ' + Math.max(0, PAIR_WINDOW - state.clock + waiting.time).toFixed(1) + 's' : tour.duplex ? 'PRINT FRONT → F TURN → PRINT BACK' : 'TWO LANES → TWO CLEAN PRINTS', 558, 619, 9, waiting ? '#ae5c43' : '#596c68');
      label(tour.duplex ? 'A = FRONT · B = BACK · INK ON FRONT STAYS' : 'PARTNERS ENTER NEIGHBORING LANES', 558, 638, 8, '#596c68');
    } else if (client) {
      label(client.name.toUpperCase(), 43, 617, 12, mood.accent);
      label(commissionObjective(client), 43, 638, 11, COLORS.navy);
      box(465, 611, 116, 31, client.completed ? '#d4e6d3' : '#e8dec1', null, 4);
      label(client.completed ? 'MASTERED +' + client.bonus : client.progress + ' / ' + client.target + ' · +' + client.bonus, 523, 626, 11, client.completed ? '#2b7d64' : '#82632a', 'monospace', 'center');
    } else {
      label(EDITIONS[state.shiftIndex].name.toUpperCase() + ' · SHIP ' + state.stats.quota + ' MATCHED POSTERS', 43, 617, 12, mood.accent);
      label('READ → SET ROLLERS → ROUTE → SHIP · Wrong proofs cost paper', 43, 638, 10, COLORS.navy);
    }
    label(runLabel(state), 1155, 617, 9, '#64766c', 'monospace', 'right');
    label(state.exhibition ? 'PAIR / TURN / FRAME' : state.transfer.enabled ? 'CLICK PAPER TO SELECT · Q/E CROSSFEED · INK STAYS ON PAPER' : 'Outlined dots = required · Filled dots = printed · Space buys time', 1155, 638, 9, COLORS.navy, 'monospace', 'right');
  }
  function acceptEvents(events) {
    for (const event of events) {
      if (['start', 'brief', 'title'].includes(event.type)) { effects.length = 0; prints.length = 0; clock = 0; }
      if (event.type === 'brief' && Number.isInteger(event.index)) currentEdition = event.index;
      if (['ship', 'spoil', 'print', 'stamp-sheet', 'ink', 'stamp', 'recycle', 'transfer', 'turn'].includes(event.type)) effects.push({ ...event, age: 0 });
      if (event.type === 'ship') { prints.push({ mask: event.mask, stamp: event.stamp, edition: event.edition ?? currentEdition }); if (prints.length > 3) prints.shift(); }
    }
    if (effects.length > 40) effects.splice(0, effects.length - 40);
  }
  function render(state, seconds = 0, preferences = {}) {
    currentEdition = state.shiftIndex;
    clock += preferences.reducedMotion || state.stage !== 'play' ? 0 : seconds;
    drawBackdrop(state, preferences.reducedMotion);
    for (const sheet of state.sheets || []) {
      const x = BOARD.left + BOARD.width * sheet.x, y = BOARD.lanes[sheet.lane] + 20;
      paperCard(x, y, sheet, state.selectedLane === sheet.lane, state.level.stamps, state.shiftIndex);
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
      } else if (effect.type === 'print' || effect.type === 'ink') {
        const x = inkX(effect.ink ?? 0), info = INKS[effect.ink ?? 0];
        if (effect.age < .32) {
          ctx.globalAlpha = Math.max(0, 1 - effect.age / .32);
          ctx.strokeStyle = info.color; ctx.lineWidth = 3;
          rounded(x - 34, y - 59, 68, 41, 8); ctx.stroke();
          if (effect.type === 'print') {
            const drop = preferences.reducedMotion ? 0 : effect.age * 35;
            for (let dot = 0; dot < 3; dot++) { ctx.beginPath(); ctx.arc(x - 10 + dot * 10, y + 8 + drop, 2.5, 0, Math.PI * 2); ctx.fillStyle = info.color; ctx.fill(); }
          }
        }
      } else if (effect.type === 'stamp' || effect.type === 'stamp-sheet') {
        if (effect.age < .35) {
          ctx.globalAlpha = Math.max(0, 1 - effect.age / .35);
          const spread = preferences.reducedMotion ? 0 : effect.age * 20;
          ctx.strokeStyle = '#b28b37'; ctx.lineWidth = 2;
          rounded(stampX - 32 - spread / 2, y - 59, 64 + spread, 41, 8); ctx.stroke();
          if (effect.type === 'stamp-sheet') glyph(effect.stamp, stampX, y + 16, 12, '#ab8241', true);
        }
      } else if (effect.type === 'recycle') {
        const x = BOARD.left + BOARD.width * (effect.x ?? .9);
        const drop = preferences.reducedMotion ? 0 : effect.age * 24;
        label('RECYCLED', Math.max(185, Math.min(1010, x)), y - 5 + drop, 10, '#997954', 'monospace', 'center');
      } else if (effect.type === 'transfer' || effect.type === 'turn') {
        const x = Math.max(160, Math.min(1030, BOARD.left + BOARD.width * effect.x));
        const sourceY = BOARD.lanes[effect.from] + 20;
        ctx.strokeStyle = '#247f87'; ctx.lineWidth = 3; ctx.setLineDash([5, 5]);
        ctx.beginPath(); ctx.moveTo(x, sourceY); ctx.lineTo(x, y + 20); ctx.stroke(); ctx.setLineDash([]);
        label(effect.type === 'turn' ? 'BACK TO THE PRESS' : 'CROSSFEED', x, y - 37, 10, '#247f87', 'monospace', 'center');
      }
      ctx.globalAlpha = 1;
    }
    if (state.brake.remaining > 0) {
      box(704, 171, 197, 20, '#e5f5ea', '#6ca58d', 5);
      label('BRAKE · ' + state.brake.remaining.toFixed(1) + 's', 802, 181, 10, '#317960', 'monospace', 'center');
    }
  }
  return { render, acceptEvents, glyph, rosette };
}
