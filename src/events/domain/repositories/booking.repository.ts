import { Booking } from '../entities/booking';

export interface BookingRepository {
  findAll(): Promise<Booking[]>;
  create(booking: Omit<Booking, 'id'>): Promise<Booking>;
  findByCourtAndDateRange(
    courtId: string,
    start: Date,
    end: Date,
  ): Promise<Booking[]>;
}
