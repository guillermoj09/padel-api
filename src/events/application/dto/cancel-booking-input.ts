// src/events/application/dto/cancel-booking-input.ts
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;

  // Acepta: admin:UUID | user:UUID | wa:+569xxxxxxx
  @IsString()
  @IsOptional()
  by!: string;

  @IsOptional()
  @IsBoolean()
  notifyCustomer?: boolean;
}
