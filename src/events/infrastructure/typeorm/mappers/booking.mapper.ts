import { Injectable } from '@nestjs/common';
import type { Booking } from '../../../domain/entities/booking';
import { BookingSchema } from '../entities/booking.schema';

/**
 * Utilidades de normalización
 */
function pick<T = any>(
  v1: T | undefined,
  v2: T | undefined,
  v3?: T,
): T | undefined {
  if (v1 !== undefined && v1 !== null) return v1;
  if (v2 !== undefined && v2 !== null) return v2;
  return v3;
}
function toIsoIfDate(v: any): any {
  return v instanceof Date ? v.toISOString() : (v ?? null);
}
function toDateIfString(v: any): any {
  // Si tu dominio usa Date en lugar de string, usa esta; si usa string ISO, usa toIsoIfDate
  if (v == null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(+d) ? v : d;
}
function toYmdIfDateOrString(v: any): string | undefined {
  if (v == null) return undefined;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // asume string 'YYYY-MM-DD' o ISO → corta YYYY-MM-DD
  const s = String(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  return isNaN(+d) ? s : d.toISOString().slice(0, 10);
}

@Injectable()
export class BookingMapper {
  // --- Helpers para armar un título legible ---
  private courtName(schema: BookingSchema): string {
    const id = pick<any>((schema as any).courtId, (schema as any).court?.id);
    const name = (schema as any).court?.name;
    return name ?? (id != null ? `Court ${id}` : 'Court');
  }

  private hhmm(v: any): string {
    const d = v instanceof Date ? v : new Date(v);
    // 24h HH:MM sin segundos
    return isNaN(+d) ? '' : d.toISOString().substring(11, 16);
  }

  private buildTitleFallback(schema: BookingSchema): string {
    const startRaw = pick<any>((schema as any).startTime, (schema as any).start_time);
    const endRaw   = pick<any>((schema as any).endTime,   (schema as any).end_time);
    const from = this.hhmm(startRaw);
    const to   = this.hhmm(endRaw);
    return `${this.courtName(schema)} · ${from}${to ? `-${to}` : ''}`;
  }
  // ------------------------------------------------

  /**
   * Mapea de TypeORM Schema → Dominio
   * - Tolera camelCase y snake_case en el schema.
   * - Extrae IDs desde relaciones si no están denormalizados.
   * - Normaliza fechas a lo que espera tu dominio (ajusta a Date o string ISO según tu caso).
   */
  toDomain(schema: BookingSchema): Booking {
    // IDs (prefiere columnas denormalizadas, si no, toma de relations)
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

    // Tiempos: tolera camel y snake
    const startTimeRaw = pick<any>(
      (schema as any).startTime,
      (schema as any).start_time,
    );
    const endTimeRaw = pick<any>(
      (schema as any).endTime,
      (schema as any).end_time,
    );

    // created/updated/cancel: tolera camel y snake
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

    // Fecha (dominio suele usar 'YYYY-MM-DD')
    const dateRaw = (schema as any).date;

    // STATUS: si ya es enum en schema, lo casteamos; si fuera string, igual sirve
    const status = (schema as any).status as Booking['status'];

    // ⚠️ Ajusta estas dos líneas según tu dominio:
    // - Si dominio espera string ISO → usa toIsoIfDate
    // - Si dominio espera Date → usa toDateIfString
    const startTime = toIsoIfDate(startTimeRaw); // o toDateIfString(startTimeRaw)
    const endTime   = toIsoIfDate(endTimeRaw);   // o toDateIfString(endTimeRaw)

    // Title: usa columna si existe; si no, fallback legible
    const title: string =
      (schema as any).title ??
      (schema as any).Title ?? // por si hubo un mapeo diferente
      this.buildTitleFallback(schema);

    return {
      id: (schema as any).id,
      userId: userId ?? null,
      courtId: courtId as any, // tu dominio lo tiene number; si es string, cambia aquí
      paymentId: paymentId ?? null,

      startTime,
      endTime,
      status,
      date: (toYmdIfDateOrString(dateRaw) ??
        (typeof dateRaw === 'string' && dateRaw) ??
        new Date().toISOString().slice(0, 10)) as string,
      contactId,
      createdAt: toIsoIfDate(createdAtRaw),
      updatedAt: toIsoIfDate(updatedAtRaw),
      canceledAt: toIsoIfDate(canceledAtRaw) ?? undefined,
      cancelReason: cancelReason ?? undefined,
      canceledBy: canceledBy ?? undefined,

      // requerido en el dominio
      title,
    };
  }

  toDomains(schemas: BookingSchema[]): Booking[] {
    return schemas.map((s) => this.toDomain(s));
  }

  /**
   * Dominio → TypeORM Schema (para create/update)
   * - Preferimos camelCase (startTime/endTime) que es lo que tienes en tu BookingSchema.
   * - Si tu DB/columns siguen en snake_case, seteamos snake_case por compatibilidad.
   */
  toSchema(domain: Booking): Partial<BookingSchema> {
    const rel = (id: any) => (id ? ({ id } as any) : null);

    // ⚠️ Si tu BookingSchema define start_time/end_time como Date, convierte aquí si es necesario.
    // const start = domain.startTime instanceof Date ? domain.startTime : new Date(domain.startTime);
    // const end   = domain.endTime   instanceof Date ? domain.endTime   : new Date(domain.endTime);

    const partial: Partial<BookingSchema> = {
      // relaciones (por id)
      user: rel(domain.userId as any),
      contact: rel(domain.contactId as any),
      court: rel(domain.courtId as any),
      payment: rel(domain.paymentId as any),

      // columnas principales
      start_time: (domain as any).startTime,
      end_time: (domain as any).endTime,
      status: domain.status as any,
      date: domain.date as any,

      // persistimos title si tu entidad tiene la columna; si no, TypeORM la ignorará
      title: (domain as any).title ?? undefined,
    };

    // Si además mantienes camelCase en la entidad TypeORM, puedes duplicar así:
    // (partial as any).startTime = (domain as any).startTime;
    // (partial as any).endTime   = (domain as any).endTime;

    return partial;
  }
}
