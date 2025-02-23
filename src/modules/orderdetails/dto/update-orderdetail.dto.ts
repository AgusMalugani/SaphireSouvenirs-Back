import { PartialType } from '@nestjs/mapped-types';
import { CreateOrderdetailDto } from './create-orderdetail.dto';

export class UpdateOrderdetailDto extends PartialType(CreateOrderdetailDto) {}
