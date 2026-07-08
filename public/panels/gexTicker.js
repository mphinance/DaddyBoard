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

/**
 * Regime gate — TWO inputs: bias AND spot-vs-flip sign.
 * Bias alone is not enough: long-gamma only pins when spot is ABOVE the flip;
 * below the flip that support is gone. Returns exact label + body copy.
 */
function regimeCopy(bias, aboveFlip, flipPoint) {
  if (bias === 'LONG_GAMMA' && aboveFlip) {
    return { label: 'PINNED',
      body: 'Spot above flip in long-gamma — dealers dampen moves. Fade extremes, expect mean reversion.' };
  }
  if (bias === 'LONG_GAMMA' && !aboveFlip) {
    return { label: 'UNSTABLE',
      body: 'Spot BELOW the flip — long-gamma support is gone. Do not fade; a break lower can accelerate.' };
  }
  if (bias === 'SHORT_GAMMA' && aboveFlip) {
    return { label: 'ACCELERANT',
      body: 'Short gamma above flip — dealers chase. Expect trend and bigger swings, not mean reversion.' };
  }
  if (bias === 'SHORT_GAMMA' && !aboveFlip) {
    return { label: 'ACCELERANT',
      body: 'Short gamma below flip — dealers sell into weakness. Downside can accelerate; no pin.' };
  }
  return { label: 'BALANCED',
    body: `Balanced dealer gamma — no strong pin. Trade the range around $${flipPoint}.` };
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
        <div class="gt-dist" id="gt-dist"></div>
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

    // Spot-vs-flip gate — the two inputs that decide the regime.
    const hasDist    = d.spot != null && d.flipPoint != null;
    const signedDist = hasDist ? d.spot - d.flipPoint : null;
    const distPct    = hasDist ? signedDist / d.spot * 100 : null;
    const aboveFlip  = hasDist ? signedDist >= 0 : false;
    const regime     = regimeCopy(d.bias, aboveFlip, d.flipPoint);

    // Header
    const symEl  = container.querySelector('#gt-symbol');
    const pillEl = container.querySelector('#gt-bias-pill');
    const flipEl = container.querySelector('#gt-flip');
    if (symEl)  symEl.textContent  = d.symbol ?? '—';
    if (flipEl) flipEl.textContent = d.flipPoint != null ? `$${d.flipPoint}` : '—';
    if (pillEl) {
      pillEl.textContent = `${biasLabel(d.bias)} · ${regime.label}`;
      pillEl.style.color = textColor;
      pillEl.style.borderColor = color;
      pillEl.style.background = d.bias === 'LONG_GAMMA'
        ? 'var(--bull-dim)' : d.bias === 'SHORT_GAMMA'
        ? 'var(--bear-dim)' : 'var(--accent-dim)';
    }

    // Distance triplet — SPOT / FLIP / signed gap. Above-flip is calm (secondary),
    // below-flip earns red. Never scream green on the safe side.
    const distEl = container.querySelector('#gt-dist');
    if (distEl) {
      if (hasDist) {
        const sd  = `${signedDist >= 0 ? '+' : '-'}$${Math.abs(signedDist).toFixed(2)}`;
        const pct = `${distPct >= 0 ? '+' : '-'}${Math.abs(distPct).toFixed(1)}%`;
        distEl.textContent = `SPOT $${d.spot}   FLIP $${d.flipPoint}   ${sd} (${pct})`;
        distEl.style.color = signedDist >= 0 ? 'var(--text-secondary)' : 'var(--text-bear)';
      } else {
        distEl.textContent = '';
      }
    }

    // Explanation — gated body copy (mean-reversion only in LONG_GAMMA + above-flip)
    const explainEl = container.querySelector('#gt-explain');
    if (explainEl) explainEl.textContent = regime.body;

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

    // Net-GEX profile — CENTERED zero axis. Positive draws UP (green), negative DOWN
    // (red) from the vertical middle. Flip + spot vertical lines show the distance
    // geometrically. Bars are positioned by strike so the flip/spot lines line up.
    const allStrikes = d.byStrike ?? [];
    const ladderEl = container.querySelector('#gt-ladder');
    if (!ladderEl || allStrikes.length === 0) return;

    // Keep it glanceable: the ~9 strikes straddling spot.
    const flipIdx = allStrikes.findIndex((s, i) =>
      s.isAboveSpot === false && allStrikes[i - 1]?.isAboveSpot);
    const pivot = flipIdx > 0 ? flipIdx : Math.floor(allStrikes.length / 2);
    const from  = Math.max(0, pivot - 4);
    const byStrike = allStrikes.slice(from, from + 9);
    const n = byStrike.length;

    const maxAbs = Math.max(...byStrike.map(s => Math.abs(s.netGex ?? 0)), 1);

    // x-position (%) for a given price, mapped across the strike range with half-slot
    // padding so the first/last columns sit inside the plot.
    const strikeVals = byStrike.map(s => s.strike).filter(v => v != null);
    const loK = Math.min(...strikeVals);
    const hiK = Math.max(...strikeVals);
    const xForPrice = (p) => {
      if (p == null || hiK === loK) return null;
      const slot = 100 / n;
      const frac = (p - loK) / (hiK - loK);        // 0..1 across strike span
      return (slot / 2) + frac * (100 - slot);     // center within padded plot
    };

    // Label only 2-3 strikes: first, middle, last.
    const labelIdx = new Set([0, Math.floor((n - 1) / 2), n - 1]);

    const flipX = xForPrice(d.flipPoint);
    const spotX = d.spot != null ? xForPrice(d.spot) : null;

    const bars = byStrike.map((s, i) => {
      const net       = s.netGex ?? 0;
      const heightPct = Math.max(2, Math.abs(net) / maxAbs * 50); // 50% = half plot
      const labelled  = labelIdx.has(i);
      return `
        <div class="gt-col">
          <div class="gt-col-plot">
            <div class="gt-col-bar ${net >= 0 ? 'is-pos' : 'is-neg'}" style="height:${heightPct.toFixed(1)}%;"></div>
          </div>
          <span class="gt-col-strike ${labelled ? '' : 'is-hidden'}">${labelled && s.strike != null ? s.strike : ''}</span>
        </div>`;
    }).join('');

    const flipLine = flipX != null ? `
      <div class="gt-vline gt-vline-flip" style="left:${flipX.toFixed(2)}%;">
        <span class="gt-vline-label">FLIP $${d.flipPoint}</span>
      </div>` : '';
    const spotLine = spotX != null ? `
      <div class="gt-vline gt-vline-spot" style="left:${spotX.toFixed(2)}%;">
        <span class="gt-vline-label">SPOT</span>
      </div>` : '';

    ladderEl.innerHTML = `
      <div class="gt-profile">
        <div class="gt-zero-axis"></div>
        <div class="gt-cols">${bars}</div>
        ${flipLine}
        ${spotLine}
      </div>`;
  },
});
