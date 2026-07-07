/**
 * DaddyBoard — screener panel (Rotating Feature Card)
 *
 * Data path: slot.data = run_screener payload
 * Fields: screener.{ id, name }, results[].{ ticker, name, price, change,
 *         changePct, volume, avgVolume, relVol, score, sector, setup, edgeScore },
 *         tickers[], count, returned, timestamp
 *
 * Shows top 7 rows from the active screener. Rotates with other stage panels.
 */

import { register, fmt, applySlotState, renderEmpty } from '../app.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function legColor(changePct) {
  return (changePct ?? 0) >= 0 ? 'bull' : 'bear';
}

function relVolClass(rv) {
  return (rv ?? 0) >= 1.5 ? ' hot' : '';
}

function relVolLabel(rv) {
  if (rv == null) return '—';
  return `${rv.toFixed(2)}x`;
}

function setupPill(row) {
  const label = row.setup ?? row.sector ?? '';
  if (!label) return '';
  return `<span class="scr-setup-pill">${label}</span>`;
}

function scoreBar(score) {
  const s = Math.max(0, Math.min(100, score ?? 0));
  return `
    <div class="scr-score">
      <div class="scr-score-num">${fmt.score(score)}</div>
      <div class="scr-score-bar">
        <div class="scr-score-bar-fill" style="width:${s}%;"></div>
      </div>
    </div>`;
}

function buildRow(row) {
  const cls = legColor(row.changePct);
  const rvCls = relVolClass(row.relVol);
  return `
    <div class="scr-row">
      <div class="scr-ticker">${row.ticker ?? '—'}</div>
      <div class="scr-name">${setupPill(row)}<span style="margin-left:var(--sp-1);color:var(--text-dim);font-size:var(--text-xs);">${row.name ?? row.sector ?? ''}</span></div>
      <div class="scr-price">$${row.price != null ? row.price.toFixed(2) : '—'}</div>
      <div class="scr-chg ${cls}">${fmt.pct(row.changePct)}</div>
      <div class="scr-vol${rvCls}">${relVolLabel(row.relVol)}</div>
      ${scoreBar(row.score)}
    </div>`;
}

function buildFooter(d) {
  const results = d.results ?? [];
  const avgScore = results.length
    ? (results.reduce((s, r) => s + (r.score ?? 0), 0) / results.length).toFixed(0)
    : '—';
  const bullCount = results.filter(r => (r.changePct ?? 0) >= 0).length;
  const tickers   = (d.tickers ?? []).slice(0, 6);

  return `
    <div class="scr-footer">
      <div class="scr-footer-left">
        <div class="scr-footer-stat">
          <div class="scr-footer-label">Showing</div>
          <div class="scr-footer-val">${d.returned ?? results.length} / ${d.count ?? results.length}</div>
        </div>
        <div class="scr-footer-stat">
          <div class="scr-footer-label">Avg Score</div>
          <div class="scr-footer-val">${avgScore}</div>
        </div>
        <div class="scr-footer-stat">
          <div class="scr-footer-label">Up / Down</div>
          <div class="scr-footer-val" style="color:var(--text-bull);">${bullCount}<span style="color:var(--text-dim);">/</span><span style="color:var(--text-bear);">${results.length - bullCount}</span></div>
        </div>
      </div>
      <div class="scr-ticker-pills">
        ${tickers.map(t => `<span class="scr-ticker-pill">${t}</span>`).join('')}
      </div>
    </div>`;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

register('screener', {
  title: 'Screener',

  mount(container) {
    container.innerHTML = `
      <div class="scr-wrap">
        <div class="scr-header">
          <div class="scr-title">Screener</div>
        </div>
        <div class="panel-loading">
          <div class="pulse-dot"></div>
          <div>Loading screener…</div>
        </div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) {
      renderEmpty(container, 'No screener data');
      return;
    }

    const d       = slot.data;
    const name    = d.screener?.name ?? 'Screener';
    const results = (d.results ?? []).slice(0, 7);
    const ts      = d.timestamp ? fmt.relTime(d.timestamp) : '';

    if (results.length === 0) {
      container.innerHTML = `
        <div class="scr-wrap">
          <div class="scr-header"><div class="scr-title">${name}</div></div>
          <div class="scr-empty">No results</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div class="scr-wrap">
        <div class="scr-header">
          <div class="scr-title">${name}</div>
          <div class="scr-meta">
            <span class="scr-count-badge">${d.count ?? results.length} hits</span>
            <span class="scr-ts">${ts}</span>
          </div>
        </div>
        <div class="scr-col-labels">
          <span>Ticker</span>
          <span>Setup</span>
          <span class="col-right">Price</span>
          <span class="col-right">Chg%</span>
          <span class="col-right">RelVol</span>
          <span class="col-right">Score</span>
        </div>
        <div class="scr-rows">
          ${results.map(buildRow).join('')}
        </div>
        ${buildFooter(d)}
      </div>`;
  },
});
