// src/events/domain/entities/booking.ts
export enum BookingStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
}

export enum BookingFilterStatus {
  Pending = 'pending',
  Confirmed = 'confirmed',
  Cancelled = 'cancelled',
  Paid = 'paid',
}

export enum PaymentMethod {
  Pendiente = 'pendiente',
  Transferencia = 'transferencia',
  Efectivo = 'efectivo',
  Tarjeta = 'tarjeta',
}

export enum PaymentStatus {
  Pending = 'pending',
  Paid = 'paid',
}

export interface Booking {
  id: string;
  title: string | null;
  userId: string | null;
  courtId: number;
  paymentId: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAt?: Date | null;
  paymentConfirmedBy?: string | null;
  startTime: Date;
  endTime: Date;
  date: string; // "YYYY-MM-DD"
  status: BookingStatus;
  phoneNumber?: string;
  contactId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  canceledAt?: Date | null;
  cancelReason?: string | null;
  canceledBy?: number | string | null;
  priceApplied?: number | null;
  currencyApplied?: string | null;
  slotApplied?: 'AM' | 'PM' | null;
  pricingSource?: 'DAILY' | 'RATE_CARD' | null;
  cutoffApplied?: string | null;
}
