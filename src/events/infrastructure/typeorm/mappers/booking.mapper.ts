import { Injectable } from '@nestjs/common';
import { Booking } from '../../../domain/entities/booking';
import { BookingSchema } from '../entities/booking.schema';

@Injectable()
export class BookingMapper {
  toDomain(schema: BookingSchema): Booking {
    return new Booking(
      schema.id,
      schema.userId,
      schema.courtId,
      schema.paymentId,
      schema.start_time,
      schema.end_time,
      schema.status,
      schema.date,
    );
  }

  toDomains(schemas: BookingSchema[]): Booking[] {
    return schemas.map((schema) => this.toDomain(schema));
  }
  /*
  toPersistence(domain: Omit<Booking, 'id'>): Partial<BookingSchema> {
    return {
      user: Object.assign(new User(), { id: domain.userId }),
      court: Object.assign(new Court(), { id: domain.courtId }),
      payment: domain.paymentId
        ? Object.assign(new Payment(), { id: domain.paymentId })
        : null,
      start_time: domain.startTime,
      end_time: domain.endTime,
      date: domain.date,
      status: domain.status,
    };
  }*/
}
