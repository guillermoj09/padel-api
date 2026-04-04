// src/events/interface/dto/create-booking.dto.ts
import {
  IsISO8601,
  IsOptional,
  IsEnum,
  IsString,
  IsNumber,
} from 'class-validator';
import { BookingStatus, PaymentMethod } from '../../domain/entities/booking';

export class CreateBookingDto {
  @IsOptional()
  @IsString()
  userId?: string | null;

  @IsNumber()
  courtId!: number;

  @IsOptional()
  @IsString()
  paymentId?: string | null;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @IsString()
  title: string | null;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsISO8601()
  date!: string;

  @IsOptional()
  @IsString()
  contactId?: string | null;
}
