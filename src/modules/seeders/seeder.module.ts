import { Module } from '@nestjs/common';
import { CategoriesSeed } from './categories/categories.seed';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../categories/entities/category.entity';

@Module({
    imports:[TypeOrmModule.forFeature([Category])],
    providers:[CategoriesSeed],
    exports:[CategoriesSeed]
})
export class SeederModule {}
