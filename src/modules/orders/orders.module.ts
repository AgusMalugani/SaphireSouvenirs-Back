import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';
import { Product } from '../products/entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { NodemailerModule } from '../nodemailer/nodemailer.module';
import { OrderdetailsModule } from '../orderdetails/orderdetails.module';
import { ValidateEndOrderMiddleware } from 'src/middlewares/validate-end-order/validate-end-order.middleware';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Orderdetail, Product, Category]),
    NodemailerModule,
    OrderdetailsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ValidateEndOrderMiddleware)
      .forRoutes({ path: 'orders', method: RequestMethod.POST });
  }
}
