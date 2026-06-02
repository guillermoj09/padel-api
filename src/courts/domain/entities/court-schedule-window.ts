export type PriceSlot = 'AM' | 'PM';

export class CourtScheduleWindow {
  constructor(
    public readonly id: number,
    public readonly courtType: string,
    public readonly label: string,
    public readonly emoji: string | null,
    public readonly openTime: string,
    public readonly closeTime: string,
    public readonly slotMinutes: number,
    public readonly priceSlot: PriceSlot,
    public readonly sortOrder: number,
    public readonly active: boolean,
  ) {}
}
