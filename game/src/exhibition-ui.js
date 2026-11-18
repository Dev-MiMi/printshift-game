import { EXHIBITIONS, PRESS_KITS, exhibitionGoal } from './exhibition.js';
import { posterMarkup } from './posters.js';

const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

/** Production diagrams and menus for the optional exhibition, using real run results. */
export function exhibitionRoute(tour) {
  return `<div class="exhibition-route" aria-label="Three exhibition venues">${EXHIBITIONS.map((venue, index) => `<span class="${index === tour.index ? 'is-current' : index < tour.index ? 'is-delivered' : ''}"><i>${index < tour.index ? '✓' : String(index + 1).padStart(2, '0')}</i><b>${escape(venue.title)}</b><small>${['PAIRED ORDERS', 'TWO-SIDED PRINTS', 'GRAND FINALE'][index]}</small></span>`).join('')}</div>`;
}

export function exhibitionSetup() {
  return `<section class="panel exhibition-setup"><p class="eyebrow">THE EXHIBITION TOUR · THREE NEW PRODUCTION PUZZLES</p><h1>A bigger canvas.</h1><p class="panel-intro">Frame paired prints. Turn paper for a second face.<br>Bring both skills to the grand showcase.</p>${exhibitionRoute({ index: 0 })}<div class="upgrade-heading"><b>Choose your starting press.</b><span>Two tools now · one new upgrade between venues</span></div><div class="press-kit-grid">${PRESS_KITS.map(kit => `<button class="press-kit" data-action="kit" data-choice="${kit.id}"><i>${kit.icon}</i><b>${escape(kit.title)}</b><span>${escape(kit.description)}</span><strong>Pack this workshop ↗</strong></button>`).join('')}</div><p class="tip-line">For experienced printers. Try the five-shift campaign first to learn inks, stamps and crossfeed.</p><div class="panel-actions"><button class="button button-secondary" data-action="title">Back to workshop</button></div></section>`;
}

export function exhibitionLesson(tour) {
  const steps = tour.duplex
    ? [['1', 'Print the front', 'Match its ink and stamp. A good front waits at the return rack.'], ['F', 'Turn the paper', 'Select that lane. F returns the sheet to the neighboring belt.'], [tour.paired ? '⇄' : '2', tour.paired ? 'Finish together' : 'Print the back', tour.paired ? 'Print both new backs. Ship the partners within three seconds.' : 'Set the new ink and stamp. The first face stays on the folio.']]
    : [['⇉', 'Read both orders', 'Two different recipes enter neighboring lanes in one feed.'], ['1/2/3', 'Prepare both lanes', 'Route the first sheet; its partner takes the next lane.'], ['▣', 'Frame the pair', 'Ship both clean prints within three seconds for a frame.']];
  return `<div class="exhibition-lesson">${steps.map(([icon, title, text]) => `<div><i>${icon}</i><b>${title}</b><p>${text}</p></div>`).join('')}</div>`;
}

export function exhibitionSummary(tour) {
  return `<div class="exhibition-summary"><b>${escape(exhibitionGoal(tour))}</b><span>${tour.completed} / ${tour.goal} complete${tour.duplex ? ' · ' + tour.turns + ' paper turns' : ''} · +${tour.bonus} exhibition bonus</span></div>`;
}

export function exhibitionCollection(history) {
  return `<div class="exhibition-collection">${history.map(result => {
    const tour = result.exhibition;
    const samples = tour?.framed?.at(-1) || [tour?.frontSpecimen, result.specimen].filter(Boolean);
    return `<div class="exhibition-keepsake"><div class="framed-prints">${samples.map(sample => `<div>${posterMarkup(sample)}</div>`).join('')}</div><b>${escape(tour?.title)}</b><small>${tour?.completed} / ${tour?.goal} DELIVERED${tour?.turns ? ' · ' + tour.turns + ' TURNS' : ''}</small></div>`;
  }).join('')}</div>`;
}
