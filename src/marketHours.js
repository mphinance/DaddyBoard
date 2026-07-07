/**
 * marketHours.js — Compute market phase in the configured timezone.
 *
 * Uses Intl.DateTimeFormat with timeZone:'America/New_York' for wall-clock
 * extraction — does NOT rely on the host's TZ environment variable.
 *
 * Phases:
 *   premarket   04:00–09:29 ET weekdays
 *   open        09:30–15:59 ET weekdays
 *   afterhours  16:00–19:59 ET weekdays
 *   closed      20:00–03:59 ET weekdays
 *   weekend     Saturday, Sunday (all hours)
 *   holiday     US market holiday (hardcoded 2026 list, approximate)
 *
 * Exports:
 *   getMarketPhase()  — returns { phase, isOpen, label, nextChangeAt }
 */

/** Approximate 2026 US market holidays (YYYY-MM-DD in ET). */
const HOLIDAYS_2026 = new Set([
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-07-03', // Independence Day observed
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-11-27', // Thanksgiving (early close — treat as holiday for simplicity)
  '2026-12-25', // Christmas
]);

const TZ = 'America/New_York';

/**
 * Extract wall-clock components in Eastern Time.
 * Returns { year, month, day, weekday, hour, minute, dateStr }.
 * weekday: 0=Sunday … 6=Saturday (matches Date.getDay() for ET).
 */
function getEasternComponents(now = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });

  const parts = fmt.formatToParts(now);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '0';

  const year = parseInt(get('year'), 10);
  const month = parseInt(get('month'), 10); // 1-based
  const day = parseInt(get('day'), 10);
  const hour = parseInt(get('hour'), 10);
  const minute = parseInt(get('minute'), 10);
  const weekdayStr = get('weekday'); // 'Sun','Mon',...'Sat'
  const weekdayMap = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const weekday = weekdayMap[weekdayStr] ?? now.getDay();

  const mm = String(month).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  const dateStr = `${year}-${mm}-${dd}`;

  return { year, month, day, weekday, hour, minute, dateStr };
}

/**
 * Build a Date representing a specific ET wall-clock time on a given date.
 * Used to compute nextChangeAt.
 */
function etWallClockToDate(year, month, day, hour, minute) {
  // Construct in ET by formatting a target string and finding the UTC offset.
  // Simplest robust approach: use the Date constructor with a "guess" and
  // verify via Intl.  We use a direct calculation instead.
  const isoStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;
  // Create a Date in UTC and adjust by the ET offset at that time.
  // The cleanest portable approach is to use the Temporal polyfill, but we
  // don't have it. We'll use a "local-noon-adjusted" trick:
  const candidateUtc = new Date(`${isoStr}Z`); // treat as UTC first
  // Determine what ET offset applies at that approximate time by sampling.
  const etParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(candidateUtc);
  const etH = parseInt(etParts.find((p) => p.type === 'hour')?.value ?? '0', 10);
  const etM = parseInt(etParts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  const targetMinutes = hour * 60 + minute;
  const actualMinutes = etH * 60 + etM;
  const diffMs = (targetMinutes - actualMinutes) * 60 * 1000;
  return new Date(candidateUtc.getTime() + diffMs);
}

/**
 * Returns the current market phase object.
 * @param {Date} [now] — defaults to new Date()
 */
export function getMarketPhase(now = new Date()) {
  const { year, month, day, weekday, hour, minute, dateStr } = getEasternComponents(now);

  // Weekend
  if (weekday === 0 || weekday === 6) {
    // Next change: Monday 4:00 ET
    const daysToMon = weekday === 0 ? 1 : 2;
    const nextD = new Date(now);
    nextD.setUTCDate(nextD.getUTCDate() + daysToMon);
    // Reset to Monday 4:00 ET
    const monComponents = getEasternComponents(nextD);
    const nextChangeAt = etWallClockToDate(monComponents.year, monComponents.month, monComponents.day, 4, 0);
    return { phase: 'weekend', isOpen: false, label: 'Market Closed (Weekend)', nextChangeAt: nextChangeAt.toISOString() };
  }

  // Holiday
  if (HOLIDAYS_2026.has(dateStr)) {
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tComps = getEasternComponents(tomorrow);
    const nextChangeAt = etWallClockToDate(tComps.year, tComps.month, tComps.day, 4, 0);
    return { phase: 'holiday', isOpen: false, label: 'Market Closed (Holiday)', nextChangeAt: nextChangeAt.toISOString() };
  }

  // Weekday phases
  const totalMinutes = hour * 60 + minute;
  const PRE_OPEN  = 4 * 60;        // 04:00
  const OPEN      = 9 * 60 + 30;   // 09:30
  const CLOSE     = 16 * 60;       // 16:00
  const AFTER_END = 20 * 60;       // 20:00

  let phase, isOpen, label, nextHour, nextMinute;

  if (totalMinutes < PRE_OPEN) {
    phase = 'closed'; isOpen = false; label = 'Market Closed';
    nextHour = 4; nextMinute = 0;
  } else if (totalMinutes < OPEN) {
    phase = 'premarket'; isOpen = false; label = 'Pre-Market';
    nextHour = 9; nextMinute = 30;
  } else if (totalMinutes < CLOSE) {
    phase = 'open'; isOpen = true; label = 'Market Open';
    nextHour = 16; nextMinute = 0;
  } else if (totalMinutes < AFTER_END) {
    phase = 'afterhours'; isOpen = false; label = 'After Hours';
    nextHour = 20; nextMinute = 0;
  } else {
    phase = 'closed'; isOpen = false; label = 'Market Closed';
    // Next change is tomorrow premarket 4:00 ET
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tComps = getEasternComponents(tomorrow);
    const nextChangeAt = etWallClockToDate(tComps.year, tComps.month, tComps.day, 4, 0);
    return { phase, isOpen, label, nextChangeAt: nextChangeAt.toISOString() };
  }

  const nextChangeAt = etWallClockToDate(year, month, day, nextHour, nextMinute);
  return { phase, isOpen, label, nextChangeAt: nextChangeAt.toISOString() };
}
