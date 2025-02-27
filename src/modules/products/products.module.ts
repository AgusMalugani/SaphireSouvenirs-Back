import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesService } from './../categories/categories.service';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService,CategoriesService,OrderdetailsService],
  exports:[ProductsService]
})
export class ProductsModule {}
