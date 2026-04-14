# 11 — Protegendo a Aplicacao

Seguranca nao e uma feature opcional. E o alicerce que sustenta tudo. Se a arquitetura e o esqueleto e o codigo e o musculo, seguranca e o sistema imunologico. Sem ela, qualquer aplicacao esta a um request de distancia de um desastre.

---

## 11.1 — Por que seguranca importa?

Falhas de seguranca nao sao hipoteticas. Acontecem todos os dias, com empresas de todos os tamanhos:

| Falha | Consequencia real |
|-------|------------------|
| Vazamento de senha em plaintext | Usuarios processam a empresa, multa da LGPD |
| SQL Injection em endpoint publico | Atacante exporta toda a base de dados |
| JWT sem expiracao | Token roubado da acesso infinito a conta |
| `.env` commitado no GitHub | Bots escaneiam repos publicos e usam suas credenciais em minutos |
| XSS em campo de comentario | Atacante rouba cookies de sessao de outros usuarios |
| Sem rate limiting na rota de login | Ataque de forca bruta descobre senhas fracas |
| CORS aberto para qualquer origem | Qualquer site consegue fazer requests autenticados |

**Na Bravy, seguranca nao e responsabilidade "do DevOps" ou "do time de seguranca". E responsabilidade de cada dev que escreve codigo.**

A regra e simples: **trate toda entrada como hostil, todo token como temporario, toda dependencia como suspeita.**

---

## 11.2 — Helmet

### O que e?

Helmet e um middleware que configura headers HTTP de seguranca automaticamente. Ele protege contra ataques comuns como clickjacking, sniffing de MIME type e injecao de scripts.

### Headers que o Helmet configura

| Header | Protege contra |
|--------|---------------|
| `X-Content-Type-Options: nosniff` | MIME type sniffing |
| `X-Frame-Options: DENY` | Clickjacking (iframe embedding) |
| `X-XSS-Protection: 0` | Desativa filtro XSS legado do browser (que causa mais problemas do que resolve) |
| `Strict-Transport-Security` | Forca HTTPS |
| `Content-Security-Policy` | Controla quais recursos podem ser carregados |

### Configuracao no NestJS

```bash
npm install helmet
```

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'", process.env.FRONTEND_URL],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  await app.listen(3001);
}
bootstrap();
```

**Regra Bravy:** Helmet e obrigatorio em todo projeto. Sempre o primeiro middleware registrado.

---

## 11.3 — CORS

### O que e?

CORS (Cross-Origin Resource Sharing) controla quais dominios podem fazer requests para sua API. Sem configuracao, o browser bloqueia requests de origens diferentes (o que e bom). O problema e quando voce abre demais.

### O erro classico

```typescript
// NUNCA faca isso em producao
app.enableCors(); // Aceita requests de QUALQUER origem
```

### Configuracao correta com whitelist

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const allowedOrigins = [
    process.env.FRONTEND_URL,           // https://app.bravy.com.br
    process.env.FRONTEND_STAGING_URL,   // https://staging.bravy.com.br
  ];

  if (process.env.NODE_ENV === 'development') {
    allowedOrigins.push('http://localhost:3000');
  }

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  await app.listen(3001);
}
bootstrap();
```

| Propriedade | Valor | Por que |
|------------|-------|---------|
| `origin` | Funcao com whitelist | So aceita origens conhecidas |
| `credentials` | `true` | Permite envio de cookies/tokens |
| `methods` | Lista explicita | Nao expoe metodos desnecessarios |
| `maxAge` | `86400` (24h) | Browser cacheia preflight, reduz requests OPTIONS |

---

## 11.4 — Rate Limiting

### O que e?

Rate limiting restringe quantos requests um cliente pode fazer em um intervalo de tempo. Protege contra:

- Ataques de forca bruta (login)
- DDoS na camada de aplicacao
- Abuso de endpoints publicos
- Scraping automatizado

### Configuracao com @nestjs/throttler

