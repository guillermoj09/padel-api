// time.utils.ts
export const TZ = 'America/Santiago';

function getLocalParts(date: Date, timeZone = TZ) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  }).formatToParts(date);

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return {
    year: String(map.year ?? '0000'),
    month: String(map.month ?? '01'),
    day: String(map.day ?? '01'),
    hour: String(map.hour ?? '00').padStart(2, '0'),
    minute: String(map.minute ?? '00').padStart(2, '0'),
  };
}

// -------------------- Helpers de fecha --------------------
export function formatYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Conversión DMY <-> YMD (para UI vs. interno)
export function ymdToDMY(ymd: string): string {
  const [y, m, d] = ymd.split('-');
  return `${d}-${m}-${y}`;
}

export function dmyToYMD(dmy: string): string {
  const [d, m, y] = dmy.split('-').map(String);
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

export function isValidDMY(s: string): boolean {
  if (!/^\d{2}-\d{2}-\d{4}$/.test(s)) return false;

  const [dd, mm, yyyy] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));

  return (
    dt.getUTCFullYear() === yyyy &&
    dt.getUTCMonth() + 1 === mm &&
    dt.getUTCDate() === dd
  );
}

export function isValidHHmm(s: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(s)) return false;
  const [hh, mm] = s.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

export function localTodayYMD(): string {
  const now = getLocalParts(new Date());
  return `${now.year}-${now.month}-${now.day}`;
}

export function localTomorrowYMD(): string {
  const now = new Date();
  const today = localTodayYMD();
  const [y, m, d] = today.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return formatYMD(dt);
}

export function isPastLocalYMD(ymd: string): boolean {
  return ymd < localTodayYMD();
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

function isSameLocalDate(ymd: string): boolean {
  return ymd === localTodayYMD();
}

// -------------------- Generación de slots --------------------
/** Genera slots HH:mm entre open-close cada slotMinutes (por defecto 60min). */
function generateBaseSlots(
  open = '09:00',
  close = '20:00',
  slotMinutes = 60,
): string[] {
  const [oh, om] = open.split(':').map(Number);
  const [ch, cm] = close.split(':').map(Number);

  let d = new Date(2000, 0, 1, oh, om, 0, 0);
  const end = new Date(2000, 0, 1, ch, cm, 0, 0);

  const fmt = (x: Date) =>
    String(x.getHours()).padStart(2, '0') +
    ':' +
    String(x.getMinutes()).padStart(2, '0');

  const out: string[] = [];

  while (d < end) {
    out.push(fmt(d));
    d = new Date(d.getTime() + slotMinutes * 60 * 1000);
  }

  return out;
}

/** Horarios base; si es hoy, filtra por instante real en la TZ local. */
export function getAvailableHours(
  ymd: string,
  opts?: { open?: string; close?: string; slotMinutes?: number },
): string[] {
  const open = opts?.open ?? '09:00';
  const close = opts?.close ?? '20:00';
  const slotMinutes = opts?.slotMinutes ?? 60;

  const base = generateBaseSlots(open, close, slotMinutes);

  if (!isSameLocalDate(ymd)) return base;

  const now = new Date();
  return base.filter((hhmm) => makeStartEndTZ(ymd, hhmm, TZ).start > now);
}

// -------------------- Mensajes --------------------
/** Mensaje de horarios (naive). Muestra la fecha en DMY al usuario. */
export function hoursMessage(ymd: string): string {
  const avail = getAvailableHours(ymd);
  const shown = ymdToDMY(ymd);

  if (!avail.length) {
    return `No quedan horas disponibles para *${shown}*.
Escribe "mañana" o una fecha (DD-MM-AAAA).`;
  }

  return `📅 Fecha *${shown}* seleccionada.
Horarios disponibles: ${avail.join(', ')}\n\nEscribe la *hora* (HH:mm, 24h).`;
}

// -------------------- Construcción de instantes con TZ --------------------
/** compone start/end a partir de YYYY-MM-DD + HH:mm, corrigiendo TZ/DST. */
export function makeStartEndTZ(
  ymd: string,
  hhmm: string,
  tz: string,
  durationMinutes = 60,
): { start: Date; end: Date } {
  const [y, m, d] = ymd.split('-').map(Number);
  const [H, MIN] = hhmm.split(':').map(Number);

  const guessUtcMs = Date.UTC(y, m - 1, d, H, MIN, 0);

  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
  });

  const parts = Object.fromEntries(
    fmt.formatToParts(new Date(guessUtcMs)).map((p) => [p.type, p.value]),
  );

  const seenY = Number(parts.year);
  const seenM = Number(parts.month);
  const seenD = Number(parts.day);
  const seenH = Number(parts.hour);
  const seenMin = Number(parts.minute);

  const desiredMinutes = (((y * 12 + (m - 1)) * 31 + d) * 24 + H) * 60 + MIN;
  const seenMinutes =
    (((seenY * 12 + (seenM - 1)) * 31 + seenD) * 24 + seenH) * 60 + seenMin;

  const deltaMin = seenMinutes - desiredMinutes;

  const start = new Date(guessUtcMs - deltaMin * 60 * 1000);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  return { start, end };
}

// -------------------- Disponibilidad real con BD --------------------
export async function getAvailableHoursForCourt(
  ymd: string,
  courtId: string | number,
  fetchExisting: (
    courtId: string | number,
    dayStartUtc: Date,
    dayEndUtc: Date,
  ) => Promise<Array<{ startTime: string | Date; endTime: string | Date }>>,
  opts?: { open?: string; close?: string; slotMinutes?: number },
): Promise<string[]> {
  const open = opts?.open ?? '09:00';
  const close = opts?.close ?? '20:00';
  const slotMinutes = opts?.slotMinutes ?? 60;

  const base = getAvailableHours(ymd, { open, close, slotMinutes });

  const dayStart = makeStartEndTZ(ymd, '00:00', TZ).start;
  const dayEnd = new Date(makeStartEndTZ(ymd, '23:59', TZ).start.getTime() + 60 * 1000);
  const existing = await fetchExisting(courtId, dayStart, dayEnd);

  return base.filter((hhmm) => {
    const { start } = makeStartEndTZ(ymd, hhmm, TZ);
    const end = new Date(start.getTime() + slotMinutes * 60 * 1000);

    return !existing.some((b) => {
      const bs = new Date(b.startTime);
      const be = new Date(b.endTime);
      return start < be && end > bs;
    });
  });
}
