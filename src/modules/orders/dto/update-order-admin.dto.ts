import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { StateEnum } from 'src/enums/states.enum';
import { TransactionTypeEnum } from 'src/enums/transactionType.enum';
import { CreateOrderdetailDto } from 'src/modules/orderdetails/dto/create-orderdetail.dto';

export class UpdateOrderAdminDto {
  @ApiPropertyOptional({
    description: 'Monto de seña en pesos. Deriva state (partialPayment/paid).',
    example: 5000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  depositAmount?: number;

  @ApiPropertyOptional({
    description: 'Solo admite cancelled para cancelar el pedido.',
    enum: [StateEnum.Cancelled],
    example: StateEnum.Cancelled,
  })
  @IsOptional()
  @IsIn([StateEnum.Cancelled])
  state?: StateEnum.Cancelled;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(500)
  cancelReason?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nameClient?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  personalizationName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  numCel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  num2Cel?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(250)
  theme?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endOrder?: string;

  @ApiPropertyOptional({ type: [CreateOrderdetailDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderdetailDto)
  products?: CreateOrderdetailDto[];
}
