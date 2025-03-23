import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';
import { Order } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsService } from '../products/products.service';
import { CategoriesService } from '../categories/categories.service';
import { Category } from '../categories/entities/category.entity';
import { NodemailerService } from '../nodemailer/nodemailer.service';
import { ValidateEndOrderMiddleware } from 'src/middlewares/validate-end-order/validate-end-order.middleware';

@Module({
  imports:[TypeOrmModule.forFeature([Order,Orderdetail,Product,Category])],
  controllers: [OrdersController],
  providers: [OrdersService,OrderdetailsService,OrderdetailsService,ProductsService,CategoriesService,NodemailerService],
  exports:[OrdersService]
})
export class OrdersModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(ValidateEndOrderMiddleware)
      .forRoutes({path:"orders",method: RequestMethod.POST});
  }
  }
