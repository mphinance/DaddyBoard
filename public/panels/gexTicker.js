/**
 * DaddyBoard — gexTicker panel (FEATURED MAIN-STAGE)
 * Single-ticker gamma ladder + flip point + bias.
 *
 * Data: slot.data = get_gex_ticker payload
 *   symbol, totalGEX, callGex, putGex, netGex, flipPoint,
 *   bias: 'LONG_GAMMA' | 'SHORT_GAMMA' | 'NEUTRAL',
 *   byStrike[].{ strike, callGex, putGex, netGex, distanceFromSpot, isAboveSpot }
 *   proxy?.{ symbol, scaleFactor }
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

function biasColor(bias) {
  if (bias === 'LONG_GAMMA')  return 'var(--bull)';
  if (bias === 'SHORT_GAMMA') return 'var(--bear)';
  return 'var(--neutral)';
}
function biasTextColor(bias) {
  if (bias === 'LONG_GAMMA')  return 'var(--text-bull)';
  if (bias === 'SHORT_GAMMA') return 'var(--text-bear)';
  return 'var(--text-muted)';
}
function biasLabel(bias) {
  if (bias === 'LONG_GAMMA')  return 'LONG GAMMA';
  if (bias === 'SHORT_GAMMA') return 'SHORT GAMMA';
  return 'NEUTRAL';
}
function biasExplain(bias) {
  if (bias === 'LONG_GAMMA')  return 'Dealers pin price toward the flip — fade the extremes, expect mean reversion';
  if (bias === 'SHORT_GAMMA') return 'Dealers amplify moves off the flip — expect acceleration and bigger swings';
  return 'Balanced dealer gamma — no strong pin, trade the range';
}

register('gexTicker', {
  title: 'GEX Ticker',

  mount(container) {
    container.innerHTML = `
      <div class="gt-wrap" id="gt-wrap">
        <div class="gt-header" id="gt-header">
          <div class="gt-header-left">
            <div class="gt-symbol" id="gt-symbol">—</div>
            <div class="gt-bias-pill" id="gt-bias-pill">—</div>
          </div>
          <div class="gt-header-right">
            <div class="gt-flip-label">FLIP POINT</div>
            <div class="gt-flip" id="gt-flip">—</div>
          </div>
        </div>
        <div class="gt-explain" id="gt-explain"></div>
        <div class="gt-stats-row" id="gt-stats-row"></div>
        <div class="gt-ladder-label">GAMMA BY STRIKE</div>
        <div class="gt-ladder" id="gt-ladder">
          <div class="panel-loading"><div class="pulse-dot"></div><div>Loading GEX…</div></div>
        </div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) { renderEmpty(container.querySelector('#gt-ladder') ?? container, 'No GEX data'); return; }

    const d = slot.data;
    const color     = biasColor(d.bias);
    const textColor = biasTextColor(d.bias);

    // Header
    const symEl  = container.querySelector('#gt-symbol');
    const pillEl = container.querySelector('#gt-bias-pill');
    const flipEl = container.querySelector('#gt-flip');
    if (symEl)  symEl.textContent  = d.symbol ?? '—';
    if (flipEl) flipEl.textContent = d.flipPoint != null ? `$${d.flipPoint}` : '—';
    if (pillEl) {
      pillEl.textContent = biasLabel(d.bias);
      pillEl.style.color = textColor;
      pillEl.style.borderColor = color;
      pillEl.style.background = d.bias === 'LONG_GAMMA'
        ? 'var(--bull-dim)' : d.bias === 'SHORT_GAMMA'
        ? 'var(--bear-dim)' : 'var(--accent-dim)';
    }

    // Explanation
    const explainEl = container.querySelector('#gt-explain');
    if (explainEl) explainEl.textContent = biasExplain(d.bias);

    // Stats row
    const statsEl = container.querySelector('#gt-stats-row');
    if (statsEl) {
      statsEl.innerHTML = `
        <div class="gt-stat">
          <div class="gt-stat-label">Net GEX</div>
          <div class="gt-stat-val" style="color:${textColor};">${fmt.currency(d.netGex)}</div>
        </div>
        <div class="gt-stat-sep"></div>
        <div class="gt-stat">
          <div class="gt-stat-label">Call GEX</div>
          <div class="gt-stat-val" style="color:var(--text-bull);">${fmt.currency(d.callGex)}</div>
        </div>
        <div class="gt-stat-sep"></div>
        <div class="gt-stat">
          <div class="gt-stat-label">Put GEX</div>
          <div class="gt-stat-val" style="color:var(--text-bear);">${fmt.currency(d.putGex)}</div>
        </div>
        ${d.proxy ? `
        <div class="gt-stat-sep"></div>
        <div class="gt-stat">
          <div class="gt-stat-label">Proxy</div>
          <div class="gt-stat-val" style="color:var(--text-accent);">${d.proxy.symbol}</div>
        </div>` : ''}`;
    }

    // Gamma-by-strike column chart — net GEX per strike, centered on spot, no scroll
    const allStrikes = d.byStrike ?? [];
    const ladderEl = container.querySelector('#gt-ladder');
    if (!ladderEl || allStrikes.length === 0) return;

    // Keep it glanceable: the ~9 strikes straddling spot (index where above→below flips)
    const flipIdx = allStrikes.findIndex((s, i) =>
      s.isAboveSpot === false && allStrikes[i - 1]?.isAboveSpot);
    const pivot = flipIdx > 0 ? flipIdx : Math.floor(allStrikes.length / 2);
    const from  = Math.max(0, pivot - 4);
    const byStrike = allStrikes.slice(from, from + 9);

    const maxAbs = Math.max(...byStrike.map(s => Math.abs(s.netGex ?? 0)), 1);

    ladderEl.innerHTML = `
      <div class="gt-cols">
        ${byStrike.map((s, i) => {
          const net      = s.netGex ?? 0;
          const heightPct = Math.max(4, Math.min(48, Math.abs(net) / maxAbs * 48));
          const isSpot   = s.isAboveSpot === false && byStrike[i - 1]?.isAboveSpot;
          return `
            <div class="gt-col ${isSpot ? 'is-spot' : ''}">
              <div class="gt-col-plot">
                <div class="gt-col-bar ${net >= 0 ? 'is-pos' : 'is-neg'}" style="height:${heightPct.toFixed(1)}%;"></div>
              </div>
              <span class="gt-col-strike ${s.isAboveSpot ? 'is-above' : ''}">${s.strike != null ? s.strike : '—'}</span>
            </div>`;
        }).join('')}
      </div>`;
  },
});
