import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderdetailsService } from './../orderdetails/orderdetails.service';
import * as dayjs from "dayjs";
import { NodemailerService } from '../nodemailer/nodemailer.service';
import { envs } from 'src/config/envs';

@Injectable()
export class OrdersService {
constructor(@InjectRepository(Order)private readonly orderRepository : Repository<Order>,
private readonly orderDetailsService:OrderdetailsService,
private readonly nodemailerService : NodemailerService,
){}

async create(createOrderDto: CreateOrderDto) {
  const {
    endOrder,
    nameClient,
    personalizationName,
    num2Cel,
    numCel,
    theme,
    transactionType,
    products,
    address,
    email,
  } = createOrderDto;

  const createAt = dayjs().format("YYYY-MM-DD"); // Fecha del pedido

  // Crear la orden
  const orderSchema = this.orderRepository.create({
    createAt,
    endOrder,
    transactionType,
    nameClient,
    personalizationName,
    theme,
    num2Cel,
    numCel,
    address,
    email,
    totalPrice: 0,
  });

  const order = await this.orderRepository.save(orderSchema); // Guardar la orden para obtener la ID

  try {
    // Crear los detalles de la orden
    const orderDetails = await Promise.all(
      products.map(async (prod) => await this.orderDetailsService.create(prod, order))
    );

    // Calcular el total
    let total = 0;
    const orderItemsHtml = orderDetails
      .map((orderDet) => {
        total += orderDet.subTotal;
        return `
          <tr>
            <td style="padding:12px 0;font-size:14px;color:#44403c;border-bottom:1px solid #f5f0ed;">${orderDet.product.name}</td>
            <td style="padding:12px 0;font-size:14px;color:#78716c;text-align:center;border-bottom:1px solid #f5f0ed;">${orderDet.cuantity}</td>
            <td style="padding:12px 0;font-size:14px;color:#78716c;text-align:right;border-bottom:1px solid #f5f0ed;">$${orderDet.product.price.toFixed(2)}</td>
            <td style="padding:12px 0;font-size:14px;font-weight:600;color:#44403c;text-align:right;border-bottom:1px solid #f5f0ed;">$${orderDet.subTotal.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    order.orderDetails = orderDetails;
    order.totalPrice = total;

    // Actualizar la orden con el total y los detalles
    await this.orderRepository.save(order);

    // Enviar correo con los detalles de la orden
    const emailHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Pedido</title>
</head>
<body style="margin:0;padding:0;background-color:#fafafa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#fafafa;padding:40px 16px;">
    <tr>
      <td align="center">

        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;border:1px solid #f0ece8;overflow:hidden;">

          <!-- HEADER -->
          <tr>
            <td style="background:linear-gradient(135deg,#fb7185,#f43f5e);padding:40px 32px;text-align:center;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;font-weight:700;letter-spacing:2px;">
                ✦ SaphireSouvenirs ✦
              </h1>
              <p style="margin:10px 0 0;font-size:15px;color:rgba(255,255,255,0.85);font-style:italic;letter-spacing:0.5px;">
                ¡Gracias por tu compra!
              </p>
            </td>
          </tr>

          <!-- SALUDO -->
          <tr>
            <td style="padding:36px 40px 0;">
              <h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#fb7185;font-weight:600;">
                Hola, ${nameClient} 🌸
              </h2>
              <p style="margin:12px 0 0;font-size:15px;color:#78716c;line-height:1.7;">
                Recibimos tu pedido con éxito. A continuación encontrarás el resumen detallado de tu compra. Gracias por elegirnos.
              </p>
            </td>
          </tr>

          <!-- TABLA DE PRODUCTOS -->
          <tr>
            <td style="padding:28px 40px 0;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                <thead>
                  <tr style="border-bottom:2px solid #f5f0ed;">
                    <th style="padding:10px 0;text-align:left;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Producto</th>
                    <th style="padding:10px 0;text-align:center;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Cant.</th>
                    <th style="padding:10px 0;text-align:right;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Precio</th>
                    <th style="padding:10px 0;text-align:right;font-size:10px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#a8a29e;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${orderItemsHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" style="padding:20px 0 0;text-align:right;font-size:14px;color:#78716c;font-weight:500;">Total del pedido:</td>
                    <td style="padding:20px 0 0;text-align:right;font-size:22px;font-weight:700;color:#fb7185;font-family:Georgia,'Times New Roman',serif;">$${total.toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </td>
          </tr>

          <!-- BOTÓN CTA -->
          <tr>
            <td style="padding:40px;text-align:center;">
              <a href="${envs.URL_CLIENT}/postShop/${order.id}"
                 style="display:inline-block;padding:15px 44px;background:linear-gradient(135deg,#fb7185,#f43f5e);color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:50px;letter-spacing:0.5px;">
                Ver detalle de mi pedido →
              </a>
            </td>
          </tr>

          <!-- DIVISOR -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#f5f0ed;"></div>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:28px 40px 36px;text-align:center;">
              <p style="margin:0 0 16px;font-size:13px;color:#a8a29e;letter-spacing:0.5px;">
                Seguinos en nuestras redes
              </p>
              <p style="margin:0 0 20px;">
                <a href="https://www.instagram.com/saphire_souvenirs/"
                   style="display:inline-block;margin:0 6px;padding:9px 22px;background:#fdf2f5;border:1px solid #fce7ed;border-radius:50px;font-size:13px;font-weight:600;color:#fb7185;text-decoration:none;">
                  ◈ Instagram
                </a>
                <a href="https://wa.me/5493417120039"
                   style="display:inline-block;margin:0 6px;padding:9px 22px;background:#fdf2f5;border:1px solid #fce7ed;border-radius:50px;font-size:13px;font-weight:600;color:#fb7185;text-decoration:none;">
                  ◈ WhatsApp
                </a>
              </p>
              <p style="margin:0;font-size:12px;color:#d6d3d1;line-height:1.6;">
                © ${new Date().getFullYear()} SaphireSouvenirs · Souvenir con amor ✦<br/>
                <span style="font-size:11px;">Si tenés alguna consulta, respondé este correo o escribinos por WhatsApp.</span>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
    `;

    await this.nodemailerService.sendEmail(email, emailHtml);

    return order;
  } catch (error) {
    // Si ocurre un error, elimina la orden creada
    await this.orderRepository.delete(order.id);
    throw error; // Re-lanza el error para que sea manejado por el controlador
  }
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
