import { Module } from '@nestjs/common';
import { OrderdetailsService } from './orderdetails.service';
import { OrderdetailsController } from './orderdetails.controller';
import { ProductsService } from '../products/products.service';
import { OrdersService } from '../orders/orders.service';
import { Orderdetail } from './entities/orderdetail.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { CategoriesService } from '../categories/categories.service';
import { Order } from '../orders/entities/order.entity';
import { Category } from '../categories/entities/category.entity';
import { NodemailerService } from '../nodemailer/nodemailer.service';

@Module({
  imports:[TypeOrmModule.forFeature([Orderdetail,Product,Order,Category])],
  controllers: [OrderdetailsController],
  providers: [OrderdetailsService,ProductsService,OrdersService,CategoriesService,NodemailerService],
  exports:[OrderdetailsService]
})
export class OrderdetailsModule {}
