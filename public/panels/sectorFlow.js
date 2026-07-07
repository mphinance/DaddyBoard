/**
 * DaddyBoard — sectorFlow panel
 *
 * Renders a sector heatmap: one colored tile per sector whose background
 * intensity encodes call (bull) or put (bear) flow magnitude.  Above the
 * grid, a macro ribbon shows the risk-on/off read.  A sentiment mini-bar
 * runs across the bottom of each tile.
 *
 * Data path: slot.data = get_sector_flow payload
 * Fields used:
 *   macro: { label, description, riskOnScore, dominantSector, dominantFlow }
 *   sectors[]: { sym, name, flowNet, chgPct, flowSide, sentiment, cylinders }
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map flowNet magnitude to a tile intensity class.
 * We use the distribution of flowNet values within the current dataset
 * to pick relative tiers, so no hard-coded dollar amounts.
 *   top third  → tier 3 (strong color)
 *   mid third  → tier 2 (medium)
 *   bot third  → tier 1 (faint)
 */
function intensityClass(sector, sortedAbsFlows) {
  const abs = Math.abs(sector.flowNet ?? 0);
  const n   = sortedAbsFlows.length;
  if (n === 0) return 'neutral';
  const rank = sortedAbsFlows.indexOf(abs); // position in asc-sorted array
  const pct  = rank / (n - 1 || 1);
  const side = (sector.flowNet ?? 0) >= 0 ? 'bull' : 'bear';
  if (pct >= 0.66) return `${side}-3`;
  if (pct >= 0.33) return `${side}-2`;
  if (pct > 0)     return `${side}-1`;
  return 'neutral';
}

function chgClass(chgPct) {
  if (chgPct == null) return 'flat';
  if (chgPct > 0.05)  return 'up';
  if (chgPct < -0.05) return 'down';
  return 'flat';
}

function buildTile(sector, intensityCls) {
  const side     = (sector.flowNet ?? 0) >= 0 ? 'bull' : 'bear';
  const chgCls   = chgClass(sector.chgPct);
  const sentPct  = Math.min(100, Math.max(0, sector.sentiment ?? 50));
  const cylCls   = sector.cylinders === 'bullish' ? ' cylinders-bull'
    : sector.cylinders === 'bearish' ? ' cylinders-bear' : '';
  const flowTxt  = fmt.currency(sector.flowNet);
  const chgTxt   = sector.chgPct != null ? `${sector.chgPct >= 0 ? '+' : ''}${sector.chgPct.toFixed(2)}%` : '';

  return `
    <div class="sf-tile ${intensityCls}${cylCls}">
      <div class="sf-tile-top">
        <span class="sf-sym">${sector.sym ?? '—'}</span>
        ${chgTxt ? `<span class="sf-chg ${chgCls}">${chgTxt}</span>` : ''}
      </div>
      <span class="sf-flow ${side}">${flowTxt}</span>
      <div class="sf-sent-bar">
        <div class="sf-sent-fill ${side}" style="width:${sentPct}%;"></div>
      </div>
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

    // Pre-compute sorted abs flows for relative intensity bucketing
    const absFlows = sectors.map(s => Math.abs(s.flowNet ?? 0)).sort((a, b) => a - b);

    // Wall-display legibility: show only the biggest movers as fewer, larger tiles
    const topSectors = [...sectors]
      .sort((a, b) => Math.abs(b.flowNet ?? 0) - Math.abs(a.flowNet ?? 0))
      .slice(0, 6);

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

      <!-- Sector heatmap grid — top movers only -->
      <div class="sf-grid">
        ${topSectors.map(s => buildTile(s, intensityClass(s, absFlows))).join('')}
      </div>

      <!-- Legend -->
      <div class="sf-legend">
        <div class="sf-legend-item"><div class="sf-legend-dot bull"></div><span>Calls leading</span></div>
        <div class="sf-legend-item"><div class="sf-legend-dot bear"></div><span>Puts leading</span></div>
        <span style="margin-left:auto;font-size:var(--text-xs);color:var(--text-dim);">top 6 by flow</span>
      </div>`;
  },
});
