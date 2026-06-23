import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
} from 'class-validator';
import { StateEnum } from 'src/enums/states.enum';
import { TransactionTypeEnum } from 'src/enums/transactionType.enum';

function coercePositiveInteger(
  value: unknown,
  fallback: number,
): number {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return fallback;
  }
  return Math.floor(parsedValue);
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ enum: StateEnum })
  @IsOptional()
  @IsEnum(StateEnum)
  state?: StateEnum;

  @ApiPropertyOptional({ enum: TransactionTypeEnum })
  @IsOptional()
  @IsEnum(TransactionTypeEnum)
  transactionType?: TransactionTypeEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => coercePositiveInteger(value, 1))
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => {
    const coercedLimit = coercePositiveInteger(value, 20);
    return Math.min(100, coercedLimit);
  })
  limit: number = 20;

  @ApiPropertyOptional({ default: 'createAt' })
  @IsOptional()
  @IsIn(['createAt'])
  sort: string = 'createAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  order: 'asc' | 'desc' = 'desc';
}
