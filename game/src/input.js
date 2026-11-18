const KEY_ACTIONS = { c: 0, m: 1, y: 2 };

export function createInput(canvas, onAction, getState, hitTest) {
  const handleKey = event => {
    if (event.ctrlKey || event.altKey || event.metaKey || event.repeat) return;
    const target = event.target;
    if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
    const key = event.key.toLowerCase();
    const state = getState();
    let action;
    // Menus keep normal keyboard button activation. Workshop shortcuts only
    // consume keys while the belts are running, apart from pause and begin.
    if ((key === 'p' || key === 'escape') && ['play', 'paused'].includes(state.stage)) {
      action = { type: state.stage === 'paused' ? 'resume' : 'pause' };
    } else if (key === 'enter' && state.stage === 'brief' && target?.tagName !== 'BUTTON') {
      action = { type: 'begin' };
    } else if (state.stage !== 'play') return;
    else if (/^[123]$/.test(key)) action = { type: 'route', lane: Number(key) - 1 };
    else if (Object.hasOwn(KEY_ACTIONS, key)) action = { type: 'toggle-ink', lane: state.selectedLane, ink: KEY_ACTIONS[key] };
    else if (key === 's') action = { type: 'cycle-stamp', lane: state.selectedLane };
    else if (key === 'r') action = { type: 'recycle' };
    else if (key === 'q' || key === 'e') action = { type: 'transfer', direction: key === 'q' ? -1 : 1 };
    else if (key === ' ') action = { type: 'brake' };
    else if (key === 'arrowup' || key === 'arrowleft') action = { type: 'route', direction: -1 };
    else if (key === 'arrowdown' || key === 'arrowright') action = { type: 'route', direction: 1 };
    if (action) { event.preventDefault(); onAction(action); }
  };
  const point = event => {
    const bounds = canvas.getBoundingClientRect();
    return { x: (event.clientX - bounds.left) * 1200 / bounds.width, y: (event.clientY - bounds.top) * 760 / bounds.height };
  };
  const handlePointer = event => {
    const location = point(event);
    const action = hitTest(location.x, location.y, getState());
    if (action) { event.preventDefault(); onAction(action); }
  };
  const handleMove = event => {
    const location = point(event);
    canvas.style.cursor = hitTest(location.x, location.y, getState()) ? 'pointer' : 'default';
  };
  const handleBlur = () => { if (getState().stage === 'play') onAction({ type: 'pause' }); };
  document.addEventListener('keydown', handleKey);
  canvas.addEventListener('pointerdown', handlePointer);
  canvas.addEventListener('pointermove', handleMove);
  window.addEventListener('blur', handleBlur);
  return { destroy() { document.removeEventListener('keydown', handleKey); canvas.removeEventListener('pointerdown', handlePointer); canvas.removeEventListener('pointermove', handleMove); window.removeEventListener('blur', handleBlur); } };
}
