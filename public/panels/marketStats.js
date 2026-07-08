/**
 * DaddyBoard — marketStats panel (Vitals Header)
 * Renders: an overall sentiment read, a compact SPY/QQQ/IWM P/C cluster, and the
 * single largest trade on the tape. Lives in the header bar.
 *
 * Data: slot.data = get_market_stats payload (the live wire shape — snake_case,
 * per-index). This tool carries NO overall sentiment index, bull/bear ratio, or
 * alert count on the wire, so the "overall" read is derived honestly here as a
 * majority vote of the three index sentiments (same math in mock and live).
 *
 * Fields: spy_put_call_ratio, qqq_put_call_ratio, iwm_put_call_ratio,
 *         spy_sentiment, qqq_sentiment, iwm_sentiment,
 *         largest_trade_{premium,symbol,strike,expiry,type}
 */

import { register, fmt, applySlotState } from '../app.js';

function sentimentClass(s) {
  const v = (s ?? '').toLowerCase();
  if (v === 'bullish') return 'bull';
  if (v === 'bearish') return 'bear';
  return 'neutral';
}

// Overall market read = majority vote of the three index sentiments. Ties
// (e.g. 1 bull / 1 bear / 1 neutral) resolve to Neutral.
function overallSentiment(d) {
  const votes = [d.spy_sentiment, d.qqq_sentiment, d.iwm_sentiment];
  let bull = 0, bear = 0;
  for (const v of votes) {
    const c = sentimentClass(v);
    if (c === 'bull') bull++;
    else if (c === 'bear') bear++;
  }
  if (bull > bear) return 'Bullish';
  if (bear > bull) return 'Bearish';
  return 'Neutral';
}

// Root ticker from an OCC option symbol, e.g. NVDA260710C00185000 → NVDA.
function occRoot(symbol) {
  return (symbol ?? '').match(/^[A-Z]+/)?.[0] ?? '';
}

function ratioClass(r) {
  // Canonical P/C band (shared with the P/C panel):
  //   < 0.80 = bullish (more calls), > 1.20 = bearish (more puts),
  //   0.80–1.20 = neutral (calm grey-blue), NOT caution/amber.
  if (r == null) return '';
  if (r < 0.8)  return 'bull';
  if (r > 1.2)  return 'bear';
  return 'neutral';
}

// Textual direction prefix so hue isn't the only signal (colorblind / 10ft).
function ratioMark(r) {
  if (r == null) return '';
  if (r < 0.8) return '▼';  // fewer puts → bullish
  if (r > 1.2) return '▲';  // more puts → bearish
  return '·';
}

register('marketStats', {
  title: 'Market Stats',

  mount(container) {
    container.innerHTML = `<div class="ms-vitals" id="ms-vitals">
      <div class="panel-loading"><div class="pulse-dot"></div></div>
    </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    const d = slot?.data;
    if (!d) return;

    const overall   = overallSentiment(d);
    const sentClass = sentimentClass(overall);
    const ltTicker  = occRoot(d.largest_trade_symbol);
    const ltType    = d.largest_trade_type; // CALL | PUT — a contract type, not a sentiment

    const pc = (r) => `<span class="ms-pc-item ${ratioClass(r)}">${ratioMark(r)}${fmt.ratio(r)}</span>`;

    container.querySelector('#ms-vitals').innerHTML = `
      <!-- Overall read — majority of the three index sentiments -->
      <div class="ms-stat">
        <div class="ms-stat-label">Sentiment</div>
        <span class="ms-sentiment-pill ${sentClass}">${overall}</span>
      </div>
      <div class="ms-sep"></div>

      <!-- P/C ratios — one compact cluster; the P/C panel owns the detail -->
      <div class="ms-stat">
        <div class="ms-stat-label">P/C</div>
        <div class="ms-pc-cluster">
          <span class="ms-pc-tkr">SPY</span>${pc(d.spy_put_call_ratio)}
          <span class="ms-pc-tkr">QQQ</span>${pc(d.qqq_put_call_ratio)}
          <span class="ms-pc-tkr">IWM</span>${pc(d.iwm_put_call_ratio)}
        </div>
      </div>

      <!-- Money moment — the single biggest trade on the tape, pinned right -->
      ${ltTicker ? `
      <div class="ms-money">
        <div class="ms-money-label">Largest Trade</div>
        <div class="ms-money-row">
          <span class="ms-money-ticker">${ltTicker}</span>
          <span class="ms-money-premium accent">${fmt.currency(d.largest_trade_premium)}</span>
        </div>
        <div class="ms-money-meta">${ltType ?? ''}${d.largest_trade_strike != null ? ' $' + d.largest_trade_strike : ''}${d.largest_trade_expiry ? ' · ' + d.largest_trade_expiry : ''}</div>
      </div>` : ''}
    `;
  },
});
