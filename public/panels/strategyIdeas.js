/**
 * DaddyBoard — strategyIdeas panel (Featured Deep-Dive)
 *
 * Data path: slot.data = get_strategy_ideas payload
 * Fields: symbol, direction, derivedFromTechnicals,
 *         structures[].{ archetype, rank, score, legs[],
 *                        maxProfit, maxLoss, breakevens, pop,
 *                        capitalAtRisk, expiration, dte,
 *                        rationale, earningsInWindow }
 *
 * Shows top 3 structures as cards with POP bar, legs, rationale.
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dirClass(dir) {
  const d = (dir ?? '').toLowerCase();
  if (d === 'bullish') return 'bullish';
  if (d === 'bearish') return 'bearish';
  return 'neutral';
}

function archetypeLabel(archetype) {
  return (archetype ?? '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function popClass(pop) {
  const p = pop ?? 0;
  if (p >= 0.65) return 'high';
  if (p >= 0.45) return 'medium';
  return 'low';
}

function legChipClass(leg) {
  const type = (leg.type ?? '').toUpperCase();
  const side = (leg.side ?? '').toLowerCase();
  if (type === 'STOCK') return 'stock';
  if (type === 'CALL' && side === 'buy')  return 'call-buy';
  if (type === 'CALL' && side === 'sell') return 'call-sell';
  if (type === 'PUT'  && side === 'buy')  return 'put-buy';
  if (type === 'PUT'  && side === 'sell') return 'put-sell';
  return 'stock';
}

function legLabel(leg) {
  const side = (leg.side ?? '').toUpperCase();
  const type = (leg.type ?? '');
  if (type === 'STOCK') return `${side} ${leg.qty ?? 1} shares`;
  const strike = leg.strike != null ? `$${leg.strike}` : '';
  const prem   = leg.premium != null ? ` @ $${leg.premium.toFixed(2)}` : '';
  return `${side} ${type} ${strike}${prem}`;
}

function buildLegs(legs) {
  if (!legs || legs.length === 0) return '';
  const chips = legs.map(leg =>
    `<span class="si-leg-chip ${legChipClass(leg)}">${legLabel(leg)}</span>`
  ).join('');
  return `<div class="si-legs">${chips}</div>`;
}

function buildStats(s) {
  const profit  = s.maxProfit != null ? fmt.currency(s.maxProfit) : '∞';
  const loss    = s.maxLoss   != null ? fmt.currency(s.maxLoss)   : '∞';
  const cap     = s.capitalAtRisk != null ? fmt.currency(s.capitalAtRisk) : '—';
  const be      = (s.breakevens ?? []).length
    ? `$${s.breakevens[0].toFixed(2)}`
    : '—';

  return `
    <div class="si-stats">
      <div class="si-stat">
        <div class="si-stat-label">Max Profit</div>
        <div class="si-stat-val profit">${profit}</div>
      </div>
      <div class="si-stat">
        <div class="si-stat-label">Max Loss</div>
        <div class="si-stat-val loss">${loss}</div>
      </div>
      <div class="si-stat">
        <div class="si-stat-label">Capital</div>
        <div class="si-stat-val caution">${cap}</div>
      </div>
      <div class="si-stat">
        <div class="si-stat-label">B/E</div>
        <div class="si-stat-val neutral">${be}</div>
      </div>
    </div>`;
}

function buildPopBar(pop) {
  if (pop == null) return '';
  const pct   = Math.round(pop * 100);
  const cls   = popClass(pop);
  return `
    <div class="si-pop-bar-wrap">
      <div class="si-pop-label">POP</div>
      <div class="si-pop-track">
        <div class="si-pop-fill ${cls}" style="width:${pct}%;"></div>
      </div>
      <div class="si-pop-pct">${pct}%</div>
    </div>`;
}

function buildExpiry(s) {
  const exp = s.expiration ?? '—';
  const dte = s.dte != null ? `${s.dte}d` : '—';
  const warn = s.earningsInWindow
    ? `<span class="si-earnings-warn">&#9888; Earnings in window</span>`
    : '';
  return `
    <div class="si-expiry">
      <span class="si-expiry-item">Exp <span class="si-expiry-val">${exp}</span></span>
      <span class="si-expiry-item">DTE <span class="si-expiry-val">${dte}</span></span>
      ${warn}
    </div>`;
}

function buildCard(s, idx) {
  const rankNum   = s.rank ?? (idx + 1);
  const rankClass = rankNum <= 3 ? `rank-${rankNum}` : '';
  const scoreChip = s.score != null
    ? `<span class="si-score-chip">Score ${fmt.score(s.score)}</span>`
    : '';

  return `
    <div class="si-card ${rankClass}">
      <div class="si-card-head">
        <div class="si-rank-badge">#${rankNum}</div>
        <div class="si-archetype">${archetypeLabel(s.archetype)}</div>
        ${scoreChip}
      </div>
      ${buildLegs(s.legs)}
      ${buildStats(s)}
      ${buildPopBar(s.pop)}
      <div class="si-rationale">${s.rationale ?? ''}</div>
      ${buildExpiry(s)}
    </div>`;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

register('strategyIdeas', {
  title: 'Strategy Ideas',

  mount(container) {
    container.innerHTML = `
      <div class="si-wrap">
        <div class="si-header">
          <div class="si-title-group">
            <div class="si-symbol">—</div>
            <div class="si-label">Strategy Ideas</div>
          </div>
        </div>
        <div class="panel-loading">
          <div class="pulse-dot"></div>
          <div>Loading strategies…</div>
        </div>
      </div>`;
  },

  update(container, slot, state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) {
      renderEmpty(container, 'No strategy data');
      return;
    }

    const d          = slot.data;
    const sym        = d.symbol ?? state?.featuredSymbol ?? '—';
    const dir        = d.direction ?? 'neutral';
    const dirCls     = dirClass(dir);
    const structures = (d.structures ?? []).slice(0, 3);

    if (structures.length === 0) {
      container.innerHTML = `
        <div class="si-wrap">
          <div class="si-header">
            <div class="si-title-group">
              <div class="si-symbol">${sym}</div>
              <div class="si-label">Strategy Ideas</div>
            </div>
          </div>
          <div class="si-empty">No structures available</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="si-wrap">
        <div class="si-header">
          <div class="si-title-group">
            <div class="si-symbol">${sym}</div>
            <div class="si-label">Strategy Ideas</div>
          </div>
          <span class="si-dir-badge ${dirCls}">${dir}</span>
        </div>
        <div class="si-cards">
          ${structures.map((s, i) => buildCard(s, i)).join('')}
        </div>
      </div>`;
  },
});
