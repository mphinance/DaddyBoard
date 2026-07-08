/**
 * DaddyBoard — sectorFlow panel
 *
 * Renders sorted horizontal bars — one per sector, ranked by |flowNet| desc.
 * Bar length = |flowNet| / maxAbsFlow, so a +$4.2M sector is physically ~10× a
 * +$420K one (true magnitude encoding — the pre-attentive "where's the money"
 * read).  Color is side-only (bull / bear); a faint 20-pt sparkline trace sits
 * behind each bar.  Above the bars, a macro ribbon shows the risk-on/off read.
 *
 * Data path: slot.data = get_sector_flow payload
 * Fields used:
 *   macro: { label, description, riskOnScore, dominantSector, dominantFlow }
 *   sectors[]: { sym, name, flowNet, chgPct, sparkline }
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chgClass(chgPct) {
  // Widened flat band so +0.06% and +1.82% don't share the same "up" energy.
  if (chgPct == null) return 'flat';
  if (chgPct > 0.25)  return 'up';
  if (chgPct < -0.25) return 'down';
  return 'flat';
}

/**
 * Render a 20-pt sparkline array as a faint SVG polyline trace.
 * viewBox is normalized 0..100 x, 0..24 y; series is min-max scaled to fit.
 */
function buildSparkline(series) {
  if (!Array.isArray(series) || series.length < 2) return '';
  const n   = series.length;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = (i / (n - 1)) * 100;
    const y = 22 - ((v - min) / span) * 20; // 2px top/bottom padding
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  return `
    <svg class="sf-spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${pts}" fill="none" stroke="var(--text-muted)"
                stroke-width="1.5" vector-effect="non-scaling-stroke"/>
    </svg>`;
}

/**
 * Build one sorted magnitude bar.
 * lenPct = |flowNet| / maxAbsFlow → all bars grow from a shared left baseline.
 * Color = side only (2-state). Label carries a +/- prefix for color redundancy.
 */
function buildBar(sector, maxAbsFlow) {
  const flow    = sector.flowNet ?? 0;
  const side    = flow >= 0 ? 'bull' : 'bear';
  const lenPct  = maxAbsFlow > 0 ? Math.min(100, (Math.abs(flow) / maxAbsFlow) * 100) : 0;
  const chgCls  = chgClass(sector.chgPct);
  const sign    = flow >= 0 ? '+' : '-';
  const flowTxt = `${sign}${fmt.currency(Math.abs(flow))}`;
  const chgTxt  = sector.chgPct != null ? fmt.pct(sector.chgPct, 2) : '';

  return `
    <div class="sf-row">
      <span class="sf-sym">${sector.sym ?? '—'}</span>
      <div class="sf-bar-lane">
        ${buildSparkline(sector.sparkline)}
        <div class="sf-bar ${side}" style="width:${lenPct}%;"></div>
      </div>
      <span class="sf-flow ${side}">${flowTxt}</span>
      ${chgTxt ? `<span class="sf-chg ${chgCls}">${chgTxt}</span>` : ''}
    </div>`;
}

// ---------------------------------------------------------------------------
// Panel registration
// ---------------------------------------------------------------------------
register('sectorFlow', {
  title: 'Sector Flow',

  mount(container) {
    container.innerHTML = `
      <div class="sf-wrap" id="sf-inner">
        <div class="panel-loading"><div class="pulse-dot"></div><div>Loading sectors…</div></div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) {
      renderEmpty(container.querySelector('#sf-inner') ?? container, 'No sector data');
      return;
    }

    const d       = slot.data;
    const macro   = d.macro   ?? {};
    const sectors = d.sectors ?? [];

    if (sectors.length === 0) {
      renderEmpty(container.querySelector('#sf-inner') ?? container, 'No sector data');
      return;
    }

    // Wall-display legibility: top movers only, sorted by |flowNet| desc.
    const topSectors = [...sectors]
      .sort((a, b) => Math.abs(b.flowNet ?? 0) - Math.abs(a.flowNet ?? 0))
      .slice(0, 6);

    // Length domain: 0 → max(|flowNet|) across the shown set.
    const maxAbsFlow = Math.max(...topSectors.map(s => Math.abs(s.flowNet ?? 0)), 0);

    const wrap = container.querySelector('#sf-inner');
    if (!wrap) return;

    wrap.innerHTML = `
      <!-- Macro ribbon -->
      <div class="sf-macro">
        <span class="sf-macro-label">${macro.label ?? 'Macro'}</span>
        <span class="sf-macro-desc">${macro.description ?? ''}</span>
        <div class="sf-risk-score">
          <span class="sf-risk-score-label">Risk-On</span>
          <span class="sf-risk-score-val">${macro.riskOnScore ?? '—'}</span>
        </div>
      </div>

      <!-- Sorted magnitude bars — top movers by flow -->
      <div class="sf-bars">
        ${topSectors.map(s => buildBar(s, maxAbsFlow)).join('')}
      </div>

      <!-- Legend -->
      <div class="sf-legend">
        <div class="sf-legend-item"><div class="sf-legend-dot bull"></div><span>Calls leading</span></div>
        <div class="sf-legend-item"><div class="sf-legend-dot bear"></div><span>Puts leading</span></div>
        <span class="sf-legend-note">bar length = net flow · top 6</span>
      </div>`;
  },
});
