# 04 — Guia do Backend NestJS

> Tutorial progressivo para vibecoders. Começa simples, vai aprofundando.
> Todo código é TypeScript real, funcional e copiável.

---

## 4.1 — O que é o NestJS e por que usar?

O NestJS é um framework Node.js que organiza seu backend como uma **empresa bem estruturada**. Sem ele, seu código vira um galpão onde todo mundo faz tudo — com ele, cada pessoa tem mesa, função e responsabilidade clara.

### A analogia da empresa

Imagine que seu backend é uma empresa. Cada peça do NestJS tem um papel:

| Peça NestJS    | Papel na empresa           | O que faz no código                                    |
| -------------- | -------------------------- | ------------------------------------------------------ |
| **Module**     | Departamento               | Agrupa tudo relacionado a um domínio (ex: Produtos)    |
| **Controller** | Recepcionista              | Recebe o pedido HTTP, encaminha pro especialista        |
| **Service**    | Especialista               | Faz o trabalho pesado: lógica de negócio               |
| **Repository** | Arquivista                 | Acessa o banco de dados, guarda e busca registros       |
| **Guard**      | Segurança na portaria      | Barra quem não tem acesso (autenticação/autorização)   |
| **Pipe**       | Inspetor de qualidade      | Valida e transforma o que entra (dados do request)     |
| **Interceptor**| Gerente de qualidade       | Transforma o que sai (padroniza respostas, logging)    |
| **Filter**     | Bombeiro                   | Lida com erros — quando algo explode, ele apaga o fogo |

### O fluxo de um request

```
Cliente HTTP
  │
  ▼
Guard (tem crachá? pode entrar?)
  │
  ▼
Pipe (o pedido está correto? dados válidos?)
  │
  ▼
Controller (recepcionista anota o pedido)
  │
  ▼
Service (especialista executa a lógica)
  │
  ▼
Repository (arquivista busca/salva no banco)
  │
  ▼
Interceptor (gerente padroniza a resposta)
  │
  ▼
Filter (se algo deu errado, bombeiro trata o erro)
  │
  ▼
Resposta HTTP
```

### Por que NestJS e não Express puro?

- **Estrutura obrigatória** — sem debate de "onde colocar isso?"
- **Injeção de dependência** — peças se conectam automaticamente
- **Decorators** — configuração declarativa, menos boilerplate
- **Ecossistema** — Swagger, validação, auth, tudo pronto
- **TypeScript nativo** — tipos de ponta a ponta

---

## 4.2 — Estrutura de pastas completa

```
src/
├── main.ts                          # Ponto de entrada da aplicação
├── app.module.ts                    # Módulo raiz — registra todos os módulos
├── app.controller.ts                # Controller raiz (health check)
├── app.service.ts                   # Service raiz (lógica mínima)
│
├── common/                          # Código compartilhado entre módulos
│   ├── constants/
│   │   └── app.constants.ts         # Constantes globais (roles, status)
│   ├── decorators/
│   │   ├── current-user.decorator.ts # Extrai usuário do request
│   │   └── roles.decorator.ts       # Marca roles necessárias na rota
│   ├── dtos/
│   │   └── pagination.dto.ts        # DTO de paginação reutilizável
│   ├── enums/
│   │   └── role.enum.ts             # Enum de papéis (ADMIN, USER)
│   ├── filters/
│   │   └── http-exception.filter.ts # Filter global de erros HTTP
│   ├── guards/
│   │   ├── jwt-auth.guard.ts        # Guard de autenticação JWT
│   │   └── roles.guard.ts           # Guard de autorização por role
│   ├── interceptors/
│   │   ├── logging.interceptor.ts   # Loga tempo de resposta
│   │   └── transform.interceptor.ts # Padroniza formato de resposta
│   ├── pipes/
│   │   └── parse-uuid.pipe.ts       # Valida e parseia UUIDs
│   └── types/
│       └── express.d.ts             # Extensão de tipos do Express
│
├── config/                          # Configuração da aplicação
│   ├── app.config.ts                # Config geral (porta, nome)
│   ├── database.config.ts           # Config do banco de dados
│   └── jwt.config.ts                # Config do JWT (secret, expiry)
│
├── database/                        # Camada de banco de dados
│   ├── database.module.ts           # Módulo de conexão com o banco
│   └── prisma.service.ts            # Service do Prisma ORM
│
├── modules/                         # Módulos de domínio
│   ├── auth/                        # Módulo de autenticação
│   │   ├── auth.module.ts           # Registro de providers de auth
│   │   ├── auth.controller.ts       # Rotas: login, register, refresh
│   │   ├── auth.service.ts          # Lógica: hash senha, gerar token
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts      # Estratégia Passport JWT
│   │   └── dtos/
│   │       ├── login.dto.ts         # DTO de login
│   │       └── register.dto.ts      # DTO de registro
│   │
│   ├── users/                       # Módulo de usuários
│   │   ├── users.module.ts          # Registro de providers de users
│   │   ├── users.controller.ts      # Rotas: CRUD de usuários
│   │   ├── users.service.ts         # Lógica de negócio de usuários
│   │   ├── users.repository.ts      # Acesso ao banco (tabela users)
│   │   └── dtos/
│   │       ├── create-user.dto.ts   # DTO de criação
│   │       ├── update-user.dto.ts   # DTO de atualização
│   │       └── user-response.dto.ts # DTO de resposta (sem senha)
│   │
│   └── products/                    # Módulo de produtos (exemplo CRUD)
│       ├── products.module.ts       # Registro de providers de products
│       ├── products.controller.ts   # Rotas: CRUD de produtos
│       ├── products.service.ts      # Lógica de negócio de produtos
│       ├── products.repository.ts   # Acesso ao banco (tabela products)
│       └── dtos/
│           ├── create-product.dto.ts    # DTO de criação
│           ├── update-product.dto.ts    # DTO de atualização
│           └── product-response.dto.ts  # DTO de resposta
│
├── prisma/
│   └── schema.prisma                # Schema do banco de dados
│
test/
├── jest-e2e.json                    # Config do Jest para testes e2e
└── app.e2e-spec.ts                  # Testes end-to-end
```

