// src/events/application/dto/create-booking.dto.ts
import {
  IsISO8601,
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
} from 'class-validator';
import { BookingStatus } from '../../domain/entities/booking';

export class CreateBookingDto {
  @IsOptional() @IsString() userId?: string | null;
  @IsNumber() courtId!: number;
  @IsOptional() @IsString() paymentId?: string | null;

  @IsISO8601() startTime!: string; // ← string ISO
  @IsISO8601() endTime!: string; // ← string ISO

  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @IsISO8601() date!: string; // si usas yyyy-mm-dd, puedes dejar IsString()
  @IsOptional() @IsString() contactId?: string | null;
}
