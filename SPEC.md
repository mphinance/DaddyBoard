# DaddyBoard — SPEC

An always-on **TraderDaddy Pro wall display**. A headless Node daemon reads the
customer's own `td_live_` API key from a local `config.json`, polls the **public
TraderDaddy Pro MCP endpoint** on a market-hours-aware schedule, caches the
responses, and serves ONE full-screen dark dashboard designed to be read from 10
feet away — for Chromium kiosk mode on a Raspberry Pi hung on the wall.

This is a **self-contained appliance**. It lives entirely in `td-daddyboard/`,
depends only on `express`, uses **no build step** (vanilla client so it runs on a
Pi), and does NOT touch the Next.js app or the backend.

## Goal

Walk past it and instantly see *what smart money is doing right now*. The hero is
the live unusual-activity flow tape; everything else frames it. Off-hours it
shows a graceful closed/recap state. A `MOCK_MODE` renders canned fixtures so it
demos with zero API key (this is also how agents verify, and doubles as the
marketing-screenshot mode).

## Stack / constraints

- **Runtime:** Node ≥20, ES modules (`"type": "module"`). Global `fetch` (no
  node-fetch dependency).
- **Server:** Express. One dependency. Serves static client from `public/` +ONE
  JSON aggregate endpoint `GET /api/state`.
- **Client:** Vanilla HTML/CSS/JS in `public/`. **No framework, no bundler, no
  build.** ES modules loaded directly by the browser (`<script type="module">`).
- **No secrets in git.** `config.json` is gitignored; only `config.example.json`
  is committed.

## The MCP contract (the thing everything depends on)

- **Endpoint:** `POST {baseUrl}/api/v1/mcp` where `baseUrl` defaults to
  `https://api.traderdaddy.pro`.
- **Auth:** send BOTH `X-API-Key: <td_live_...>` and
  `Authorization: Bearer <td_live_...>` (either is accepted; sending both is
  safe).
- **Transport:** JSON-RPC 2.0 over MCP StreamableHTTP, **stateless**
  (`sessionIdGenerator: undefined` server-side). **One JSON-RPC message per HTTP
  request** — batches are rejected. Send header
  `Accept: application/json, text/event-stream`. The response may come back
  **SSE-framed** (`text/event-stream`, lines like `data: {json}`) OR as plain
  `application/json` — the client MUST handle both: if `content-type` includes
  `text/event-stream`, parse the last `data:` line as JSON; else `JSON.parse` the
  body.
- **Handshake:** stateless mode still expects the MCP lifecycle. Perform an
  `initialize` request first (method `initialize`, params
  `{ protocolVersion: "2024-11-05", capabilities: {}, clientInfo: { name:
  "daddyboard", version: "0.1.0" } }`), then send the `notifications/initialized`
  notification, then `tools/call`. If a bare `tools/call` works without the
  handshake against the live endpoint, keep it simple — but implement the
  handshake since the transport is spec-compliant. **Verify against a real
  response shape via MOCK_MODE fixtures; the live path is documented for the
  user to test with their own key.**
- **Tool call shape:** `{ jsonrpc: "2.0", id: <n>, method: "tools/call",
  params: { name: "<tool>", arguments: { ... } } }`. The result arrives as
  `result.content[0].text` — a **JSON string** that must be `JSON.parse`d to get
  the actual payload.
- **Rate limits:** per-key. On HTTP 429 (or JSON-RPC error code `-32000`), back
  off exponentially (base 2s, cap 60s, jitter) and serve the last cached value.
  Never hammer. A wall display does not need sub-second data.

### The 12 public tools

Market-wide (no arguments needed):
| tool | arguments | powers panel |
|---|---|---|
| `get_market_stats` | — | vitals header |
| `get_unusual_activity` | `{ direction?, minPremium?, limit? }` (omit ticker for market-wide) | **flow tape (hero)** |
| `get_gex_overview` | — | gamma landscape |
| `get_sector_flow` | — | sector heatmap |
| `get_put_call_ratios` | — | sentiment gauge |
| `get_earnings_flow` | — | "what's coming" ribbon |
| `get_economic_calendar` | — | "what's coming" ribbon |

Screener (enum key):
| `run_screener` | `{ screener: <key>, limit? }` — keys: `bullish-pullback`, `momentum`, `volatility-squeeze`, `small-cap`, `volatility-surge`, `gamma-scan`, `csp-wheel`, `leaps`, `leveraged`, `daily-cuts` | rotating feature card |

Ticker-scoped (need a `symbol` / `ticker`):
| `get_iv_rank` | `{ symbol }` | premium-seller watch |
| `get_strategy_ideas` | `{ symbol, direction?, capital?, deltaNeutral?, limit? }` | featured deep-dive |
| `get_edge_xray` | `{ symbol, expiration?, lens? }` | featured deep-dive |
| `get_gex_ticker` | `{ symbol }` | featured deep-dive |

**Featured symbol derivation:** the ticker-scoped tools need a symbol. The
daemon picks the **featured symbol** = the ticker of the top (highest-score /
highest-premium) row from the latest `get_unusual_activity` result, falling back
to the configured `featuredTickers` rotation (default `["SPY","QQQ","NVDA"]`) if
flow is empty. This makes the deep-dive follow the day's hottest name
automatically.

