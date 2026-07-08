/**
 * DaddyBoard — putCallRatios panel
 *
 * Renders a horizontal bullet bar: a zoned track (bull / neutral / bear) with a
 * solid marker at the current P/C ratio and a dashed reference tick at its 20-day
 * average.  Position on the track IS the reading — no length-fill progress bar.
 * Below: per-side volume bars and a meta footer with ticker + expiry.
 *
 * Data path: slot.data = get_put_call_ratios payload
 * Fields used: ticker, putCallRatio, putCallRatioAvg20d, putVolume, callVolume,
 *              sentiment, expirationDate, dataSource
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Bullet-bar scale (canonical — must match the zone bands below)
// ---------------------------------------------------------------------------

const SCALE_MIN = 0.5;   // left edge of track
const SCALE_MAX = 1.5;   // right edge of track
const PIVOT     = 1.0;   // reference gridline
// Canonical zone boundaries — MUST match the header copy.
const BULL_MAX    = 0.80; // 0.50–0.80 = bull
const NEUTRAL_MAX = 1.20; // 0.80–1.20 = neutral; 1.20–1.50 = bear

/** Ratio → percent position along the track (0–100), clamped to the scale. */
function ratioToPct(ratio) {
  if (ratio == null || isNaN(ratio)) return 50;
  const clamped = Math.max(SCALE_MIN, Math.min(SCALE_MAX, ratio));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

/** Zone token key for a ratio → 'bull' | 'neutral' | 'bear'. */
function zone(ratio) {
  if (ratio == null || isNaN(ratio)) return 'neutral';
  if (ratio < BULL_MAX)    return 'bull';
  if (ratio < NEUTRAL_MAX) return 'neutral';
  return 'bear';
}

function biasClass(ratio) {
  return `is-${zone(ratio)}`;
}

/**
 * Directional reading label with a non-color redundancy prefix (+/- via arrow).
 * Bull zone = call-heavy (▼ fewer puts), bear zone = put-heavy (▲ more puts).
 */
function biasLabel(ratio, sentiment) {
  const z = zone(ratio);
  const prefix = z === 'bull' ? '▼ ' : z === 'bear' ? '▲ ' : '● ';
  if (sentiment) return prefix + sentiment; // use fixture label if provided
  if (ratio == null) return '—';
  const word = z === 'bull' ? 'CALL-HEAVY'
    : z === 'bear' ? 'PUT-HEAVY'
    : 'BALANCED';
  return prefix + word;
}

/**
 * Build the horizontal bullet bar.
 * A zoned track (bull / neutral / bear bands) with a solid value marker and a
 * dashed 20-day reference tick.  No length-fill — it's a bullet, not a progress bar.
 */
function buildBulletBar(ratio, avg20d) {
  const z         = zone(ratio);
  const valPct    = ratioToPct(ratio);
  const avgPct    = ratioToPct(avg20d);
  const pivotPct  = ratioToPct(PIVOT);
  // Zone band widths as % of track (relative to SCALE_MIN..SCALE_MAX span).
  const span      = SCALE_MAX - SCALE_MIN;
  const bullW     = ((BULL_MAX    - SCALE_MIN) / span) * 100;
  const neutralW  = ((NEUTRAL_MAX - BULL_MAX)  / span) * 100;
  const bearW     = ((SCALE_MAX   - NEUTRAL_MAX) / span) * 100;
  const hasAvg    = avg20d != null && !isNaN(avg20d);

  return `
  <div class="pcr-bullet">
    <div class="pcr-track">
      <div class="pcr-zone bull"    style="width:${bullW}%;"></div>
      <div class="pcr-zone neutral" style="width:${neutralW}%;"></div>
      <div class="pcr-zone bear"    style="width:${bearW}%;"></div>
      <div class="pcr-pivot" style="left:${pivotPct}%;"></div>
      ${hasAvg ? `<div class="pcr-ref" style="left:${avgPct}%;"></div>` : ''}
      <div class="pcr-marker is-${z}" style="left:${valPct}%;"></div>
    </div>
    <div class="pcr-track-labels">
      <span class="pcr-track-lo">${fmt.ratio(SCALE_MIN)}</span>
      <span class="pcr-track-pivot" style="left:${pivotPct}%;">1.0</span>
      ${hasAvg ? `<span class="pcr-track-ref" style="left:${avgPct}%;">20d ${fmt.ratio(avg20d)}</span>` : ''}
      <span class="pcr-track-hi">${fmt.ratio(SCALE_MAX)}</span>
    </div>
  </div>`;
}

// ---------------------------------------------------------------------------
// Panel registration
// ---------------------------------------------------------------------------
register('putCallRatios', {
  title: 'Put / Call Sentiment',

  mount(container) {
    container.innerHTML = `
      <div class="pcr-wrap" id="pcr-inner">
        <div class="pcr-readout" id="pcr-readout">
          <div class="panel-loading"><div class="pulse-dot"></div><div>Loading…</div></div>
        </div>
        <div class="pcr-bullet-wrap" id="pcr-bullet-wrap"></div>
        <div class="pcr-vol-section" id="pcr-vol-section"></div>
        <div class="pcr-meta" id="pcr-meta"></div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) {
      renderEmpty(container.querySelector('#pcr-readout') ?? container, 'No P/C data');
      return;
    }

    const d = slot.data;
    const ratio    = d.putCallRatio;
    const avg20d   = d.putCallRatioAvg20d;
    const cls      = biasClass(ratio);
    const label    = biasLabel(ratio, d.sentiment);
    const callVol  = d.callVolume ?? 0;
    const putVol   = d.putVolume  ?? 0;
    const total    = callVol + putVol;
    const callPct  = total > 0 ? (callVol / total * 100).toFixed(0) : 50;
    const putPct   = total > 0 ? (putVol  / total * 100).toFixed(0) : 50;

    // Center numeric readout + directional label
    const readout = container.querySelector('#pcr-readout');
    if (readout) {
      readout.innerHTML = `
        <div class="pcr-ratio-val ${cls}">${fmt.ratio(ratio)}</div>
        <div class="pcr-sentiment-label ${cls}">${label}</div>`;
    }

    // Bullet bar (zoned track + value marker + 20d reference tick)
    const bulletWrap = container.querySelector('#pcr-bullet-wrap');
    if (bulletWrap) {
      bulletWrap.innerHTML = buildBulletBar(ratio, avg20d);
    }

    // Volume bars
    const volSection = container.querySelector('#pcr-vol-section');
    if (volSection) {
      volSection.innerHTML = `
        <div class="pcr-vol-row">
          <span class="pcr-vol-label calls">Calls</span>
          <div class="pcr-vol-track">
            <div class="pcr-vol-fill calls" style="width:${callPct}%;"></div>
          </div>
          <span class="pcr-vol-num">${fmt.number(callVol)}</span>
        </div>
        <div class="pcr-vol-row">
          <span class="pcr-vol-label puts">Puts</span>
          <div class="pcr-vol-track">
            <div class="pcr-vol-fill puts" style="width:${putPct}%;"></div>
          </div>
          <span class="pcr-vol-num">${fmt.number(putVol)}</span>
        </div>`;
    }

    // Meta footer
    const meta = container.querySelector('#pcr-meta');
    if (meta) {
      meta.innerHTML = `
        <span class="pcr-ticker">${d.ticker ?? '—'}</span>
        <span class="pcr-expiry">Exp ${d.expirationDate ?? '—'} · ${d.dataSource ?? 'volume'}</span>`;
    }
  },
});
