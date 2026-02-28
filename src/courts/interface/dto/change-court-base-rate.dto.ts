import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ChangeCourtBaseRateDto {
  @IsInt()
  @Min(0)
  amPrice!: number;

  @IsInt()
  @Min(0)
  pmPrice!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  priceCutoff?: string | null;
}