> **Exact output field shapes:** each tool's response fields are defined in its
> source at `backend/src/mcp/public/tools/<tool>.ts` in the parent repo. Agents
> building a panel MUST read the relevant tool source to get exact field names
> (e.g. `get_unusual_activity` rows are documented in `unusualActivity.ts`:
> `ticker, type, premium, volume, openInterest, sentiment, score, tradeType,
> vsOI, flowDescription, tier, tierColor, sentimentLabel, moneynessBucket`, plus
> top-level `total`, `aggregates`). Build fixtures from these real shapes.

## `/api/state` — the daemon → client contract

The daemon polls in the background and exposes ONE aggregate the client polls
(default every 5s; cheap, served from memory):

```jsonc
{
  "generatedAt": "2026-07-07T14:32:00.000Z",
  "mockMode": false,
  "market": {
    "phase": "open",            // "premarket" | "open" | "afterhours" | "closed" | "weekend" | "holiday"
    "isOpen": true,
    "label": "Market Open",
    "nextChangeAt": "2026-07-07T20:00:00.000Z"  // when the phase next flips
  },
  "featuredSymbol": "NVDA",
  "panels": {
    "marketStats":     { "data": { /* get_market_stats payload */ }, "fetchedAt": "...", "stale": false, "error": null },
    "unusualActivity": { "data": { /* get_unusual_activity payload */ }, "fetchedAt": "...", "stale": false, "error": null },
    "gexOverview":     { "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "sectorFlow":      { "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "putCallRatios":   { "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "earningsFlow":    { "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "economicCalendar":{ "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "screener":        { "data": { "screener": "daily-cuts", /* run_screener payload */ }, "fetchedAt": "...", "stale": false, "error": null },
    "ivRank":          { "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "strategyIdeas":   { "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "edgeXray":        { "data": {}, "fetchedAt": "...", "stale": false, "error": null },
    "gexTicker":       { "data": {}, "fetchedAt": "...", "stale": false, "error": null }
  }
}
```

- Each panel slot: `{ data, fetchedAt, stale, error }`. `stale: true` when the
  last successful fetch is older than 2× its poll interval (client dims it).
  `error` is a short string or null (never a raw upstream error message).
- The client is defensive: any panel may have `data: null` / `error` set and must
  render an empty/loading state, never crash.

### Poll cadence (market-hours aware; only poll when `isOpen` unless noted)

| panel(s) | interval (open) | notes |
|---|---|---|
| unusualActivity | 30s | hero |
| marketStats, putCallRatios | 60s | |
| gexOverview, sectorFlow | 120s | slow-moving |
| ivRank, strategyIdeas, edgeXray, gexTicker (featured) | 120s | re-pick symbol each cycle |
| screener (rotating) | 300s | rotate `screenerRotation` list, one per cycle |
| earningsFlow, economicCalendar | once at boot + every 30 min | "what's coming" |

When closed: stop the fast pollers, keep the last values (recap), refresh
earnings/econ + one final marketStats every 30 min.

## Client design — "make it nice" (this is the whole point)

- **Aesthetic:** premium dark trading-terminal. Deep navy/near-black background
  (`#0b0f1a`-ish), glassmorphism panels (subtle `backdrop-filter: blur`,
  translucent card fills, 1px hairline borders), a restrained accent system.
  Think TraderDaddy Frosted-UI energy, but its own standalone identity — bolder,
  because it's read from across a room.
- **Legibility from 10 feet:** large type, high contrast, generous spacing. A
  glance should convey the market's mood via color and motion before any reading.
- **Color semantics:** green = bullish/positive, red = bearish/negative, amber =
  caution/neutral — but use tasteful HSL tones, never raw `#f00`/`#0f0`. Define a
  design-token layer (CSS custom properties) all panels consume.
- **Motion with restraint:** the flow tape scrolls/streams; new hero rows can
  flash in (split-flap / ticker-tape feel). Everything else updates calmly (fade
  crossfades, no jarring reflows). Respect `prefers-reduced-motion`.
- **Layout:** fixed **vitals header** (market_stats) across the top; a persistent
  **flow-tape hero** as the dominant region; a **panel grid** of always-visible
  small panels; a **rotating "main stage"** that cycles the heavier
  panels (screener / strategy / edge-xray / iv-rank) every `rotationSeconds`; a
  bottom **"what's coming" ribbon** (earnings + econ). A small footer strip shows
  clock, market phase, featured symbol, connection status, and a MOCK badge when
  in mock mode.
- **Panel registry:** each panel is a self-registering ES module
  (`public/panels/<name>.js`) exporting `{ id, mount(el), update(state) }` and
  registering itself into a global registry the shell drives. This lets parallel
  agents each own one panel file + its CSS with zero collisions.

## Out of scope

- No auth UI, no login, no website integration — the key lives in a file.
- No trading / order placement — read-only display.
- No writes to the backend or DB. No changes anywhere outside `td-daddyboard/`.
- No historical storage / DB — in-memory cache only.
- No WebSocket/streaming from the MCP (it's request/response) — poll-based only.

## Acceptance (see feature_list.json for the testable list)

- `npm install && MOCK_MODE=true npm start` boots, serves the dashboard on the
  configured port, and every panel renders from fixtures with no console errors.
- With a real `config.json` key, the daemon reaches the live MCP and panels fill
  with live data (user-verified; agents verify the mock path).
- Market-phase logic is correct for open/closed/weekend and drives poller
  behavior and the off-hours state.
- Nothing outside `td-daddyboard/` is modified.