```bash
npm install @nestjs/throttler
```

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,   // 1 segundo
        limit: 3,    // max 3 requests por segundo
      },
      {
        name: 'medium',
        ttl: 10000,  // 10 segundos
        limit: 20,   // max 20 requests em 10 segundos
      },
      {
        name: 'long',
        ttl: 60000,  // 1 minuto
        limit: 100,  // max 100 requests por minuto
      },
    ]),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
```

### Rate limiting mais restritivo para login

```typescript
// src/modules/auth/auth.controller.ts
import { Controller, Post, Body } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Throttle([
    { name: 'short', limit: 1, ttl: 1000 },
    { name: 'medium', limit: 5, ttl: 60000 },
    { name: 'long', limit: 10, ttl: 300000 },
  ])
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('forgot-password')
  @Throttle([
    { name: 'short', limit: 1, ttl: 1000 },
    { name: 'medium', limit: 3, ttl: 60000 },
  ])
  async forgotPassword(@Body() dto: { email: string }) {
    return this.authService.forgotPassword(dto.email);
  }
}
```

### Desabilitar throttle em rotas especificas (raro)

```typescript
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Get('health')
healthCheck() {
  return { status: 'ok' };
}
```

---

## 11.5 — ValidationPipe global

### Por que SEMPRE validar input?

Qualquer dado que vem do cliente e **potencialmente malicioso**. Nao importa se voce "controla" o frontend — o frontend pode ser bypassado com curl, Postman ou qualquer HTTP client. A unica barreira real e a validacao no backend.

### Configuracao global

```typescript
// src/main.ts
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  await app.listen(3001);
}
bootstrap();
```

| Opcao | O que faz | Por que |
|-------|----------|---------|
| `whitelist` | Remove propriedades que nao estao no DTO | Impede que o cliente envie campos extras |
| `forbidNonWhitelisted` | Retorna erro 400 se enviar campo extra | O cliente sabe que enviou algo errado |
| `transform` | Converte tipos automaticamente | `"123"` vira `123` se o DTO diz `@IsNumber()` |

### Exemplo de DTO protegido

```typescript
// src/modules/products/dto/create-product.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
  Max,
  IsEnum,
} from 'class-validator';

export enum ProductStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DRAFT = 'DRAFT',
}

export class CreateProductDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  name: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(999999.99)
  price: number;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus = ProductStatus.DRAFT;
}
```

**O que acontece quando alguem envia `{ "name": "A", "isAdmin": true }`?**

1. `whitelist` remove `isAdmin` (nao esta no DTO)
2. `forbidNonWhitelisted` retorna erro 400 informando que `isAdmin` nao deveria existir
3. `MinLength(3)` retorna erro porque "A" tem so 1 caractere

Tres camadas de protecao em um unico middleware.

---

## 11.6 — SQL Injection

### O que e?

SQL Injection acontece quando input do usuario e concatenado diretamente na query SQL, permitindo que o atacante execute comandos arbitrarios no banco.

### O exemplo perigoso

```typescript
// NUNCA faca isso — vulneravel a SQL Injection
const users = await prisma.$queryRawUnsafe(
  `SELECT * FROM "User" WHERE email = '${email}'`
);

// Se o atacante enviar como email:
// ' OR '1'='1'; DROP TABLE "User"; --
// A query vira:
// SELECT * FROM "User" WHERE email = '' OR '1'='1'; DROP TABLE "User"; --'
```

Resultado: o atacante retorna todos os usuarios **e deleta a tabela inteira**.

### Como o Prisma protege

O Prisma Client usa queries parametrizadas automaticamente. Os valores nunca sao concatenados na string SQL:

```typescript
// SEGURO — Prisma parametriza automaticamente
const user = await prisma.user.findUnique({
  where: { email: email },
});

