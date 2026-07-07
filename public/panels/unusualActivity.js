/**
 * DaddyBoard — unusualActivity panel (HERO)
 * The showpiece: a live flow tape of smart-money options activity.
 *
 * Data path: slot.data.data = array of flow rows
 *            slot.data.aggregates = { totalPremium, bullishPremium, bearishPremium,
 *                                     bullishCount, bearishCount, avgScore, topTicker }
 *
 * Row fields rendered: ticker, type, sentiment, premium, score, tier/tierColor,
 *                      flowDescription, vsOI, tradeType, tradeTime, isRepeatFlow
 */

import { register, fmt, applySlotState } from '../app.js';

// Track rendered row IDs to detect new arrivals
let _knownIds = new Set();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function tierStyle(row) {
  // Map both the fixture tiers (LEGENDARY/ELITE/NOTABLE) and the live API tiers
  // (HIGH_CONVICTION, MODERATE, …) to our token palette + a SHORT label that
  // fits the fixed-width score column. tierColor from the live API is a
  // Tailwind class string, never a CSS color, so it is never used as one.
  const t = (row.tier ?? '').toUpperCase();
  if (t.includes('LEGEND'))                    return { color: 'var(--tier-legendary)', label: 'LEGEND' };
  if (t.includes('HIGH') || t.includes('CONVICT')) return { color: 'var(--accent)',    label: 'HIGH' };
  if (t.includes('ELITE'))                     return { color: 'var(--tier-elite)',     label: 'ELITE' };
  if (t.includes('NOTABLE') || t.includes('MODERATE')) return { color: 'var(--tier-notable)', label: 'NOTABLE' };
  // Unknown tier: first token, capped so it can't overflow the column.
  const short = (row.tier ?? '').split(/[_\s]/)[0].slice(0, 7).toUpperCase();
  return { color: 'var(--text-muted)', label: short };
}

function isBull(row) {
  return (row.sentiment ?? '').toLowerCase() === 'bullish' ||
         (row.type ?? '') === 'CALL';
}

function buildAggStrip(agg) {
  if (!agg) return '';
  const total = fmt.currency(agg.totalPremium);
  const bull  = fmt.currency(agg.bullishPremium);
  const bear  = fmt.currency(agg.bearishPremium);
  const ratio = agg.bullishPremium > 0 && agg.bearishPremium > 0
    ? (agg.bullishPremium / (agg.bullishPremium + agg.bearishPremium) * 100).toFixed(0)
    : 50;

  return `
    <div class="ua-agg-strip">
      <div>
        <div class="ua-agg-label">Total Flow</div>
        <div class="ua-agg-value">${total}</div>
      </div>
      <div class="ua-agg-sep"></div>
      <div>
        <div class="ua-agg-label">Calls</div>
        <div class="ua-agg-value ua-agg-bull">${bull}
          <span style="font-size:var(--text-xs);font-weight:var(--weight-medium);color:var(--text-bull);"> (${agg.bullishCount ?? 0})</span>
        </div>
      </div>
      <div class="ua-agg-sep"></div>
      <div>
        <div class="ua-agg-label">Puts</div>
        <div class="ua-agg-value ua-agg-bear">${bear}
          <span style="font-size:var(--text-xs);font-weight:var(--weight-medium);color:var(--text-bear);"> (${agg.bearishCount ?? 0})</span>
        </div>
      </div>
      <div class="ua-agg-sep"></div>
      <div>
        <div class="ua-agg-label">Avg Score</div>
        <div class="ua-agg-value">${agg.avgScore ?? '—'}</div>
      </div>
      <div class="ua-agg-right">
        <div class="ua-flow-bar-wrap">
          <span style="font-size:var(--text-xs);color:var(--text-bear);">PUTS</span>
          <div class="ua-flow-bar">
            <div class="ua-flow-bar-thumb" style="left:${100 - ratio}%;right:0;background:var(--bull);border-radius:0 var(--radius-pill) var(--radius-pill) 0;"></div>
          </div>
          <span style="font-size:var(--text-xs);color:var(--text-bull);">CALLS ${ratio}%</span>
        </div>
        ${agg.topTicker ? `<div style="font-size:var(--text-xs);color:var(--text-muted);">Top: <span style="font-weight:var(--weight-bold);color:var(--text-primary);">${agg.topTicker}</span></div>` : ''}
      </div>
    </div>`;
}

