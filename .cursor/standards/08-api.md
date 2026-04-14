# 08 — Padrões de API REST

> Guia definitivo para construir APIs REST consistentes, previsíveis e profissionais na Bravy.

---

## 8.1 — O que é REST?

REST (Representational State Transfer) é um estilo de arquitetura para comunicação entre sistemas pela internet.
Funciona como um cardápio de restaurante: o cliente (frontend) faz pedidos, e o servidor (backend) entrega os pratos.
Cada "prato" é um **recurso** (usuário, pedido, produto) identificado por uma URL única.
O cliente usa **verbos HTTP** (GET, POST, PATCH, DELETE) para dizer o que quer fazer com o recurso.
Toda comunicação é **stateless** — cada requisição carrega tudo que o servidor precisa para respondê-la, sem depender de contexto anterior.

---

## 8.2 — Verbos HTTP

Pense nos verbos como ações do dia a dia:

| Verbo      | Analogia                        | Ação no sistema       |
| ---------- | ------------------------------- | --------------------- |
| **GET**    | Consultar um extrato bancário   | Ler dados             |
| **POST**   | Preencher um formulário novo    | Criar recurso         |
| **PATCH**  | Corrigir um campo do formulário | Atualizar parcialmente |
| **DELETE** | Jogar o formulário no lixo      | Remover recurso       |

### Mapeamento completo de rotas

| Método   | Rota                        | Ação              | Idempotente | Body |
| -------- | --------------------------- | ------------------ | ----------- | ---- |
| `GET`    | `/api/v1/resources`         | Listar todos       | Sim         | Não  |
| `GET`    | `/api/v1/resources/:id`     | Buscar um          | Sim         | Não  |
| `POST`   | `/api/v1/resources`         | Criar              | Não         | Sim  |
| `PATCH`  | `/api/v1/resources/:id`     | Atualizar parcial  | Sim         | Sim  |
| `DELETE` | `/api/v1/resources/:id`     | Remover            | Sim         | Não  |

### Controller exemplo

```typescript
// src/modules/products/products.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() pagination: PaginationDto) {
    return this.productsService.findAll(pagination);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.remove(id);
  }
}
```

---

## 8.3 — Response envelope padrão

Toda resposta de sucesso da API **obrigatoriamente** segue este formato:

```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "Produto X",
    "price": 99.90,
    "createdAt": "2026-03-25T10:30:00.000Z"
  },
  "meta": {
    "timestamp": "2026-03-25T10:30:00.123Z",
    "requestId": "req_abc123def456"
  }
}
```

Para listas com paginação:

```json
{
  "data": [
    { "id": "...", "name": "Produto A" },
    { "id": "...", "name": "Produto B" }
  ],
  "meta": {
    "timestamp": "2026-03-25T10:30:00.123Z",
    "requestId": "req_abc123def456",
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 142,
      "totalPages": 8
    }
  }
}
```

### Interface do envelope

