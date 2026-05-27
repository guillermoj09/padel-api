import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelCourtBlockDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string | null;
}
