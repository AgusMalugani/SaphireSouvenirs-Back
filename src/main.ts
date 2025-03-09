import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CategoriesSeed } from './modules/seeders/categories/categories.seed';
import { ProductsSeed } from './modules/seeders/products/products.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
const categories = app.get(CategoriesSeed)
await categories.seed();
console.log("categorias cargadas");

const products = app.get(ProductsSeed)
await products.seed();
console.log("Productos cargado");


//validationpipe global
app.useGlobalPipes(new ValidationPipe({
  transform:true,
  whitelist:true,
  skipMissingProperties:false
  //falta personalizar el error y q agarre todos
}))


app.enableCors({
    origin: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', "PATCH"],
    allowedHeaders: 'Content-type, Authorization',
    credentials: true, 
});

  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