```typescript
// src/common/interfaces/api-response.interface.ts
export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface ApiMeta {
  timestamp: string;
  requestId: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### ResponseInterceptor

```typescript
// src/common/interceptors/response.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.headers['x-request-id'] || uuidv4();

    return next.handle().pipe(
      map((responseData) => {
        const isPaginated =
          responseData &&
          typeof responseData === 'object' &&
          'items' in responseData &&
          'meta' in responseData;

        if (isPaginated) {
          return {
            data: responseData.items,
            meta: {
              timestamp: new Date().toISOString(),
              requestId,
              pagination: responseData.meta,
            },
          };
        }

        return {
          data: responseData,
          meta: {
            timestamp: new Date().toISOString(),
            requestId,
          },
        };
      }),
    );
  }
}
```

### Registro global

```typescript
// src/main.ts
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(3000);
}
bootstrap();
```

---

## 8.4 — Error response padrão

Toda resposta de erro segue este formato:

```json
{
  "statusCode": 400,
  "message": "O campo 'email' é obrigatório",
  "error": "Bad Request",
  "timestamp": "2026-03-25T10:30:00.123Z",
  "path": "/api/v1/products"
}
```

Para erros de validação com múltiplos campos:

```json
{
  "statusCode": 422,
  "message": "Erro de validação",
  "error": "Unprocessable Entity",
  "details": [
    { "field": "email", "message": "Formato de email inválido" },
    { "field": "price", "message": "Deve ser um número positivo" }
  ],
  "timestamp": "2026-03-25T10:30:00.123Z",
  "path": "/api/v1/products"
}
```

### HttpExceptionFilter

```typescript
// src/common/filters/http-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ExceptionPayload {
  message?: string | string[];
  error?: string;
  details?: Record<string, unknown>[];
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as ExceptionPayload)
        : null;

    const message =
      exceptionResponse?.message || 'Erro interno do servidor';

    const errorBody = {
      statusCode,
      message: Array.isArray(message) ? message[0] : message,
      error: exceptionResponse?.error || 'Internal Server Error',
      ...(Array.isArray(message) &&
        message.length > 1 && {
          details: message.map((msg) => ({ message: msg })),
        }),
      ...(exceptionResponse?.details && {
        details: exceptionResponse.details,
      }),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    if (statusCode >= 500) {
      this.logger.error(
        `[${request.method}] ${request.url} -> ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} -> ${statusCode}: ${errorBody.message}`,
      );
    }

    response.status(statusCode).json(errorBody);
  }
}
```

### Registro global

```typescript
// src/main.ts
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(3000);
}
bootstrap();
```

### Exceções customizadas

```typescript
// src/common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
  constructor(message: string, details?: Record<string, unknown>[]) {
    super(
      {
        message,
        error: 'Business Rule Violation',
        details,
      },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class ResourceNotFoundException extends HttpException {
  constructor(resource: string, id: string) {
    super(
      {
        message: `${resource} com id '${id}' não encontrado`,
        error: 'Not Found',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class DuplicateResourceException extends HttpException {
  constructor(resource: string, field: string, value: string) {
    super(
      {
        message: `${resource} com ${field} '${value}' já existe`,
        error: 'Conflict',
      },
      HttpStatus.CONFLICT,
    );
  }
}
```

---

## 8.5 — Status codes obrigatórios

| Código | Nome                  | Quando usar                                              | Exemplo                                       |
| ------ | --------------------- | -------------------------------------------------------- | --------------------------------------------- |
| `200`  | OK                    | Requisição processada com sucesso (GET, PATCH)           | `GET /products` retorna lista                  |
| `201`  | Created               | Recurso criado com sucesso (POST)                        | `POST /products` cria produto                  |
| `204`  | No Content            | Ação concluída sem corpo de resposta (DELETE)             | `DELETE /products/:id` remove produto          |
| `400`  | Bad Request           | Requisição malformada, JSON inválido, parâmetro faltando | Body com JSON quebrado                         |
| `401`  | Unauthorized          | Token ausente ou expirado                                | Requisição sem header `Authorization`          |
| `403`  | Forbidden             | Token válido, mas sem permissão para a ação              | Usuário tenta acessar recurso de outro usuário |
| `404`  | Not Found             | Recurso não existe                                       | `GET /products/uuid-inexistente`               |
| `409`  | Conflict              | Recurso duplicado ou conflito de estado                  | Email já cadastrado                            |
| `422`  | Unprocessable Entity  | Validação de regra de negócio falhou                     | Preço negativo, data no passado                |
| `429`  | Too Many Requests     | Rate limit atingido                                      | Mais de 100 req/min do mesmo IP                |
| `500`  | Internal Server Error | Erro inesperado no servidor                              | Banco de dados fora do ar                      |

### Uso correto no service

```typescript
// src/modules/products/products.service.ts
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from './entities/product.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ResourceNotFoundException, DuplicateResourceException } from '@/common/exceptions/business.exception';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async findOne(id: string): Promise<Product> {
    const product = await this.productRepository.findOne({
      where: { id },
    });

    if (!product) {
      throw new ResourceNotFoundException('Product', id);
    }

    return product;
  }

  async create(dto: CreateProductDto): Promise<Product> {
    const existing = await this.productRepository.findOne({
      where: { sku: dto.sku },
    });

    if (existing) {
      throw new DuplicateResourceException('Product', 'sku', dto.sku);
    }

    const product = this.productRepository.create(dto);
    return this.productRepository.save(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<Product> {
    const product = await this.findOne(id);

    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.softRemove(product);
  }
}
```

---

## 8.6 — Paginação

### Offset-based (padrão)

Usado na maioria dos endpoints de listagem. Ideal para tabelas com navegação por páginas.

**Query params:**
- `page` — número da página (default: `1`)
- `limit` — itens por página (default: `20`, máximo: `100`)

```
GET /api/v1/products?page=2&limit=20
```

### Cursor-based (feeds)

Usado para feeds infinitos, timelines e dados que mudam frequentemente. Evita o problema de itens duplicados ou pulados quando novos registros são inseridos.

```
GET /api/v1/notifications?cursor=eyJpZCI6MTAwfQ&limit=20
```

### PaginationDto

```typescript
// src/common/dto/pagination.dto.ts
import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

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

export class CursorPaginationDto {
  @IsOptional()
  cursor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
```

### Helper de paginação

```typescript
// src/common/helpers/paginate.helper.ts
import { SelectQueryBuilder } from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto';
import { PaginationMeta } from '../interfaces/api-response.interface';

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}

export async function paginate<T>(
  queryBuilder: SelectQueryBuilder<T>,
  pagination: PaginationDto,
): Promise<PaginatedResult<T>> {
  const { page, limit, skip } = pagination;

  const [items, total] = await queryBuilder
    .skip(skip)
    .take(limit)
    .getManyAndCount();

  return {
    items,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
```

### Cursor-based helper

```typescript
// src/common/helpers/cursor-paginate.helper.ts
import { SelectQueryBuilder } from 'typeorm';
import { CursorPaginationDto } from '../dto/pagination.dto';

export interface CursorPaginatedResult<T> {
  items: T[];
  meta: {
    nextCursor: string | null;
    hasMore: boolean;
    limit: number;
  };
}

export async function cursorPaginate<T extends { id: string }>(
  queryBuilder: SelectQueryBuilder<T>,
  pagination: CursorPaginationDto,
  orderColumn: string = 'createdAt',
): Promise<CursorPaginatedResult<T>> {
  const { cursor, limit } = pagination;

  if (cursor) {
    const decoded = JSON.parse(
      Buffer.from(cursor, 'base64').toString('utf-8'),
    );
    queryBuilder.andWhere(`${orderColumn} < :cursor`, {
      cursor: decoded.value,
    });
  }

  queryBuilder.orderBy(orderColumn, 'DESC').take(limit + 1);

  const items = await queryBuilder.getMany();
  const hasMore = items.length > limit;

  if (hasMore) {
    items.pop();
  }

  const lastItem = items[items.length - 1];
  const nextCursor = hasMore
    ? Buffer.from(
        JSON.stringify({ value: (lastItem as any)[orderColumn] }),
      ).toString('base64')
    : null;

  return {
    items,
    meta: { nextCursor, hasMore, limit },
  };
}
```

### Uso no service

```typescript
// Dentro de ProductsService
async findAll(pagination: PaginationDto): Promise<PaginatedResult<Product>> {
  const queryBuilder = this.productRepository
    .createQueryBuilder('product')
    .where('product.deletedAt IS NULL')
    .orderBy('product.createdAt', 'DESC');

  return paginate(queryBuilder, pagination);
}
```

---

## 8.7 — Filtros, ordenação, busca

### Query params padronizados

| Param             | Tipo   | Exemplo                            | Descrição                    |
| ----------------- | ------ | ---------------------------------- | ---------------------------- |
| `search`          | string | `?search=notebook`                 | Busca textual livre          |
| `sortBy`          | string | `?sortBy=price`                    | Campo para ordenação         |
| `sortOrder`       | enum   | `?sortOrder=DESC`                  | Direção: `ASC` ou `DESC`    |
| `filter[campo]`   | string | `?filter[status]=active`           | Filtro por campo específico  |
| `filter[minPrice]`| number | `?filter[minPrice]=50`             | Filtro de intervalo (mínimo) |
| `filter[maxPrice]`| number | `?filter[maxPrice]=200`            | Filtro de intervalo (máximo) |

### QueryDto

```typescript
// src/common/dto/query.dto.ts
import { IsOptional, IsString, IsIn } from 'class-validator';
import { PaginationDto } from './pagination.dto';

export class QueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}
```

### FilterDto com validação dinâmica

```typescript
// src/modules/products/dto/product-query.dto.ts
import { IsOptional, IsString, IsNumber, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { QueryDto } from '@/common/dto/query.dto';

export class ProductQueryDto extends QueryDto {
  @IsOptional()
  @IsIn(['name', 'price', 'createdAt'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  'filter[status]'?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  'filter[minPrice]'?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  'filter[maxPrice]'?: number;

  @IsOptional()
  @IsString()
  'filter[category]'?: string;
}
```

### Helper de query builder

```typescript
// src/common/helpers/query-builder.helper.ts
import { SelectQueryBuilder } from 'typeorm';
import { QueryDto } from '../dto/query.dto';

export interface FilterConfig {
  searchColumns?: string[];
  allowedFilters?: Record<string, FilterType>;
}

export type FilterType = 'exact' | 'like' | 'gte' | 'lte' | 'in';

export function applyQueryParams<T>(
  qb: SelectQueryBuilder<T>,
  query: QueryDto & Record<string, any>,
  alias: string,
  config: FilterConfig,
): SelectQueryBuilder<T> {
  if (query.search && config.searchColumns?.length) {
    const conditions = config.searchColumns
      .map((col) => `${alias}.${col} ILIKE :search`)
      .join(' OR ');
    qb.andWhere(`(${conditions})`, { search: `%${query.search}%` });
  }

  if (config.allowedFilters) {
    for (const [key, type] of Object.entries(config.allowedFilters)) {
      const filterKey = `filter[${key}]`;
      const value = query[filterKey];

      if (value === undefined || value === null) continue;

      const paramName = key.replace(/[^a-zA-Z]/g, '');

      switch (type) {
        case 'exact':
          qb.andWhere(`${alias}.${key} = :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'like':
          qb.andWhere(`${alias}.${key} ILIKE :${paramName}`, {
            [paramName]: `%${value}%`,
          });
          break;
        case 'gte':
          qb.andWhere(`${alias}.${key} >= :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'lte':
          qb.andWhere(`${alias}.${key} <= :${paramName}`, {
            [paramName]: value,
          });
          break;
        case 'in':
          qb.andWhere(`${alias}.${key} IN (:...${paramName})`, {
            [paramName]: value.split(','),
          });
          break;
      }
    }
  }

  if (query.sortBy) {
    qb.orderBy(`${alias}.${query.sortBy}`, query.sortOrder || 'DESC');
  }

  return qb;
}
```

### Uso completo no service

```typescript
// src/modules/products/products.service.ts
async findAll(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
  const qb = this.productRepository
    .createQueryBuilder('product')
    .where('product.deletedAt IS NULL');

  applyQueryParams(qb, query, 'product', {
    searchColumns: ['name', 'description', 'sku'],
    allowedFilters: {
      status: 'exact',
      category: 'exact',
      minPrice: 'gte',
      maxPrice: 'lte',
    },
  });

  return paginate(qb, query);
}
```

Exemplo de requisição completa:

```
GET /api/v1/products?search=notebook&filter[status]=active&filter[minPrice]=500&sortBy=price&sortOrder=ASC&page=1&limit=10
```

---

## 8.8 — Upload de arquivos

### Regras gerais

- Formato: `multipart/form-data`
- Tamanho máximo: **10 MB** por arquivo
- Mimetypes permitidos: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`
- Armazenamento: bucket externo (S3, Supabase Storage)

### FileValidationPipe

```typescript
// src/common/pipes/file-validation.pipe.ts
import {
  PipeTransform,
  Injectable,
  BadRequestException,
} from '@nestjs/common';

export interface FileValidationOptions {
  maxSize?: number;
  allowedMimeTypes?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const DEFAULT_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
];

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly maxSize: number;
  private readonly allowedMimeTypes: string[];

  constructor(options: FileValidationOptions = {}) {
    this.maxSize = options.maxSize ?? DEFAULT_MAX_SIZE;
    this.allowedMimeTypes =
      options.allowedMimeTypes ?? DEFAULT_MIME_TYPES;
  }

  transform(file: Express.Multer.File): Express.Multer.File {
    if (!file) {
      throw new BadRequestException('Arquivo é obrigatório');
    }

    if (file.size > this.maxSize) {
      const maxMB = (this.maxSize / (1024 * 1024)).toFixed(0);
      throw new BadRequestException(
        `Arquivo excede o tamanho máximo de ${maxMB}MB`,
      );
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Tipo de arquivo '${file.mimetype}' não permitido. Tipos aceitos: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    return file;
  }
}
```

### Controller com FileInterceptor

```typescript
// src/modules/uploads/uploads.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadsService } from './uploads.service';
import { FileValidationPipe } from '@/common/pipes/file-validation.pipe';

@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile(new FileValidationPipe())
    file: Express.Multer.File,
  ) {
    return this.uploadsService.upload(file);
  }

  @Post('avatar')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new FileValidationPipe({
        maxSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadAvatar(file);
  }
}
```

### Upload service com Supabase Storage

```typescript
// src/modules/uploads/uploads.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';

@Injectable()
export class UploadsService {
  private readonly supabase: SupabaseClient;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow('SUPABASE_URL'),
      this.configService.getOrThrow('SUPABASE_SERVICE_KEY'),
    );
    this.bucket = this.configService.getOrThrow('SUPABASE_STORAGE_BUCKET');
  }

  async upload(file: Express.Multer.File) {
    const ext = extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const path = `uploads/${filename}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Falha ao fazer upload: ${error.message}`,
      );
    }

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return {
      url: data.publicUrl,
      filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  async uploadAvatar(file: Express.Multer.File) {
    const ext = extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    const path = `avatars/${filename}`;

    const { error } = await this.supabase.storage
      .from(this.bucket)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new InternalServerErrorException(
        `Falha ao fazer upload do avatar: ${error.message}`,
      );
    }

    const { data } = this.supabase.storage
      .from(this.bucket)
      .getPublicUrl(path);

    return {
      url: data.publicUrl,
      filename,
    };
  }
}
```

---

## 8.9 — Versionamento

### Prefixo global obrigatório

Todas as rotas da API usam o prefixo `/api/v1/`:

```typescript
// src/main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api/v1');

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || '*',
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
```

### Regras de versionamento

1. **Versão atual:** `v1` — todo desenvolvimento novo acontece aqui
2. **Quando criar v2:** apenas quando houver breaking changes que não podem ser feitas de forma retrocompatível
3. **Deprecação:** a versão antiga continua ativa por no mínimo **6 meses** após lançamento da nova
4. **Header de aviso:** respostas da versão deprecated incluem `Deprecation: true` e `Sunset: <data>`

### Middleware de deprecação (para uso futuro)

```typescript
// src/common/middleware/deprecation.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class DeprecationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    if (req.path.startsWith('/api/v1')) {
      // Ativar quando v2 for lançada:
      // res.setHeader('Deprecation', 'true');
      // res.setHeader('Sunset', 'Sat, 01 Jan 2027 00:00:00 GMT');
      // res.setHeader('Link', '</api/v2>; rel="successor-version"');
    }

    next();
  }
}
```

### URLs finais

| Recurso        | URL completa                        |
| -------------- | ----------------------------------- |
| Listar produtos | `GET /api/v1/products`             |
| Buscar produto  | `GET /api/v1/products/:id`         |
| Criar produto   | `POST /api/v1/products`            |
| Atualizar       | `PATCH /api/v1/products/:id`       |
| Deletar         | `DELETE /api/v1/products/:id`      |
| Upload          | `POST /api/v1/uploads`             |
| Notificações    | `GET /api/v1/notifications?cursor=` |

---

## Próximos passos

- Leia **[09 — Banco de Dados e Migrações](./09-database.md)** para entender como modelar as entidades que a API expõe.
- Leia **[10 — Autenticação e Autorização](./10-auth.md)** para proteger os endpoints com JWT e guards.
- Leia **[07 — Testes](./07-testing.md)** para aprender a testar controllers e services com cobertura real.
