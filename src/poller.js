/**
 * poller.js — Background poll loop + in-memory state store.
 *
 * Owns the aggregate /api/state object:
 *   { generatedAt, mockMode, market, featuredSymbol, panels{12 slots} }
 *
 * Poll cadence (SPEC table):
 *   unusualActivity          30s  (hero)
 *   marketStats, putCallRatios 60s
 *   gexOverview, sectorFlow  120s
 *   ivRank, strategyIdeas, edgeXray, gexTicker  120s  (featured symbol)
 *   screener (rotating)      300s  (rotates screenerRotation list)
 *   earningsFlow, economicCalendar  boot + every 30 min
 *
 * In MOCK_MODE: reads fixtures on the real cadence (timer-based), so
 * rotation/stale logic is exercised.  Mock intervals are the same as live
 * (they're already generous) but can be tuned with MOCK_INTERVAL_SCALE env.
 *
 * When market is closed: stop fast pollers, keep last values (recap),
 * refresh earnings/econ + one final marketStats every 30 min.
 *
 * On RateLimitError: exponential backoff (base 2s, cap 60s, jitter).
 * Cached data is served during backoff.
 */

import { config } from './config.js';
import { getMarketPhase } from './marketHours.js';
import { callTool, RateLimitError } from './mcpClient.js';
import * as fixtures from './mock/fixtures.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** @type {Record<string, { data: any, fetchedAt: string|null, stale: boolean, error: string|null }>} */
const PANEL_DEFAULTS = () => ({
  data: null, fetchedAt: null, stale: false, error: null,
});

const state = {
  generatedAt: new Date().toISOString(),
  mockMode: config.mockMode,
  market: { phase: 'closed', isOpen: false, label: 'Market Closed', nextChangeAt: null },
  featuredSymbol: config.featuredTickers[0] ?? 'SPY',
  panels: {
    marketStats:      PANEL_DEFAULTS(),
    unusualActivity:  PANEL_DEFAULTS(),
    gexOverview:      PANEL_DEFAULTS(),
    sectorFlow:       PANEL_DEFAULTS(),
    putCallRatios:    PANEL_DEFAULTS(),
    earningsFlow:     PANEL_DEFAULTS(),
    economicCalendar: PANEL_DEFAULTS(),
    screener:         PANEL_DEFAULTS(),
    ivRank:           PANEL_DEFAULTS(),
    strategyIdeas:    PANEL_DEFAULTS(),
    edgeXray:         PANEL_DEFAULTS(),
    gexTicker:        PANEL_DEFAULTS(),
  },
};

// Screener rotation index
let screenerIdx = 0;

// Featured tickers rotation fallback index
let featuredTickerIdx = 0;

// Per-panel backoff state
const backoff = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Shallow-clone state for the /api/state response (avoid mutation from outside). */
export function getState() {
  state.generatedAt = new Date().toISOString();
  state.market = getMarketPhase();
  return JSON.parse(JSON.stringify(state));
}

/** Update a single panel slot on success. */
function setPanel(name, data) {
  state.panels[name] = {
    data,
    fetchedAt: new Date().toISOString(),
    stale: false,
    error: null,
  };
}

/** Mark a panel as errored, keeping previous data. */
function setError(name, shortMsg) {
  const prev = state.panels[name];
  state.panels[name] = {
    data: prev.data,            // keep previous data
    fetchedAt: prev.fetchedAt,
    stale: prev.fetchedAt !== null, // if there's previous data it may now be stale
    error: shortMsg,
  };
}

/** Recompute stale flags for all panels based on their intervals. */
const INTERVALS_MS = {
  unusualActivity:  30_000,
  marketStats:      60_000,
  putCallRatios:    60_000,
  gexOverview:      120_000,
  sectorFlow:       120_000,
  ivRank:           120_000,
  strategyIdeas:    120_000,
  edgeXray:         120_000,
  gexTicker:        120_000,
  screener:         300_000,
  earningsFlow:     30 * 60_000,
  economicCalendar: 30 * 60_000,
};