// SEGURO — Prisma escapa o valor
const users = await prisma.user.findMany({
  where: {
    name: { contains: searchTerm },
  },
});
```

### O cuidado com $queryRaw

Quando voce precisa de queries cruas (relatorios complexos, funcoes especificas do PostgreSQL), use `$queryRaw` com template literals — **nunca** `$queryRawUnsafe`:

```typescript
// SEGURO — $queryRaw com template literal parametriza automaticamente
const results = await prisma.$queryRaw`
  SELECT
    DATE_TRUNC('month', "createdAt") as month,
    COUNT(*)::int as total,
    SUM(price)::float as revenue
  FROM "Product"
  WHERE "tenantId" = ${tenantId}
    AND "createdAt" >= ${startDate}
  GROUP BY month
  ORDER BY month DESC
`;
```

```typescript
// PERIGOSO — $queryRawUnsafe nao parametriza
// So use se for ABSOLUTAMENTE necessario e valide TUDO manualmente
const results = await prisma.$queryRawUnsafe(query); // Evite ao maximo
```

**Regra Bravy:** Nunca use `$queryRawUnsafe`. Se achar que precisa, pergunte no code review primeiro.

---

## 11.7 — XSS (Cross-Site Scripting)

### O que e?

XSS acontece quando um atacante consegue injetar e executar JavaScript no browser de outro usuario. O script pode roubar cookies, tokens, dados de formulario ou redirecionar o usuario para sites maliciosos.

### Tipos de XSS

| Tipo | Como funciona | Exemplo |
|------|--------------|---------|
| Stored | Script salvo no banco e renderizado para outros usuarios | Comentario com `<script>` que roda para todos que visualizam |
| Reflected | Script na URL que e refletido na pagina | Link malicioso com payload na query string |
| DOM-based | Script manipula o DOM diretamente no client | Input que altera `innerHTML` sem sanitizar |

### Como React protege por padrao

React escapa automaticamente qualquer conteudo renderizado via JSX:

```tsx
// SEGURO — React escapa automaticamente
function UserProfile({ user }: { user: User }) {
  return (
    <div>
      <h1>{user.name}</h1>       {/* Escapa HTML automaticamente */}
      <p>{user.bio}</p>           {/* Mesmo que bio contenha <script>, vira texto */}
    </div>
  );
}

// Se user.name for "<script>alert('xss')</script>"
// React renderiza como TEXTO, nao como HTML executavel
```

### O perigo do dangerouslySetInnerHTML

```tsx
// PERIGOSO — injeta HTML cru no DOM
function RichContent({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
```

Se voce **precisa** renderizar HTML (ex: conteudo de um rich text editor), **sempre sanitize**:

```bash
npm install dompurify isomorphic-dompurify
```

```tsx
// SEGURO — sanitiza antes de renderizar
import DOMPurify from 'isomorphic-dompurify';

function RichContent({ html }: { html: string }) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });

  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

### Protecao adicional no backend

```typescript
// src/common/pipes/sanitize.pipe.ts
import { PipeTransform, Injectable } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizeHtmlPipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (typeof value === 'string') {
      return sanitizeHtml(value, {
        allowedTags: [],
        allowedAttributes: {},
      });
    }

    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value);
    }

    return value;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      sanitized[key] = this.transform(val);
    }
    return sanitized;
  }
}
```

---

## 11.8 — CSRF (Cross-Site Request Forgery)

### O que e?

CSRF e um ataque onde um site malicioso faz requests autenticados em nome do usuario, aproveitando que o browser envia cookies automaticamente.

**Cenario:** O usuario esta logado no banco. Ele abre um email com um link malicioso. O link executa um request POST para transferir dinheiro — e o browser envia o cookie de sessao automaticamente.

### Como proteger

#### 1. SameSite cookies

```typescript
// src/modules/auth/auth.service.ts
import { Response } from 'express';

@Injectable()
export class AuthService {
  setRefreshTokenCookie(res: Response, token: string) {
    res.cookie('refreshToken', token, {
      httpOnly: true,    // JavaScript nao consegue ler
      secure: true,      // So HTTPS
      sameSite: 'strict', // Nao envia em requests cross-origin
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 dias
      path: '/auth/refresh',
    });
  }
}
```

| Atributo | Valor | Protecao |
|----------|-------|----------|
| `httpOnly` | `true` | XSS nao consegue ler o cookie |
| `secure` | `true` | Cookie so trafega por HTTPS |
| `sameSite` | `strict` | Browser nao envia o cookie em requests cross-origin |
| `path` | `/auth/refresh` | Cookie so e enviado para a rota especifica |