### Detalhamento por arquivo

#### `src/main.ts`

- **O que é:** Ponto de entrada — configura e inicia o servidor.
- **Quando mexer:** Ao adicionar plugins globais (Swagger, CORS, validação).

```typescript
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(3000);
}
bootstrap();
```

#### `src/app.module.ts`

- **O que é:** Módulo raiz — importa todos os outros módulos.
- **Quando mexer:** Ao criar um módulo novo (ex: `OrdersModule`).

```typescript
import { Module } from '@nestjs/common';
import { ProductsModule } from './modules/products/products.module';

@Module({
  imports: [ProductsModule],
})
export class AppModule {}
```

#### `src/common/filters/http-exception.filter.ts`

- **O que é:** Captura exceções HTTP e padroniza a resposta de erro.
- **Quando mexer:** Ao mudar o formato de erro da API.

```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      timestamp: new Date().toISOString(),
    });
  }
}
```

#### `src/common/guards/jwt-auth.guard.ts`

- **O que é:** Protege rotas — só deixa passar quem tem token JWT válido.
- **Quando mexer:** Raramente. Configuração única.

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

#### `src/common/interceptors/transform.interceptor.ts`

- **O que é:** Envolve toda resposta num formato padrão `{ data, meta }`.
- **Quando mexer:** Ao mudar o envelope de resposta da API.

```typescript
import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, { data: T }> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<{ data: T }> {
    return next.handle().pipe(
      map((data) => ({ data })),
    );
  }
}
```

#### `src/common/pipes/parse-uuid.pipe.ts`

- **O que é:** Valida que um parâmetro de rota é um UUID válido.
- **Quando mexer:** Raramente. Pipe utilitário.

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { isUUID } from 'class-validator';

@Injectable()
export class ParseUuidPipe implements PipeTransform<string> {
  transform(value: string): string {
    if (!isUUID(value, '4')) {
      throw new BadRequestException(`"${value}" não é um UUID válido`);
    }
    return value;
  }
}
```

#### `src/common/decorators/current-user.decorator.ts`

- **O que é:** Decorator customizado que extrai o usuário autenticado do request.
- **Quando mexer:** Ao mudar o que é salvo no token JWT.

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```

#### `src/common/dtos/pagination.dto.ts`

- **O que é:** DTO reutilizável de paginação (page, limit).
- **Quando mexer:** Ao mudar o padrão de paginação.

```typescript
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;

  get skip(): number {
    return (this.page - 1) * this.limit;
  }
}
```

#### `src/database/prisma.service.ts`

- **O que é:** Encapsula a conexão do Prisma, gerencia lifecycle.
- **Quando mexer:** Raramente. Configuração única.

```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

#### `src/config/database.config.ts`

- **O que é:** Registra config do banco como objeto tipado.
- **Quando mexer:** Ao mudar URL, pool, ou SSL do banco.

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  url: process.env.DATABASE_URL,
  logging: process.env.DATABASE_LOGGING === 'true',
}));
```

---

## 4.3 — O fluxo de uma feature: CRUD de Produtos passo a passo

