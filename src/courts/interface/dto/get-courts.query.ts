// src/courts/interface/dto/get-courts.query.ts
import { IsOptional, IsInt, Min, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetCourtsQuery {
  @IsOptional() q?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  active?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 10;
}
