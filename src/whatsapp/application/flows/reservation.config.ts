export type ReservationWindow = {
  label: string;
  emoji: string;
  open: string;
  close: string;
  slotMinutes: number;
};

export type ReservationFlowConfig = {
  flowKey: 'padel' | 'futbol' | 'general';
  sportLabel: string;
  sportIcon: string;
  courtType?: string;
  windows: ReservationWindow[];
};

export const PADEL_RESERVATION_CONFIG: ReservationFlowConfig = {
  flowKey: 'padel',
  sportLabel: 'pádel',
  sportIcon: '🎾',
  courtType: 'padel',
  windows: [
    { label: 'Turno AM', emoji: '🌞', open: '07:00', close: '13:00', slotMinutes: 90 },
    { label: 'Turno PM', emoji: '🌙', open: '17:00', close: '23:00', slotMinutes: 90 },
  ],
};

export const FOOTBALL_RESERVATION_CONFIG: ReservationFlowConfig = {
  flowKey: 'futbol',
  sportLabel: 'fútbol',
  sportIcon: '⚽',
  courtType: 'futbol',
  windows: [
    {
      label: 'Jornada completa',
      emoji: '🕘',
      open: '07:00',
      close: '23:59',
      slotMinutes: 60,
    },
  ],
};
