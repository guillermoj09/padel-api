export type Step =
  | 'idle'
  | 'choose_cancha'
  | 'choose_date'
  | 'awaiting_other_date'
  | 'choose_time';

export type Session = {
  step: Step;
  cancha?: number;
  date?: string; // YYYY-MM-DD
  time?: string; // HH:mm
  contactId?: string; // id del Contact asociado al número
};
