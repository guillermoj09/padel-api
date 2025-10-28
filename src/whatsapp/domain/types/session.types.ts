// src/whatsapp/domain/types/session.types.ts
export type Step =
  | 'idle'
  | 'choose_cancha'
  | 'choose_date'
  | 'awaiting_other_date'
  | 'choose_time'
  | 'cancel_choose'
  | 'cancel_confirm';

export type Session = {
  step: Step;
  cancha?: number;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  bookingIdToCancel?: string;
  cancelOptions?: string[]; // ids para fallback 1/2/3
};
