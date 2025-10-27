// src/events/application/dto/cancel-booking-input.ts
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class CancelBookingDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;

  // Acepta: admin:UUID | user:UUID | wa:+569xxxxxxx
  @IsString()
  @Matches(/^(admin|user):[a-zA-Z0-9-]+$|^wa:\+\d{6,15}$/)
  by!: string;
}
