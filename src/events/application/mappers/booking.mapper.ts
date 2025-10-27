// src/events/application/mappers/booking.mapper.ts
import { Booking, BookingStatus } from '../../domain/entities/booking';
import { CreateBookingDto } from '../../interface/dto/create-booking.dto';

export class BookingMapper {
  /**
   * Convierte el DTO de entrada (camelCase) al shape EXACTO que
   * necesita el repositorio (Omit<Booking, 'id'>), aplicando:
   * - renombre de campos
   * - defaults requeridos
   * - coerciones de tipo
   */
  static toCreatable(dto: CreateBookingDto): Omit<Booking, 'id'> {
    // Si start/end vienen como string ISO:
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    // Status default seguro
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const status: BookingStatus = dto.status ?? BookingStatus.Pending;

    return {
      userId: dto.userId ?? null,
      courtId: dto.courtId,
      paymentId: dto.paymentId ?? null,
      // 👇 usa los nombres que tenga TU Booking (ajusta si es camelCase)
      startTime: start,
      endTime: end,
      date: dto.date,
      status,
      // createdAt/updatedAt si en tu tipo Booking son requeridos:
      // createdAt: new Date(),
      // updatedAt: new Date(),
    };
  }

  /**
   * (Opcional) Convierte entidad → respuesta pública
   * para ocultar campos internos y normalizar nombres.
   */
  static toResponse(b: Booking) {
    return {
      id: b.id,
      userId: b.userId,
      courtId: b.courtId,
      paymentId: b.paymentId,
      startTime:
        'start_time' in b ? (b as any).start_time : (b as any).startTime,
      endTime: 'end_time' in b ? (b as any).end_time : (b as any).endTime,
      date: b.date,
      status: b.status,
      // evita exponer flags internos si no quieres:
      // cancel: b.cancel,
      // isActive: b.isActive,
    };
  }
}
