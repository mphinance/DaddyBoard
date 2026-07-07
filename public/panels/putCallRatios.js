/**
 * DaddyBoard — putCallRatios panel
 *
 * Renders a semicircular sentiment gauge whose needle angle maps the P/C ratio
 * to a bull→neutral→bear arc.  Below the gauge: per-side volume bars and a
 * meta footer with ticker + expiry.
 *
 * Data path: slot.data = get_put_call_ratios payload
 * Fields used: ticker, putCallRatio, putVolume, callVolume, sentiment,
 *              expirationDate, dataSource
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a put/call ratio to a -1…+1 sentiment scale.
 *   ratio < 0.7  → strong bull (+1)
 *   ratio ~ 0.9  → neutral   (0)
 *   ratio > 1.2  → strong bear (-1)
 */
function ratioToSentiment(ratio) {
  if (ratio == null || isNaN(ratio)) return 0;
  // clamp mapping: 0.5 → +1, 0.9 → 0, 1.3 → -1
  const clamped = Math.max(0.5, Math.min(1.3, ratio));
  return 1 - ((clamped - 0.5) / 0.8) * 2;
}

/**
 * sentiment ∈ [-1, +1] → SVG needle rotation in degrees
 * Arc spans -90° (full bull, left) to +90° (full bear, right), 0° = neutral.
 */
function sentimentToDeg(sentiment) {
  return -sentiment * 90;
}

function biasClass(ratio) {
  if (ratio == null) return 'is-caution';
  if (ratio < 0.8)  return 'is-bull';
  if (ratio > 1.05) return 'is-bear';
  return 'is-caution';
}

function biasLabel(ratio, sentiment) {
  if (sentiment) return sentiment; // use fixture label if provided
  if (ratio == null) return '—';
  if (ratio < 0.7)  return 'VERY BULLISH';
  if (ratio < 0.8)  return 'BULLISH';
  if (ratio < 0.95) return 'LEAN BULL';
  if (ratio < 1.05) return 'NEUTRAL';
  if (ratio < 1.15) return 'LEAN BEAR';
  if (ratio < 1.3)  return 'BEARISH';
  return 'VERY BEARISH';
}

/**
 * Build the semicircular SVG gauge.
 * viewBox center is (130, 130), radius 100.
 * Arc: 180° from left (-180°) to right (0°) measured clockwise from top.
 * We split into three colored zones: bull, neutral, bear.
 */
