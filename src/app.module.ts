import { Module } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OrderdetailsModule } from './modules/orderdetails/orderdetails.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/tpeOrm.config';
import { ConfigModule } from '@nestjs/config';

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
      CategoriesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
