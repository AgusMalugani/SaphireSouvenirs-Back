import { Module } from '@nestjs/common';
import { CategoriesSeed } from './categories/categories.seed';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';
import { Product } from '../products/entities/product.entity';
import { ProductsSeed } from './products/products.seed';
import { User } from '../users/entities/user.entity';
import { UsersSeed } from './users/users.seed';

@Module({
    imports:[TypeOrmModule.forFeature([Category,Product,User])],
    providers:[CategoriesSeed,ProductsSeed,UsersSeed],
    exports:[CategoriesSeed,ProductsSeed,UsersSeed]
})
export class SeederModule {}
