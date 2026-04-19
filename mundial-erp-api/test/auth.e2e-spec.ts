import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  let accessToken: string;
  let refreshToken: string;

  const testUser = {
    email: `e2e-test-${Date.now()}@mundial.com`,
    name: 'E2E Test User',
    password: 'senhaSegura123',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1', {
      exclude: ['health', 'health/ready', 'docs'],
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );

    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({ where: { email: testUser.email } });
    await app.close();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user and return tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user).toHaveProperty('id');
      expect(res.body.data.user.email).toBe(testUser.email);
      expect(res.body.data.user).not.toHaveProperty('passwordHash');
      expect(res.body.data.user).not.toHaveProperty('refreshToken');

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should return 409 for duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);
    });

    it('should return 400 for invalid body', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: testUser.password })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.user.email).toBe(testUser.email);

      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should return 401 for wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 401 for non-existent email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nope@mundial.com', password: 'pass123' })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return user data with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.data.email).toBe(testUser.email);
      expect(res.body.data.name).toBe(testUser.name);
      expect(res.body.data).not.toHaveProperty('passwordHash');
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
    });

    it('should return 401 with invalid token', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should return new token pair with valid refresh token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(res.body.data).toHaveProperty('accessToken');
      expect(res.body.data).toHaveProperty('refreshToken');
      expect(res.body.data.accessToken).not.toBe(accessToken);

      // Update tokens for subsequent tests
      accessToken = res.body.data.accessToken;
      refreshToken = res.body.data.refreshToken;
    });

    it('should reject old refresh token after rotation', async () => {
      // The old refreshToken was already rotated in the previous test
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'old-rotated-token' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout and invalidate refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
    });

    it('should reject refresh after logout', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('Protected routes', () => {
    it('should return 401 for protected route without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users').expect(401);
    });
  });
});
