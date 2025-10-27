// src/utils/date.ts

const DEFAULT_TZ = 'America/Santiago';

/** YYYY-MM-DD de HOY en la zona local (America/Santiago). */
export function nowYMD(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());

  const y = parts.find(p => p.type === 'year')!.value;
  const m = parts.find(p => p.type === 'month')!.value;
  const d = parts.find(p => p.type === 'day')!.value;
  return `${y}-${m}-${d}`;
}

/** Hora actual HH:mm en la zona local (America/Santiago). */
export function nowHM(): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DEFAULT_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const hh = parts.find(p => p.type === 'hour')!.value;
  const mm = parts.find(p => p.type === 'minute')!.value;
  return `${hh}:${mm}`;
}

/** Fecha y hora local “YYYY-MM-DD HH:mm” (America/Santiago). */
export function nowYMD_HM(): string {
  return `${nowYMD()} ${nowHM()}`;
}

/** ISO 8601 en UTC del instante actual (útil para DB). */
export function nowISO(): string {
  return new Date().toISOString();
}
