/**
 * DaddyBoard — app.js
 * Shell engine + panel registry.
 *
 * CONTRACT (for Wave-3 panel agents):
 *   import { register, fmt } from '../app.js';
 *   register('<panelId>', { title, mount(container), update(container, slot, fullState) });
 *
 *   mount(container)               — called ONCE when the container is first available.
 *                                    Set up inner DOM, attach event listeners here.
 *   update(container, slot, state) — called every poll cycle (~5s).
 *                                    slot = state.panels[panelId]
 *                                    slot shape: { data, fetchedAt, stale, error }
 *                                    state = full /api/state object (market, featuredSymbol…)
 *
 * Helper exports (use these — no raw number formatting in panels):
 *   fmt.currency(n)     — "$3.84M" / "$975K"
 *   fmt.pct(n)          — "2.5%"
 *   fmt.score(n)        — "94"
 *   fmt.time(isoStr)    — "1:45 PM"
 *   fmt.relTime(isoStr) — "3m ago"
 *
 * Signalling empty/error in mount:
 *   Use applySlotState(container, slot) — sets .is-stale / .is-error on the
 *   container's nearest .panel ancestor and renders an inline error message.
 *   Call this at the top of update() before your render logic.
 */

// ---------------------------------------------------------------------------
// Formatters — exported for panel use
// ---------------------------------------------------------------------------
export const fmt = {
  currency(n) {
    if (n == null || isNaN(n)) return '—';
    const abs = Math.abs(n);
    if (abs >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000)     return `$${(n / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000)         return `$${(n / 1_000).toFixed(1)}K`;
    return `$${n.toFixed(0)}`;
  },
  pct(n, decimals = 1) {
    if (n == null || isNaN(n)) return '—';
    return `${n >= 0 ? '+' : ''}${n.toFixed(decimals)}%`;
  },
  score(n) {
    if (n == null || isNaN(n)) return '—';
    return String(Math.round(n));
  },
  number(n, decimals = 0) {
    if (n == null || isNaN(n)) return '—';
    return n.toLocaleString('en-US', { maximumFractionDigits: decimals });
  },
  time(isoStr) {
    if (!isoStr) return '—';
    try {
      return new Date(isoStr).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit', hour12: true,
        timeZone: 'America/New_York',
      });
    } catch { return '—'; }
  },
  relTime(isoStr) {
    if (!isoStr) return '—';
    try {
      const diff = Date.now() - new Date(isoStr).getTime();
      const s = Math.round(diff / 1000);
      if (s < 60)  return `${s}s ago`;
      const m = Math.round(s / 60);
      if (m < 60)  return `${m}m ago`;
      const h = Math.round(m / 60);
      return `${h}h ago`;
    } catch { return '—'; }
  },
  ratio(n, decimals = 2) {
    if (n == null || isNaN(n)) return '—';
    return n.toFixed(decimals);
  },
};

// ---------------------------------------------------------------------------
// Panel registry
// ---------------------------------------------------------------------------
const _registry = new Map(); // panelId → { title, mount, update, mounted }

/**
 * register(panelId, descriptor)
 * Called by each panel module. app.js will wire up the [data-panel] container,
 * call mount() once on first data arrival, then update() every cycle.
 */
export function register(panelId, { title, mount, update }) {
  _registry.set(panelId, { title, mount, update, mounted: false });
}

// ---------------------------------------------------------------------------
// Slot state helpers
// ---------------------------------------------------------------------------
/**
 * applySlotState(container, slot)
 * Adds .is-stale / .is-error to the nearest .panel ancestor.
 * Returns true if the slot has an error (so panel update() can bail early).
 */
export function applySlotState(container, slot) {
  const panel = container.closest('.panel') ?? container;
  panel.classList.toggle('is-stale', !!slot?.stale);
  panel.classList.toggle('is-error', !!slot?.error);
  if (slot?.error) {
    const existing = container.querySelector('.panel-error-msg');
    if (!existing) {
      container.innerHTML = `
        <div class="panel-loading">
          <div class="error-icon">&#9675;</div>
          <div style="font-size:var(--text-xs);color:var(--text-muted);">${slot.error}</div>
        </div>`;
    }
    return true;
  }
  return false;
}

/**
 * renderEmpty(container, message)
 * For panels with null data — show a tasteful placeholder.
 */
export function renderEmpty(container, message = 'No data') {
  container.innerHTML = `
    <div class="panel-loading">
      <div class="pulse-dot"></div>
      <div>${message}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Rotating main-stage
// ---------------------------------------------------------------------------
// TODO: read from data-rotation attr or /api/config if needed.
const ROTATION_SECONDS = parseInt(document.documentElement.dataset.rotation ?? '20', 10);
const STAGE_PANELS = ['screener', 'strategyIdeas', 'edgeXray', 'gexTicker'];
const STAGE_SLOT_IDS = {
  screener:      'stage-screener',
  strategyIdeas: 'stage-strategyIdeas',
  edgeXray:      'stage-edgeXray',
  gexTicker:     'stage-gexTicker',
};

let _stageIndex = 0;
let _stageTimer = null;

function activateStageSlot(idx) {
  STAGE_PANELS.forEach((id, i) => {
    const el = document.getElementById(STAGE_SLOT_IDS[id]);
    if (!el) return;
    el.classList.toggle('is-active', i === idx);
  });
}

function startRotation() {
  activateStageSlot(0);
  _stageTimer = setInterval(() => {
    _stageIndex = (_stageIndex + 1) % STAGE_PANELS.length;
    activateStageSlot(_stageIndex);
  }, ROTATION_SECONDS * 1000);
}

// ---------------------------------------------------------------------------
// Clock
// ---------------------------------------------------------------------------
function tickClock() {
  const now = new Date();
  const str = now.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', second: '2-digit',
    hour12: true, timeZone: 'America/New_York',
  });
  document.getElementById('footer-clock')?.let?.(el => el.textContent = str)
  || (document.getElementById('footer-clock') && (document.getElementById('footer-clock').textContent = str));
  document.getElementById('header-clock') && (document.getElementById('header-clock').textContent = str);
}

