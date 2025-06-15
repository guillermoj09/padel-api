import { IsString, IsDateString, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsDateString()
  start: string;

  @IsDateString()
  end: string;

  @IsNumber()
  courtId: number;
}
