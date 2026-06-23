import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { StateEnum } from 'src/enums/states.enum';
import { TransactionTypeEnum } from 'src/enums/transactionType.enum';

export class UpdateOrderPartialDto {
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
  @MinLength(3)
  @MaxLength(100)
  address?: string;
}
