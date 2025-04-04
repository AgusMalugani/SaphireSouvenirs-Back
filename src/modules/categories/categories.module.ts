import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { ProductsService } from '../products/products.service';
import { Category } from './entities/category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../products/entities/product.entity';
import { CloudinaryService } from 'src/services/cloudinary/cloudinary.service';
import { FileUploadService } from '../file-upload/file-upload.service';

@Module({
  imports:[TypeOrmModule.forFeature([Category,Product])],
  controllers: [CategoriesController],
  providers: [CategoriesService,ProductsService,FileUploadService,CloudinaryService],
  exports:[CategoriesService]
})
export class CategoriesModule {}