Vamos construir um CRUD completo de Produtos. Cada arquivo com código real, funcional e copiável. Siga na ordem.

### Passo 1 — Schema do Prisma

Abra `prisma/schema.prisma` e adicione o model:

```typescript
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Product {
  id          String   @id @default(uuid())
  name        String
  description String?
  price       Float
  stock       Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@map("products")
}
```

Rode a migration:

```bash
npx prisma migrate dev --name add-products
```

### Passo 2 — DTOs (contratos de entrada e saída)

#### `src/modules/products/dtos/create-product.dto.ts`

O DTO de criação define **exatamente** o que o cliente pode enviar para criar um produto:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsInt,
  Min,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nome do produto',
    example: 'Camiseta Preta G',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada do produto',
    example: 'Camiseta 100% algodão, cor preta, tamanho G',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @ApiProperty({
    description: 'Preço em reais',
    example: 79.9,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;

  @ApiPropertyOptional({
    description: 'Quantidade em estoque',
    example: 150,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  stock?: number;
}
```

#### `src/modules/products/dtos/update-product.dto.ts`

O DTO de atualização torna todos os campos opcionais com `PartialType`:

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

#### `src/modules/products/dtos/product-response.dto.ts`

O DTO de resposta define **exatamente** o que a API retorna. Nunca retorne a entidade crua do banco:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' })
  id: string;

  @ApiProperty({ example: 'Camiseta Preta G' })
  name: string;

  @ApiPropertyOptional({ example: 'Camiseta 100% algodão, cor preta, tamanho G' })
  description: string | null;

  @ApiProperty({ example: 79.9 })
  price: number;

  @ApiProperty({ example: 150 })
  stock: number;

  @ApiProperty({ example: true })
  active: boolean;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-01-15T10:30:00.000Z' })
  updatedAt: Date;

  static fromEntity(entity: {
    id: string;
    name: string;
    description: string | null;
    price: number;
    stock: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): ProductResponseDto {
    const dto = new ProductResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.description = entity.description;
    dto.price = entity.price;
    dto.stock = entity.stock;
    dto.active = entity.active;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
```

### Passo 3 — Repository (acesso ao banco)

#### `src/modules/products/products.repository.ts`

O repository é o **arquivista** — só ele fala com o banco. O service nunca chama o Prisma diretamente:

```typescript
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({ data });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ProductWhereInput;
    orderBy?: Prisma.ProductOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        skip,
        take,
        where,
        orderBy: orderBy ?? { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async findById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findByName(name: string) {
    return this.prisma.product.findFirst({
      where: { name, active: true },
    });
  }

  async update(id: string, data: Prisma.ProductUpdateInput) {
    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { active: false },
    });
  }

  async hardDelete(id: string) {
    return this.prisma.product.delete({ where: { id } });
  }
}
```

### Passo 4 — Service (lógica de negócio)

#### `src/modules/products/products.service.ts`

O service é o **especialista** — contém toda a lógica de negócio. Nunca coloque lógica no controller:

```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductResponseDto } from './dtos/product-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const existing = await this.productsRepository.findByName(dto.name);
    if (existing) {
      throw new ConflictException(`Produto "${dto.name}" já existe`);
    }

    const product = await this.productsRepository.create({
      name: dto.name,
      description: dto.description,
      price: dto.price,
      stock: dto.stock ?? 0,
    });

    return ProductResponseDto.fromEntity(product);
  }

  async findAll(
    pagination: PaginationDto,
  ): Promise<{ items: ProductResponseDto[]; total: number; page: number; limit: number }> {
    const { items, total } = await this.productsRepository.findAll({
      skip: pagination.skip,
      take: pagination.limit,
      where: { active: true },
    });

    return {
      items: items.map(ProductResponseDto.fromEntity),
      total,
      page: pagination.page,
      limit: pagination.limit,
    };
  }

  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    return ProductResponseDto.fromEntity(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    if (dto.name && dto.name !== product.name) {
      const existing = await this.productsRepository.findByName(dto.name);
      if (existing) {
        throw new ConflictException(`Produto "${dto.name}" já existe`);
      }
    }

    const updated = await this.productsRepository.update(id, dto);
    return ProductResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException(`Produto com ID "${id}" não encontrado`);
    }

    await this.productsRepository.softDelete(id);
  }
}
```

### Passo 5 — Controller (recepcionista HTTP)

#### `src/modules/products/products.controller.ts`

O controller é a **recepcionista** — recebe o request, chama o service, devolve a resposta. Zero lógica de negócio aqui:

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { ProductResponseDto } from './dtos/product-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { ParseUuidPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Produtos')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar um novo produto' })
  @ApiResponse({
    status: 201,
    description: 'Produto criado com sucesso',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Produto com este nome já existe' })
  async create(@Body() dto: CreateProductDto): Promise<ProductResponseDto> {
    return this.productsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar produtos com paginação' })
  @ApiResponse({
    status: 200,
    description: 'Lista de produtos',
  })
  async findAll(@Query() pagination: PaginationDto) {
    return this.productsService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar produto por ID' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({
    status: 200,
    description: 'Produto encontrado',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async findOne(@Param('id', ParseUuidPipe) id: string): Promise<ProductResponseDto> {
    return this.productsService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar produto' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({
    status: 200,
    description: 'Produto atualizado',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  @ApiResponse({ status: 409, description: 'Produto com este nome já existe' })
  async update(
    @Param('id', ParseUuidPipe) id: string,
    @Body() dto: UpdateProductDto,
  ): Promise<ProductResponseDto> {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover produto (soft delete)' })
  @ApiParam({ name: 'id', description: 'UUID do produto' })
  @ApiResponse({ status: 204, description: 'Produto removido' })
  @ApiResponse({ status: 404, description: 'Produto não encontrado' })
  async remove(@Param('id', ParseUuidPipe) id: string): Promise<void> {
    return this.productsService.remove(id);
  }
}
```

### Passo 6 — Module (departamento)

#### `src/modules/products/products.module.ts`

O module **registra** todas as peças do domínio Produtos. Sem registro aqui, nada funciona:

```typescript
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ProductsController],
  providers: [ProductsService, ProductsRepository],
  exports: [ProductsService],
})
export class ProductsModule {}
```

### Passo 7 — Registrar no `app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProductsModule } from './modules/products/products.module';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    ProductsModule,
  ],
})
export class AppModule {}
```

### Passo 8 — Database Module

#### `src/database/database.module.ts`

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
```

