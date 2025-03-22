import { Module } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OrderdetailsModule } from './modules/orderdetails/orderdetails.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/tpeOrm.config';
import { ConfigModule } from '@nestjs/config';
import { SeederModule } from './modules/seeders/seeder.module';
import { NodemailerModule } from './modules/nodemailer/nodemailer.module';
import { CloudinaryService } from './services/cloudinary/cloudinary.service'; 
import { FileUploadModule } from './modules/file-upload/file-upload.module';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig), 
    ConfigModule.forRoot({
      envFilePath: '.env',  
      isGlobal: true, 
    }),
    ProductsModule, 
    OrdersModule,
     OrderdetailsModule,
      CategoriesModule,
      SeederModule,
      NodemailerModule,
      FileUploadModule],
  controllers: [],
  providers: [CloudinaryService],
})
export class AppModule {}
