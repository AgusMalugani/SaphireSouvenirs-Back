import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderdetailDto } from './dto/create-orderdetail.dto';
import { UpdateOrderdetailDto } from './dto/update-orderdetail.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Orderdetail } from './entities/orderdetail.entity';
import { Repository } from 'typeorm';
import { Order } from '../orders/entities/order.entity';
import { ProductsService } from '../products/products.service';

@Injectable()
export class OrderdetailsService {
constructor(@InjectRepository(Orderdetail) private readonly orderDetailRepository : Repository<Orderdetail>, 
private readonly productService : ProductsService ){}

  async create(createOrderdetailDto: CreateOrderdetailDto,order:Order) {
    const{productId,quantity}=createOrderdetailDto;
    const product = await this.productService.findOneById(productId);
    if(!product){
      throw new BadRequestException("No existe ese producto");
    }

      
      if(product.stock === false){
        throw new BadRequestException("El producto, no esta en stock"); //esto no deberia pasar.
      }

      const subTotal= product.price * quantity
    
const orderDetail = this.orderDetailRepository.create({product,quantity,subTotal,order});
return this.orderDetailRepository.save(orderDetail);  
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