### Passo 9 — Testar

```bash
# Subir a aplicação
npm run start:dev

# Criar produto
curl -X POST http://localhost:3000/products \
  -H "Content-Type: application/json" \
  -d '{"name":"Camiseta Preta G","price":79.90,"stock":150}'

# Listar produtos
curl http://localhost:3000/products

# Buscar por ID
curl http://localhost:3000/products/{id-retornado}

# Atualizar
curl -X PUT http://localhost:3000/products/{id-retornado} \
  -H "Content-Type: application/json" \
  -d '{"price":69.90}'

# Remover (soft delete)
curl -X DELETE http://localhost:3000/products/{id-retornado}
```

---

## 4.4 — Camada por camada (referência detalhada)

### Controller

**O que é:** A recepcionista da API. Recebe requests HTTP, delega pro service, devolve a resposta.

**O que NÃO pode fazer:**

- Acessar o banco de dados diretamente
- Conter lógica de negócio (if/else de regras)
- Chamar outros controllers

**Template padrão:**

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('NomeDoRecurso')
@Controller('nome-do-recurso')
export class NomeController {
  constructor(private readonly nomeService: NomeService) {}

  @Post()
  @ApiOperation({ summary: 'Criar recurso' })
  @ApiResponse({ status: 201, description: 'Criado' })
  async create(@Body() dto: CreateNomeDto) {
    return this.nomeService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar recursos' })
  async findAll(@Query() pagination: PaginationDto) {
    return this.nomeService.findAll(pagination);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar recurso por ID' })
  async findOne(@Param('id', ParseUuidPipe) id: string) {
    return this.nomeService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar recurso' })
  async update(@Param('id', ParseUuidPipe) id: string, @Body() dto: UpdateNomeDto) {
    return this.nomeService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover recurso' })
  async remove(@Param('id', ParseUuidPipe) id: string) {
    return this.nomeService.remove(id);
  }
}
```

**Anti-pattern da LLM:** A LLM adora colocar `try/catch` em todo método do controller e tratar erros manualmente. **Não faça isso.** O NestJS tem o `ExceptionFilter` global que trata tudo. O controller só chama o service e retorna.

```typescript
// ❌ ERRADO — a LLM adora gerar isso
@Post()
async create(@Body() dto: CreateProductDto) {
  try {
    return await this.productsService.create(dto);
  } catch (error) {
    throw new HttpException(error.message, 500);
  }
}

// ✅ CERTO — simples, limpo, o filter global cuida dos erros
@Post()
async create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

---

### Service

**O que é:** O especialista. Contém toda a lógica de negócio: validações, regras, orquestração.

**O que NÃO pode fazer:**

- Acessar `request` ou `response` do HTTP
- Usar decorators HTTP (`@Get`, `@Post`)
- Chamar o Prisma diretamente (deve usar o Repository)

**Template padrão:**

```typescript
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';

@Injectable()
export class NomeService {
  constructor(private readonly nomeRepository: NomeRepository) {}

  async create(dto: CreateNomeDto): Promise<NomeResponseDto> {
    // 1. Validar regras de negócio
    // 2. Chamar repository
    // 3. Mapear para DTO de resposta
    const entity = await this.nomeRepository.create(dto);
    return NomeResponseDto.fromEntity(entity);
  }

  async findOne(id: string): Promise<NomeResponseDto> {
    const entity = await this.nomeRepository.findById(id);
    if (!entity) {
      throw new NotFoundException(`Recurso "${id}" não encontrado`);
    }
    return NomeResponseDto.fromEntity(entity);
  }
}
```

**Anti-pattern da LLM:** A LLM retorna a entidade do banco diretamente, sem mapear para DTO. Isso expõe campos internos (senha, tokens, campos deletados).

```typescript
// ❌ ERRADO — expõe a entidade inteira do banco
async findOne(id: string) {
  return this.prisma.user.findUnique({ where: { id } });
}

// ✅ CERTO — mapeia para DTO de resposta
async findOne(id: string): Promise<UserResponseDto> {
  const user = await this.usersRepository.findById(id);
  if (!user) throw new NotFoundException(`Usuário "${id}" não encontrado`);
  return UserResponseDto.fromEntity(user);
}
```

---

### Repository

**O que é:** O arquivista. Única camada que fala com o banco de dados.

**O que NÃO pode fazer:**

- Conter lógica de negócio
- Lançar exceções HTTP (`NotFoundException`, etc.)
- Acessar DTOs — recebe dados primitivos ou tipos do Prisma

**Template padrão:**

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class NomeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.NomeCreateInput) {
    return this.prisma.nome.create({ data });
  }

  async findById(id: string) {
    return this.prisma.nome.findUnique({ where: { id } });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.NomeWhereInput;
  }) {
    const { skip, take, where } = params;
    const [items, total] = await Promise.all([
      this.prisma.nome.findMany({ skip, take, where }),
      this.prisma.nome.count({ where }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.NomeUpdateInput) {
    return this.prisma.nome.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.nome.delete({ where: { id } });
  }
}
```

**Anti-pattern da LLM:** A LLM pula a camada de repository e coloca `this.prisma` direto no service. Funciona, mas acopla tudo. Se trocar de ORM, reescreve o projeto inteiro.

```typescript
// ❌ ERRADO — Prisma direto no service
@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany();
  }
}

// ✅ CERTO — repository isola o acesso ao banco
@Injectable()
export class ProductsService {
  constructor(private readonly productsRepository: ProductsRepository) {}

  async findAll() {
    return this.productsRepository.findAll({});
  }
}
```

---

### DTO (Data Transfer Object)

**O que é:** O contrato entre cliente e API. Define exatamente o que entra e o que sai.

**O que NÃO pode fazer:**

- Conter lógica de negócio
- Acessar o banco de dados
- Ter métodos complexos (exceto `fromEntity` para mapeamento)

**Template de criação:**

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class CreateNomeDto {
  @ApiProperty({ description: 'Campo obrigatório', example: 'valor' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  campo: string;

  @ApiPropertyOptional({ description: 'Campo opcional', example: 'valor' })
  @IsOptional()
  @IsString()
  campoOpcional?: string;
}
```

**Template de atualização (herda do create com tudo opcional):**

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateNomeDto } from './create-nome.dto';

export class UpdateNomeDto extends PartialType(CreateNomeDto) {}
```

**Template de resposta:**

```typescript
import { ApiProperty } from '@nestjs/swagger';

export class NomeResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  campo: string;

