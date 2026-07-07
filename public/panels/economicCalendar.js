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

    // Prioritize high-impact events first, then medium, then low; show up to 6
    const all    = slot.data.events ?? [];
    const order  = { high: 0, medium: 1, low: 2 };
    const events = [...all]
      .sort((a, b) => (order[a.impact] ?? 3) - (order[b.impact] ?? 3))
      .slice(0, 6);

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
            <div class="ec-time" style="color:${col};">${ev.time ?? '—'}</div>
          </div>
          <div class="ec-date">${formatEventDate(ev.date)}</div>
          <div class="ec-event-name" title="${(ev.event ?? '').replace(/"/g, '&quot;')}">${ev.event ?? '—'}</div>
          <div class="ec-figures">
            ${hasActual   ? `<div class="ec-figure"><span class="ec-fig-label">ACTUAL</span><span class="ec-fig-val is-actual">${ev.actual}</span></div>` : ''}
            ${hasForecast ? `<div class="ec-figure"><span class="ec-fig-label">FCST</span><span class="ec-fig-val">${ev.forecast}</span></div>` : ''}
            ${hasPrev     ? `<div class="ec-figure"><span class="ec-fig-label">PREV</span><span class="ec-fig-val is-prev">${ev.previous}</span></div>` : ''}
          </div>
        </div>`;
    }).join(`<div class="ec-sep"></div>`);
  },
});
