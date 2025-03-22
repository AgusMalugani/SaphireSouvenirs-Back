import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderdetailsService } from './../orderdetails/orderdetails.service';
import * as dayjs from "dayjs";
import { NodemailerService } from '../nodemailer/nodemailer.service';

@Injectable()
export class OrdersService {
constructor(@InjectRepository(Order)private readonly orderRepository : Repository<Order>,
private readonly orderDetailsService:OrderdetailsService,
private readonly nodemailerService : NodemailerService
){}

  async create(createOrderDto: CreateOrderDto) {
    const {endOrder,nameClient,nameForCard,
      num2Cel,numCel,theme,transactionType,products,address,email} = createOrderDto;

      const createAt = dayjs().format("YYYY-MM-DD") //fecha del pedido
      if(!dayjs(endOrder,"YYYY-MM-DD",true).isValid()){ //fecha de la fiesta
        throw new BadRequestException("El formato de la fecha esta mal, debe ser YYYY-MM-DD");
      }
      
      //State esta por def inprocess
      const orderSchema = this.orderRepository.create({
        createAt,
        endOrder,
        transactionType,
        nameClient,
        nameForCard,
        theme,
        num2Cel,
        numCel,
        address,
        email,
        totalPrice:0,
      });

      const order = await this.orderRepository.save(orderSchema) //hago esto, para poder obtener la id
      
      const orderDetails = await Promise.all(products.map(async prod=> await this.orderDetailsService.create(prod,order))) ;
      
      let total= 0;
      orderDetails.map(orderDet => total = total + orderDet.subTotal);
      order.orderDetails = orderDetails;      
       order.totalPrice = total;
       
       console.log(order);
       this.nodemailerService.sendEmail(order.email,`http://localhost:5173/postShop/${order.id}`);
       return this.orderRepository.save(order);
  }

  async findAll() : Promise<Order[]> {
    const orders = await this.orderRepository.find({relations:{orderDetails:true}});
    if(!orders){
      throw new BadRequestException("No hay ordenes");
    }
    return orders;
  }

 async findOneById(id: string) {
  const order = await this.orderRepository.findOne({where:{id},relations:{orderDetails:{product:true}}})
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
