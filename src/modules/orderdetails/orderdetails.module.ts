import { Module } from '@nestjs/common';
import { OrderdetailsService } from './orderdetails.service';
import { OrderdetailsController } from './orderdetails.controller';

@Module({
  controllers: [OrderdetailsController],
  providers: [OrderdetailsService],
})
export class OrderdetailsModule {}
