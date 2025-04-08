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
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig), 
    ConfigModule.forRoot({
      envFilePath: '.env',  
      isGlobal: true, 
    }),
    JwtModule.register({
          global: true,
          secret: process.env.JWT_SECRET||"clavesecret",
          signOptions: { expiresIn: '4h' }
        }),
    ProductsModule, 
    OrdersModule,
     OrderdetailsModule,
      CategoriesModule,
      SeederModule,
      NodemailerModule,
      FileUploadModule,
      UsersModule,
      AuthModule],
  controllers: [],
  providers: [CloudinaryService],
})
export class AppModule {}
