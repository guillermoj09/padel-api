import { Injectable } from '@nestjs/common';
import {
  PaymentMethod,
  PaymentStatus,
  type Booking,
} from '../../../domain/entities/booking';
import { BookingSchema } from '../entities/booking.schema';

function pick<T = any>(
  v1: T | undefined,
  v2: T | undefined,
  v3?: T,
): T | undefined {
  if (v1 !== undefined && v1 !== null) return v1;
  if (v2 !== undefined && v2 !== null) return v2;
  return v3;
}

function toDateIfString(v: any): any {
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(+d) ? v : d;
}

function toYmdIfDateOrString(v: any): string | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);

  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  const d = new Date(s);
  return isNaN(+d) ? s : d.toISOString().slice(0, 10);
}

@Injectable()
export class BookingMapper {
  private courtName(schema: BookingSchema): string {
    const id = pick<any>((schema as any).courtId, (schema as any).court?.id);
    const name = (schema as any).court?.name;
    return name ?? (id != null ? `Court ${id}` : 'Court');
  }

  private hhmm(v: any): string {
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(+d) ? '' : d.toISOString().substring(11, 16);
  }

  private buildTitleFallback(schema: BookingSchema): string {
    const startRaw = pick<any>(
      (schema as any).startTime,
      (schema as any).start_time,
    );
    const endRaw = pick<any>((schema as any).endTime, (schema as any).end_time);
    const from = this.hhmm(startRaw);
    const to = this.hhmm(endRaw);
    return `${this.courtName(schema)} · ${from}${to ? `-${to}` : ''}`;
  }

  toDomain(schema: BookingSchema): Booking {
    const userId =
      pick<string>((schema as any).userId, (schema as any).user?.id) ??
      undefined;

    const courtIdRaw = pick<string | number>(
      (schema as any).courtId,
      (schema as any).court?.id,
    );
    const courtId =
      courtIdRaw != null ? Number(courtIdRaw) : (undefined as any);

    const contactId =
      pick<string>((schema as any).contactId, (schema as any).contact?.id) ??
      undefined;

    const paymentId =
      pick<string>((schema as any).paymentId, (schema as any).payment?.id) ??
      undefined;

    const paymentMethod =
      pick<PaymentMethod>(
        (schema as any).paymentMethod,
        (schema as any).payment_method,
      ) ?? PaymentMethod.Pendiente;

    const paymentStatus =
      pick<PaymentStatus>(
        (schema as any).paymentStatus,
        (schema as any).payment_status,
      ) ?? PaymentStatus.Pending;

    const paidAtRaw = pick<any>((schema as any).paidAt, (schema as any).paid_at);

    const paymentConfirmedBy = pick<string>(
      (schema as any).paymentConfirmedBy,
      (schema as any).payment_confirmed_by,
    );

    const startTimeRaw = pick<any>(
      (schema as any).startTime,
      (schema as any).start_time,
    );
    const endTimeRaw = pick<any>(
      (schema as any).endTime,
      (schema as any).end_time,
    );

    const createdAtRaw = pick<any>(
      (schema as any).createdAt,
      (schema as any).created_at,
    );
    const updatedAtRaw = pick<any>(
      (schema as any).updatedAt,
      (schema as any).updated_at,
    );
    const canceledAtRaw = pick<any>(
      (schema as any).canceledAt,
      (schema as any).canceled_at,
    );
    const cancelReason = pick<string>(
      (schema as any).cancelReason,
      (schema as any).cancel_reason,
    );
    const canceledBy = pick<string | number>(
      (schema as any).canceledBy,
      (schema as any).canceled_by,
    );

    const dateRaw = (schema as any).date;
    const status = (schema as any).status as Booking['status'];
    const startTime = toDateIfString(startTimeRaw);
    const endTime = toDateIfString(endTimeRaw);

    const title: string =
      (schema as any).title ??
      (schema as any).Title ??
      this.buildTitleFallback(schema);

    const phoneNumber =
      (schema as any).contact?.waPhone ??
      (schema as any).contact?.wa_phone ??
      null;

    const priceApplied = pick<number>(
      (schema as any).priceApplied,
      (schema as any).price_applied,
    );

    const currencyApplied = pick<string>(
      (schema as any).currencyApplied,
      (schema as any).currency_applied,
    );

    const slotApplied = pick<'AM' | 'PM'>(
      (schema as any).slotApplied,
      (schema as any).slot_applied,
    );

    const pricingSource = pick<'DAILY' | 'RATE_CARD'>(
      (schema as any).pricingSource,
      (schema as any).pricing_source,
    );

    const cutoffApplied = pick<string>(
      (schema as any).cutoffApplied,
      (schema as any).cutoff_applied,
    );

    return {
      id: (schema as any).id,
      userId: userId ?? null,
      courtId: courtId as any,
      paymentId: paymentId ?? null,
      paymentMethod,
      paymentStatus,
      paidAt: toDateIfString(paidAtRaw) ?? null,
      paymentConfirmedBy: paymentConfirmedBy ?? null,
      startTime,
      endTime,
      status,
      date: (toYmdIfDateOrString(dateRaw) ??
        (typeof dateRaw === 'string' && dateRaw) ??
        new Date().toISOString().slice(0, 10)) as string,
      phoneNumber,
      contactId,
      createdAt: toDateIfString(createdAtRaw) ?? undefined,
      updatedAt: toDateIfString(updatedAtRaw) ?? undefined,
      canceledAt: toDateIfString(canceledAtRaw) ?? undefined,
      cancelReason: cancelReason ?? undefined,
      canceledBy: canceledBy ?? undefined,
      title,
      priceApplied: priceApplied ?? null,
      currencyApplied: currencyApplied ?? null,
      slotApplied: slotApplied ?? null,
      pricingSource: pricingSource ?? null,
      cutoffApplied: cutoffApplied ?? null,
    };
  }

  toDomains(schemas: BookingSchema[]): Booking[] {
    return schemas.map((s) => this.toDomain(s));
  }

  toSchema(domain: Booking): Partial<BookingSchema> {
    const rel = (id: any) => (id ? ({ id } as any) : null);

    const partial: Partial<BookingSchema> = {
      paymentMethod: (domain as any).paymentMethod ?? PaymentMethod.Pendiente,
      paymentStatus: (domain as any).paymentStatus ?? PaymentStatus.Pending,
      paidAt: (domain as any).paidAt ?? null,
      paymentConfirmedBy: (domain as any).paymentConfirmedBy ?? null,
      user: rel(domain.userId as any),
      contact: rel(domain.contactId as any),
      court: rel(domain.courtId as any),
      payment: rel(domain.paymentId as any),
      start_time: (domain as any).startTime,
      end_time: (domain as any).endTime,
      status: domain.status as any,
      date: domain.date as any,
      title: (domain as any).title ?? undefined,
      priceApplied: (domain as any).priceApplied ?? null,
      currencyApplied: (domain as any).currencyApplied ?? null,
      slotApplied: (domain as any).slotApplied ?? null,
      pricingSource: (domain as any).pricingSource ?? null,
      cutoffApplied: (domain as any).cutoffApplied ?? null,
    };

    return partial;
  }
}
