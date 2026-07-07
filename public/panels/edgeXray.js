/**
 * DaddyBoard — edgeXray panel (FEATURED MAIN-STAGE)
 * Whole-chain rich/cheap read for the featured symbol.
 *
 * Data: slot.data = get_edge_xray payload
 *   symbol, spot, expiration, dte, availableExpirations,
 *   contracts[].{ strike, type, mid, iv, delta, residual, verdict:'rich'|'cheap'|'fair' }
 *   fairIvSummary.{ callsMedianResidual, putsMedianResidual, overallBias }
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// Map verdict to token colors
function verdictColor(verdict) {
  if (verdict === 'rich')  return 'var(--text-bear)';
  if (verdict === 'cheap') return 'var(--text-bull)';
  return 'var(--text-muted)';
}
function verdictBg(verdict) {
  if (verdict === 'rich')  return 'var(--bear-dim)';
  if (verdict === 'cheap') return 'var(--bull-dim)';
  return 'hsla(210 14% 50% / 0.10)';
}
function verdictBorder(verdict) {
  if (verdict === 'rich')  return 'var(--border-bear)';
  if (verdict === 'cheap') return 'var(--border-bull)';
  return 'var(--border-hairline)';
}

// Build the summary bar for calls/puts bias
function buildFairIvSummary(summary) {
  if (!summary) return '';
  const callRes  = summary.callsMedianResidual ?? 0;
  const putRes   = summary.putsMedianResidual  ?? 0;
  const callDir  = callRes > 0.01 ? 'RICH' : callRes < -0.01 ? 'CHEAP' : 'FAIR';
  const putDir   = putRes  > 0.01 ? 'RICH' : putRes  < -0.01 ? 'CHEAP' : 'FAIR';
  const callCol  = callDir === 'RICH' ? 'var(--text-bear)' : callDir === 'CHEAP' ? 'var(--text-bull)' : 'var(--text-muted)';
  const putCol   = putDir  === 'RICH' ? 'var(--text-bear)' : putDir  === 'CHEAP' ? 'var(--text-bull)' : 'var(--text-muted)';
  return `
    <div class="ex-iv-summary">
      <div class="ex-iv-half">
        <div class="ex-iv-label">CALLS</div>
        <div class="ex-iv-verdict" style="color:${callCol};">${callDir}</div>
        <div class="ex-iv-residual" style="color:${callCol};">${callRes >= 0 ? '+' : ''}${(callRes * 100).toFixed(1)}%</div>
      </div>
      <div class="ex-iv-divider"></div>
      <div class="ex-iv-half">
        <div class="ex-iv-label">PUTS</div>
        <div class="ex-iv-verdict" style="color:${putCol};">${putDir}</div>
        <div class="ex-iv-residual" style="color:${putCol};">${putRes >= 0 ? '+' : ''}${(putRes * 100).toFixed(1)}%</div>
      </div>
      <div class="ex-iv-divider"></div>
      <div class="ex-iv-bias">${summary.overallBias ?? ''}</div>
    </div>`;
}

// Build a contract grade chip
function buildGradeChip(c) {
  const residualPct = ((c.residual ?? 0) * 100).toFixed(1);
  const sign = c.residual >= 0 ? '+' : '';
  const isCall = c.type === 'CALL';
  const typeColor = isCall ? 'var(--text-bull)' : 'var(--text-bear)';
  return `
    <div class="ex-grade-chip" style="background:${verdictBg(c.verdict)};border-color:${verdictBorder(c.verdict)};">
      <div class="ex-grade-strike">$${c.strike}</div>
      <div class="ex-grade-type" style="color:${typeColor};">${c.type}</div>
      <div class="ex-grade-verdict" style="color:${verdictColor(c.verdict)};">${(c.verdict ?? 'fair').toUpperCase()}</div>
      <div class="ex-grade-residual" style="color:${verdictColor(c.verdict)};">${sign}${residualPct}%</div>
      <div class="ex-grade-iv">IV ${fmt.pct(c.iv != null ? c.iv * 100 : null, 0)}</div>
    </div>`;
}

register('edgeXray', {
  title: 'Edge X-Ray',

  mount(container) {
    container.innerHTML = `
      <div class="ex-wrap" id="ex-wrap">
        <div class="ex-header" id="ex-header">
          <div class="ex-header-left">
            <div class="ex-symbol" id="ex-symbol">—</div>
            <div class="ex-meta" id="ex-meta"></div>
          </div>
          <div class="ex-header-right">
            <div class="ex-spot-label">SPOT</div>
            <div class="ex-spot" id="ex-spot">—</div>
          </div>
        </div>
        <div id="ex-summary"></div>
        <div class="ex-grade-section-label">NOTABLE STRIKES</div>
        <div class="ex-grade-strip" id="ex-grade-strip">
          <div class="panel-loading"><div class="pulse-dot"></div><div>Loading edge data…</div></div>
        </div>
        <div class="ex-full-table-wrap" id="ex-full-table"></div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) { renderEmpty(container.querySelector('#ex-grade-strip') ?? container, 'No edge data'); return; }

    const d = slot.data;

    // Header
    const symEl  = container.querySelector('#ex-symbol');
    const metaEl = container.querySelector('#ex-meta');
    const spotEl = container.querySelector('#ex-spot');
    if (symEl)  symEl.textContent  = d.symbol ?? '—';
    if (spotEl) spotEl.textContent = d.spot != null ? `$${d.spot.toFixed(2)}` : '—';
    if (metaEl) metaEl.textContent = d.expiration
      ? `${d.expiration}  ·  ${d.dte ?? '?'}d`
      : '';

    // Fair IV summary
    const summaryEl = container.querySelector('#ex-summary');
    if (summaryEl) summaryEl.innerHTML = buildFairIvSummary(d.fairIvSummary);

    // Grade strip — top 6 by |residual|, always show notable rich/cheap
    const contracts = d.contracts ?? [];
    const notable = [...contracts]
      .filter(c => c.verdict !== 'fair')
      .sort((a, b) => Math.abs(b.residual ?? 0) - Math.abs(a.residual ?? 0))
      .slice(0, 6);
    // fallback: if all fair, show 6 by |residual|
    const chips = notable.length >= 2
      ? notable
      : [...contracts].sort((a, b) => Math.abs(b.residual ?? 0) - Math.abs(a.residual ?? 0)).slice(0, 6);

    const stripEl = container.querySelector('#ex-grade-strip');
    if (stripEl) stripEl.innerHTML = chips.map(buildGradeChip).join('');

    // Full compact table — all contracts sorted by strike then type
    const sorted = [...contracts].sort((a, b) => a.strike - b.strike || a.type.localeCompare(b.type));
    const tableEl = container.querySelector('#ex-full-table');
    if (tableEl && sorted.length > 0) {
      tableEl.innerHTML = `
        <div class="ex-table-header">
          <span>STRIKE</span><span>TYPE</span><span>MID</span>
          <span>IV</span><span>DELTA</span><span>EDGE</span><span>VERDICT</span>
        </div>
        <div class="ex-table-body">
          ${sorted.map(c => {
            const isCall = c.type === 'CALL';
            const typeColor = isCall ? 'var(--text-bull)' : 'var(--text-bear)';
            const res = ((c.residual ?? 0) * 100).toFixed(1);
            const sign = (c.residual ?? 0) >= 0 ? '+' : '';
            return `
              <div class="ex-table-row" style="border-left:2px solid ${verdictBorder(c.verdict)};">
                <span class="ex-table-strike">$${c.strike}</span>
                <span class="ex-table-type" style="color:${typeColor};">${c.type}</span>
                <span class="ex-table-num">$${c.mid?.toFixed(2) ?? '—'}</span>
                <span class="ex-table-num">${fmt.pct(c.iv != null ? c.iv * 100 : null, 1)}</span>
                <span class="ex-table-num">${c.delta?.toFixed(2) ?? '—'}</span>
                <span class="ex-table-num" style="color:${verdictColor(c.verdict)};">${sign}${res}%</span>
                <span class="ex-table-verdict" style="color:${verdictColor(c.verdict)};background:${verdictBg(c.verdict)};">${(c.verdict ?? 'fair').toUpperCase()}</span>
              </div>`;
          }).join('')}
        </div>`;
    }
  },
});