#### 2. Token CSRF (para formularios tradicionais)

Se a aplicacao usa formularios com server-side rendering:

```bash
npm install csurf cookie-parser
```

```typescript
// src/main.ts
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.use(
    csurf({
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
      },
    }),
  );

  await app.listen(3001);
}
```

#### 3. Na Bravy (SPA + JWT)

A maioria dos projetos Bravy usa SPA (Next.js) com JWT no header Authorization. Nesse caso, CSRF e naturalmente mitigado porque:

- O token JWT **nao e um cookie** (o browser nao envia automaticamente)
- O frontend envia o token explicitamente no header `Authorization`
- Um site malicioso nao tem como acessar o token armazenado no JavaScript de outro dominio

**Mas se voce usar refresh token via cookie**, o `sameSite: 'strict'` e `httpOnly: true` sao obrigatorios.

---

## 11.9 — Gerenciamento de Secrets

### Regra #1: NUNCA commitar .env

```gitignore
# .gitignore — obrigatorio em todo projeto Bravy
.env
.env.local
.env.*.local
.env.production
.env.staging
```

### Usar variaveis de ambiente

```typescript
// src/config/env.config.ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']),
  PORT: z.coerce.number().default(3001),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_EXPIRATION: z.string().default('7d'),

  FRONTEND_URL: z.string().url(),
  FRONTEND_STAGING_URL: z.string().url().optional(),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  return result.data;
}
```

```typescript
// src/main.ts
import { validateEnv } from './config/env.config';

async function bootstrap() {
  const env = validateEnv();
  // Aplicacao so inicia se TODAS as variaveis estiverem corretas
}
```

### .env.example como template

Sempre mantenha um `.env.example` no repositorio com **valores de exemplo, nunca reais**:

```bash
# .env.example — commitar no repositorio
NODE_ENV=development
PORT=3001

DATABASE_URL=postgresql://user:password@localhost:5432/bravy_dev

JWT_ACCESS_SECRET=troque-por-um-secret-forte-com-minimo-32-chars
JWT_REFRESH_SECRET=troque-por-outro-secret-forte-com-minimo-32-chars
JWT_ACCESS_EXPIRATION=15m
JWT_REFRESH_EXPIRATION=7d

FRONTEND_URL=http://localhost:3000
```

### Rotacao de secrets

| Quando rodar | O que fazer |
|-------------|-------------|
| A cada 90 dias | Rotacionar JWT secrets |
| Imediatamente | Se um dev sair do time |
| Imediatamente | Se um secret for exposto (log, repo, chat) |
| A cada 90 dias | Rotacionar credenciais de servicos externos (AWS, SMTP) |

**Processo de rotacao JWT:**

1. Gere um novo secret
2. Atualize a variavel de ambiente em producao
3. Faca deploy — tokens existentes vao expirar naturalmente (access token em 15min)
4. Se urgente, atualize e force logout de todos os usuarios

---

## 11.10 — Dependencias seguras

### O problema

Sua aplicacao depende de centenas de pacotes npm. Cada um pode ter vulnerabilidades conhecidas. Uma dependencia comprometida pode injetar codigo malicioso na sua aplicacao.

### npm audit

```bash
# Verificar vulnerabilidades
npm audit

# Corrigir automaticamente o que for possivel
npm audit fix

# Ver detalhes de vulnerabilidades criticas
npm audit --audit-level=critical
```

**Regra Bravy:** `npm audit` deve rodar no CI. Build falha se houver vulnerabilidades criticas.

### Dependabot / Renovate

Configure atualizacao automatica de dependencias:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
      day: "monday"
    open-pull-requests-limit: 10
    labels:
      - "dependencies"
      - "automated"
    reviewers:
      - "bravy/backend-team"
    ignore:
      - dependency-name: "*"
        update-types: ["version-update:semver-major"]
