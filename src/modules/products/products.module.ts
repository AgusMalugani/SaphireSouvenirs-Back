import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesService } from './../categories/categories.service';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Product,Category,Orderdetail])],
  controllers: [ProductsController],
  providers: [ProductsService,CategoriesService,OrderdetailsService],
  exports:[ProductsService]
})
export class ProductsModule {}