function buildRow(row, isNew) {
  const bull = isBull(row);
  const tier = tierStyle(row);
  const newClass = isNew ? ' is-new' : '';
  const sideClass = bull ? ' is-bull' : ' is-bear';
  const badgeClass = bull ? 'bull' : 'bear';
  const contractLabel = (row.type ?? 'CALL') + (row.tradeType ? ` <span class="ua-trade-chip">${row.tradeType}</span>` : '');
  const repeatBadge = row.isRepeatFlow
    ? `<span class="ua-repeat">&#8635;${row.repeatCount > 1 ? ` x${row.repeatCount}` : ''}</span>` : '';
  // vsOI can be huge on live data (e.g. 16300x) — compact so it stays in-column.
  const vsOIStr = row.vsOI != null
    ? (Math.abs(row.vsOI) >= 1000
        ? `${(row.vsOI / 1000).toFixed(1)}Kx OI`
        : `${row.vsOI.toFixed(1)}x OI`)
    : '—';

  return `
    <div class="ua-row${sideClass}${newClass}" data-id="${row.id ?? ''}">
      <div class="ua-ticker">${row.ticker ?? '—'}</div>
      <div>
        <span class="ua-type-badge ${badgeClass}">${contractLabel}</span>
        ${repeatBadge}
      </div>
      <div class="ua-premium">${fmt.currency(row.premium)}</div>
      <div class="ua-score">
        <div class="ua-score-num" style="color:${tier.color};">${row.score ?? '—'}</div>
        <div class="ua-tier-label" style="color:${tier.color};opacity:0.8;">${tier.label}</div>
      </div>
      <div class="ua-vsoi">${vsOIStr}</div>
      <div class="ua-desc" title="${(row.flowDescription ?? '').replace(/"/g, '&quot;')}">${row.flowDescription ?? ''}</div>
      <div class="ua-time">${fmt.time(row.tradeTime)}</div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Panel registration
// ---------------------------------------------------------------------------
register('unusualActivity', {
  title: 'Unusual Activity',

  mount(container) {
    container.innerHTML = `
      <div class="ua-hero" id="ua-hero-inner">
        <div id="ua-agg" class="ua-agg-strip">
          <div class="panel-loading"><div class="pulse-dot"></div><div>Loading flow…</div></div>
        </div>
        <div class="ua-tape" id="ua-tape"></div>
      </div>`;
  },

  update(container, slot, _state) {
    const hero = container.querySelector('#ua-hero-inner');
    if (hero) {
      hero.classList.toggle('is-stale', !!slot?.stale);
    }

    // Error
    if (slot?.error) {
      const tape = container.querySelector('#ua-tape');
      if (tape) tape.innerHTML = `<div class="ua-empty"><div style="font-size:var(--text-sm);color:var(--text-muted);">${slot.error}</div></div>`;
      return;
    }

    // Null data
    if (!slot?.data) {
      const tape = container.querySelector('#ua-tape');
      if (tape) tape.innerHTML = `<div class="ua-empty"><div class="pulse-dot"></div><div style="font-size:var(--text-sm);">Awaiting flow data…</div></div>`;
      return;
    }

    // unusualActivity has nested: slot.data.data is the row array
    const rows = slot.data.data ?? [];
    const agg  = slot.data.aggregates ?? null;

    // Sort by score desc, then premium desc
    const sorted = [...rows].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || (b.premium ?? 0) - (a.premium ?? 0));

    // Update agg strip
    const aggEl = container.querySelector('#ua-agg');
    if (aggEl) aggEl.outerHTML = buildAggStrip(agg);

    // Detect new row IDs
    const newIds = new Set(sorted.map(r => r.id).filter(Boolean));
    const newOnes = new Set([...newIds].filter(id => !_knownIds.has(id)));
    _knownIds = newIds;

    // Render tape
    const tape = container.querySelector('#ua-tape');
    if (!tape) return;

    if (sorted.length === 0) {
      tape.innerHTML = `<div class="ua-empty"><div style="color:var(--text-dim);font-size:var(--text-sm);">No unusual flow detected</div></div>`;
      return;
    }

    tape.innerHTML = sorted.map(row => buildRow(row, newOnes.has(row.id))).join('');
  },
});
