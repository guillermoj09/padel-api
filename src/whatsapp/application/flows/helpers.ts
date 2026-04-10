const TZ = 'America/Santiago';

function getTzParts(date: Date, timeZone = TZ) {
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
    month: String(map.month ?? '01').padStart(2, '0'),
    day: String(map.day ?? '01').padStart(2, '0'),
    hour: String(map.hour ?? '00').padStart(2, '0'),
    minute: String(map.minute ?? '00').padStart(2, '0'),
  };
}

function formatIsoInTz(iso: string, timeZone = TZ) {
  return getTzParts(new Date(iso), timeZone);
}

export function shortSlotTitle(
  startIso: string,
  endIso: string,
  courtId: number | string,
) {
  const d1 = formatIsoInTz(startIso);
  const d2 = formatIsoInTz(endIso);

  // Máx compacidad p/ botones: "DD-MM HH:mm-HH:mm Cx"
  return `${d1.day}-${d1.month} ${d1.hour}:${d1.minute}-${d2.hour}:${d2.minute} C${courtId}`;
}

export function ensureMax(s: string, max = 20) {
  return s.length <= max ? s : s.slice(0, max);
}

export function normalizeE164(raw: string) {
  const clean = String(raw)
    .replace(/^whatsapp:/i, '')
    .trim();
  const digits = clean.replace(/[^0-9+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

// --- Agrupa reservas por fecha DD-MM-YYYY (para List Message) ---
export function groupByDate(
  items: {
    startTime: string;
    endTime: string;
    courtId: number | string;
    id: string;
  }[],
) {
  return items.reduce(
    (acc, b) => {
      const d = formatIsoInTz(b.startTime);
      const key = `${d.day}-${d.month}-${d.year}`;
      (acc[key] ||= []).push(b);
      return acc;
    },
    {} as Record<string, typeof items>,
  );
}

export function fmtSlot(
  startIso: string,
  endIso: string,
  courtId: number | string,
) {
  const d1 = formatIsoInTz(startIso);
  const d2 = formatIsoInTz(endIso);

  return `${d1.day}-${d1.month}-${d1.year} • ${d1.hour}:${d1.minute}-${d2.hour}:${d2.minute} · Cancha ${courtId}`;
}

export function dmyToYmd(dmy: string): string {
  const [dd, mm, yyyy] = dmy.split('-').map(Number);
  const d = String(dd).padStart(2, '0');
  const m = String(mm).padStart(2, '0');
  return `${yyyy}-${m}-${d}`; // YYYY-MM-DD
}

export function ymdToDmy(ymd: string): string {
  const [yyyy, mm, dd] = ymd.split('-');
  return `${dd}-${mm}-${yyyy}`; // DD-MM-YYYY
}

export const reDateDMY = /^\d{2}-\d{2}-\d{4}$/;