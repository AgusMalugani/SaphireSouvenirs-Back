import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { ProductsService } from '../products/products.service';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';

@Module({
  imports:[TypeOrmModule.forFeature([Category,Product])],
  controllers: [CategoriesController],
  providers: [CategoriesService,ProductsService],
  exports:[CategoriesService]
})
export class CategoriesModule {}
