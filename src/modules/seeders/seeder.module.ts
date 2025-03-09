import { Module } from '@nestjs/common';
import { CategoriesSeed } from './categories/categories.seed';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsSeed } from './products/products.seed';

@Module({
    imports:[TypeOrmModule.forFeature([Category,Product])],
    providers:[CategoriesSeed,ProductsSeed],
    exports:[CategoriesSeed,ProductsSeed]
})
export class SeederModule {}
