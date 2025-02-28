import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderdetailDto } from './dto/create-orderdetail.dto';
import { UpdateOrderdetailDto } from './dto/update-orderdetail.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Orderdetail } from './entities/orderdetail.entity';
import { Repository } from 'typeorm';

@Injectable()
export class OrderdetailsService {
constructor(@InjectRepository(Orderdetail) private readonly orderDetailRepository : Repository<Orderdetail> ){}

  create(createOrderdetailDto: CreateOrderdetailDto) {
    return 'This action adds a new orderdetail';
  }

  async findAll() {
    const  orderDetails = await this.orderDetailRepository.find()
    if(!orderDetails){
      throw new BadRequestException("No hay detalles de ordenes");
    }
    return orderDetails;
  }

 async findOneById(id: string) {
  const orderDetail= await this.orderDetailRepository.findOne({where:{id}})
  if(!orderDetail){
    throw new BadRequestException("No hay detalles de orden con esa id");
  }
  return orderDetail;
  }


  async update(id: string, updateOrderdetailDto: UpdateOrderdetailDto) {
    const orderDetail = await this.findOneById(id);
    Object.assign(orderDetail,updateOrderdetailDto);
    return this.orderDetailRepository.save(orderDetail);
  }

  remove(id: number) {
    return `This action removes a #${id} orderdetail`;
  }
}
