import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, Max, IsBooleanString } from 'class-validator';

export class GetCourtsQuery {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsBooleanString()
  active?: string; // 'true' | 'false'

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number; // la app capará a 10
}