// src/events/application/dto/create-booking.dto.ts
import { IsNotEmpty, IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string; // ID del usuario que hace la reserva

  @IsUUID()
  @IsNotEmpty()
  courtId: string; // ID de la cancha que se reserva

  @IsDateString()
  @IsNotEmpty()
  startTime: string; // Hora de inicio de la reserva

  @IsDateString()
  @IsNotEmpty()
  endTime: string; // Hora de finalización de la reserva

  @IsNotEmpty()
  status: string; // Estado de la reserva (pendiente, confirmada, cancelada)

  @IsDateString()
  @IsNotEmpty()
  date: string; // Fecha de la reserva
}