function buildGaugeSVG(ratio) {
  const cx = 130, cy = 130, r = 100;
  const needleDeg = sentimentToDeg(ratioToSentiment(ratio));

  // Polar → Cartesian for a given arc degree (0° = right, CCW positive)
  // We lay the gauge flat: left = 180° (full bull), right = 0° (full bear),
  // center top is 90°.  We work in standard math angles.
  function polar(deg, radius) {
    const rad = (deg * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy - radius * Math.sin(rad),
    };
  }

  // Arc path helper (large-arc flag = 1 if span > 180°)
  function arcPath(startDeg, endDeg, innerR, outerR) {
    const s1 = polar(startDeg, outerR);
    const e1 = polar(endDeg,   outerR);
    const s2 = polar(endDeg,   innerR);
    const e2 = polar(startDeg, innerR);
    const span = Math.abs(endDeg - startDeg);
    const large = span > 180 ? 1 : 0;
    // CCW outer arc then CW inner arc back
    return [
      `M ${s1.x} ${s1.y}`,
      `A ${outerR} ${outerR} 0 ${large} 0 ${e1.x} ${e1.y}`,
      `L ${s2.x} ${s2.y}`,
      `A ${innerR} ${innerR} 0 ${large} 1 ${e2.x} ${e2.y}`,
      'Z',
    ].join(' ');
  }

  // Three arc zones across 180° (0° left = bear, 180° right = bull)
  // Zone spans (in standard angle, going CCW from 0° to 180°):
  //   Bear zone: 0°–60°
  //   Caution:   60°–120°
  //   Bull zone: 120°–180°
  const innerR = 64, outerR = 100;

  const bearArc    = arcPath(0,   60,  innerR, outerR);
  const cautionArc = arcPath(60,  120, innerR, outerR);
  const bullArc    = arcPath(120, 180, innerR, outerR);

  // Tick marks at 0°, 30°, 60°, 90°, 120°, 150°, 180°
  const ticks = [0, 30, 60, 90, 120, 150, 180].map(deg => {
    const outer = polar(deg, outerR + 4);
    const inner = polar(deg, outerR - 1);
    return `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}"
              stroke="hsla(210 40% 60% / 0.25)" stroke-width="1.5"/>`;
  }).join('\n');

  // Needle: a thin polygon from center bottom to tip at outerR-8
  // needleDeg: 0° = neutral (pointing up), -90° = full bull (left), +90° = bear (right)
  // In our arc coords: neutral = 90°, bull = 180°, bear = 0°.
  const needleArcDeg = 90 + needleDeg; // convert
  const tipPt  = polar(needleArcDeg, outerR - 10);
  const leftPt = polar(needleArcDeg + 90, 7);
  const rightPt= polar(needleArcDeg - 90, 7);

  const cls = biasClass(ratio);
  const needleColor = cls === 'is-bull' ? 'var(--bull)'
    : cls === 'is-bear' ? 'var(--bear)'
    : 'var(--caution)';

  // Zone labels
  const bearLbl  = polar(30,  innerR - 14);
  const neutLbl  = polar(90,  innerR - 14);
  const bullLbl  = polar(150, innerR - 14);

  return `
  <svg class="pcr-gauge-svg" viewBox="0 0 260 145" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <!-- Arc zones -->
    <path d="${bullArc}"    fill="hsla(152 62% 46% / 0.18)" stroke="hsla(152 65% 45% / 0.30)" stroke-width="1"/>
    <path d="${cautionArc}" fill="hsla(40  90% 56% / 0.14)" stroke="hsla(40  90% 56% / 0.25)" stroke-width="1"/>
    <path d="${bearArc}"    fill="hsla(3   68% 56% / 0.18)" stroke="hsla(3   70% 50% / 0.30)"  stroke-width="1"/>
    <!-- Tick marks -->
    ${ticks}
    <!-- Zone labels -->
    <text x="${bullLbl.x}" y="${bullLbl.y}" fill="var(--text-bull)"    font-size="9" font-weight="700"
          text-anchor="middle" dominant-baseline="middle" letter-spacing="0.06em">BULL</text>
    <text x="${neutLbl.x}" y="${neutLbl.y}" fill="var(--text-caution)" font-size="9" font-weight="700"
          text-anchor="middle" dominant-baseline="middle" letter-spacing="0.06em">NEUT</text>
    <text x="${bearLbl.x}" y="${bearLbl.y}" fill="var(--text-bear)"    font-size="9" font-weight="700"
          text-anchor="middle" dominant-baseline="middle" letter-spacing="0.06em">BEAR</text>
    <!-- Needle -->
    <polygon
      points="${tipPt.x},${tipPt.y} ${leftPt.x},${leftPt.y} ${rightPt.x},${rightPt.y}"
      fill="${needleColor}"
      opacity="0.95"
    />
    <!-- Center hub -->
    <circle cx="${cx}" cy="${cy}" r="7" fill="hsla(220 40% 18% / 0.90)"
            stroke="hsla(210 40% 60% / 0.30)" stroke-width="1.5"/>
  </svg>`;
}

// ---------------------------------------------------------------------------
// Panel registration
// ---------------------------------------------------------------------------
register('putCallRatios', {
  title: 'Put / Call Sentiment',

  mount(container) {
    container.innerHTML = `
      <div class="pcr-wrap" id="pcr-inner">
        <div class="pcr-gauge-wrap" id="pcr-gauge-wrap">
          <div class="panel-loading"><div class="pulse-dot"></div><div>Loading gauge…</div></div>
          <div class="pcr-center" id="pcr-center" style="display:none;">
            <div class="pcr-ratio-val" id="pcr-ratio-val">—</div>
            <div class="pcr-sentiment-label" id="pcr-sentiment-label">—</div>
          </div>
        </div>
        <div class="pcr-vol-section" id="pcr-vol-section"></div>
        <div class="pcr-meta" id="pcr-meta"></div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) {
      renderEmpty(container.querySelector('#pcr-gauge-wrap') ?? container, 'No P/C data');
      return;
    }

    const d = slot.data;
    const ratio    = d.putCallRatio;
    const cls      = biasClass(ratio);
    const label    = biasLabel(ratio, d.sentiment);
    const callVol  = d.callVolume ?? 0;
    const putVol   = d.putVolume  ?? 0;
    const total    = callVol + putVol;
    const callPct  = total > 0 ? (callVol / total * 100).toFixed(0) : 50;
    const putPct   = total > 0 ? (putVol  / total * 100).toFixed(0) : 50;

    // Gauge SVG
    const gaugeWrap = container.querySelector('#pcr-gauge-wrap');
    if (gaugeWrap) {
      gaugeWrap.innerHTML = buildGaugeSVG(ratio);
      // Re-inject center overlay
      const center = document.createElement('div');
      center.className = 'pcr-center';
      center.innerHTML = `
        <div class="pcr-ratio-val ${cls}">${fmt.ratio(ratio)}</div>
        <div class="pcr-sentiment-label ${cls}">${label}</div>`;
      gaugeWrap.appendChild(center);
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
