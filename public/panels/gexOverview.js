/**
 * DaddyBoard — gexOverview panel
 *
 * Renders the gamma landscape in three layers:
 *   1. Hero bias block — large LONG/SHORT GAMMA label, color-coded, with
 *      totalGEX and a calm/volatile signal.
 *   2. Interpretation sentence from marketSummary.
 *   3. Per-index strip (SPX / SPY / QQQ) — each with a net-GEX bar,
 *      symbol, total GEX value, and bias label, plus a flip-point chip.
 *
 * Data path: slot.data = get_gex_overview payload
 * Fields used:
 *   marketSummary: { totalGEX, bias, interpretation }
 *   SPX / SPY / QQQ: { symbol, totalGEX, netGex, bias, flipPoint }
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function biasVariant(bias) {
  const b = (bias ?? '').toUpperCase();
  if (b === 'LONG_GAMMA')  return 'long';
  if (b === 'SHORT_GAMMA') return 'short';
  return 'neutral';
}

function biasDisplay(bias) {
  const b = (bias ?? '').toUpperCase();
  if (b === 'LONG_GAMMA')  return 'LONG GAMMA';
  if (b === 'SHORT_GAMMA') return 'SHORT GAMMA';
  return 'NEUTRAL';
}

/** Compact bias label for the tight per-index rows (full label is in the hero). */
function biasShort(bias) {
  const b = (bias ?? '').toUpperCase();
  if (b === 'LONG_GAMMA')  return 'LONG';
  if (b === 'SHORT_GAMMA') return 'SHORT';
  return 'NEUT';
}

/** Icon that communicates calm (long) vs volatile (short) vs unknown */
function biasIcon(variant) {
  if (variant === 'long')  return '&#9660;';  // downward = damped vol
  if (variant === 'short') return '&#9650;';  // upward = amplified vol
  return '&#9632;';
}

/**
 * Build a net-GEX bar that shows how far long or short a symbol sits.
 * maxGex is the reference scale (use the largest netGex in the set).
 */
function buildIndexRow(sym, entry, maxGex) {
  if (!entry) return '';
  const variant  = biasVariant(entry.bias);
  const pct = maxGex > 0 ? Math.min(100, Math.abs(entry.netGex ?? 0) / maxGex * 50) : 0;
  const barCls = variant === 'long' ? 'long' : variant === 'short' ? 'short' : 'long';
  const flipChip = entry.flipPoint != null
    ? `<span class="gex-flip-chip">flip ${fmt.number(entry.flipPoint)}</span>`
    : '';

  return `
    <div class="gex-index-row">
      <div class="gex-index-sym">${sym}</div>
      <div class="gex-bar-wrap">
        <div class="gex-bar-track">
          <div class="gex-bar-fill ${barCls}" style="width:${pct.toFixed(1)}%;"></div>
        </div>
        ${flipChip}
      </div>
      <div class="gex-index-gex">${fmt.currency(entry.totalGEX)}</div>
      <div class="gex-index-bias ${variant}">${biasShort(entry.bias)}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Panel registration
// ---------------------------------------------------------------------------
register('gexOverview', {
  title: 'Gamma Exposure',

  mount(container) {
    container.innerHTML = `
      <div class="gex-wrap" id="gex-inner">
        <div class="panel-loading"><div class="pulse-dot"></div><div>Loading Gamma…</div></div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) {
      renderEmpty(container.querySelector('#gex-inner') ?? container, 'No GEX data');
      return;
    }

    const d   = slot.data;
    const ms  = d.marketSummary ?? {};
    const variant = biasVariant(ms.bias);

    // Collect per-index entries
    const INDEX_KEYS = ['SPX', 'SPY', 'QQQ'];
    const entries = INDEX_KEYS
      .filter(k => d[k] != null)
      .map(k => ({ sym: k, entry: d[k] }));

    const maxGex = entries.reduce((m, { entry }) => Math.max(m, Math.abs(entry.netGex ?? 0)), 1);

    const wrap = container.querySelector('#gex-inner');
    if (!wrap) return;

    wrap.innerHTML = `
      <!-- Bias hero -->
      <div class="gex-bias-hero is-${variant}">
        <div class="gex-bias-icon">${biasIcon(variant)}</div>
        <div class="gex-bias-text">
          <div class="gex-bias-label">Market Gamma Bias</div>
          <div class="gex-bias-value is-${variant}">${biasDisplay(ms.bias)}</div>
        </div>
        <div style="text-align:right;">
          <div class="gex-total">${fmt.currency(ms.totalGEX)}</div>
          <div class="gex-total-label">Total GEX</div>
        </div>
      </div>

      <!-- Interpretation -->
      ${ms.interpretation ? `
        <div class="gex-interpretation">${ms.interpretation}</div>
      ` : ''}

      <!-- Per-index strip -->
      <div class="gex-index-strip">
        ${entries.map(({ sym, entry }) => buildIndexRow(sym, entry, maxGex)).join('')}
      </div>`;
  },
});
