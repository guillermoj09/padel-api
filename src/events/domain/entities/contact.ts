export interface Contact {
  id: string;
  waPhone: string; // E.164 (ej: +56940145791)
  displayName?: string | null;
  tz: string; // IANA TZ, ej: 'America/Santiago'
  userId?: string | null; // vínculo opcional a User cuando exista
}
