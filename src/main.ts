import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CategoriesSeed } from './modules/seeders/categories/categories.seed';
import { ProductsSeed } from './modules/seeders/products/products.seed';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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
  skipMissingProperties:false,
  exceptionFactory: (errors)=>{
    const errores = errors.map((error)=>{
       return {property : error.property, constraints: error.constraints};
  });
 return new BadRequestException({alert: "Se han detectado los siguientes errores",errors: errores})
  }
}))

const swaggerConfig = new DocumentBuilder()
    .setTitle('SaphireSouvenirs API')
    .setDescription('Documentación de la API para manejar datos de la app de SaphireSouvenirs')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);


app.enableCors({
    origin: true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE', "PATCH"],
    allowedHeaders: 'Content-type, Authorization',
    credentials: true, 
});

  
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
