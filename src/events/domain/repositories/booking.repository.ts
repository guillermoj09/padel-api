import {
  Booking,
  BookingFilterStatus,
  BookingStatus,
  PaymentMethod,
} from '../entities/booking';

export interface BookingRepository {
  findById(id: number | string): Promise<Booking | null>;
  findAll(): Promise<Booking[]>;
  create(booking: Omit<Booking, 'id'>): Promise<Booking>;

  findByCourtAndDateRange(
    courtId: string,
    start: Date,
    end: Date,
  ): Promise<Booking[]>;

  cancel(
    id: string,
    info: {
      reason?: string | null;
      by?: string | number | null;
    },
  ): Promise<Booking>;

  updatePaymentMethod(
    id: string,
    paymentMethod: PaymentMethod,
  ): Promise<Booking>;

  confirmPayment(
    id: string,
    input: {
      paymentMethod: PaymentMethod;
      confirmedBy: string;
    },
  ): Promise<Booking>;

  findWaPhoneByBookingId(id: string | number): Promise<string | null>;

  findByCourtAndDateRangeAndFilter(
    courtId: string,
    from: Date,
    to: Date,
    filter?: BookingFilterStatus,
  ): Promise<Booking[]>;

  existsActiveOverlap(
    courtId: number,
    start: Date,
    end: Date,
  ): Promise<boolean>;
}

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');
