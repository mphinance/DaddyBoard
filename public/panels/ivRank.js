/**
 * DaddyBoard — ivRank panel (Premium-Seller Watch)
 *
 * Data path: slot.data = get_iv_rank payload
 * Fields: symbol, ivRank (0-100), ivPercentile (0-100),
 *         currentIV, ivMin52w, ivMax52w,
 *         interpretation ('rich'|'cheap'|'neutral'), note
 *
 * Null case: ivRank may be null with reason:'insufficient_history'
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function interpClass(interp) {
  if (interp === 'rich')  return 'rich';
  if (interp === 'cheap') return 'cheap';
  return 'neutral';
}

function actionLabel(interp) {
  if (interp === 'rich')  return { icon: '↓', text: 'Favor selling — CSPs, credit spreads, covered calls' };
  if (interp === 'cheap') return { icon: '↑', text: 'Favor buying — long calls/puts, debit spreads' };
  return { icon: '↔', text: 'No edge to buyers or sellers — size positions carefully' };
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function buildContent(d, sym) {
  // Handle insufficient history case
  if (d.ivRank == null) {
    return `
      <div class="ivr-wrap">
        <div class="ivr-header">
          <div class="ivr-symbol">${sym}</div>
          <span class="ivr-interp-pill neutral">No History</span>
        </div>
        <div class="ivr-note" style="margin-top:var(--sp-4);">
          ${d.reason === 'insufficient_history'
            ? 'Insufficient IV history to compute rank. Check back after more trading days.'
            : 'IV rank data unavailable.'}
        </div>
      </div>`;
  }

  const rank  = d.ivRank ?? 0;
  const pct   = d.ivPercentile ?? rank;
  const cls   = interpClass(d.interpretation);
  const action = actionLabel(d.interpretation);
  const iv    = d.currentIV != null ? `${(d.currentIV * 100).toFixed(1)}%` : '—';
  const ivMin = d.ivMin52w  != null ? `${(d.ivMin52w  * 100).toFixed(1)}%` : '—';
  const ivMax = d.ivMax52w  != null ? `${(d.ivMax52w  * 100).toFixed(1)}%` : '—';

  // Gauge position clamped 0-100
  const gaugeLeft = Math.max(0, Math.min(100, rank));

  return `
    <div class="ivr-wrap">

      <div class="ivr-header">
        <div class="ivr-symbol">${sym}</div>
        <span class="ivr-interp-pill ${cls}">${d.interpretation ?? 'neutral'}</span>
      </div>

      <div class="ivr-dial-row">
        <div class="ivr-rank-num ${cls}">${fmt.score(rank)}</div>
        <div class="ivr-rank-label">IVR</div>
        <div class="ivr-pct-label">
          <div class="ivr-pct-num">${fmt.score(pct)}</div>
          <div class="ivr-pct-sub">IVP</div>
        </div>
        <span class="ivr-iv-chip" style="margin-left:auto;align-self:flex-end;">IV ${iv}</span>
      </div>

      <div class="ivr-gauge-wrap">
        <div class="ivr-gauge-track">
          <div class="ivr-gauge-fill ${cls}" style="width:${gaugeLeft}%;"></div>
          <div class="ivr-gauge-thumb ${cls}" style="left:${gaugeLeft}%;"></div>
        </div>
        <div class="ivr-gauge-labels">
          <span>0</span>
          <span>25</span>
          <span>50</span>
          <span>75</span>
          <span>100</span>
        </div>
      </div>

      <div class="ivr-range-row">
        <div class="ivr-range-item">
          <div class="ivr-range-label">52w Low IV</div>
          <div class="ivr-range-val">${ivMin}</div>
        </div>
        <div class="ivr-range-sep"></div>
        <div class="ivr-range-item">
          <div class="ivr-range-label">Current IV</div>
          <div class="ivr-range-val">${iv}</div>
        </div>
        <div class="ivr-range-sep"></div>
        <div class="ivr-range-item">
          <div class="ivr-range-label">52w High IV</div>
          <div class="ivr-range-val">${ivMax}</div>
        </div>
      </div>

      <div class="ivr-note">${d.note ?? ''}</div>

      <div class="ivr-action ${cls}">
        <div class="ivr-action-icon">${action.icon}</div>
        <div class="ivr-action-text">${action.text}</div>
      </div>

    </div>`;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

register('ivRank', {
  title: 'IV Rank',

  mount(container) {
    container.innerHTML = `
      <div class="ivr-wrap">
        <div class="panel-loading">
          <div class="pulse-dot"></div>
          <div>Loading IV rank…</div>
        </div>
      </div>`;
  },

  update(container, slot, state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) {
      renderEmpty(container, 'No IV data');
      return;
    }

    const d   = slot.data;
    const sym = d.symbol ?? state?.featuredSymbol ?? '—';

    container.innerHTML = buildContent(d, sym);
  },
});
