import { RECIPE_COLORS } from './recipes.js';

/** Five original editions, made from the same shapes on paper, menus and the folio. */
export const EDITIONS = Object.freeze([
  { name: 'Sunward', caption: 'Good mornings, printed here.', theme: 'morning' },
  { name: 'Color Parade', caption: 'A festival in three layers.', theme: 'noon' },
  { name: 'Fold & Fern', caption: 'A little geometry, a little growth.', theme: 'afternoon' },
  { name: 'Night Post', caption: 'Bright windows. Last collection.', theme: 'evening' },
  { name: 'Orbit Press', caption: 'Your signature among the stars.', theme: 'night' },
]);

const PAPER = '#fff8e3';
const NAVY = '#172b4d';
const XML = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

function editionIndex(value) {
  return Math.max(0, Math.min(4, Number.isFinite(Number(value)) ? Math.floor(Number(value)) : 0));
}

function posterShapes({ edition = 0, mask = 0, stamp = null } = {}) {
  const index = editionIndex(edition), ink = Number(mask) & 7;
  const main = ink ? RECIPE_COLORS[ink] : '#d5d3c1';
  const dark = ink ? NAVY : '#b8bbaf';
  const cyan = ink & 1 ? '#31b9d4' : main;
  const magenta = ink & 2 ? '#ed5b85' : main;
  const yellow = ink & 4 ? '#efc64e' : main;
  const shapes = [];
  const rect = (x, y, width, height, fill, extra = {}) => shapes.push({ kind: 'rect', x, y, width, height, fill, ...extra });
  const circle = (cx, cy, r, fill, extra = {}) => shapes.push({ kind: 'circle', cx, cy, r, fill, ...extra });
  const ellipse = (cx, cy, rx, ry, fill, extra = {}) => shapes.push({ kind: 'ellipse', cx, cy, rx, ry, fill, ...extra });
  const line = (x1, y1, x2, y2, stroke, strokeWidth = 1, extra = {}) => shapes.push({ kind: 'line', x1, y1, x2, y2, stroke, strokeWidth, ...extra });
  const path = (d, fill, extra = {}) => shapes.push({ kind: 'path', d, fill, ...extra });
  const text = (value, x, y, size, fill = dark, extra = {}) => shapes.push({ kind: 'text', value, x, y, size, fill, ...extra });
  rect(0, 0, 100, 110, PAPER);
  rect(5, 5, 90, 100, PAPER, { stroke: dark, strokeWidth: .6 });
  text(`EDITION ${String(index + 1).padStart(2, '0')}`, 10, 13, 4.5, dark);
  line(10, 17, 90, 17, dark, .65);

  if (index === 0) {
    // Sun rays over an invented neighborhood of stepped houses.
    circle(50, 42, 15, main);
    for (let ray = 0; ray < 12; ray++) {
      const angle = ray * Math.PI / 6;
      line(50 + Math.cos(angle) * 20, 42 + Math.sin(angle) * 20, 50 + Math.cos(angle) * 25, 42 + Math.sin(angle) * 25, yellow, 2);
    }
    rect(10, 61, 22, 24, cyan);
    rect(35, 55, 27, 30, main);
    rect(65, 63, 25, 22, magenta);
    path('M10 61 L21 52 L32 61 Z', dark);
    path('M35 55 L48 46 L62 55 Z', dark);
    for (const x of [16, 25, 41, 53, 71, 83]) {
      rect(x, x < 35 ? 67 : x < 65 ? 62 : 69, 4, 6, PAPER);
      rect(x, 77, 4, 6, PAPER);
    }
    line(10, 87, 90, 87, dark, 1.5);
    text('SUNWARD', 10, 98, 9.5, dark, { family: 'Georgia', weight: 700 });
  } else if (index === 1) {
    // Stacked festival arches alternate against a bold stair of color.
    path('M13 70 L13 52 A37 37 0 0 1 87 52 L87 70', 'none', { stroke: main, strokeWidth: 9 });
    path('M27 70 L27 52 A23 23 0 0 1 73 52 L73 70', 'none', { stroke: magenta, strokeWidth: 7 });
    path('M40 70 L40 52 A10 10 0 0 1 60 52 L60 70', 'none', { stroke: yellow, strokeWidth: 5 });
    rect(10, 73, 25, 9, cyan);
    rect(37, 73, 25, 9, magenta);
    rect(64, 73, 26, 9, yellow);
    circle(84, 27, 6, dark);
    text('COLOR', 10, 96, 9, dark, { family: 'Georgia', weight: 700 });
    text('PARADE', 10, 104, 6.5, dark);
  } else if (index === 2) {
    // A folded diamond and asymmetric leaves share a central printing spine.
    path('M50 23 L83 54 L50 86 L17 54 Z', main);
    path('M50 23 L50 86 L17 54 Z', cyan);
    path('M50 23 L83 54 L50 54 Z', magenta);
    line(50, 29, 50, 79, PAPER, 2);
    for (let leaf = 0; leaf < 3; leaf++) {
      const y = 40 + leaf * 12;
      ellipse(41, y, 11, 4.2, PAPER, { rotate: 32 });
      ellipse(59, y + 7, 11, 4.2, PAPER, { rotate: -32 });
    }
    circle(50, 29, 4, yellow);
    text('FOLD & FERN', 10, 98, 8.8, dark, { family: 'Georgia', weight: 700 });
  } else if (index === 3) {
    // A courier's diagonal crosses windows in a fictional evening skyline.
    rect(10, 23, 80, 61, main);
    circle(77, 36, 10, yellow);
    const buildings = [[14, 51, 12], [29, 40, 15], [47, 55, 13], [63, 47, 11], [77, 58, 9]];
    for (const [x, y, width] of buildings) {
      rect(x, y, width, 84 - y, dark);
      for (let yy = y + 5; yy < 78; yy += 9) for (let xx = x + 3; xx < x + width - 3; xx += 6) rect(xx, yy, 3, 4, PAPER);
    }
    path('M10 75 L90 51 L90 58 L10 82 Z', magenta);
    line(10, 88, 90, 88, dark, 1.3);
    text('NIGHT POST', 10, 99, 9.1, dark, { family: 'Georgia', weight: 700 });
  } else {
    // Three print orbits surround a crescent and a small signature starfield.
    rect(10, 23, 80, 63, main);
    ellipse(50, 55, 33, 13, 'none', { stroke: PAPER, strokeWidth: 1.5, rotate: -26 });
    ellipse(50, 55, 31, 20, 'none', { stroke: cyan, strokeWidth: 2, rotate: 29 });
    circle(50, 54, 15, PAPER);
    circle(56, 48, 13, main);
    for (const [x, y, radius] of [[25, 35, 3], [79, 70, 4], [33, 76, 2]]) {
      path(`M${x} ${y - radius} L${x + radius * .35} ${y - radius * .35} L${x + radius} ${y} L${x + radius * .35} ${y + radius * .35} L${x} ${y + radius} L${x - radius * .35} ${y + radius * .35} L${x - radius} ${y} L${x - radius * .35} ${y - radius * .35} Z`, yellow);
    }
    circle(75, 37, 3.5, magenta);
    text('ORBIT PRESS', 10, 99, 9, dark, { family: 'Georgia', weight: 700 });
  }
  if (stamp) {
    circle(87, 97, 5.8, PAPER, { stroke: dark, strokeWidth: .65 });
    if (stamp === 'diamond') path('M87 92.5 L91.5 97 L87 101.5 L82.5 97 Z', dark);
    else if (stamp === 'star') path('M87 92 L88.3 95.4 L92 95.4 L89 97.7 L90.2 101.3 L87 99.2 L83.8 101.3 L85 97.7 L82 95.4 L85.7 95.4 Z', dark);
    else circle(87, 97, 3.6, dark);
  }
  return shapes;
}

