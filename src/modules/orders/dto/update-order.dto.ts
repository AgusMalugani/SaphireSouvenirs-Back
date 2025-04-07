import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderDto } from './create-order.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { StateEnum } from 'src/enums/states.enum';

export class UpdateOrderDto extends PartialType(CreateOrderDto) {
    @IsOptional()
    @IsEnum(StateEnum)
    state?:StateEnum
}
