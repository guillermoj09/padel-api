export type Step =
  | 'idle'
  | 'choose_cancha'
  | 'choose_date'
  | 'awaiting_other_date'
  | 'choose_time'
  | 'choose_court_for_time'
  | 'ask_name'
  | 'confirm_booking'
  | 'cancel_choose'
  | 'cancel_confirm';

export type Session = {
  step: Step;
  flowType?: 'padel' | 'futbol' | 'general';
  cancha?: number;
  date?: string;
  time?: string;
  contactId?: string;
  contactName?: string;
  contactPhone?: string;
  bookingIdToCancel?: string;
  cancelOptions?: string[];
  reservationName?: string;
  availableCourtIds?: number[];

  amPrice?: number;
  pmPrice?: number;
  currency?: string;
  cutoff?: string | null;
  pricePreview?: number | null;

  priceApplied?: number;
  currencyApplied?: string | null;
  pricingSource?: 'DAILY' | 'COURT_DEFAULT' | 'RATE_CARD' | null;
  slotApplied?: 'AM' | 'PM' | null;
  cutoffApplied?: string | null;
};
