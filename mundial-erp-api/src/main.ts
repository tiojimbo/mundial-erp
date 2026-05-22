import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json, raw, urlencoded } from 'express';
import { AppModule } from './app.module';
import { CustomIoAdapter } from './common/adapters/custom-io.adapter';

async function bootstrap() {
  // `bodyParser: false` desliga os parsers default do Nest para podermos
  // instalar manualmente: `raw` ESCOPADO em `/webhooks/kommo/*` (preserva
  // bytes exatos para HMAC — ADR-005 §2.1#8) + `json`/`urlencoded` global
  // para o resto da API. Ordem importa — raw antes do json.
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  const config = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Raw body middleware ESCOPADO para `/webhooks/kommo/*` — preserva os
  // bytes exatos para validacao HMAC-SHA256 (ADR-005 §2.1#8). Se o parser
  // JSON global rodasse antes, `re-stringify` quebraria o hash.
  app.use('/webhooks/kommo', raw({ type: 'application/json', limit: '1mb' }));

  // Body parsers globais — substituem os default desligados acima. Limite
  // de 10mb mantem comportamento original do Nest (`100kb` default e
  // baixo demais para uploads multipart no chat/tasks).
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));

  // Global prefix
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'health',
      'health/ready',
      'docs',
      // webhooks publicos nao sao versionados (ADR-005 + convencao do
      // ecossistema). `setGlobalPrefix.exclude` aceita string com
      // wildcard via path-to-regexp.
      'webhooks/(.*)',
      // Convencao Prometheus: scraper raspa `/metrics` na raiz, nao em
      // versionada. Auth via Bearer token (METRICS_TOKEN) — TTT-050.
      'metrics',
    ],
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
void bootstrap();
