import { Module } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { OrderdetailsModule } from './modules/orderdetails/orderdetails.module';
import { CategoriesModule } from './modules/categories/categories.module';

@Module({
  imports: [ProductsModule, OrdersModule, OrderdetailsModule, CategoriesModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
