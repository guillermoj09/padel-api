export const TZ = 'America/Santiago';

export function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function localTodayYMD(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export function localTomorrowYMD(): string {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [y, m, d] = fmt.format(now).split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return formatYMD(dt);
}

export function isValidYMD(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() + 1 === m &&
    dt.getUTCDate() === d
  );
}

export function isValidHHmm(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function isSameLocalDate(ymd: string): boolean {
  return ymd === localTodayYMD();
}

function getLocalHourRoundedUp(): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hh = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const mm = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  return hh + (mm >= 30 ? 1 : 0);
}

/** Horarios base de una hora entre 09:00–20:00; si es hoy, filtra pasados. */
export function getAvailableHours(ymd: string): string[] {
  const base = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
    '20:00',
  ];
  if (!isSameLocalDate(ymd)) return base;
  const h = getLocalHourRoundedUp();
  return base.filter((t) => Number(t.slice(0, 2)) >= h);
}

export function hoursMessage(ymd: string): string {
  const avail = getAvailableHours(ymd);
  if (!avail.length) {
    return `No quedan horas disponibles para *${ymd}*.
Escribe "mañana" o una fecha (YYYY-MM-DD).`;
  }
  return `📅 Fecha *${ymd}* seleccionada.
Horarios disponibles: ${avail.join(', ')}\n\nEscribe la *hora* (HH:mm, 24h).`;
}

/** Naive: compone start/end (60min) a partir de YYYY-MM-DD + HH:mm. */
// time.utils.ts
export function makeStartEndTZ(
  ymd: string,
  hhmm: string,
  tz: string,
): { start: Date; end: Date } {
  const [y, m, d] = ymd.split('-').map(Number);
  const [H, MIN] = hhmm.split(':').map(Number);

  // Paso 1: “suposición” en UTC del día/hora solicitados
  const guessUtcMs = Date.UTC(y, m - 1, d, H, MIN, 0);

  // Paso 2: ver qué hora “ve” ese instante en la zona tz
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(guessUtcMs)).map((p) => [p.type, p.value]),
  );
  const seenY = Number(parts.year);
  const seenM = Number(parts.month);
  const seenD = Number(parts.day);
  const seenH = Number(parts.hour);
  const seenMin = Number(parts.minute);

  // Paso 3: diferencia entre lo deseado (ymd+hhmm) y lo que “vio” la TZ
  const desiredMinutes = (((y * 12 + (m - 1)) * 31 + d) * 24 + H) * 60 + MIN;
  const seenMinutes =
    (((seenY * 12 + (seenM - 1)) * 31 + seenD) * 24 + seenH) * 60 + seenMin;
  const deltaMin = seenMinutes - desiredMinutes;

  // Paso 4: corrige la suposición para que en tz sea exactamente ymd+hhmm
  const start = new Date(guessUtcMs - deltaMin * 60 * 1000);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // 60 min

  return { start, end };
}
