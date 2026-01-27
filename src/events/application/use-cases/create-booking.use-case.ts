// src/events/application/use-cases/create-booking.use-case.ts
import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { Booking, BookingStatus } from 'src/events/domain/entities/booking';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { CreateBookingDto } from '../dto/create-booking.dto';


@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject('BookingRepository') private readonly repo: BookingRepository,
  ) {}

  async execute(dto: CreateBookingDto): Promise<Booking> {
    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    // (Opcional) sanity check
    if (!(start instanceof Date) || isNaN(start.getTime())) {
      throw new ConflictException('startTime inválido');
    }
    if (!(end instanceof Date) || isNaN(end.getTime()) || end <= start) {
      throw new ConflictException('endTime inválido (debe ser mayor a startTime)');
    }

    // ✅ VALIDACIÓN: misma cancha + solapamiento + activa
    const conflict = await this.repo.existsActiveOverlap(dto.courtId, start, end);
    if (conflict) {
      console.log("entro a conflict");
      throw new ConflictException(
        'Ya existe una reserva activa en ese día/horario para esa cancha.',
      );
    }

    const toCreate: Omit<Booking, 'id'> = {
      userId: dto.userId ?? null,
      courtId: dto.courtId,
      paymentId: dto.paymentId ?? null,
      startTime: start,
      endTime: end,
      date: dto.date,
      status: dto.status ?? BookingStatus.Confirmed,
      contactId: dto.contactId ?? undefined,
      title: dto.title ?? null,
    };

    return this.repo.create(toCreate);
  }
}