function startClock() {
  tickClock();
  setInterval(tickClock, 1000);
}

// ---------------------------------------------------------------------------
// Market phase chrome
// ---------------------------------------------------------------------------
function updatePhaseChrome(market) {
  if (!market) return;

  const { phase, isOpen, label } = market;
  const dotClass = isOpen ? 'is-open'
    : (phase === 'premarket' ? 'is-pre'
    : (phase === 'afterhours' ? 'is-after' : 'is-closed'));

  ['footer-phase-dot', 'header-phase-dot'].forEach(id => {
    const dot = document.getElementById(id);
    if (!dot) return;
    dot.className = `phase-dot ${dotClass}`;
  });

  ['footer-phase-label', 'header-phase-label'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = label ?? phase ?? '—';
  });

  document.body.classList.toggle('market-closed', !isOpen);
}

// ---------------------------------------------------------------------------
// Connection indicator
// ---------------------------------------------------------------------------
let _connected = true;

function setConnected(ok) {
  _connected = ok;
  document.body.classList.toggle('is-disconnected', !ok);
  const dot = document.getElementById('conn-dot');
  const lbl = document.getElementById('conn-label');
  if (dot) dot.classList.toggle('is-disconnected', !ok);
  if (lbl) lbl.textContent = ok ? 'live' : 'disconnected';
}

// ---------------------------------------------------------------------------
// Panel wiring
// ---------------------------------------------------------------------------
function getContainer(panelId) {
  return document.querySelector(`[data-panel="${panelId}"]`);
}

function drivePanel(panelId, slot, fullState) {
  const descriptor = _registry.get(panelId);
  if (!descriptor) return;

  const container = getContainer(panelId);
  if (!container) return;

  if (!descriptor.mounted) {
    descriptor.mount(container);
    descriptor.mounted = true;
  }

  try {
    descriptor.update(container, slot ?? { data: null, fetchedAt: null, stale: false, error: null }, fullState);
  } catch (err) {
    console.error(`[daddyboard] panel "${panelId}" update error:`, err);
  }
}

function driveAllPanels(state) {
  for (const panelId of _registry.keys()) {
    const slot = state.panels?.[panelId] ?? null;
    drivePanel(panelId, slot, state);
  }
}

// ---------------------------------------------------------------------------
// Poller
// ---------------------------------------------------------------------------
let _lastState = null;
const POLL_INTERVAL_MS = 5000;

async function fetchState() {
  try {
    const res = await fetch('/api/state');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const state = await res.json();
    setConnected(true);
    return state;
  } catch (err) {
    setConnected(false);
    return null;
  }
}

async function poll() {
  const state = await fetchState();
  if (!state) {
    // keep last render, just stay disconnected
    return;
  }

  _lastState = state;

  // Mock badge
  const mockBadge = document.getElementById('mock-badge');
  if (mockBadge) mockBadge.classList.toggle('is-visible', !!state.mockMode);

  // Phase chrome
  updatePhaseChrome(state.market);

  // Featured symbol
  const featuredEl = document.getElementById('footer-featured');
  if (featuredEl) featuredEl.textContent = state.featuredSymbol ?? '—';

  // Drive all panels
  driveAllPanels(state);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  startClock();
  startRotation();

  // Import all 12 panel modules so they self-register
  await Promise.all([
    import('./panels/marketStats.js'),
    import('./panels/unusualActivity.js'),
    import('./panels/gexOverview.js'),
    import('./panels/sectorFlow.js'),
    import('./panels/putCallRatios.js'),
    import('./panels/earningsFlow.js'),
    import('./panels/economicCalendar.js'),
    import('./panels/screener.js'),
    import('./panels/ivRank.js'),
    import('./panels/strategyIdeas.js'),
    import('./panels/edgeXray.js'),
    import('./panels/gexTicker.js'),
  ]);

  // First poll immediately, then on interval
  await poll();
  setInterval(poll, POLL_INTERVAL_MS);
}

boot().catch(err => console.error('[daddyboard] boot error:', err));
