import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService,OrderdetailsService],
  exports:[OrdersService]
})
export class OrdersModule {}
