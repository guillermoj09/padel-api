// src/events/domain/entities/booking.ts
export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export interface Booking {
  id: string;
  userId: string | null;
  courtId: number;
  paymentId: string | null;
  startTime: Date;
  endTime: Date;
  date: string; // "YYYY-MM-DD"
  status: BookingStatus;
  contactId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  canceledAt?: Date | null;
  cancelReason?: string | null;
  canceledBy?: number | string | null;
}
