/**
 * DaddyBoard — economicCalendar panel (BOTTOM RIBBON)
 * Upcoming macro / econ events, importance-coded.
 *
 * Data: slot.data = get_economic_calendar payload
 *   events[].{ date, time, event, impact:'high'|'medium'|'low', forecast, previous, actual, country }
 *   dateFrom, dateTo, totalEvents
 */

import { register, applySlotState, renderEmpty } from '../app.js';

function impactColor(impact) {
  if (impact === 'high')   return 'var(--text-bear)';
  if (impact === 'medium') return 'var(--text-caution)';
  return 'var(--text-dim)';
}
function impactBg(impact) {
  if (impact === 'high')   return 'var(--bear-dim)';
  if (impact === 'medium') return 'var(--caution-dim)';
  return 'hsla(210 14% 50% / 0.08)';
}
function impactBorder(impact) {
  if (impact === 'high')   return 'var(--border-bear)';
  if (impact === 'medium') return 'hsla(40 90% 56% / 0.30)';
  return 'var(--border-hairline)';
}
function impactBullets(impact) {
  const n = impact === 'high' ? 3 : impact === 'medium' ? 2 : 1;
  return Array.from({ length: 3 }, (_, i) =>
    `<span class="ec-bullet ${i < n ? 'is-lit' : ''}"></span>`
  ).join('');
}

function formatEventDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return dateStr; }
}

// Non-color redundancy: any signed numeric figure carries an explicit +/- prefix.
function signedFigure(v) {
  const s = String(v).trim();
  if (/^[+\-▲▼]/.test(s)) return s;                 // already prefixed
  const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  if (isNaN(num) || num === 0) return s;             // non-numeric or flat — leave as-is
  return `${num > 0 ? '+' : '-'}${s.replace(/^-/, '')}`;
}

register('economicCalendar', {
  title: 'Economic Calendar',

  mount(container) {
    container.innerHTML = `
      <div class="ec-wrap" id="ec-wrap">
        <div class="ec-ribbon-label">
          <span class="ec-label-text">MACRO CALENDAR</span>
        </div>
        <div class="ec-items" id="ec-items">
          <div class="panel-loading"><div class="pulse-dot"></div><div>Loading calendar…</div></div>
        </div>
      </div>`;
  },

  update(container, slot, _state) {
    if (applySlotState(container, slot)) return;
    if (!slot?.data) { renderEmpty(container.querySelector('#ec-items') ?? container, 'No calendar data'); return; }

    // Tertiary "what's coming" strip — the NEXT 2-3 events only, high-impact first.
    const all    = slot.data.events ?? [];
    const order  = { high: 0, medium: 1, low: 2 };
    const events = [...all]
      .sort((a, b) => (order[a.impact] ?? 3) - (order[b.impact] ?? 3))
      .slice(0, 3);

    const itemsEl = container.querySelector('#ec-items');
    if (!itemsEl) return;

    if (events.length === 0) {
      itemsEl.innerHTML = `<div class="ec-empty">No upcoming macro events</div>`;
      return;
    }

    itemsEl.innerHTML = events.map(ev => {
      const col = impactColor(ev.impact);
      const bg  = impactBg(ev.impact);
      const bdr = impactBorder(ev.impact);
      const hasActual   = ev.actual   != null && ev.actual !== '';
      const hasForecast = ev.forecast != null && ev.forecast !== '';
      const hasPrev     = ev.previous != null && ev.previous !== '';

      return `
        <div class="ec-card" style="border-color:${bdr};background:${bg};">
          <div class="ec-card-top">
            <div class="ec-impact-bullets">${impactBullets(ev.impact)}</div>
            <div class="ec-event-name" title="${(ev.event ?? '').replace(/"/g, '&quot;')}">${ev.event ?? '—'}</div>
            <div class="ec-time" style="color:${col};">${ev.time ?? '—'}</div>
          </div>
          <div class="ec-card-meta">
            <span class="ec-date">${formatEventDate(ev.date)}</span>
            ${hasActual   ? `<span class="ec-fig"><span class="ec-fig-label">ACT</span> <span class="ec-fig-val is-actual">${signedFigure(ev.actual)}</span></span>` : ''}
            ${hasForecast ? `<span class="ec-fig"><span class="ec-fig-label">FCST</span> <span class="ec-fig-val">${signedFigure(ev.forecast)}</span></span>` : ''}
            ${hasPrev     ? `<span class="ec-fig"><span class="ec-fig-label">PREV</span> <span class="ec-fig-val is-prev">${signedFigure(ev.previous)}</span></span>` : ''}
          </div>
        </div>`;
    }).join(`<div class="ec-sep"></div>`);
  },
});
