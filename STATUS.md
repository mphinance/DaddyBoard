# DaddyBoard — build status

An always-on TraderDaddy Pro wall display appliance. Self-contained in
`td-daddyboard/`, built as an orchestrated multi-wave run. Does not touch the
Next app or the backend.

## What shipped

- **Foundation daemon** (`src/`): config loader (file + env, friendly no-key
  error), market-hours module (ET, all phases, 2026 holidays), MCP JSON-RPC
  client (initialize → tools/call, SSE + JSON parsing, dual auth headers, 429
  backoff), background poller with the full SPEC cadence + featured-symbol
  derivation + per-panel stale/error, Express serving `/api/state` + static.
- **MOCK_MODE**: realistic fixtures for all 12 tools (doubles as the demo /
  screenshot mode; DEMO badge shown).
- **Client** (`public/`): no-build vanilla ES-module shell — design-token system,
  glassmorphism layout, panel registry, rotating main stage, live clock + market
  phase, off-hours state, connection/stale/error handling.
- **12 panels**: flow-tape hero, market vitals, sentiment gauge, gamma bias,
  sector heatmap, IV-rank watch, screener card, strategy ideas, edge X-ray,
  ticker gamma ladder, earnings + econ ribbon.
- **README** with Raspberry Pi kiosk setup (systemd + Chromium `--kiosk`).

## Verification

- **Live** (`npm start` with a real `td_live_` key): daemon boots, **all 12
  panels fill from the real MCP endpoint with zero errors on cold start**, no
  429. Featured symbol derives from the top live flow row.
- `MOCK_MODE=true npm start` boots; `/api/state` returns the full contract; **all
  12 panels populate with data and no errors**; static assets serve 200.
- **Rendered pass (Playwright, 1920×1080):** both mock and live render with
  **zero console errors**; captures in `docs/screenshot-mock.png` /
  `docs/screenshot-live.png`.
- All client JS modules pass `node --check`; **no raw hex outside `tokens.css`**.
- All changes scoped to `td-daddyboard/` (verified via `git diff --name-only`).

## Feature list: 28 / 28 passing

All items pass. Notes on the four that were formerly held open:

| # | Item | How it cleared |
|---|---|---|
| 3 | Live MCP handshake | Verified against the real endpoint. The public transport is stateless — a bare `tools/call` is accepted with no `initialize` handshake, so the client now issues **one** POST per tool (was three). |
| 4 | Live 429 backoff | Confirmed live: the original 3-POST-per-tool boot burst self-inflicted a 429 and the exponential backoff fired correctly. Fixed the burst (single POST + a 2-in-flight boot cap) so cold start no longer trips the limit. |
| 24 | Premium glassmorphism aesthetic | Rendered via Playwright and reviewed; polished several data-driven issues (B-rollover on GEX values, tier-label overflow, flip-point clipping, vsOI overflow). |
| 25 | Legible from 10 feet | Confirmed on the full-screen render — large type, color-first hierarchy, glanceable. |

## How to take it further

- Add a `docs/screenshot.png` (run mock, full-screen, capture) for the README /
  marketing.
- Live-key smoke: `npm start` with a real `config.json`, confirm panels fill and
  Railway shows the MCP calls under the key's usage log.
- Optional: per-panel config (hide/show, reorder), a second "watchlist wall"
  layout, or a scheduled evening screen-sleep (cron `xset dpms`).