  static fromEntity(entity: any): NomeResponseDto {
    const dto = new NomeResponseDto();
    dto.id = entity.id;
    dto.campo = entity.campo;
    return dto;
  }
}
```

**Anti-pattern da LLM:** A LLM não coloca validação nos DTOs. O campo aceita qualquer coisa e erros só aparecem em runtime.

```typescript
// ❌ ERRADO — sem validação, aceita qualquer lixo
export class CreateProductDto {
  name: string;
  price: number;
}

// ✅ CERTO — validação explícita com class-validator
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  price: number;
}
```

---

### Guard

**O que é:** O segurança na portaria. Decide se o request pode ou não entrar na rota.

**O que NÃO pode fazer:**

- Modificar o body do request
- Chamar services de negócio
- Retornar dados — só retorna `true` (passa) ou lança exceção (barra)

**Template de Guard por role:**

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { Role } from '../enums/role.enum';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) return true;

    const { user } = context.switchToHttp().getRequest();
    const hasRole = requiredRoles.some((role) => user?.roles?.includes(role));

    if (!hasRole) {
      throw new ForbiddenException('Acesso negado: permissão insuficiente');
    }

    return true;
  }
}
```

**Decorator auxiliar para roles:**

```typescript
// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from '../enums/role.enum';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
```

