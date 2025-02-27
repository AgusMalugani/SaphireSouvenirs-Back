import { Module } from '@nestjs/common';
import { OrderdetailsService } from './orderdetails.service';
import { OrderdetailsController } from './orderdetails.controller';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';

@Module({
  controllers: [OrderdetailsController],
  providers: [OrderdetailsService,ProductsService,OrdersService],
  exports:[OrderdetailsService]
})
export class OrderdetailsModule {}
