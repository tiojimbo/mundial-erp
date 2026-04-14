import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { CustomIoAdapter } from './common/adapters/custom-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: ['health', 'health/ready', 'docs'],
  });

  // Security headers (Helmet with CSP)
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
          ],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // CORS with whitelist
  const allowedOrigins = [
    config.get<string>('FRONTEND_URL', 'http://localhost:3000'),
  ];
  if (config.get<string>('NODE_ENV', 'development') === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
      'Idempotency-Key',
    ],
    maxAge: 86400,
  });

  // WebSocket adapter (Socket.io with CORS from ConfigService)
  app.useWebSocketAdapter(new CustomIoAdapter(app));

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mundial ERP API')
    .setDescription(
      'API do ERP Mundial Telhas — gestão de pedidos, produção, financeiro e BPM',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = config.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`Mundial ERP API running on http://localhost:${port}`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}
bootstrap();