**Enum de roles:**

```typescript
// src/common/enums/role.enum.ts
export enum Role {
  USER = 'user',
  ADMIN = 'admin',
}
```

**Uso no controller:**

```typescript
@Post()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
async create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

**Anti-pattern da LLM:** A LLM coloca verificação de role dentro do service ou controller ao invés de usar Guard.

```typescript
// ❌ ERRADO — verificação manual no service
async create(dto: CreateProductDto, user: User) {
  if (user.role !== 'admin') {
    throw new ForbiddenException();
  }
  // ...
}

// ✅ CERTO — Guard cuida disso declarativamente
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Post()
async create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

---

### Pipe

**O que é:** O inspetor de qualidade. Valida e/ou transforma dados **antes** de chegarem no controller.

**O que NÃO pode fazer:**

- Acessar o banco de dados
- Conter lógica de negócio
- Modificar o response

**Template de Pipe customizado:**

```typescript
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class ParseIntSafePipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
      throw new BadRequestException(`"${value}" não é um número inteiro válido`);
    }
    return parsed;
  }
}
```

**Pipe de validação global (configurar uma vez no `main.ts`):**

```typescript
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
  }),
);
```

- `whitelist: true` — remove campos que não estão no DTO
- `forbidNonWhitelisted: true` — lança erro se enviar campo extra
- `transform: true` — converte tipos automaticamente (string → number)

**Anti-pattern da LLM:** A LLM esquece de ativar o `ValidationPipe` global e os DTOs não validam nada.

---

### Interceptor

**O que é:** O gerente de qualidade. Executa lógica **antes e/ou depois** do handler do controller.

**O que NÃO pode fazer:**

- Barrar requests (isso é Guard)
- Validar dados (isso é Pipe)
- Acessar banco diretamente

**Template de Interceptor de logging:**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const elapsed = Date.now() - start;
        this.logger.log(`${method} ${url} — ${elapsed}ms`);
      }),
    );
  }
}
```

**Template de Interceptor de cache simples:**

```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SimpleCacheInterceptor implements NestInterceptor {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly ttl = 60_000;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    if (request.method !== 'GET') return next.handle();

    const key = request.url;
    const cached = this.cache.get(key);

    if (cached && cached.expiry > Date.now()) {
      return of(cached.data);
    }

    return next.handle().pipe(
      tap((data) => {
        this.cache.set(key, { data, expiry: Date.now() + this.ttl });
      }),
    );
  }
}
```

**Anti-pattern da LLM:** A LLM coloca logging manual em cada método do controller/service em vez de usar um interceptor global.

---

### Exception Filter

**O que é:** O bombeiro. Quando algo explode (exceção), ele apaga o fogo e retorna uma resposta formatada.

**O que NÃO pode fazer:**

- Prevenir erros (isso é Guard + Pipe)
- Modificar dados de sucesso (isso é Interceptor)
- Conter lógica de negócio

**Template completo:**

```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro interno do servidor';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || exception.message;
    }

    this.logger.error(
      `${request.method} ${request.url} — ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      statusCode: status,
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
```

**Anti-pattern da LLM:** A LLM cria `try/catch` em todo controller/service em vez de confiar no filter global.

---

### Custom Decorator

**O que é:** Atalho reutilizável que extrai dados do request ou combina decorators.

**O que NÃO pode fazer:**

- Conter lógica de negócio pesada
- Acessar banco de dados
- Substituir Guards ou Pipes

**Template de decorator que combina auth + roles:**

```typescript
import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '../enums/role.enum';

export function Auth(...roles: Role[]) {
  return applyDecorators(
    UseGuards(JwtAuthGuard, RolesGuard),
    Roles(...roles),
    ApiBearerAuth(),
  );
}
```

**Uso simplificado:**

```typescript
@Auth(Role.ADMIN)
@Post()
async create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

---

## 4.5 — Configuração global

### `main.ts` completo

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  // Prefixo global de API
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3001'),
    credentials: true,
  });

  // Validação global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Filter global de exceções
  app.useGlobalFilters(new AllExceptionsFilter());

  // Interceptors globais
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('API')
    .setDescription('Documentação da API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  // Iniciar servidor
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);

  logger.log(`Aplicação rodando em http://localhost:${port}`);
  logger.log(`Swagger disponível em http://localhost:${port}/docs`);
}
bootstrap();
```

### Arquivo `.env`

```bash
# Servidor
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3001

