import { Booking, BookingStatus } from '../entities/booking';

export interface BookingRepository {
  findById(id: number | string): Promise<Booking | null>;
  findAll(): Promise<Booking[]>;
  create(booking: Omit<Booking, 'id'>): Promise<Booking>;
  findByCourtAndDateRange(
    courtId: string,
    start: Date,
    end: Date,
  ): Promise<Booking[]>;
  //deleteById(id: number | string): Promise<void>;
  cancel(
    id: string,
    info: {
      reason?: string | null;
      by?: string | number | null;
    },
  ): Promise<Booking>;

  findWaPhoneByBookingId(id: string | number): Promise<string | null>;
  findByCourtAndDateRangeAndStatus(
    courtId: string,
    from: Date,
    to: Date,
    status?: BookingStatus,
  );
}

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