/** A shared display list makes Canvas paper and inline SVG previews the same original art. */
export function drawPoster(ctx, { edition = 0, mask = 0, stamp = null, width = 100, height = 110 } = {}) {
  ctx.save();
  ctx.scale(width / 100, height / 110);
  ctx.beginPath(); ctx.rect(0, 0, 100, 110); ctx.clip();
  for (const shape of posterShapes({ edition, mask, stamp })) {
    ctx.save();
    if (shape.rotate) { ctx.translate(shape.cx, shape.cy); ctx.rotate(shape.rotate * Math.PI / 180); ctx.translate(-shape.cx, -shape.cy); }
    ctx.lineWidth = shape.strokeWidth || 1;
    ctx.strokeStyle = shape.stroke || NAVY;
    ctx.fillStyle = shape.fill || PAPER;
    if (shape.kind === 'text') {
      ctx.font = `${shape.weight || 700} ${shape.size}px ${shape.family || 'monospace'}`;
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText(shape.value, shape.x, shape.y);
    } else if (shape.kind === 'line') {
      ctx.beginPath(); ctx.moveTo(shape.x1, shape.y1); ctx.lineTo(shape.x2, shape.y2); ctx.stroke();
    } else {
      let path;
      if (shape.kind === 'path') path = new Path2D(shape.d);
      else {
        ctx.beginPath();
        if (shape.kind === 'rect') ctx.rect(shape.x, shape.y, shape.width, shape.height);
        if (shape.kind === 'circle') ctx.arc(shape.cx, shape.cy, shape.r, 0, Math.PI * 2);
        if (shape.kind === 'ellipse') ctx.ellipse(shape.cx, shape.cy, shape.rx, shape.ry, 0, 0, Math.PI * 2);
      }
      if (shape.fill !== 'none') path ? ctx.fill(path) : ctx.fill();
      if (shape.stroke) path ? ctx.stroke(path) : ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

/** No URLs, generated identifiers, images or fonts: this SVG is the poster itself. */
export function posterMarkup({ edition = 0, mask = 0, stamp = null } = {}) {
  const body = posterShapes({ edition, mask, stamp }).map(shape => {
    const style = `fill="${shape.fill || 'none'}"${shape.stroke ? ` stroke="${shape.stroke}" stroke-width="${shape.strokeWidth || 1}"` : ''}${shape.rotate ? ` transform="rotate(${shape.rotate} ${shape.cx} ${shape.cy})"` : ''}`;
    if (shape.kind === 'rect') return `<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" ${style}/>`;
    if (shape.kind === 'circle') return `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" ${style}/>`;
    if (shape.kind === 'ellipse') return `<ellipse cx="${shape.cx}" cy="${shape.cy}" rx="${shape.rx}" ry="${shape.ry}" ${style}/>`;
    if (shape.kind === 'line') return `<line x1="${shape.x1}" y1="${shape.y1}" x2="${shape.x2}" y2="${shape.y2}" ${style}/>`;
    if (shape.kind === 'path') return `<path d="${shape.d}" ${style}/>`;
    return `<text x="${shape.x}" y="${shape.y}" font-family="${shape.family || 'monospace'}" font-size="${shape.size}" font-weight="${shape.weight || 700}" ${style}>${XML(shape.value)}</text>`;
  }).join('');
  return `<svg viewBox="0 0 100 110" role="img" aria-label="${XML(EDITIONS[editionIndex(edition)].name)} printed edition">${body}</svg>`;
}
