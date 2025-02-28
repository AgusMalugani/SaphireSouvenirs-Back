import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderdetailsService } from './../orderdetails/orderdetails.service';

@Injectable()
export class OrdersService {
constructor(@InjectRepository(Order)private readonly orderRepository : Repository<Order>,
private readonly orderDetailsService:OrderdetailsService
){}

  create(createOrderDto: CreateOrderDto) {
    return 'This action adds a new order';
  }

  async findAll() : Promise<Order[]> {
    const orders = await this.orderRepository.find({relations:{orderDetails:true}});
    if(!orders){
      throw new BadRequestException("No hay ordenes");
    }
    return orders;
  }

 async findOneById(id: string) {
  const order = await this.orderRepository.findOne({where:{id}})
  if(!order){
    throw new BadRequestException("No hay orden con esa id");
  }
  return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.findOneById(id);
    Object.assign(order,updateOrderDto);
    return this.orderRepository.save(order);
  }

  remove(id: number) {
    return `This action removes a #${id} order`;
  }
}
