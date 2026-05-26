import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import {
  CourtBlockStatus,
  CourtBlockType,
} from '../../domain/entities/court-block';

export class CreateCourtBlockDto {
  @IsNumber()
  courtId!: number;

  @IsISO8601()
  startTime!: string;

  @IsISO8601()
  endTime!: string;

  @IsOptional()
  @IsISO8601()
  date?: string;

  @IsEnum(CourtBlockType)
  type!: CourtBlockType;

  @IsOptional()
  @IsEnum(CourtBlockStatus)
  status?: CourtBlockStatus;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