```

### Lockfile

**Sempre commite o lockfile** (`package-lock.json` ou `pnpm-lock.yaml`). O lockfile garante que todos instalam exatamente as mesmas versoes.

```bash
# Instalar usando lockfile (CI e producao)
npm ci  # Mais rapido e deterministic que npm install
```

---

## 11.11 — HTTPS obrigatorio

### Por que?

HTTP transmite dados em texto puro. Qualquer pessoa na mesma rede (Wi-Fi do cafe, rede corporativa) pode interceptar requests e ver senhas, tokens e dados pessoais.

### Configuracao nginx + Let's Encrypt

```nginx
# /etc/nginx/sites-available/bravy-api
server {
    listen 80;
    server_name api.bravy.com.br;

    # Redireciona todo HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.bravy.com.br;

    # Certificado Let's Encrypt
    ssl_certificate /etc/letsencrypt/live/api.bravy.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.bravy.com.br/privkey.pem;

    # Configuracoes SSL modernas
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers off;

    # Headers de seguranca
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Proxy para a API NestJS
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Gerar certificado com Certbot

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Gerar certificado (automatico com nginx)
sudo certbot --nginx -d api.bravy.com.br

# Renovacao automatica (certbot ja configura um cron)
sudo certbot renew --dry-run
```

---

## 11.12 — Bcrypt para senhas

### A regra de ouro

**NUNCA armazene senhas em plaintext. NUNCA use MD5 ou SHA para senhas. Use bcrypt.**

| Metodo | Seguranca | Problema |
|--------|----------|----------|
| Plaintext | Nenhuma | Qualquer vazamento expoe todas as senhas |
| MD5/SHA | Fraca | Vulneravel a rainbow tables e forca bruta |
| bcrypt | Forte | Hash lento por design, salt automatico, resistente a GPU |

### Instalacao e uso

```bash
npm install bcrypt
npm install -D @types/bcrypt
```

```typescript
// src/modules/users/users.service.ts
import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersRepository } from './users.repository';
import { CreateUserDto } from './dto/create-user.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    return this.usersRepository.create({
      ...dto,
      password: hashedPassword,
    });
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.usersRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }
}
```

### Por que 12 rounds?

| Rounds | Tempo aprox. por hash | Uso |
|--------|----------------------|-----|
| 10 | ~65ms | Minimo aceitavel |
| 12 | ~250ms | Recomendado para a maioria das aplicacoes |
| 14 | ~1s | Alta seguranca (mas impacta UX no login) |

**12 rounds** e o sweet spot: lento o suficiente para inviabilizar forca bruta, rapido o suficiente para nao atrasar o login.

### Cuidado ao retornar dados do usuario

```typescript
// src/modules/users/users.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        // password: NUNCA inclua na select
      },
    });
  }
}
```

---

## 11.13 — JWT Security

### Secret forte

```bash
# Gerar secrets seguros (rode no terminal)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

O secret deve ter **minimo 256 bits (32 bytes)**. Nunca use strings como `"secret"`, `"jwt-secret"` ou `"bravy123"`.

### Access Token + Refresh Token

```typescript
// src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { TokenPayload } from './types/token-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.usersService.validateCredentials(email, password);

    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: '7d',
      }),
    ]);

    await this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async refresh(currentRefreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(
        currentRefreshToken,
        { secret: process.env.JWT_REFRESH_SECRET },
      );

      const isValid = await this.validateStoredRefreshToken(
        payload.sub,
        currentRefreshToken,
      );

      if (!isValid) {
        throw new UnauthorizedException('Refresh token revoked');
      }

      const newPayload: TokenPayload = {
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      const [newAccessToken, newRefreshToken] = await Promise.all([
        this.jwtService.signAsync(newPayload, {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: '15m',
        }),
        this.jwtService.signAsync(newPayload, {
          secret: process.env.JWT_REFRESH_SECRET,
          expiresIn: '7d',
        }),
      ]);

      await this.rotateRefreshToken(payload.sub, currentRefreshToken, newRefreshToken);

      return { accessToken: newAccessToken, refreshToken: newRefreshToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken: string) {
    await this.revokeRefreshToken(userId, refreshToken);
  }

  private async storeRefreshToken(userId: string, token: string) {
    const hashedToken = await bcrypt.hash(token, 10);
    // Salvar hash do refresh token no banco
    // Permite invalidar tokens especificos
  }

  private async validateStoredRefreshToken(userId: string, token: string) {
    // Buscar hash do token no banco e comparar com bcrypt.compare
    return true;
  }

  private async rotateRefreshToken(
    userId: string,
    oldToken: string,
    newToken: string,
  ) {
    // Revogar token antigo e salvar novo
    // "Refresh token rotation" — cada refresh gera um novo par
  }

  private async revokeRefreshToken(userId: string, token: string) {
    // Deletar o hash do token do banco
  }
}
```

