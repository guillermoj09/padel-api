export type ReservationFlowConfig = {
  flowKey: 'padel' | 'futbol' | 'general';
  sportLabel: string;
  sportIcon: string;
  courtType: string;
};

export const PADEL_RESERVATION_CONFIG: ReservationFlowConfig = {
  flowKey: 'padel',
  sportLabel: 'pádel',
  sportIcon: '🎾',
  courtType: 'padel',
};

export const FOOTBALL_RESERVATION_CONFIG: ReservationFlowConfig = {
  flowKey: 'futbol',
  sportLabel: 'fútbol',
  sportIcon: '⚽',
  courtType: 'futbol',
};
