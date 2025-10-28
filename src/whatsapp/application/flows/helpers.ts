export function shortSlotTitle(
  startIso: string,
  endIso: string,
  courtId: number | string,
) {
  const d1 = new Date(startIso),
    d2 = new Date(endIso);
  const dd = String(d1.getDate()).padStart(2, '0');
  const mm = String(d1.getMonth() + 1).padStart(2, '0');
  const h1 = String(d1.getHours()).padStart(2, '0');
  const m1 = String(d1.getMinutes()).padStart(2, '0');
  const h2 = String(d2.getHours()).padStart(2, '0');
  const m2 = String(d2.getMinutes()).padStart(2, '0');
  // Máx compacidad p/ botones: "DD-MM HH:mm-HH:mm Cx" (≈ 19–21 chars)
  return `${dd}-${mm} ${h1}:${m1}-${h2}:${m2} C${courtId}`;
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
      const d = new Date(b.startTime);
      const key =
        `${String(d.getDate()).padStart(2, '0')}` +
        `-${String(d.getMonth() + 1).padStart(2, '0')}` +
        `-${d.getFullYear()}`;
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
  const d1 = new Date(startIso),
    d2 = new Date(endIso);
  const dd = String(d1.getDate()).padStart(2, '0');
  const mm = String(d1.getMonth() + 1).padStart(2, '0');
  const yyyy = d1.getFullYear();
  const h1 = String(d1.getHours()).padStart(2, '0');
  const m1 = String(d1.getMinutes()).padStart(2, '0');
  const h2 = String(d2.getHours()).padStart(2, '0');
  const m2 = String(d2.getMinutes()).padStart(2, '0');
  return `${dd}-${mm}-${yyyy} • ${h1}:${m1}-${h2}:${m2} · Cancha ${courtId}`;
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
