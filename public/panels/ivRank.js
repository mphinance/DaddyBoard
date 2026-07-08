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

function actionLabel(interp, earningsInWindow) {
  if (interp === 'rich') {
    if (earningsInWindow === true) {
      // "Elevated IV" is already carried by the RICH + EARNINGS pills above —
      // lead straight with the safety instruction so it fits two lines uncut.
      return { icon: '↓', text: `Don't sell naked into the earnings print.` };
    }
    return { icon: '↓', text: 'Favor selling — CSPs, credit spreads, covered calls' };
  }
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
  const earningsInWindow = d.earningsInWindow === true;
  const action = actionLabel(d.interpretation, d.earningsInWindow);
  const iv    = d.currentIV != null ? `${(d.currentIV * 100).toFixed(1)}%` : '—';
  const ivMin = d.ivMin52w  != null ? `${(d.ivMin52w  * 100).toFixed(1)}%` : '—';
  const ivMax = d.ivMax52w  != null ? `${(d.ivMax52w  * 100).toFixed(1)}%` : '—';

  // Rank-vs-percentile divergence caption (fires only on a real gap)
  const divergence = Math.abs(pct - rank) >= 15
    ? `Rank ${fmt.score(rank)} vs Pct ${fmt.score(pct)} — read the divergence.`
    : '';

  const gated = d.interpretation === 'rich' && earningsInWindow;

  // Amber earnings chip — sits inline in the header beside the interp pill when
  // premium-sell advice is gated (absolute-positioning it collided with the pill).
  const earningsChip = gated
    ? `<span class="ivr-earnings-chip">EARNINGS ⚠</span>`
    : '';

  // When gated, the raw note ("favor selling strategies…") contradicts the
  // action line's earnings caveat — and any note here is redundant with the
  // action line directly below. Drop it so the note becomes a flex spacer that
  // pins the (safety-critical) action line without the panel overflowing.
  const noteText = gated ? '' : (d.note ?? '');

  // Gauge position clamped 0-100
  const gaugeLeft = Math.max(0, Math.min(100, rank));

  return `
    <div class="ivr-wrap">

      <div class="ivr-header">
        <div class="ivr-symbol">${sym}</div>
        <div class="ivr-header-pills">
          ${earningsChip}
          <span class="ivr-interp-pill ${cls}">${d.interpretation ?? 'neutral'}</span>
        </div>
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

      <div class="ivr-note">${noteText}${divergence ? ` <span class="ivr-divergence">${divergence}</span>` : ''}</div>

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
