import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderdetailsService } from './../orderdetails/orderdetails.service';
import * as dayjs from "dayjs";
import { NodemailerService } from '../nodemailer/nodemailer.service';
import * as dotenv from "dotenv"

@Injectable()
export class OrdersService {
constructor(@InjectRepository(Order)private readonly orderRepository : Repository<Order>,
private readonly orderDetailsService:OrderdetailsService,
private readonly nodemailerService : NodemailerService,
){}

  async create(createOrderDto: CreateOrderDto) {
    const {endOrder,nameClient,nameForCard,
      num2Cel,numCel,theme,transactionType,products,address,email} = createOrderDto;

      const createAt = dayjs().format("YYYY-MM-DD") //fecha del pedido
     
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
     // orderDetails.map(orderDet => total = total + orderDet.subTotal);
     const orderItemsHtml = orderDetails.map((orderDet) => {
      total += orderDet.subTotal;
      return `
          <tr>
              <td>${orderDet.product.name}</td>
              <td>${orderDet.cuantity}</td>
              <td>$${orderDet.product.price.toFixed(2)}</td>
              <td>$${orderDet.subTotal.toFixed(2)}</td>
          </tr>
      `;
  }).join("");
     
     order.orderDetails = orderDetails;      
       order.totalPrice = total;
       
     //  console.log(order);
      // this.nodemailerService.sendEmail(order.email,`${process.env.URL_CLIENT}postShop/${order.id}`);
      // Enviar correo con los detalles de la orden
    const emailHtml = `
    <html>
    <body>
        <h1>Confirmación de Pedido</h1>
        <p>Gracias por tu compra, ${nameClient}. Aquí están los detalles de tu pedido:</p>
        <table border="1" style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr>
                    <th>Producto</th>
                    <th>Cantidad</th>
                    <th>Precio Unitario</th>
                    <th>Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${orderItemsHtml}
            </tbody>
            <tfoot>
                <tr>
                    <td colspan="3" style="text-align: right;"><strong>Total:</strong></td>
                    <td><strong>$${total.toFixed(2)}</strong></td>
                </tr>
            </tfoot>
        </table>
        <p>Puedes ver más detalles de tu pedido <a href="${process.env.URL_CLIENT}postShop/${order.id}">aquí</a>.</p>
        <p>Gracias por elegir SaphireSouvenirs.</p>
    </body>
    </html>
`;

await this.nodemailerService.sendEmail(email, emailHtml);

      
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