function refreshStaleFlags() {
  // When the market is closed we deliberately stop the fast pollers, so the
  // last-fetched values are the *freshest data that exists* — last session,
  // not stale. Staleness only means "we expected a refresh and didn't get one,"
  // which can only happen while the market is open. The board sits closed
  // ~17.5h/day plus weekends — its main glance window — so we must not paint
  // every panel STALE for the majority of its life.
  const marketOpen = getMarketPhase().isOpen;
  const now = Date.now();
  for (const [name, panel] of Object.entries(state.panels)) {
    if (!panel.fetchedAt) continue;
    if (!marketOpen) { state.panels[name].stale = false; continue; }
    const age = now - new Date(panel.fetchedAt).getTime();
    const threshold = (INTERVALS_MS[name] ?? 120_000) * 2;
    state.panels[name].stale = age > threshold;
  }
}

/** Compute jittered backoff delay in ms. */
function nextBackoffMs(panelName) {
  const b = backoff[panelName] ?? { attempt: 0 };
  const delay = Math.min(2_000 * Math.pow(2, b.attempt), 60_000);
  const jitter = Math.random() * 1000;
  backoff[panelName] = { attempt: b.attempt + 1, until: Date.now() + delay + jitter };
  return delay + jitter;
}

function clearBackoff(panelName) {
  delete backoff[panelName];
}

function isBackingOff(panelName) {
  const b = backoff[panelName];
  return b && b.until > Date.now();
}

/**
 * Derive the featured symbol from the top unusual-activity row.
 * Falls back to featuredTickers rotation.
 */
function deriveFeaturedSymbol() {
  const ua = state.panels.unusualActivity.data;
  if (ua?.data?.length > 0) {
    // Sort by score desc, then premium desc
    const sorted = [...ua.data].sort((a, b) =>
      (b.score - a.score) || (b.premium - a.premium),
    );
    const top = sorted[0];
    if (top?.ticker) return top.ticker;
  }
  // Fallback: rotate through featuredTickers
  const tickers = config.featuredTickers;
  const sym = tickers[featuredTickerIdx % tickers.length];
  return sym;
}

// ---------------------------------------------------------------------------
// Fixture access (mock mode)
// ---------------------------------------------------------------------------

function fixtureForTool(name, args) {
  const f = fixtures[name];
  if (typeof f === 'function') return f(args);
  return f;
}

/**
 * Run async tasks with a bounded concurrency so we never burst the per-key
 * rate limit (e.g. the boot fan-out). Live mode caps at 2 in-flight; mock
 * mode has no real endpoint so it runs them all at once.
 */
async function runLimited(tasks, limit) {
  if (config.mockMode || tasks.length <= limit) {
    await Promise.allSettled(tasks.map((t) => t()));
    return;
  }
  let i = 0;
  const worker = async () => {
    while (i < tasks.length) {
      const task = tasks[i++];
      try { await task(); } catch { /* fetchPanel already handles errors */ }
    }
  };
  await Promise.all(Array.from({ length: limit }, worker));
}

// ---------------------------------------------------------------------------
// Core fetch wrapper — handles mock/live, backoff, errors
// ---------------------------------------------------------------------------

async function fetchPanel(panelName, toolName, args = {}) {
  if (isBackingOff(panelName)) return; // serve cached data

  try {
    let data;
    if (config.mockMode) {
      data = fixtureForTool(toolName, args);
      if (!data) throw new Error(`No fixture for tool: ${toolName}`);
    } else {
      data = await callTool(toolName, args);
    }
    setPanel(panelName, data);
    clearBackoff(panelName);
  } catch (err) {
    if (err instanceof RateLimitError) {
      const delay = nextBackoffMs(panelName);
      console.warn(`[poller] Rate limited on ${panelName} — backing off ${Math.round(delay / 1000)}s`);
      setError(panelName, 'Rate limited — retrying');
    } else {
      clearBackoff(panelName);
      const short = `Fetch failed: ${err.message?.slice(0, 80) ?? 'unknown error'}`;
      console.error(`[poller] ${panelName} error:`, err.message);
      setError(panelName, short);
    }
  }
}

// ---------------------------------------------------------------------------
// Individual poll tasks
// ---------------------------------------------------------------------------

async function pollUnusualActivity() {
  // minScore MUST be explicit. Omitting it makes the MCP tool inherit the
  // service default of 95, which returns [] on any session where nothing scores
  // ≥95 (a common, quiet-market state) — while the web app's REST feed passes
  // 70. Pass 70 here so the board's tape matches the site row-for-row.
  await fetchPanel('unusualActivity', 'get_unusual_activity', { limit: 25, minScore: 70 });
  // After UA updates, rederive the featured symbol
  state.featuredSymbol = deriveFeaturedSymbol();
}

