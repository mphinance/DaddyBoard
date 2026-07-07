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
  if (bias === 'LONG_GAMMA')  return 'MMs pin price — expect dampened moves, mean reversion';
  if (bias === 'SHORT_GAMMA') return 'MMs amplify moves — expect acceleration, larger swings';
  return 'Mixed gamma — neutral market-maker positioning';
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

    // Gamma ladder
    const byStrike = d.byStrike ?? [];
    const ladderEl = container.querySelector('#gt-ladder');
    if (!ladderEl || byStrike.length === 0) return;

    // Scale bars relative to max absolute netGex
    const maxAbs = Math.max(...byStrike.map(s => Math.abs(s.netGex ?? 0)), 1);
    const maxCallAbs = Math.max(...byStrike.map(s => Math.abs(s.callGex ?? 0)), 1);
    const maxPutAbs  = Math.max(...byStrike.map(s => Math.abs(s.putGex ?? 0)), 1);

    ladderEl.innerHTML = `
      <div class="gt-ladder-inner">
        <div class="gt-ladder-head">
          <span>STRIKE</span>
          <span>CALL GEX</span>
          <span></span>
          <span>PUT GEX</span>
          <span>NET</span>
        </div>
        ${byStrike.map(s => {
          const callPct  = Math.min(100, Math.abs(s.callGex ?? 0) / maxCallAbs * 100);
          const putPct   = Math.min(100, Math.abs(s.putGex  ?? 0) / maxPutAbs  * 100);
          const netPct   = Math.min(100, Math.abs(s.netGex  ?? 0) / maxAbs     * 100);
          const netColor = (s.netGex ?? 0) >= 0 ? 'var(--bull)' : 'var(--bear)';
          const spotMark = s.isAboveSpot === false && byStrike[byStrike.indexOf(s) + 1]?.isAboveSpot
            ? 'gt-row-at-spot'
            : '';
          return `
            <div class="gt-ladder-row ${spotMark}">
              <span class="gt-ladder-strike ${s.isAboveSpot ? 'is-above' : 'is-below'}">${s.strike != null ? '$' + s.strike : '—'}</span>
              <div class="gt-bar-wrap gt-bar-call">
                <div class="gt-bar" style="width:${callPct.toFixed(1)}%;background:var(--bull);"></div>
              </div>
              <span class="gt-ladder-net-label" style="color:${netColor};">${fmt.currency(s.netGex)}</span>
              <div class="gt-bar-wrap gt-bar-put">
                <div class="gt-bar" style="width:${putPct.toFixed(1)}%;background:var(--bear);"></div>
              </div>
              <div class="gt-net-bar-wrap">
                <div class="gt-net-bar" style="width:${netPct.toFixed(1)}%;background:${netColor};"></div>
              </div>
            </div>`;
        }).join('')}
      </div>`;
  },
});
