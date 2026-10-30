import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { SanitizedExceptionFilter } from './common/security/sanitized-exception.filter';
import { StorageService, UPLOADS_ROUTE } from './storage/storage.service';

async function bootstrap() {
  // rawBody is required to verify the Stripe webhook signature
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // Needed for correct client IPs (rate limiting) behind a reverse proxy
  const trustProxy = process.env.TRUST_PROXY?.trim();
  if (trustProxy && trustProxy !== 'false') {
    app.set('trust proxy', trustProxy === 'true' ? 1 : trustProxy);
  }

  app.use(cookieParser());
  app.useGlobalFilters(new SanitizedExceptionFilter());

  if (process.env.SWAGGER_ENABLED !== 'false') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('Veyro API')
        .setDescription('Catalog, cart, orders, payments, reviews and auth')
        .setVersion('1.0')
        .addBearerAuth()
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }
  const storage = app.get(StorageService);

  if (!storage.usesCloudinary) {
    app.useStaticAssets(storage.rootDir, {
      prefix: UPLOADS_ROUTE,
      index: false,
      maxAge: '30d',
      immutable: true,
      setHeaders: (res) => res.setHeader('X-Content-Type-Options', 'nosniff'),
    });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
