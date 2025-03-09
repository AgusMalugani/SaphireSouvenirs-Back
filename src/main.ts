import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { CategoriesSeed } from './modules/seeders/categories/categories.seed';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
const categories = app.get(CategoriesSeed)
await categories.seed();
console.log("categorias cargadas");


//validationpipe global
app.useGlobalPipes(new ValidationPipe({
  transform:true,
  whitelist:true,
  skipMissingProperties:false
  //falta personalizar el error y q agarre todos
}))
  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
