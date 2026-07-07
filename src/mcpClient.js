/**
 * mcpClient.js — MCP JSON-RPC client over StreamableHTTP (stateless).
 *
 * The public endpoint (/api/v1/mcp) is a stateless StreamableHTTP transport:
 * it spins up a fresh McpServer per POST, so there is no session to
 * establish.  A bare `tools/call` is accepted directly — no `initialize`
 * handshake or `notifications/initialized` is required (verified against the
 * live endpoint).  Sending them would just triple the request count against
 * the per-key rate limit, so we issue ONE POST per tool call.
 *
 * Response may be application/json or text/event-stream (SSE).  Both are
 * handled.  The real payload lives at result.content[0].text and must be
 * JSON.parsed.
 *
 * On HTTP 429 or JSON-RPC error code -32000, throws RateLimitError so the
 * poller can back off.
 */

import { config } from './config.js';

export class RateLimitError extends Error {
  constructor(message = 'Rate limited') {
    super(message);
    this.name = 'RateLimitError';
  }
}

let _requestId = 1;
function nextId() { return _requestId++; }

/** Parse the response body, handling both SSE and JSON content-types. */
async function parseResponse(response) {
  const ct = response.headers.get('content-type') ?? '';

  if (ct.includes('text/event-stream')) {
    const text = await response.text();
    // Find the last non-empty `data: …` line
    const lines = text.split('\n');
    let lastData = null;
    for (const line of lines) {
      if (line.startsWith('data:')) {
        const candidate = line.slice(5).trim();
        if (candidate) lastData = candidate;
      }
    }
    if (!lastData) throw new Error('SSE response contained no data lines');
    return JSON.parse(lastData);
  }

  const text = await response.text();
  return JSON.parse(text);
}

/** Build common auth headers. */
function authHeaders() {
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'X-API-Key': config.apiKey,
    'Authorization': `Bearer ${config.apiKey}`,
  };
}

/**
 * Perform a single MCP HTTP POST with a 45s timeout.
 * Returns the parsed JSON-RPC response object.
 */
async function post(body, sessionId) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45_000);

  const headers = authHeaders();
  if (sessionId) headers['mcp-session-id'] = sessionId;

  let response;
  try {
    response = await fetch(`${config.baseUrl}/api/v1/mcp`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 429) {
    throw new RateLimitError('HTTP 429 from MCP endpoint');
  }

  if (!response.ok) {
    throw new Error(`MCP HTTP ${response.status}: ${response.statusText}`);
  }

  return { parsed: await parseResponse(response), sessionId: response.headers.get('mcp-session-id') };
}

/**
 * callTool(name, args) — issue a single stateless tools/call.
 *
 * Returns the parsed tool payload (result.content[0].text JSON.parsed).
 * Throws RateLimitError on rate-limit; throws Error on other failures.
 */
export async function callTool(name, args = {}) {
  const callBody = {
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/call',
    params: { name, arguments: args },
  };

  const { parsed } = await post(callBody, null);

  // Check for JSON-RPC error
  if (parsed.error) {
    const code = parsed.error.code;
    if (code === -32000) throw new RateLimitError(`JSON-RPC -32000: ${parsed.error.message}`);
    throw new Error(`JSON-RPC error ${code}: ${parsed.error.message}`);
  }

  // Extract payload from content[0].text
  const content = parsed?.result?.content;
  if (!Array.isArray(content) || !content[0]?.text) {
    throw new Error(`Unexpected MCP result shape for tool ${name}`);
  }

  return JSON.parse(content[0].text);
}