# Banco de dados
DATABASE_URL=postgresql://user:password@localhost:5432/myapp?schema=public
DATABASE_LOGGING=false

# JWT
JWT_SECRET=sua-chave-secreta-muito-longa-e-aleatoria
JWT_EXPIRES_IN=7d
```

### `@nestjs/config` — Como usar

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),
  ],
})
export class AppModule {}
```

```typescript
// Injetando em qualquer service
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SomeService {
  constructor(private readonly config: ConfigService) {}

  getPort(): number {
    return this.config.get<number>('PORT', 3000);
  }
}
```

### ESLint — `.eslintrc.js`

```javascript
module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: 'tsconfig.json',
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint/eslint-plugin'],
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  root: true,
  env: {
    node: true,
    jest: true,
  },
  ignorePatterns: ['.eslintrc.js'],
  rules: {
    '@typescript-eslint/interface-name-prefix': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

### Prettier — `.prettierrc`

```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true,
  "arrowParens": "always"
}
```

---

## 4.6 — Testes

### Filosofia de testes

Regra absoluta: **todo service deve ter testes unitários**. Se o service não tem teste, não está pronto.

Dois tipos de teste:

| Tipo       | O que testa                      | Velocidade | Quando usar           |
| ---------- | -------------------------------- | ---------- | --------------------- |
| Unitário   | Uma classe isolada (mock deps)   | Rápido     | Todo service e pipe   |
| E2E        | Fluxo completo (HTTP → banco)    | Lento      | Fluxos críticos       |

### Jest Config — `jest.config.ts`

```typescript
import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(service|repository|pipe|guard).ts'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/$1',
  },
};

export default config;
```

### Jest E2E Config — `test/jest-e2e.json`

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^src/(.*)$": "<rootDir>/../src/$1"
  }
}
```

### Teste unitário de Service — `products.service.spec.ts`

O padrão é: **criar mock do repository, injetar no service, testar cada método**.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dtos/create-product.dto';
import { UpdateProductDto } from './dtos/update-product.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

const mockProduct = {
  id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  name: 'Camiseta Preta G',
  description: 'Camiseta 100% algodão',
  price: 79.9,
  stock: 150,
  active: true,
  createdAt: new Date('2025-01-15T10:30:00Z'),
  updatedAt: new Date('2025-01-15T10:30:00Z'),
};

const mockRepository = {
  create: jest.fn(),
  findAll: jest.fn(),
  findById: jest.fn(),
  findByName: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
};

