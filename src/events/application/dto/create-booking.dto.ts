// src/events/application/dto/create-booking.dto.ts
import { Type } from 'class-transformer';
import {
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { BookingStatus } from '../../domain/entities/booking';

export class CreateBookingDto {
  @IsOptional() @IsString() userId?: string | null;
  @IsNumber() courtId!: number;
  @IsOptional() @IsString() paymentId?: string | null;

  @Type(() => Date) @IsDate() startTime!: Date; // ← Date
  @Type(() => Date) @IsDate() endTime!: Date; // ← Date

  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsString() date!: string;
  @IsOptional() @IsString() contactId?: string | null;
}
