// src/events/application/use-cases/create-booking.use-case.ts
import { Inject, Injectable } from '@nestjs/common';
import { Booking, BookingStatus } from 'src/events/domain/entities/booking';
import { BookingRepository } from '../../domain/repositories/booking.repository';
import { CreateBookingDto } from '../dto/create-booking.dto';

@Injectable()
export class CreateBookingUseCase {
  constructor(
    @Inject('BookingRepository') private readonly repo: BookingRepository,
  ) {}

  async execute(dto: CreateBookingDto): Promise<Booking> {
    const toCreate: Omit<Booking, 'id'> = {
      userId: dto.userId ?? null,
      courtId: dto.courtId,
      paymentId: dto.paymentId ?? null,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      date: dto.date,
      status: dto.status ?? BookingStatus.Pending,
      contactId: dto.contactId ?? undefined,
      // createdAt/updatedAt si no los agrega la DB:
      // createdAt: new Date(), updatedAt: new Date(),
    };
    return this.repo.create(toCreate);
  }
}
