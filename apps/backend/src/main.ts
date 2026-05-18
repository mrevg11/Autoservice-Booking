import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap(): Promise<void> {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Security
  app.use(helmet());
  app.enableCors({
    origin: process.env['FRONTEND_URL'] ?? 'http://localhost:5173',
    credentials: true,
  });

  // Global prefix
  const prefix = process.env['API_PREFIX'] ?? 'api/v1';
  app.setGlobalPrefix(prefix);

  // Global pipes & filters
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Swagger — development only
  if (process.env['NODE_ENV'] !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('AutoService API')
      .setDescription('API для системи онлайн-запису автосервісу')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup(`${prefix}/docs`, app, document);
  }

  const port = process.env['PORT'] ?? 3000;
  await app.listen(port);
  logger.log(`Server running on http://localhost:${port}/${prefix}`);
  if (process.env['NODE_ENV'] !== 'production') {
    logger.log(`Swagger: http://localhost:${port}/${prefix}/docs`);
  }
}

process.env['TZ'] = 'Europe/Kyiv';
bootstrap().catch(console.error);
