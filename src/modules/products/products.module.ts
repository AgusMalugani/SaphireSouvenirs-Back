import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { CategoriesService } from './../categories/categories.service';
import { OrderdetailsService } from '../orderdetails/orderdetails.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Category } from '../categories/entities/category.entity';
import { Orderdetail } from '../orderdetails/entities/orderdetail.entity';
import { FileUploadService } from '../file-upload/file-upload.service';
import { CloudinaryService } from 'src/services/cloudinary/cloudinary.service';

@Module({
  imports:[TypeOrmModule.forFeature([Product,Category,Orderdetail])],
  controllers: [ProductsController],
  providers: [ProductsService,CategoriesService,OrderdetailsService,FileUploadService,CloudinaryService],
  exports:[ProductsService]
})
export class ProductsModule {}
