import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';
import { Order } from './entities/order.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';
import { Product } from '../products/entities/product.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Order,Orderdetail,Product])],
  controllers: [OrdersController],
  providers: [OrdersService,OrderdetailsService,OrderdetailsService],
  exports:[OrdersService]
})
export class OrdersModule {}
