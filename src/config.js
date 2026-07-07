/**
 * config.js — Load config.json (fall back to config.local.json), apply env
 * overrides (MOCK_MODE, PORT, TD_API_KEY, TD_BASE_URL).
 *
 * In non-mock mode with no apiKey, throws a clear human-readable error instead
 * of a stack trace.
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

/** Defaults that mirror config.example.json exactly. */
const DEFAULTS = {
  apiKey: '',
  baseUrl: 'https://api.traderdaddy.pro',
  port: 4321,
  mockMode: false,
  featuredTickers: ['SPY', 'QQQ', 'NVDA'],
  screenerRotation: ['daily-cuts', 'momentum', 'csp-wheel', 'volatility-squeeze'],
  rotationSeconds: 20,
  timezone: 'America/New_York',
};

function loadConfigFile() {
  const candidates = ['config.json', 'config.local.json'];
  for (const name of candidates) {
    const p = join(ROOT, name);
    if (existsSync(p)) {
      try {
        return JSON.parse(readFileSync(p, 'utf8'));
      } catch (e) {
        throw new Error(`Failed to parse ${name}: ${e.message}`);
      }
    }
  }
  return {};
}

function buildConfig() {
  const file = loadConfigFile();

  const mockMode =
    process.env.MOCK_MODE === 'true' ||
    process.env.MOCK_MODE === '1' ||
    file.mockMode === true;

  const config = {
    ...DEFAULTS,
    ...file,
    mockMode,
    // Env overrides (highest priority)
    ...(process.env.TD_API_KEY ? { apiKey: process.env.TD_API_KEY } : {}),
    ...(process.env.TD_BASE_URL ? { baseUrl: process.env.TD_BASE_URL } : {}),
    ...(process.env.PORT ? { port: parseInt(process.env.PORT, 10) } : {}),
  };

  // In live mode, an API key is required.
  if (!config.mockMode && !config.apiKey) {
    throw new Error(
      [
        '',
        '  DaddyBoard requires a TraderDaddy Pro API key.',
        '',
        '  To get started:',
        '    1. Copy config.example.json to config.json',
        '    2. Replace the placeholder apiKey with your real td_live_... key',
        '    3. Restart the daemon',
        '',
        '  Or run in demo/mock mode (no key needed):',
        '    MOCK_MODE=true npm start',
        '',
      ].join('\n'),
    );
  }

  return config;
}

export const config = buildConfig();
