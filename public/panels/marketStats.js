/**
 * DaddyBoard — marketStats panel (Vitals Header)
 * Renders: put/call ratios, overall sentiment, bull/bear premium split,
 * largest trade, active alerts. Lives in the header bar.
 *
 * Data: slot.data = get_market_stats payload
 * Fields: putCallRatioSPY, putCallRatioQQQ, putCallRatioIWM,
 *         overallSentiment, sentimentScore, dominantFlow,
 *         totalBullishPremium, totalBearishPremium, bullishBearishRatio,
 *         largestTrade { ticker, type, premium, sentiment, tradeType, score },
 *         activeAlerts, totalFlowPremium
 */

import { register, fmt, applySlotState } from '../app.js';

function sentimentClass(s) {
  const v = (s ?? '').toLowerCase();
  if (v === 'bullish') return 'bull';
  if (v === 'bearish') return 'bear';
  return 'neutral';
}

function ratioClass(r) {
  // P/C < 0.8 = bullish (more calls), > 1.2 = bearish (more puts)
  if (r == null) return '';
  if (r < 0.8)  return 'bull';
  if (r > 1.2)  return 'bear';
  return 'accent';
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

    const lt = d.largestTrade ?? {};
    const sentClass = sentimentClass(d.overallSentiment);

    container.querySelector('#ms-vitals').innerHTML = `
      <!-- Overall sentiment -->
      <div class="ms-stat">
        <div class="ms-stat-label">Sentiment</div>
        <span class="ms-sentiment-pill ${sentClass}">${d.overallSentiment ?? '—'} ${d.sentimentScore != null ? d.sentimentScore : ''}</span>
      </div>
      <div class="ms-sep"></div>

      <!-- P/C ratios -->
      <div class="ms-stat">
        <div class="ms-stat-label">P/C SPY</div>
        <div class="ms-stat-value ${ratioClass(d.putCallRatioSPY)}">${d.putCallRatioSPY?.toFixed(2) ?? '—'}</div>
      </div>
      <div class="ms-stat">
        <div class="ms-stat-label">P/C QQQ</div>
        <div class="ms-stat-value ${ratioClass(d.putCallRatioQQQ)}">${d.putCallRatioQQQ?.toFixed(2) ?? '—'}</div>
      </div>
      <div class="ms-stat">
        <div class="ms-stat-label">P/C IWM</div>
        <div class="ms-stat-value ${ratioClass(d.putCallRatioIWM)}">${d.putCallRatioIWM?.toFixed(2) ?? '—'}</div>
      </div>
      <div class="ms-sep"></div>

      <!-- Bull/Bear split -->
      <div class="ms-stat">
        <div class="ms-stat-label">Bull Premium</div>
        <div class="ms-stat-value bull">${fmt.currency(d.totalBullishPremium)}</div>
      </div>
      <div class="ms-stat">
        <div class="ms-stat-label">Bear Premium</div>
        <div class="ms-stat-value bear">${fmt.currency(d.totalBearishPremium)}</div>
      </div>
      <div class="ms-sep"></div>

      <!-- Largest trade -->
      ${lt.ticker ? `
      <div class="ms-largest-trade">
        <div class="ms-largest-ticker">${lt.ticker}</div>
        <div>
          <div class="ms-stat-label">Largest Trade · ${lt.tradeType ?? ''}</div>
          <div class="ms-largest-meta">
            <span class="ms-stat-value ${sentimentClass(lt.sentiment)}" style="font-size:var(--text-md);">${fmt.currency(lt.premium)}</span>
            <span style="margin-left:6px;">${lt.type ?? ''} · Score ${lt.score ?? '—'}</span>
          </div>
        </div>
      </div>
      <div class="ms-sep"></div>` : ''}

      <!-- Active alerts -->
      ${d.activeAlerts > 0 ? `
      <div class="ms-alerts">
        <div class="ms-alerts-dot"></div>
        ${d.activeAlerts} Alert${d.activeAlerts !== 1 ? 's' : ''}
      </div>` : ''}
    `;
  },
});
