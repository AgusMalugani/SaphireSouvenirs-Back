import { Injectable } from '@nestjs/common';
import { CreateOrderdetailDto } from './dto/create-orderdetail.dto';
import { UpdateOrderdetailDto } from './dto/update-orderdetail.dto';

@Injectable()
export class OrderdetailsService {
  create(createOrderdetailDto: CreateOrderdetailDto) {
    return 'This action adds a new orderdetail';
  }

  findAll() {
    return `This action returns all orderdetails`;
  }

  findOne(id: number) {
    return `This action returns a #${id} orderdetail`;
  }

  update(id: number, updateOrderdetailDto: UpdateOrderdetailDto) {
    return `This action updates a #${id} orderdetail`;
  }

  remove(id: number) {
    return `This action removes a #${id} orderdetail`;
  }
}