async function pollMarketStats() {
  await fetchPanel('marketStats', 'get_market_stats');
}

async function pollPutCallRatios() {
  // Market-wide: use SPY as the primary ticker
  await fetchPanel('putCallRatios', 'get_put_call_ratios', { ticker: 'SPY' });
}

async function pollGexOverview() {
  await fetchPanel('gexOverview', 'get_gex_overview');
}

async function pollSectorFlow() {
  await fetchPanel('sectorFlow', 'get_sector_flow', { window: 'today' });
}

async function pollFeaturedTickerTools() {
  const sym = state.featuredSymbol;
  await runLimited([
    () => fetchPanel('ivRank',        'get_iv_rank',        { symbol: sym }),
    () => fetchPanel('strategyIdeas', 'get_strategy_ideas', { symbol: sym }),
    () => fetchPanel('edgeXray',      'get_edge_xray',      { symbol: sym }),
    () => fetchPanel('gexTicker',     'get_gex_ticker',     { symbol: sym }),
  ], 2);
  // Advance featured ticker fallback index for next cycle
  featuredTickerIdx = (featuredTickerIdx + 1) % config.featuredTickers.length;
}

async function pollScreener() {
  const rotation = config.screenerRotation;
  const screener = rotation[screenerIdx % rotation.length];
  screenerIdx++;
  await fetchPanel('screener', 'run_screener', { screener, limit: 10 });
}

async function pollSlowPanels() {
  await Promise.allSettled([
    fetchPanel('earningsFlow',    'get_earnings_flow',    { days: 7 }),
    fetchPanel('economicCalendar','get_economic_calendar', {}),
  ]);
}

// ---------------------------------------------------------------------------
// Poll scheduler
// ---------------------------------------------------------------------------

/** Start all background poll loops. */
export function startPolling() {
  console.log(`[poller] Starting in ${config.mockMode ? 'MOCK' : 'LIVE'} mode`);

  // Run once immediately at boot. In live mode these are throttled to 2
  // in-flight so the cold-start doesn't burst the per-key rate limit.
  // unusualActivity runs first so featuredSymbol is derived before the
  // featured-ticker tools fetch.
  const bootInit = async () => {
    await runLimited([pollUnusualActivity], 1);
    await runLimited([
      pollMarketStats,
      pollPutCallRatios,
      pollGexOverview,
      pollSectorFlow,
      pollFeaturedTickerTools,
      pollScreener,
      pollSlowPanels,
    ], 2);
    refreshStaleFlags();
    console.log('[poller] Initial fetch complete');
  };

  bootInit();

  // --- Fast pollers (market-hours aware) ---

  // unusualActivity: 30s
  setInterval(async () => {
    refreshStaleFlags();
    const market = getMarketPhase();
    if (market.isOpen) {
      await pollUnusualActivity();
    }
  }, 30_000);

  // marketStats + putCallRatios: 60s (open) or 30min (closed)
  setInterval(async () => {
    const market = getMarketPhase();
    if (market.isOpen) {
      await Promise.allSettled([pollMarketStats(), pollPutCallRatios()]);
    }
  }, 60_000);

  // gexOverview + sectorFlow: 120s (open only)
  setInterval(async () => {
    const market = getMarketPhase();
    if (market.isOpen) {
      await Promise.allSettled([pollGexOverview(), pollSectorFlow()]);
    }
  }, 120_000);

  // Featured-symbol tools: 120s (open only)
  setInterval(async () => {
    const market = getMarketPhase();
    if (market.isOpen) {
      await pollFeaturedTickerTools();
    }
  }, 120_000);

  // Screener rotation: 300s (open only)
  setInterval(async () => {
    const market = getMarketPhase();
    if (market.isOpen) {
      await pollScreener();
    }
  }, 300_000);

  // Slow panels (earnings + econ): every 30 min regardless of market hours
  setInterval(async () => {
    await pollSlowPanels();
  }, 30 * 60_000);

  // Closed-market heartbeat: every 30 min refresh marketStats when closed
  setInterval(async () => {
    const market = getMarketPhase();
    if (!market.isOpen) {
      await pollMarketStats();
    }
    refreshStaleFlags();
  }, 30 * 60_000);

  // Stale flag refresh: every 30s regardless
  setInterval(refreshStaleFlags, 30_000);
}