### Estrategia JWT no NestJS

```typescript
// src/modules/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { TokenPayload } from '../types/token-payload.type';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET,
    });
  }

  validate(payload: TokenPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
```

### Resumo das decisoes JWT

| Decisao | Valor | Razao |
|---------|-------|-------|
| Access token expiration | 15 minutos | Curto o suficiente para limitar dano de token roubado |
| Refresh token expiration | 7 dias | Longo o suficiente para UX confortavel |
| Refresh token rotation | Sim | Cada refresh invalida o token anterior |
| Refresh token storage | Hash no banco | Permite revogar tokens individualmente |
| Secret length | 64+ bytes | Resistente a forca bruta |
| Algorithm | HS256 (default) | Suficiente para maioria das aplicacoes |

---

## 11.14 — O que pode dar errado? (cenarios reais)

### Cenario 1: Dev commita .env no repositorio

**O que acontece:** Bots automatizados escaneiam novos commits no GitHub em tempo real. Em questao de minutos, suas credenciais AWS estao sendo usadas para minerar criptomoedas com instancias EC2 — gerando faturas de milhares de dolares.

**Como evitar:**
- `.env` no `.gitignore` desde o primeiro commit
- Usar `git-secrets` ou `gitleaks` como pre-commit hook
- Se ja commitou: rotacionar TODOS os secrets imediatamente (remover do historico nao basta — ja foi copiado)

### Cenario 2: Endpoint de listagem sem paginacao

**O que acontece:** Um atacante (ou um bug no frontend) faz `GET /api/users` sem limit. A query retorna 500.000 registros. O servidor fica sem memoria, o banco fica sobrecarregado, e toda a aplicacao cai.

**Como evitar:**
- Paginacao obrigatoria com limite maximo no backend
- `@IsOptional() @Max(100) limit: number = 20` no DTO de query
- Timeout nas queries do Prisma

### Cenario 3: Enumeracao de usuarios na rota de login

**O que acontece:** A API retorna "User not found" quando o email nao existe e "Wrong password" quando a senha esta errada. O atacante usa isso para descobrir quais emails estao cadastrados, e depois faz forca bruta so nesses.

**Como evitar:**
- Sempre retornar a mesma mensagem generica: `"Invalid credentials"`
- Nunca diferenciar "usuario nao existe" de "senha errada"
- Rate limiting na rota de login

### Cenario 4: Acesso horizontal — usuario vendo dados de outro

**O que acontece:** Usuario A descobre que a URL `/api/orders/123` retorna o pedido 123. Ele tenta `/api/orders/124` e consegue ver o pedido de outro usuario, porque o backend so verifica se o usuario esta autenticado, nao se o recurso pertence a ele.

**Como evitar:**
- Sempre filtrar por `userId` ou `tenantId` no repositorio
- Nunca confiar so no ID da URL
- Implementar guards ou interceptors que verificam ownership

```typescript
// ERRADO — so verifica autenticacao
async findOne(id: string) {
  return this.ordersRepository.findById(id);
}

// CERTO — verifica autenticacao E ownership
async findOne(id: string, userId: string) {
  const order = await this.ordersRepository.findById(id);
  if (order.userId !== userId) {
    throw new ForbiddenException('Access denied');
  }
  return order;
}
```