describe('ProductsService', () => {
  let service: ProductsService;
  let repository: typeof mockRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: ProductsRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    repository = module.get(ProductsRepository);

    jest.clearAllMocks();
  });

  describe('create', () => {
    const dto: CreateProductDto = {
      name: 'Camiseta Preta G',
      price: 79.9,
      stock: 150,
    };

    it('deve criar um produto com sucesso', async () => {
      repository.findByName.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockProduct);

      const result = await service.create(dto);

      expect(repository.findByName).toHaveBeenCalledWith(dto.name);
      expect(repository.create).toHaveBeenCalledWith({
        name: dto.name,
        description: undefined,
        price: dto.price,
        stock: dto.stock,
      });
      expect(result.id).toBe(mockProduct.id);
      expect(result.name).toBe(mockProduct.name);
    });

    it('deve lançar ConflictException se produto já existe', async () => {
      repository.findByName.mockResolvedValue(mockProduct);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('deve retornar lista paginada de produtos', async () => {
      const pagination = new PaginationDto();
      pagination.page = 1;
      pagination.limit = 20;

      repository.findAll.mockResolvedValue({
        items: [mockProduct],
        total: 1,
      });

      const result = await service.findAll(pagination);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });
  });

  describe('findOne', () => {
    it('deve retornar um produto por ID', async () => {
      repository.findById.mockResolvedValue(mockProduct);

      const result = await service.findOne(mockProduct.id);

      expect(result.id).toBe(mockProduct.id);
    });

    it('deve lançar NotFoundException se produto não existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findOne('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const dto: UpdateProductDto = { price: 69.9 };

    it('deve atualizar um produto com sucesso', async () => {
      repository.findById.mockResolvedValue(mockProduct);
      repository.update.mockResolvedValue({ ...mockProduct, price: 69.9 });

      const result = await service.update(mockProduct.id, dto);

      expect(result.price).toBe(69.9);
      expect(repository.update).toHaveBeenCalledWith(mockProduct.id, dto);
    });

    it('deve lançar NotFoundException se produto não existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('id-inexistente', dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('deve lançar ConflictException se nome já existe em outro produto', async () => {
      const updateDto: UpdateProductDto = { name: 'Outro Produto' };
      repository.findById.mockResolvedValue(mockProduct);
      repository.findByName.mockResolvedValue({
        ...mockProduct,
        id: 'outro-id',
        name: 'Outro Produto',
      });

      await expect(
        service.update(mockProduct.id, updateDto),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove', () => {
    it('deve remover (soft delete) um produto', async () => {
      repository.findById.mockResolvedValue(mockProduct);
      repository.softDelete.mockResolvedValue(undefined);

      await service.remove(mockProduct.id);

      expect(repository.softDelete).toHaveBeenCalledWith(mockProduct.id);
    });

    it('deve lançar NotFoundException se produto não existe', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('id-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```

### Teste E2E — `test/app.e2e-spec.ts`

O teste E2E testa o fluxo completo: HTTP request → controller → service → banco → resposta.

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('ProductsController (e2e)', () => {
  let app: INestApplication;
  let createdProductId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/products', () => {
    it('deve criar um produto', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .send({
          name: 'Produto E2E Test',
          price: 99.9,
          stock: 10,
        })
        .expect(201)
        .then((response) => {
          expect(response.body.data).toBeDefined();
          expect(response.body.data.name).toBe('Produto E2E Test');
          expect(response.body.data.price).toBe(99.9);
          createdProductId = response.body.data.id;
        });
    });

    it('deve rejeitar dados inválidos', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .send({
          name: '',
          price: -10,
        })
        .expect(400);
    });

    it('deve rejeitar produto duplicado', () => {
      return request(app.getHttpServer())
        .post('/api/v1/products')
        .send({
          name: 'Produto E2E Test',
          price: 99.9,
        })
        .expect(409);
    });
  });

  describe('GET /api/v1/products', () => {
    it('deve listar produtos', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products')
        .expect(200)
        .then((response) => {
          expect(response.body.data).toBeDefined();
          expect(response.body.data.items).toBeInstanceOf(Array);
          expect(response.body.data.total).toBeGreaterThanOrEqual(1);
        });
    });

    it('deve aceitar paginação', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products?page=1&limit=5')
        .expect(200)
        .then((response) => {
          expect(response.body.data.page).toBe(1);
          expect(response.body.data.limit).toBe(5);
        });
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('deve buscar produto por ID', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/products/${createdProductId}`)
        .expect(200)
        .then((response) => {
          expect(response.body.data.id).toBe(createdProductId);
        });
    });

    it('deve retornar 404 para ID inexistente', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/00000000-0000-4000-a000-000000000000')
        .expect(404);
    });

    it('deve retornar 400 para ID inválido', () => {
      return request(app.getHttpServer())
        .get('/api/v1/products/id-invalido')
        .expect(400);
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    it('deve atualizar um produto', () => {
      return request(app.getHttpServer())
        .put(`/api/v1/products/${createdProductId}`)
        .send({ price: 89.9 })
        .expect(200)
        .then((response) => {
          expect(response.body.data.price).toBe(89.9);
        });
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    it('deve remover um produto (soft delete)', () => {
      return request(app.getHttpServer())
        .delete(`/api/v1/products/${createdProductId}`)
        .expect(204);
    });
  });
});
```

### Rodando os testes

```bash
# Testes unitários
npm run test

# Testes unitários com coverage
npm run test:cov

# Testes e2e
npm run test:e2e

# Watch mode (rerroda ao salvar)
npm run test:watch
```

### Regras de ouro dos testes

1. **Todo service deve ter testes** — sem exceção
2. **Mock o repository, não o banco** — teste unitário é rápido porque não toca no banco
3. **Teste o happy path E os erros** — `NotFoundException`, `ConflictException`, etc.
4. **Nomeie os testes em português** — `deve criar um produto com sucesso`
5. **Um `describe` por método** — organiza e facilita debugar
6. **`beforeEach` limpa os mocks** — `jest.clearAllMocks()` evita interferência entre testes
7. **E2E testa o fluxo completo** — cria, lista, busca, atualiza, remove (nessa ordem)

---

> **Resumo rápido:** Module agrupa, Controller recebe, Service pensa, Repository guarda, Guard protege, Pipe valida, Interceptor transforma, Filter trata erro. Cada um no seu quadrado.
