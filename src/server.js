/**
 * server.js — Express server: /api/state, /api/health, static public/.
 *
 * On boot:
 *   1. Load config (throws a clear message if key is missing in live mode)
 *   2. Start background polling
 *   3. Listen on config.port
 */

import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config.js';
import { getState, startPolling } from './poller.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, '..', 'public');

const app = express();

// Serve the static client from an absolute path (anchored to this module, not
// the CWD) so the daemon serves the UI no matter where it's launched from —
// e.g. a systemd unit or `node /path/to/src/server.js`.
app.use(express.static(PUBLIC_DIR));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * GET /api/health
 * Quick liveness check — no auth, no data dependency.
 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, mockMode: config.mockMode });
});

/**
 * GET /api/state
 * The primary daemon→client contract: one aggregate JSON object with all 12
 * panel slots, market phase, and derived featured symbol.  Served from memory
 * — always fast regardless of upstream latency.
 */
app.get('/api/state', (_req, res) => {
  res.json(getState());
});

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

startPolling();

app.listen(config.port, () => {
  const mode = config.mockMode ? 'MOCK/demo mode (no API key required)' : `live mode (${config.baseUrl})`;
  console.log(`[daddyboard] Listening on http://localhost:${config.port}  —  ${mode}`);
  if (config.mockMode) {
    console.log('[daddyboard] MOCK_MODE=true  All data is from built-in fixtures.');
  }
});