### Cenario 5: Upload de arquivo sem validacao

**O que acontece:** A API aceita upload de qualquer arquivo. O atacante faz upload de um `.php` ou `.html` com JavaScript malicioso. Se o arquivo for servido diretamente pelo servidor, o script executa no contexto do dominio.

**Como evitar:**
- Validar MIME type e extensao no backend
- Limitar tamanho maximo do arquivo
- Nunca servir uploads diretamente — usar CDN ou storage externo (S3)
- Renomear arquivos com UUID (nunca manter o nome original)

### Cenario 6: Logging excessivo expondo dados sensiveis

**O que acontece:** O dev coloca `console.log(req.body)` para debugar e esquece de remover. Em producao, senhas, tokens e dados pessoais vao parar nos logs. Se os logs forem acessiveis (CloudWatch, Datadog, arquivo em servidor), qualquer pessoa com acesso le tudo.

**Como evitar:**
- Nunca logar `req.body` inteiro em producao
- Usar um logger estruturado que filtra campos sensiveis
- Configurar log levels por ambiente (debug so em development)

```typescript
// src/common/interceptors/logging.interceptor.ts
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'creditCard'];

function sanitizeForLogging(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized = { ...data };
  for (const field of SENSITIVE_FIELDS) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]';
    }
  }
  return sanitized;
}
```

### Cenario 7: Dependencia comprometida (supply chain attack)

**O que acontece:** Um pacote npm popular e comprometido (o mantenedor vende a conta, ou uma dependencia transitiva e hackeada). O codigo malicioso roda no build ou no runtime, roubando variaveis de ambiente ou injetando backdoors.

**Como evitar:**
- Sempre commitar o lockfile
- Usar `npm ci` em vez de `npm install` no CI/producao
- Configurar Dependabot/Renovate para atualizacoes controladas
- Revisar changelogs antes de atualizar major versions
- Considerar `npm audit signatures` para verificar integridade

---

## 11.15 — Checklist de seguranca pre-deploy

Antes de cada deploy para producao, verifique:

| # | Item | Status |
|---|------|--------|
| 1 | Helmet esta configurado e e o primeiro middleware | ☐ |
| 2 | CORS esta configurado com whitelist (nao `*`) | ☐ |
| 3 | Rate limiting esta ativo globalmente e restritivo em login/register | ☐ |
| 4 | ValidationPipe global com `whitelist` e `forbidNonWhitelisted` | ☐ |
| 5 | Nenhum `.env` ou secret no repositorio (verificar historico do git) | ☐ |
| 6 | Variaveis de ambiente validadas na inicializacao (Zod schema) | ☐ |
| 7 | Senhas armazenadas com bcrypt (12+ rounds) | ☐ |
| 8 | Senha nunca retornada em nenhuma response da API | ☐ |
| 9 | JWT com secret forte (64+ bytes), access token curto (15min) | ☐ |
| 10 | Refresh token com rotation e possibilidade de revogacao | ☐ |
| 11 | HTTPS obrigatorio com redirect HTTP -> HTTPS | ☐ |
| 12 | `npm audit` sem vulnerabilidades criticas | ☐ |
| 13 | Queries parametrizadas (nenhum uso de `$queryRawUnsafe`) | ☐ |
| 14 | Uploads validados (tipo, tamanho, nome sanitizado) | ☐ |
| 15 | Logs nao contem dados sensiveis (senhas, tokens, cartoes) | ☐ |
| 16 | Endpoints protegidos verificam ownership (nao so autenticacao) | ☐ |
| 17 | Mensagens de erro genericas em login (nao revelar se email existe) | ☐ |

**Regra Bravy:** este checklist e parte do processo de code review para PRs que vao para producao.

---

## Proximos passos

- Precisa implementar autenticacao completa? -> [07-autenticacao.md](07-autenticacao.md)
- Precisa configurar Docker e nginx? -> [10-devops.md](10-devops.md)
- Precisa revisar padroes de API? -> [08-api.md](08-api.md)
- Voltar ao indice -> [00-indice.md](00-indice.md)
