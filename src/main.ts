import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);


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
