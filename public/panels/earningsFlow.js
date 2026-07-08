/**
 * DaddyBoard — earningsFlow panel (BOTTOM RIBBON)
 * Upcoming earnings with pre-earnings flow sentiment.
 *
 * Data: slot.data = get_earnings_flow payload
 *   earnings[].{
 *     event.{ symbol, earningsDate, earningsTime, expectedMovePct,
 *             preEarningsSentiment, preEarningsBullishPct,
 *             preEarningsPremium, consensusConfidence, lastEarningsOutcome }
 *     flows[].{ premium, sentiment, unusualScore, tradeType, contractType }
 *     summary.{ direction, confidence, note }
 *   }
 *   count, days, timestamp
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

function dirColor(dir) {
  const d = (dir ?? '').toLowerCase();
  if (d === 'bullish') return 'var(--text-bull)';
  if (d === 'bearish') return 'var(--text-bear)';
  return 'var(--text-caution)';
}
function dirBg(dir) {
  const d = (dir ?? '').toLowerCase();
  if (d === 'bullish') return 'var(--bull-dim)';
  if (d === 'bearish') return 'var(--bear-dim)';
  return 'var(--caution-dim)';
}
function dirBorder(dir) {
  const d = (dir ?? '').toLowerCase();
  if (d === 'bullish') return 'var(--border-bull)';
  if (d === 'bearish') return 'var(--border-bear)';
  return 'hsla(40 90% 56% / 0.30)';
}
function timingLabel(t) {
  if (t === 'AMC') return 'After Close';
  if (t === 'BMO') return 'Before Open';
  return t ?? '';
}
function confidenceDots(conf) {
  const n = conf === 'high' ? 3 : conf === 'medium' ? 2 : 1;
  return Array.from({ length: 3 }, (_, i) =>
    `<span class="ef-dot ${i < n ? 'is-lit' : ''}"></span>`
  ).join('');
}

register('earningsFlow', {
  title: 'Earnings Ahead',

  mount(container) {
    container.innerHTML = `
      <div class="ef-wrap" id="ef-wrap">
        <div class="ef-ribbon-label">
          <span class="ef-label-text">EARNINGS AHEAD</span>
        </div>
        <div class="ef-items" id="ef-items">
          <div class="panel-loading"><div class="pulse-dot"></div><div>Loading earnings…</div></div>
        </div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) { renderEmpty(container.querySelector('#ef-items') ?? container, 'No earnings data'); return; }

    // Tertiary "what's coming" strip — the NEXT 2-3 names only.
    const items = (slot.data.earnings ?? []).slice(0, 3);
    const itemsEl = container.querySelector('#ef-items');
    if (!itemsEl) return;

    if (items.length === 0) {
      itemsEl.innerHTML = `<div class="ef-empty">No upcoming earnings with flow</div>`;
      return;
    }

    itemsEl.innerHTML = items.map((item, idx) => {
      const ev  = item.event   ?? {};
      const sum = item.summary ?? {};
      const dir = sum.direction ?? 'Mixed';
      const col = dirColor(dir);
      const bg  = dirBg(dir);
      const bdr = dirBorder(dir);

      // Flow premium total across flows array
      const flowPremium = (item.flows ?? []).reduce((s, f) => s + (f.premium ?? 0), 0);
      const topFlow     = (item.flows ?? []).sort((a, b) => (b.unusualScore ?? 0) - (a.unusualScore ?? 0))[0];
      // Non-color redundancy: directional lean carries a ▲/▼ glyph prefix.
      const bullPct     = ev.preEarningsBullishPct != null
        ? `${ev.preEarningsBullishPct >= 50 ? '▲' : '▼'} ${ev.preEarningsBullishPct}% bull`
        : null;

      // Date display
      const dateStr = ev.earningsDate
        ? new Date(ev.earningsDate + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '—';

      return `
        <div class="ef-card" style="border-color:${bdr};background:${bg};">
          <div class="ef-card-top">
            <div class="ef-ticker" style="color:${col};">${ev.symbol ?? '—'}</div>
            <div class="ef-timing">${timingLabel(ev.earningsTime)}</div>
          </div>
          <div class="ef-date">${dateStr}</div>
          <div class="ef-move">±${ev.expectedMovePct != null ? ev.expectedMovePct.toFixed(1) : '?'}%</div>
          <div class="ef-flow-row">
            <span class="ef-flow-premium" style="color:${col};">${fmt.currency(flowPremium)}</span>
            ${bullPct ? `<span class="ef-bull-pct">${bullPct}</span>` : ''}
          </div>
          <div class="ef-confidence">
            ${confidenceDots(sum.confidence)}
            <span class="ef-conf-label">${sum.confidence ?? ''}</span>
          </div>
          ${topFlow ? `<div class="ef-top-flow">
            <span class="ef-flow-chip ${topFlow.contractType === 'CALL' ? 'is-call' : 'is-put'}">${topFlow.contractType ?? ''}</span>
            <span class="ef-flow-score">${topFlow.unusualScore ?? ''}pts</span>
          </div>` : ''}
        </div>`;
    }).join(`<div class="ef-sep"></div>`);
  },
});
