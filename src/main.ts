import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { CategoriesSeed } from './modules/seeders/categories/categories.seed';
import { ProductsSeed } from './modules/seeders/products/products.seed';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { UsersSeed } from './modules/seeders/users/users.seed';
import { effectiveRuntimeConfig, envs } from './config/envs';

async function bootstrap() {
  const bootstrapLogger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  if (envs.NODE_ENV === 'production' && envs.SEED_ON_STARTUP) {
    bootstrapLogger.warn(
      'SEED_ON_STARTUP=true ignorado en production; no se ejecutaran seeders en arranque.',
    );
  }

  if (effectiveRuntimeConfig.seedOnStartup) {
    const categories = app.get(CategoriesSeed);
    await categories.seed();
    bootstrapLogger.log('categorias cargadas');

    const products = app.get(ProductsSeed);
    await products.seed();
    bootstrapLogger.log('Productos cargado');

    const usersSeed = app.get(UsersSeed);
    await usersSeed.seed();
    bootstrapLogger.log('Admin cargado');
  }

  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      skipMissingProperties: false,
      exceptionFactory: (errors) => {
        const errores = errors.map((error) => {
          return { property: error.property, constraints: error.constraints };
        });
        return new BadRequestException({
          alert: 'Se han detectado los siguientes errores',
          errors: errores,
        });
      },
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('SaphireSouvenirs API')
    .setDescription(
      'Documentación de la API para manejar datos de la app de SaphireSouvenirs',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api', app, document);

  app.enableCors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: 'Content-type, Authorization',
    credentials: true,
  });

  await app.listen(envs.PORT);
  bootstrapLogger.log(`Server is running on port ${envs.PORT}`);
}
bootstrap();
