# 12 — Guia de Vibecoding

Como usar LLMs do jeito certo para construir software de verdade. Este e o documento mais importante para quem usa Claude, Cursor, ChatGPT ou qualquer LLM no dia a dia da Bravy.

**Premissa:** LLMs sao estagiarios extremamente rapidos que leram toda a internet. Sabem muito, mas nao conhecem o SEU projeto. Se voce nao guiar, o resultado sera generico, inconsistente e cheio de divida tecnica.

---

## 12.1 — Regras de Ouro do Vibecoding

### Regra 1: Sempre passe a documentacao como contexto

A LLM nao sabe como a Bravy organiza codigo. Se voce pedir "crie um modulo de produtos", ela vai criar do jeito DELA — nao do jeito da Bravy.

**O que fazer:**
- Antes de qualquer pedido, passe o documento relevante como contexto
- Para backend: passe `04-backend.md` + `03-nomenclatura-e-padroes.md`
- Para frontend: passe `05-frontend.md` + `03-nomenclatura-e-padroes.md`
- Para banco: passe `06-banco-de-dados.md`
- Para tudo: passe `99-referencia-completa.md`

**Exemplo ruim:**
```
Cria um CRUD de produtos
```

**Exemplo bom:**
```
[anexa 99-referencia-completa.md como contexto]

Seguindo os padroes documentados, crie o modulo de produtos no backend
com: controller, service, repository, DTOs de create/update e response.
O model Product ja existe no Prisma com os campos: id, name, price,
description, isActive, createdAt, updatedAt.
```

### Regra 2: Seja especifico

Quanto mais vago o pedido, mais a LLM inventa. Quanto mais especifico, mais previsivel o resultado.

**O que fazer:**
- Nomeie os campos exatos
- Diga qual camada (controller, service, repository)
- Indique o caminho do arquivo
- Mencione os patterns esperados (ValidationPipe, envelope, etc.)

**Exemplo ruim:**
```
Adiciona autenticacao no projeto
```

**Exemplo bom:**
```
Crie o modulo de auth em src/modules/auth/ com:
- auth.module.ts registrando JwtModule com secret do .env (JWT_SECRET)
- auth.controller.ts com endpoints POST /auth/login e POST /auth/refresh
- auth.service.ts com metodos login(email, password) e refreshToken(token)
- DTOs: login.dto.ts (email: string, password: string) e auth-response.dto.ts
- Use bcrypt para comparar senhas
- Retorne access_token (15min) e refresh_token (7d)
- Siga o padrao de envelope { data, meta } do response.interceptor.ts
```

### Regra 3: Revise TUDO antes de aceitar

A LLM vai gerar codigo que PARECE correto. Muitas vezes compila e roda. Mas pode ter:
- Logica de negocio no controller
- `any` escondido
- Queries sem paginacao
- Imports errados
- Patterns diferentes do projeto

**O que fazer:**
- Leia cada linha antes de aceitar
- Compare com arquivos existentes no projeto
- Verifique se segue os patterns da Bravy
- Rode os testes
- Verifique se nao quebrou nada existente

**Checklist rapido de revisao:**
- [ ] Nomenclatura segue `03-nomenclatura-e-padroes.md`?
- [ ] Logica de negocio esta no service (nao no controller)?
- [ ] Acesso a dados esta no repository (nao no service)?
- [ ] DTOs tem validacao com class-validator?
- [ ] Nenhum `any` no TypeScript?
- [ ] Queries tem paginacao?
- [ ] Erros estao sendo tratados?
- [ ] Imports estao corretos (sem circular)?

### Regra 4: Corrija desvios imediatamente

Se a LLM gerou algo fora do padrao e voce aceitou, corrija AGORA. Nao deixe para depois. Divida tecnica acumula rapido e fica exponencialmente mais cara.

**O que fazer:**
- Se o codigo gerado nao segue o padrao, peca para refazer passando o arquivo correto como exemplo
- Se a LLM insiste em um anti-pattern, seja explicito: "NAO faca X, faca Y"
- Se o resultado saiu muito diferente, descarte e comece de novo com um prompt melhor

**Exemplo:**
```
O codigo que voce gerou coloca logica de negocio no controller.
Na Bravy, o controller apenas recebe o request, delega para o service
e retorna o response. Refatore movendo toda a logica para
products.service.ts e deixe o controller apenas com:

@Post()
async create(@Body() dto: CreateProductDto) {
  return this.productsService.create(dto);
}
```

### Regra 5: Uma tarefa por vez

LLMs perdem qualidade quando o prompt e muito longo ou pede muitas coisas simultaneamente. O contexto se dilui e os ultimos itens saem piores que os primeiros.

**O que fazer:**
- Peca uma camada por vez: primeiro o model, depois o repository, depois o service...
- Valide cada etapa antes de pedir a proxima
- Se a conversa ficou longa (>20 mensagens), comece uma nova passando o contexto atualizado

**Exemplo ruim:**
```
Cria o modulo completo de produtos com backend, frontend, testes,
migrations, seeds, componentes React, hooks, services HTTP, paginas,
rotas, formularios, validacao, paginacao e filtros.
```

**Exemplo bom (sequencia de prompts):**
```
Prompt 1: "Crie o model Product no schema.prisma com os campos..."
Prompt 2: "Agora crie a migration e aplique"
Prompt 3: "Crie o products.repository.ts seguindo o padrao do base.repository.ts"
Prompt 4: "Crie o products.service.ts com os metodos CRUD"
...e assim por diante
```

---

## 12.2 — System Prompt Padrao

Copie e cole o texto abaixo no inicio de qualquer conversa com LLM para projetos Bravy. Adapte o nome do projeto e os detalhes especificos.

```
Voce e um desenvolvedor senior trabalhando em um projeto da Bravy.

## Stack
- Backend: NestJS + TypeScript + Prisma + PostgreSQL
- Frontend: Next.js (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- Auth: JWT (access token 15min + refresh token 7d)
- Validacao: class-validator (backend) + Zod (frontend)
- State: React Query (server state) + Zustand (client state, quando necessario)
- HTTP: Axios com interceptors para auth
- Testes: Jest (backend) + Vitest (frontend)

## Estrutura backend
- src/modules/{nome}/ — cada modulo com: module, controller, service, repository, dto/
- src/common/ — guards, interceptors, filters, decorators, pipes, types compartilhados
- src/config/ — configuracoes de ambiente
- src/database/ — Prisma module, service e base repository
- Controller: apenas recebe request e delega para service. ZERO logica de negocio.
- Service: toda logica de negocio. Chama repository para acesso a dados.
- Repository: unica camada que fala com o Prisma/banco.

## Estrutura frontend
- src/app/ — rotas do Next.js (App Router). Apenas page.tsx e layout.tsx.
- src/components/ui/ — componentes shadcn (nao editar manualmente)
- src/components/shared/ — componentes reutilizaveis do projeto
- src/components/layout/ — sidebar, header, main-layout
- src/features/{nome}/ — por feature: components/, hooks/, services/, schemas/, types/
- src/lib/ — utilitarios: api.ts (Axios), utils.ts, cn.ts
- src/providers/ — auth-provider, query-provider

## Nomenclatura
- Arquivos: kebab-case (create-product.dto.ts, product-form.tsx)
- Classes: PascalCase (ProductsService, CreateProductDto)
- Funcoes/variaveis: camelCase (findById, isActive)
- Tabelas SQL: snake_case plural (user_products)
- Colunas SQL: snake_case (created_at, is_active)
- Componentes React: PascalCase (ProductForm, DataTable)
- Hooks: camelCase com prefixo use (useProducts, useCreateProduct)
- Endpoints: kebab-case plural (/api/user-products)

## Padroes obrigatorios
- Toda response da API usa envelope: { data: T, meta?: { page, limit, total } }
- Toda listagem tem paginacao com query params: ?page=1&limit=20
- Todo DTO de criacao/atualizacao tem validacao com class-validator
- Todo schema de formulario usa Zod
- Todo acesso a dados passa pelo repository (nunca Prisma direto no service)
- Todo endpoint protegido usa JwtAuthGuard
- Logs usam o Logger do NestJS (nunca console.log)
- Erros usam HttpException com codigos HTTP corretos
- Soft delete com campo deletedAt (nunca DELETE fisico)
- Variaveis de ambiente via ConfigService (nunca process.env direto)

## Regras
- NAO use "any" no TypeScript. Sempre tipar explicitamente.
- NAO coloque logica de negocio no controller.
- NAO acesse o Prisma diretamente no service.
- NAO use console.log. Use o Logger do NestJS.
- NAO crie God components. Maximo ~150 linhas por componente.
- NAO use fetch direto. Use o service HTTP da feature.
- NAO ignore tratamento de erros.
- NAO crie migrations destrutivas sem confirmacao.
- SEMPRE siga os patterns dos arquivos existentes no projeto.
- SEMPRE retorne tipos explicitos nas funcoes.
```

---

## 12.3 — Receitas Prontas

Prompts copiáveis para as tarefas mais comuns. Copie, adapte o nome do modulo/feature, e use.

---

### Receita 1: Criar novo modulo NestJS completo

**Quando usar:** Precisa criar um novo recurso no backend do zero (ex: orders, categories, invoices).

```
Crie o modulo completo de {NOME} em src/modules/{nome}/ seguindo os padroes da Bravy.

Arquivos a criar:
1. {nome}.module.ts — registra controller, service, repository. Importa DatabaseModule.
2. {nome}.controller.ts — endpoints REST:
   - GET /{nome} (listagem paginada, query: page, limit, search)
   - GET /{nome}/:id (busca por ID)
   - POST /{nome} (criacao)
   - PATCH /{nome}/:id (atualizacao parcial)
   - DELETE /{nome}/:id (soft delete)
   Todos protegidos com @UseGuards(JwtAuthGuard).
   Controller apenas delega para o service, zero logica.
3. {nome}.service.ts — metodos: findAll(params), findById(id), create(dto), update(id, dto), remove(id).
   Toda logica de negocio aqui. Chama o repository para dados. Lanca NotFoundException quando nao encontrar.
4. {nome}.repository.ts — extends BaseRepository ou implementa os metodos Prisma.
   Metodos: findMany(where, pagination), findById(id), create(data), update(id, data), softDelete(id).
   Filtra automaticamente deletedAt: null em todas as queries.
5. dto/create-{nome}.dto.ts — campos com decorators class-validator (@IsString, @IsNotEmpty, etc.)
6. dto/update-{nome}.dto.ts — PartialType(Create{Nome}Dto)
7. dto/{nome}-response.dto.ts — tipo de response incluindo id, timestamps

O model Prisma {Nome} ja existe com os campos: {LISTE OS CAMPOS}.

Siga o padrao de envelope { data, meta } nas responses de listagem.
Use o Logger do NestJS para logs (nunca console.log).
```

---

### Receita 2: Criar novo model Prisma + migration

**Quando usar:** Precisa criar ou alterar uma tabela no banco de dados.

```
Adicione o model {Nome} no schema.prisma com os seguintes campos:

model {Nome} {
  id          String   @id @default(uuid())
  {CAMPOS}
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@map("{nome_snake_case_plural}")
}

Regras:
- Nomes de colunas no banco: snake_case (use @map)
- Nome da tabela: snake_case plural (use @@map)
- Campos do model no Prisma: camelCase
- ID sempre UUID com @default(uuid())
- Sempre incluir createdAt, updatedAt, deletedAt
- Relacoes com onDelete adequado (CASCADE, SET NULL, RESTRICT)

Depois gere a migration com nome descritivo:
npx prisma migrate dev --name add_{nome_snake_case}_table
```

---

### Receita 3: Criar feature frontend completa (listagem + formulario)

**Quando usar:** Precisa criar a interface completa de um recurso no frontend.

```
Crie a feature de {NOME} no frontend seguindo a estrutura da Bravy.

Estrutura de pastas — src/features/{nome}/:
1. types/{nome}.types.ts — interfaces: {Nome}, Create{Nome}Request, Update{Nome}Request, {Nome}ListParams
2. services/{nome}.service.ts — classe com metodos HTTP via Axios:
   - getAll(params): GET /api/{nome}
   - getById(id): GET /api/{nome}/:id
   - create(data): POST /api/{nome}
   - update(id, data): PATCH /api/{nome}/:id
   - remove(id): DELETE /api/{nome}/:id
3. hooks/use-{nome}.ts — useQuery para listagem paginada com filtros
4. hooks/use-create-{nome}.ts — useMutation para criacao com invalidacao de cache
5. hooks/use-update-{nome}.ts — useMutation para atualizacao com invalidacao de cache
6. hooks/use-delete-{nome}.ts — useMutation para remocao com invalidacao de cache
7. schemas/{nome}.schema.ts — schema Zod para validacao do formulario
8. components/{nome}-columns.tsx — definicao das colunas para DataTable
9. components/{nome}-table.tsx — DataTable com paginacao, busca e acoes
10. components/{nome}-form.tsx — formulario com React Hook Form + Zod, modo create/edit

Paginas — src/app/(dashboard)/{nome}/:
11. page.tsx — pagina de listagem (importa {Nome}Table)
12. new/page.tsx — pagina de criacao (importa {Nome}Form)
13. [id]/page.tsx — pagina de edicao (importa {Nome}Form com dados preenchidos)

O recurso {Nome} tem os campos: {LISTE OS CAMPOS}.
Use componentes do shadcn/ui para inputs, buttons, dialogs.
Use o DataTable compartilhado de src/components/shared/data-table.tsx.
Use toast do shadcn para feedback de sucesso/erro.
```

---

### Receita 4: Implementar paginacao

**Quando usar:** Precisa adicionar paginacao em uma listagem (backend + frontend).

```
Implemente paginacao no endpoint GET /api/{nome} seguindo o padrao Bravy.

Backend:
1. Crie dto/pagination.dto.ts (se nao existir) com:
   - page: number (@IsOptional, @IsInt, @Min(1), default 1)
   - limit: number (@IsOptional, @IsInt, @Min(1), @Max(100), default 20)
   - search: string (@IsOptional)

2. No {nome}.repository.ts:
   - Receba { page, limit, search } como parametros
   - Use Prisma findMany com skip: (page - 1) * limit e take: limit
   - Use Prisma count para o total
   - Filtre por search nos campos relevantes (contains, mode: insensitive)
   - Retorne { items, total }

3. No {nome}.service.ts:
   - Receba o PaginationDto
   - Chame o repository
   - Retorne { data: items, meta: { page, limit, total, totalPages } }

4. No {nome}.controller.ts:
   - Use @Query() com PaginationDto
   - Apenas delegue para o service

Frontend:
5. No hook use-{nome}.ts:
   - Receba params { page, limit, search }
   - Use useQuery com queryKey incluindo os params
   - Retorne data, meta, isLoading

6. No componente {nome}-table.tsx:
   - Use o hook com os params
   - Renderize paginacao com botoes Anterior/Proximo
   - Mostre "Exibindo X de Y resultados"
   - Permita mudar limite (10, 20, 50)
```

---

### Receita 5: Adicionar endpoint com upload de arquivo

**Quando usar:** Precisa de upload de imagem, documento, etc.

```
Adicione upload de arquivo no modulo {NOME}.

Backend:
1. Instale: @nestjs/platform-express, multer, @types/multer (se nao instalados)

2. Crie src/common/interceptors/file-upload.interceptor.ts:
   - Limite de tamanho: 5MB
   - Tipos permitidos: {LISTE MIME TYPES} (ex: image/jpeg, image/png, application/pdf)
   - Salve em uploads/{nome}/ (ou configure S3 se for producao)

3. No {nome}.controller.ts adicione:
   @Post(':id/upload')
   @UseGuards(JwtAuthGuard)
   @UseInterceptors(FileInterceptor('file', multerOptions))
   async uploadFile(
     @Param('id') id: string,
     @UploadedFile() file: Express.Multer.File,
   ) {
     return this.{nome}Service.uploadFile(id, file);
   }

4. No {nome}.service.ts:
   - Valide que o registro existe
   - Salve o path do arquivo no banco
   - Retorne a URL de acesso

5. Adicione campo fileUrl (String?) no model Prisma se nao existir.

6. Configure o ServeStaticModule para servir a pasta uploads/ (dev).

NAO armazene o arquivo em base64 no banco.
NAO permita upload sem autenticacao.
SEMPRE valide tipo e tamanho do arquivo.
```

---

### Receita 6: Criar guard de autorizacao por role

**Quando usar:** Precisa restringir endpoints por tipo de usuario (admin, manager, user).

```
Crie um sistema de autorizacao por roles seguindo os padroes da Bravy.

1. Crie src/common/decorators/roles.decorator.ts:
   - Decorator @Roles('admin', 'manager') usando SetMetadata
   - Enum Role { ADMIN = 'admin', MANAGER = 'manager', USER = 'user' }

2. Crie src/common/guards/roles.guard.ts:
   - Implemente CanActivate
   - Injete Reflector para ler o metadata de roles
   - Pegue o usuario do request (request.user via JWT)
   - Compare user.role com as roles permitidas
   - Retorne true se a role do usuario esta na lista
   - Lance ForbiddenException se nao autorizado

3. Exemplo de uso no controller:
   @Post()
   @UseGuards(JwtAuthGuard, RolesGuard)
   @Roles(Role.ADMIN, Role.MANAGER)
   async create(@Body() dto: Create{Nome}Dto) {
     return this.service.create(dto);
   }

4. Adicione o campo "role" no model User do Prisma (se nao existir):
   role Role @default(USER)

5. Inclua a role no payload do JWT (em auth.service.ts).

O guard deve funcionar em conjunto com JwtAuthGuard (auth primeiro, roles depois).
```

---

### Receita 7: Criar hook React Query

**Quando usar:** Precisa criar hooks de dados para o frontend.

```
Crie os hooks React Query para a feature {NOME} em src/features/{nome}/hooks/.

1. use-{nome}.ts (listagem):
import { useQuery } from '@tanstack/react-query';
import { {nome}Service } from '../services/{nome}.service';
import { {Nome}ListParams } from '../types/{nome}.types';

export const {nome}Keys = {
  all: ['{nome}'] as const,
  lists: () => [...{nome}Keys.all, 'list'] as const,
  list: (params: {Nome}ListParams) => [...{nome}Keys.lists(), params] as const,
  details: () => [...{nome}Keys.all, 'detail'] as const,
  detail: (id: string) => [...{nome}Keys.details(), id] as const,
};

export function use{Nome}(params: {Nome}ListParams) {
  return useQuery({
    queryKey: {nome}Keys.list(params),
    queryFn: () => {nome}Service.getAll(params),
  });
}

2. use-create-{nome}.ts (criacao):
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreate{Nome}() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: {nome}Service.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: {nome}Keys.lists() });
      toast.success('{Nome} criado com sucesso');
    },
    onError: () => {
      toast.error('Erro ao criar {nome}');
    },
  });
}

3. use-update-{nome}.ts e use-delete-{nome}.ts seguindo o mesmo padrao.

Use queryKey factory ({nome}Keys) para consistencia.
Invalide o cache apos mutacoes.
Use toast para feedback ao usuario.
```

---

### Receita 8: Criar componente de tabela com filtros

**Quando usar:** Precisa de uma tabela de listagem com busca, filtros e paginacao.

```
Crie o componente de tabela para {NOME} usando o DataTable compartilhado.

1. src/features/{nome}/components/{nome}-columns.tsx:
import { ColumnDef } from '@tanstack/react-table';
import { {Nome} } from '../types/{nome}.types';

export const {nome}Columns: ColumnDef<{Nome}>[] = [
  {
    accessorKey: 'name',
    header: 'Nome',
  },
  // {ADICIONE COLUNAS CONFORME OS CAMPOS}
  {
    accessorKey: 'createdAt',
    header: 'Criado em',
    cell: ({ row }) => formatDate(row.getValue('createdAt')),
  },
  {
    id: 'actions',
    cell: ({ row }) => <{Nome}Actions {nome}={row.original} />,
  },
];

2. src/features/{nome}/components/{nome}-table.tsx:
- Importe DataTable de src/components/shared/data-table.tsx
- Use o hook use{Nome}(params)
- Implemente estado local para page, limit, search
- Debounce no campo de busca (300ms)
- Renderize:
  - Input de busca no topo
  - DataTable com as colunas e dados
  - Paginacao embaixo com info "Exibindo X-Y de Z"
  - Botao "Novo {Nome}" que leva para /{nome}/new

3. Componente {Nome}Actions (dentro de {nome}-table.tsx ou separado):
- Dropdown com opcoes: Editar, Excluir
- Editar navega para /{nome}/{id}
- Excluir abre ConfirmDialog e usa useDelete{Nome}

Use componentes shadcn: Input, Button, DropdownMenu.
Maximo 150 linhas por componente. Separe se necessario.
```

---

### Receita 9: Implementar soft delete

**Quando usar:** Precisa implementar exclusao logica (manter registro no banco mas marcar como deletado).

```
Implemente soft delete no modulo {NOME} seguindo o padrao Bravy.

1. Certifique-se que o model Prisma tem:
   deletedAt DateTime? @map("deleted_at")

2. No {nome}.repository.ts:
   - Toda query de leitura DEVE incluir: where: { deletedAt: null, ...filtros }
   - O metodo softDelete deve fazer update com deletedAt: new Date()
   - NAO use prisma.{nome}.delete() (nunca DELETE fisico)

   async softDelete(id: string): Promise<void> {
     await this.prisma.{nome}.update({
       where: { id },
       data: { deletedAt: new Date() },
     });
   }

   async findMany(params: PaginationParams) {
     const where = { deletedAt: null };
     // ... adicionar filtros
     const [items, total] = await Promise.all([
       this.prisma.{nome}.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
       this.prisma.{nome}.count({ where }),
     ]);
     return { items, total };
   }

3. No {nome}.service.ts:
   async remove(id: string) {
     const item = await this.repository.findById(id);
     if (!item) throw new NotFoundException('{Nome} nao encontrado');
     await this.repository.softDelete(id);
   }

4. No {nome}.controller.ts:
   @Delete(':id')
   @HttpCode(HttpStatus.NO_CONTENT)
   async remove(@Param('id') id: string) {
     await this.service.remove(id);
   }

NUNCA faca DELETE fisico sem motivo explicito (ex: LGPD).
SEMPRE filtre deletedAt: null em todas as queries de leitura.
```

---

### Receita 10: Criar middleware de logging

**Quando usar:** Precisa registrar requests para debug ou auditoria.

```
Crie um middleware de logging para requests HTTP no NestJS.

1. Crie src/common/middleware/logger.middleware.ts:

import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction) {
    const { method, originalUrl, ip } = req;
    const userAgent = req.get('user-agent') || '';
    const start = Date.now();

    res.on('finish', () => {
      const { statusCode } = res;
      const duration = Date.now() - start;
      this.logger.log(
        `${method} ${originalUrl} ${statusCode} ${duration}ms - ${ip} - ${userAgent}`,
      );
    });

    next();
  }
}

2. Registre no AppModule:

export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}

Use o Logger do NestJS (nunca console.log).
O middleware registra: metodo, URL, status code, duracao, IP e user-agent.
```

---

### Receita 11: Configurar validacao com Zod

**Quando usar:** Precisa criar validacao de formulario no frontend.

```
Configure validacao com Zod + React Hook Form para o formulario de {NOME}.

1. src/features/{nome}/schemas/{nome}.schema.ts:

import { z } from 'zod';

export const {nome}Schema = z.object({
  name: z
    .string({ required_error: 'Nome e obrigatorio' })
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no maximo 100 caracteres'),
  email: z
    .string({ required_error: 'Email e obrigatorio' })
    .email('Email invalido'),
  // {ADICIONE CAMPOS CONFORME NECESSARIO}
});

export type {Nome}FormData = z.infer<typeof {nome}Schema>;

2. No componente {nome}-form.tsx:

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { {nome}Schema, {Nome}FormData } from '../schemas/{nome}.schema';

export function {Nome}Form() {
  const form = useForm<{Nome}FormData>({
    resolver: zodResolver({nome}Schema),
    defaultValues: {
      name: '',
      email: '',
    },
  });

  const onSubmit = (data: {Nome}FormData) => {
    // chamar mutation
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* demais campos */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
        </Button>
      </form>
    </Form>
  );
}

Mensagens de erro em portugues.
Use componentes Form do shadcn/ui.
Desabilite o botao durante submissao.
```

---

### Receita 12: Criar testes unitarios para um service

**Quando usar:** Precisa criar testes para logica de negocio no backend.

```
Crie testes unitarios para {nome}.service.ts.

Arquivo: src/modules/{nome}/{nome}.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { {Nome}Service } from './{nome}.service';
import { {Nome}Repository } from './{nome}.repository';
import { NotFoundException } from '@nestjs/common';

describe('{Nome}Service', () => {
  let service: {Nome}Service;
  let repository: jest.Mocked<{Nome}Repository>;

  const mock{Nome} = {
    id: 'uuid-123',
    name: 'Test',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {Nome}Service,
        {
          provide: {Nome}Repository,
          useValue: {
            findMany: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<{Nome}Service>({Nome}Service);
    repository = module.get({Nome}Repository);
  });

  describe('findById', () => {
    it('deve retornar o {nome} quando encontrado', async () => {
      repository.findById.mockResolvedValue(mock{Nome});
      const result = await service.findById('uuid-123');
      expect(result).toEqual(mock{Nome});
      expect(repository.findById).toHaveBeenCalledWith('uuid-123');
    });

    it('deve lancar NotFoundException quando nao encontrado', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.findById('uuid-404')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('deve criar e retornar o {nome}', async () => {
      const dto = { name: 'Novo' };
      repository.create.mockResolvedValue({ ...mock{Nome}, ...dto });
      const result = await service.create(dto);
      expect(result.name).toBe('Novo');
      expect(repository.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('remove', () => {
    it('deve fazer soft delete quando encontrado', async () => {
      repository.findById.mockResolvedValue(mock{Nome});
      await service.remove('uuid-123');
      expect(repository.softDelete).toHaveBeenCalledWith('uuid-123');
    });

    it('deve lancar NotFoundException quando nao encontrado', async () => {
      repository.findById.mockResolvedValue(null);
      await expect(service.remove('uuid-404')).rejects.toThrow(NotFoundException);
    });
  });
});

Teste os cenarios: sucesso, nao encontrado, dados invalidos.
Mocke SEMPRE o repository (nunca bata no banco real).
Use nomes de teste em portugues descritivos.
```

---

### Receita 13: Criar docker-compose para dev

**Quando usar:** Setup inicial do ambiente de desenvolvimento.

```
Crie o docker-compose.yml para desenvolvimento local do projeto {NOME}.

version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: {nome}-db
    restart: unless-stopped
    ports:
      - '5432:5432'
    environment:
      POSTGRES_USER: ${DB_USER:-bravy}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-bravy123}
      POSTGRES_DB: ${DB_NAME:-bravy_{nome}}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U bravy']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: {nome}-redis
    restart: unless-stopped
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  mailhog:
    image: mailhog/mailhog
    container_name: {nome}-mail
    ports:
      - '1025:1025'
      - '8025:8025'

volumes:
  postgres_data:
  redis_data:

Tambem crie o .env.example correspondente:

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=bravy
DB_PASSWORD=bravy123
DB_NAME=bravy_{nome}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}

# JWT
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App
PORT=3001
NODE_ENV=development

Para subir: docker compose up -d
Para verificar: docker compose ps
Para ver logs: docker compose logs -f postgres
```

---

### Receita 14: Resolver erro de CORS

**Quando usar:** Frontend recebe erro "Access-Control-Allow-Origin" ao chamar a API.

```
Configure CORS corretamente no NestJS para o projeto Bravy.

No arquivo src/main.ts:

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');

  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN', 'http://localhost:3000'),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get<number>('PORT', 3001);
  await app.listen(port);
  logger.log(`Application running on port ${port}`);
}
bootstrap();

No .env:
CORS_ORIGIN=http://localhost:3000

Em staging/producao:
CORS_ORIGIN=https://staging.bravy.com.br

NUNCA use origin: '*' em producao.
NUNCA desabilite CORS "pra resolver rapido".
SEMPRE use ConfigService para ler a origin do .env.
```

---

### Receita 15: Otimizar query N+1

**Quando usar:** Listagem esta lenta porque cada item faz uma query separada para carregar relacoes.

```
Otimize a query N+1 no modulo {NOME}.

PROBLEMA (N+1):
// No repository — FAZ 1 query para listar + N queries para relacoes
async findMany() {
  const items = await this.prisma.{nome}.findMany();
  // Cada item faz outra query para carregar a relacao
  return items;
}

SOLUCAO (include ou select):
// No repository — FAZ 1 unica query com JOIN
async findMany(params: PaginationParams) {
  const where = { deletedAt: null };
  const [items, total] = await Promise.all([
    this.prisma.{nome}.findMany({
      where,
      skip: (params.page - 1) * params.limit,
      take: params.limit,
      orderBy: { createdAt: 'desc' },
      include: {
        category: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    }),
    this.prisma.{nome}.count({ where }),
  ]);
  return { items, total };
}

Regras:
- Use "include" para trazer relacoes inteiras
- Use "select" dentro do include para trazer apenas campos necessarios
- NUNCA carregue relacoes em loop (forEach, map com await)
- Para relacoes profundas, considere queries separadas com IN ao inves de nested includes
- Use o Prisma logging para verificar as queries geradas:
  const prisma = new PrismaClient({ log: ['query'] });

Dica: ative o log de queries no dev para identificar N+1 cedo.
```

---

## 12.4 — Anti-patterns: O Que a LLM Faz de Errado

Estes sao os erros mais comuns que LLMs cometem ao gerar codigo. Saiba reconhecer e corrigir.

---

### Anti-pattern 1: Logica de negocio no Controller

| | |
|---|---|
| **O que a LLM faz** | Coloca validacoes, calculos e regras de negocio direto no controller |
| **Por que esta errado** | Controller e porta de entrada. Logica no controller nao e reutilizavel e viola separacao de responsabilidades |
| **O que deveria fazer** | Controller apenas recebe, delega e retorna. Toda logica no service |

```typescript
// ERRADO — logica no controller
@Post()
async create(@Body() dto: CreateOrderDto) {
  const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
  if (!product) throw new NotFoundException();
  if (product.stock < dto.quantity) throw new BadRequestException('Sem estoque');
  const total = product.price * dto.quantity;
  const order = await this.prisma.order.create({
    data: { ...dto, total, status: 'pending' },
  });
  await this.prisma.product.update({
    where: { id: dto.productId },
    data: { stock: product.stock - dto.quantity },
  });
  return order;
}
```

```typescript
// CERTO — controller delega, service tem a logica
// controller
@Post()
async create(@Body() dto: CreateOrderDto) {
  return this.ordersService.create(dto);
}

// service
async create(dto: CreateOrderDto) {
  const product = await this.productsRepository.findById(dto.productId);
  if (!product) throw new NotFoundException('Produto nao encontrado');
  if (product.stock < dto.quantity) throw new BadRequestException('Estoque insuficiente');
  const total = product.price * dto.quantity;
  const order = await this.ordersRepository.create({ ...dto, total, status: 'pending' });
  await this.productsRepository.decrementStock(dto.productId, dto.quantity);
  return order;
}
```

---

### Anti-pattern 2: `any` no TypeScript

| | |
|---|---|
| **O que a LLM faz** | Usa `any` para "resolver rapido" erros de tipo |
| **Por que esta errado** | Desabilita type safety, esconde bugs, torna refactoring perigoso |
| **O que deveria fazer** | Tipar explicitamente. Se nao sabe o tipo, use `unknown` e faca type narrowing |

```typescript
// ERRADO
async function processData(data: any) {
  const result = data.items.map((item: any) => item.value);
  return result;
}
```

```typescript
// CERTO
interface ProcessableData {
  items: Array<{ value: number; label: string }>;
}

async function processData(data: ProcessableData): Promise<number[]> {
  return data.items.map((item) => item.value);
}
```

---

### Anti-pattern 3: Console.log ao inves de Logger

| | |
|---|---|
| **O que a LLM faz** | Usa `console.log` para debug e logging |
| **Por que esta errado** | console.log nao tem nivel (info/warn/error), nao tem timestamp, nao integra com ferramentas de observabilidade |
| **O que deveria fazer** | Usar o Logger do NestJS com niveis apropriados |

```typescript
// ERRADO
console.log('Criando produto:', dto);
console.log('Erro:', error);
console.log('Query executada');
```

```typescript
// CERTO
import { Logger } from '@nestjs/common';

private readonly logger = new Logger(ProductsService.name);

this.logger.log(`Criando produto: ${dto.name}`);
this.logger.error(`Erro ao criar produto: ${error.message}`, error.stack);
this.logger.debug('Query executada');
this.logger.warn('Estoque baixo para produto ' + id);
```

---

### Anti-pattern 4: Queries sem paginacao

| | |
|---|---|
| **O que a LLM faz** | Retorna todos os registros de uma vez com `findMany()` sem limite |
| **Por que esta errado** | Com 10k registros, o endpoint vai estourar a memoria e travar |
| **O que deveria fazer** | Sempre paginar com skip/take e retornar meta com total |

```typescript
// ERRADO
async findAll() {
  return this.prisma.product.findMany();
}
```

```typescript
// CERTO
async findAll(params: PaginationParams) {
  const { page = 1, limit = 20 } = params;
  const skip = (page - 1) * limit;
  const where = { deletedAt: null };

  const [items, total] = await Promise.all([
    this.prisma.product.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    this.prisma.product.count({ where }),
  ]);

  return {
    data: items,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
```

---

### Anti-pattern 5: Senhas em plaintext

| | |
|---|---|
| **O que a LLM faz** | Salva senha direto no banco ou faz comparacao direta de strings |
| **Por que esta errado** | Vazamento do banco expoe todas as senhas dos usuarios |
| **O que deveria fazer** | Hash com bcrypt antes de salvar, compare com bcrypt.compare |

```typescript
// ERRADO
async register(dto: RegisterDto) {
  return this.usersRepository.create({
    email: dto.email,
    password: dto.password, // plaintext no banco!
  });
}

async login(dto: LoginDto) {
  const user = await this.usersRepository.findByEmail(dto.email);
  if (user.password !== dto.password) throw new UnauthorizedException(); // comparacao direta!
}
```

```typescript
// CERTO
import * as bcrypt from 'bcrypt';

async register(dto: RegisterDto) {
  const hashedPassword = await bcrypt.hash(dto.password, 10);
  return this.usersRepository.create({
    email: dto.email,
    password: hashedPassword,
  });
}

async login(dto: LoginDto) {
  const user = await this.usersRepository.findByEmail(dto.email);
  if (!user) throw new UnauthorizedException('Credenciais invalidas');
  const isValid = await bcrypt.compare(dto.password, user.password);
  if (!isValid) throw new UnauthorizedException('Credenciais invalidas');
}
```

---

### Anti-pattern 6: Sem ValidationPipe

| | |
|---|---|
| **O que a LLM faz** | Aceita qualquer payload sem validar no backend |
| **Por que esta errado** | Permite dados invalidos, SQL injection, tipos errados no banco |
| **O que deveria fazer** | Configurar ValidationPipe global + DTOs com class-validator |

```typescript
// ERRADO — aceita qualquer coisa
@Post()
async create(@Body() body: any) {
  return this.service.create(body);
}
```

```typescript
// CERTO — valida com DTO
// main.ts
app.useGlobalPipes(new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
}));

// dto
export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name: string;

  @IsNumber()
  @IsPositive()
  price: number;
}

// controller
@Post()
async create(@Body() dto: CreateProductDto) {
  return this.service.create(dto);
}
```

---

### Anti-pattern 7: Import circular

| | |
|---|---|
| **O que a LLM faz** | Cria dependencias circulares entre modulos (A importa B que importa A) |
| **Por que esta errado** | Causa erros de runtime dificeis de debugar, dependency injection quebra |
| **O que deveria fazer** | Usar `forwardRef()` quando necessario, ou refatorar para eliminar o ciclo |

```typescript
// ERRADO — ciclo: OrdersModule <-> ProductsModule
// orders.module.ts
@Module({ imports: [ProductsModule] })
export class OrdersModule {}

// products.module.ts
@Module({ imports: [OrdersModule] }) // ciclo!
export class ProductsModule {}
```

```typescript
// CERTO — opcao 1: forwardRef
@Module({ imports: [forwardRef(() => ProductsModule)] })
export class OrdersModule {}

// CERTO — opcao 2 (melhor): extrair logica compartilhada
// shared/stock.service.ts — servico independente
@Module({ imports: [DatabaseModule] })
export class StockModule {}

// Ambos importam StockModule sem ciclo
```

---

### Anti-pattern 8: God components (componentes gigantes)

| | |
|---|---|
| **O que a LLM faz** | Cria um unico componente com 500+ linhas fazendo tudo |
| **Por que esta errado** | Impossivel de manter, testar e reutilizar. Re-renderiza tudo a cada mudanca |
| **O que deveria fazer** | Componentes pequenos (~150 linhas max), cada um com uma responsabilidade |

```tsx
// ERRADO — God component
export function ProductPage() {
  // 50 linhas de hooks e estado
  // 30 linhas de handlers
  // 400 linhas de JSX com tabela, formulario, modal, filtros...
  return (
    <div>
      {/* centenas de linhas de JSX misturando tudo */}
    </div>
  );
}
```

```tsx
// CERTO — componentes separados
// page.tsx (orquestrador simples)
export default function ProductsPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Produtos" action={<NewProductButton />} />
      <ProductTable />
    </div>
  );
}

// components/product-table.tsx (~100 linhas)
// components/product-form.tsx (~120 linhas)
// components/product-columns.tsx (~50 linhas)
// components/product-actions.tsx (~40 linhas)
```

---

### Anti-pattern 9: Fetch direto ao inves de service

| | |
|---|---|
| **O que a LLM faz** | Usa `fetch()` ou `axios` direto dentro do componente |
| **Por que esta errado** | URL, headers e logica de request ficam espalhados. Impossivel centralizar tratamento de erro |
| **O que deveria fazer** | Centralizar chamadas HTTP no service da feature |

```tsx
// ERRADO — fetch direto no componente
function ProductList() {
  useEffect(() => {
    fetch('http://localhost:3001/api/products', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => setProducts(data));
  }, []);
}
```

```tsx
// CERTO — via service + hook
// services/product.service.ts
class ProductServiceClass {
  async getAll(params: ProductListParams) {
    const { data } = await api.get('/products', { params });
    return data;
  }
}
export const productService = new ProductServiceClass();

// hooks/use-products.ts
export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.getAll(params),
  });
}

// componente — limpo e desacoplado
function ProductList() {
  const { data, isLoading } = useProducts({ page: 1, limit: 20 });
}
```

---

### Anti-pattern 10: Estado global desnecessario

| | |
|---|---|
| **O que a LLM faz** | Coloca tudo no Zustand/Redux: dados do servidor, estado de formulario, estado de UI |
| **Por que esta errado** | Server state deve ficar no React Query. Duplicar causa dessincronizacao e complexidade |
| **O que deveria fazer** | React Query para server state. Zustand somente para client state puro (tema, sidebar, preferencias) |

```tsx
// ERRADO — estado do servidor no Zustand
const useProductStore = create((set) => ({
  products: [],
  loading: false,
  fetchProducts: async () => {
    set({ loading: true });
    const res = await api.get('/products');
    set({ products: res.data, loading: false });
  },
}));
```

```tsx
// CERTO — React Query para server state
function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: () => productService.getAll(params),
  });
}

// Zustand APENAS para client state puro
const useUIStore = create((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
```

---

### Anti-pattern 11: Ignorar error handling

| | |
|---|---|
| **O que a LLM faz** | Nao trata erros ou usa catch vazio |
| **Por que esta errado** | Erros silenciosos sao os piores. Usuario nao sabe o que aconteceu, dev nao sabe o que quebrou |
| **O que deveria fazer** | Tratar erros em cada camada com mensagens uteis |

```typescript
// ERRADO
async create(dto: CreateProductDto) {
  try {
    return await this.repository.create(dto);
  } catch (error) {
    // nada aqui, erro engolido
  }
}
```

```typescript
// CERTO
async create(dto: CreateProductDto) {
  try {
    return await this.repository.create(dto);
  } catch (error) {
    this.logger.error(`Erro ao criar produto: ${error.message}`, error.stack);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        throw new ConflictException('Produto com este nome ja existe');
      }
    }
    throw new InternalServerErrorException('Erro ao criar produto');
  }
}
```

---

### Anti-pattern 12: SQL direto sem necessidade

| | |
|---|---|
| **O que a LLM faz** | Usa `$queryRaw` do Prisma para queries simples |
| **Por que esta errado** | Perde type safety, abre brecha para SQL injection, mais dificil de manter |
| **O que deveria fazer** | Usar a API do Prisma. $queryRaw so para queries realmente complexas |

```typescript
// ERRADO — SQL raw para query simples
const products = await this.prisma.$queryRaw`
  SELECT * FROM products WHERE is_active = true AND deleted_at IS NULL
  ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}
`;
```

```typescript
// CERTO — API do Prisma (type-safe)
const products = await this.prisma.product.findMany({
  where: { isActive: true, deletedAt: null },
  orderBy: { createdAt: 'desc' },
  take: limit,
  skip: offset,
});
```

---

### Anti-pattern 13: Nao usar variaveis de ambiente via ConfigService

| | |
|---|---|
| **O que a LLM faz** | Usa `process.env.JWT_SECRET` direto no codigo |
| **Por que esta errado** | Sem validacao, sem tipagem, espalha acesso a env por todo o projeto |
| **O que deveria fazer** | Centralizar com ConfigModule/ConfigService do NestJS |

```typescript
// ERRADO
const secret = process.env.JWT_SECRET;
const port = process.env.PORT || 3001;
```

```typescript
// CERTO
// config/env.config.ts
export const envConfig = () => ({
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  },
  port: parseInt(process.env.PORT, 10) || 3001,
});

// no service
constructor(private configService: ConfigService) {}

const secret = this.configService.get<string>('jwt.secret');
```

---

### Anti-pattern 14: Misturar responsabilidades no hook

| | |
|---|---|
| **O que a LLM faz** | Cria um unico hook gigante que faz fetch, mutacao, estado local e logica de UI |
| **Por que esta errado** | Impossivel reutilizar partes, dificil de testar, dificil de entender |
| **O que deveria fazer** | Um hook por operacao: useProducts, useCreateProduct, useUpdateProduct |

```tsx
// ERRADO — hook fazendo tudo
function useProductManager() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  // + 100 linhas de logica misturada
}
```

```tsx
// CERTO — hooks separados por operacao
function useProducts(params) { /* useQuery */ }
function useCreateProduct() { /* useMutation */ }
function useUpdateProduct() { /* useMutation */ }
function useDeleteProduct() { /* useMutation */ }
```

---

### Anti-pattern 15: Nao tipar retorno de funcoes

| | |
|---|---|
| **O que a LLM faz** | Deixa o TypeScript inferir o retorno de funcoes publicas |
| **Por que esta errado** | A inferencia pode mudar silenciosamente se o corpo da funcao mudar. Quem consome nao sabe o que esperar |
| **O que deveria fazer** | Tipar explicitamente o retorno de funcoes publicas e metodos de service |

```typescript
// ERRADO — retorno inferido
async findById(id: string) {
  const product = await this.repository.findById(id);
  if (!product) throw new NotFoundException();
  return product;
}
```

```typescript
// CERTO — retorno explicito
async findById(id: string): Promise<Product> {
  const product = await this.repository.findById(id);
  if (!product) throw new NotFoundException('Produto nao encontrado');
  return product;
}
```

---

### Anti-pattern 16: Nao tratar loading e erro no frontend

| | |
|---|---|
| **O que a LLM faz** | Renderiza direto os dados sem verificar se carregaram |
| **Por que esta errado** | Flash de conteudo vazio, crash se data e undefined, UX ruim |
| **O que deveria fazer** | Sempre tratar isLoading, isError e data vazio |

```tsx
// ERRADO — assume que data existe
function ProductList() {
  const { data } = useProducts(params);
  return (
    <DataTable columns={columns} data={data.data} />
  );
}
```

```tsx
// CERTO — trata todos os estados
function ProductList() {
  const { data, isLoading, isError } = useProducts(params);

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorMessage message="Erro ao carregar produtos" />;
  if (!data?.data.length) return <EmptyState message="Nenhum produto encontrado" />;

  return <DataTable columns={columns} data={data.data} />;
}
```

---

### Anti-pattern 17: Hardcoded URLs e magic numbers

| | |
|---|---|
| **O que a LLM faz** | Coloca URLs, numeros e strings direto no codigo |
| **Por que esta errado** | Dificil de manter, mudar e encontrar. Valores espalhados sem contexto |
| **O que deveria fazer** | Constantes nomeadas, configuracao centralizada |

```typescript
// ERRADO
const response = await fetch('http://localhost:3001/api/products');
if (items.length > 50) { /* ... */ }
await new Promise(resolve => setTimeout(resolve, 3000));
```

```typescript
// CERTO
// lib/constants.ts
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
export const MAX_ITEMS_PER_PAGE = 50;
export const DEBOUNCE_DELAY_MS = 300;

// uso
const response = await api.get('/products'); // Axios ja tem baseURL configurado
if (items.length > MAX_ITEMS_PER_PAGE) { /* ... */ }
```

---

### Anti-pattern 18: Criar migrations destrutivas sem pensar

| | |
|---|---|
| **O que a LLM faz** | Gera migration que dropa coluna/tabela ou altera tipo de dado |
| **Por que esta errado** | Perda de dados irreversivel em producao |
| **O que deveria fazer** | Migrations aditivas. Para remover: 1) marcar como deprecated, 2) migrar dados, 3) remover |

```sql
-- ERRADO — migration destrutiva
ALTER TABLE products DROP COLUMN description;
ALTER TABLE users ALTER COLUMN phone TYPE integer;
```

```sql
-- CERTO — migration segura
-- Passo 1: adicionar nova coluna
ALTER TABLE users ADD COLUMN phone_new VARCHAR(20);
-- Passo 2: migrar dados (em outro deploy)
UPDATE users SET phone_new = CAST(phone AS VARCHAR);
-- Passo 3: remover coluna antiga (em outro deploy, apos validacao)
ALTER TABLE users DROP COLUMN phone;
ALTER TABLE users RENAME COLUMN phone_new TO phone;
```

---

### Anti-pattern 19: Nao usar transacoes para operacoes compostas

| | |
|---|---|
| **O que a LLM faz** | Executa multiplas operacoes de escrita sem transacao |
| **Por que esta errado** | Se a segunda falhar, a primeira ja foi salva. Dados inconsistentes |
| **O que deveria fazer** | Usar `$transaction` do Prisma para operacoes que devem ser atomicas |

```typescript
// ERRADO — sem transacao
async createOrder(dto: CreateOrderDto) {
  const order = await this.prisma.order.create({ data: orderData });
  await this.prisma.product.update({ data: { stock: newStock } }); // se falhar aqui, order ja existe sem estoque deduzido
  await this.prisma.orderItem.createMany({ data: items }); // se falhar aqui, order sem items
}
```

```typescript
// CERTO — com transacao
async createOrder(dto: CreateOrderDto) {
  return this.prisma.$transaction(async (tx) => {
    const order = await tx.order.create({ data: orderData });
    await tx.product.update({ data: { stock: newStock } });
    await tx.orderItem.createMany({ data: items });
    return order;
  });
}
```

---

### Anti-pattern 20: Expor dados sensiveis na response

| | |
|---|---|
| **O que a LLM faz** | Retorna o objeto inteiro do banco incluindo password, tokens internos |
| **Por que esta errado** | Vaza dados sensiveis para o frontend/API |
| **O que deveria fazer** | Usar select ou DTO de response para controlar o que sai |

```typescript
// ERRADO — retorna tudo, incluindo senha
async findById(id: string) {
  return this.prisma.user.findUnique({ where: { id } });
  // retorna: { id, name, email, password, refreshToken, ... }
}
```

```typescript
// CERTO — seleciona apenas campos seguros
async findById(id: string): Promise<UserResponse> {
  const user = await this.prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });
  if (!user) throw new NotFoundException('Usuario nao encontrado');
  return user;
}
```

---

## 12.5 — Checklist de Inicio de Projeto

Siga esta ordem ao criar um projeto novo. Cada etapa tem o prompt pronto.

### Etapa 1: Setup inicial

```
Crie a estrutura base do backend NestJS para o projeto bravy-{nome}-api:

1. nest new bravy-{nome}-api
2. Instale dependencias:
   @nestjs/config, @nestjs/jwt, @nestjs/passport, passport, passport-jwt,
   @prisma/client, prisma, bcrypt, class-validator, class-transformer,
   helmet, compression
3. Configure src/main.ts com:
   - ValidationPipe global (whitelist, forbidNonWhitelisted, transform)
   - CORS habilitado
   - Helmet
   - Compression
   - Prefixo /api
   - Logger do NestJS
4. Crie src/config/env.config.ts com validacao das variaveis obrigatorias
5. Configure o ConfigModule como global no AppModule
6. Crie .env.example com todas as variaveis necessarias
```

### Etapa 2: Docker + banco

```
Configure Docker e banco de dados para dev:

1. Crie docker-compose.yml com PostgreSQL 16 e Redis 7
2. Crie .env com DATABASE_URL apontando para o container
3. Inicialize Prisma: npx prisma init
4. Configure o datasource no schema.prisma
5. Crie src/database/prisma.service.ts (extends PrismaClient, implementa OnModuleInit)
6. Crie src/database/prisma.module.ts (exporta PrismaService como global)
7. Crie src/database/repositories/base.repository.ts com metodos genericos

Suba os containers e verifique a conexao com: npx prisma db push
```

### Etapa 3: Auth

```
Implemente autenticacao JWT completa:

1. Model User no Prisma com: id, name, email (unique), password, role (enum), refreshToken, timestamps
2. Migration: npx prisma migrate dev --name add_users_table
3. Modulo auth: controller, service, strategies (jwt, jwt-refresh)
4. Modulo users: controller, service, repository, DTOs
5. Guards: JwtAuthGuard, RolesGuard
6. Decorators: @CurrentUser(), @Roles()
7. Endpoints: POST /auth/register, POST /auth/login, POST /auth/refresh, POST /auth/logout
8. Seed: npx prisma db seed com usuario admin padrao

Siga os padroes de nomenclatura e camadas da Bravy.
```

### Etapa 4: Primeiro modulo

```
Crie o primeiro modulo de negocio: {NOME_DO_MODULO}.

Siga a Receita 1 (modulo NestJS completo) com os campos:
{LISTE OS CAMPOS}

Depois de criar, teste:
1. POST /api/{nome} com dados validos (deve criar)
2. POST /api/{nome} com dados invalidos (deve retornar 400)
3. GET /api/{nome} (deve listar paginado)
4. GET /api/{nome}/:id (deve retornar um)
5. GET /api/{nome}/uuid-invalido (deve retornar 404)
6. PATCH /api/{nome}/:id (deve atualizar)
7. DELETE /api/{nome}/:id (deve soft delete)
```

### Etapa 5: Frontend base

```
Crie a estrutura base do frontend Next.js para bravy-{nome}-web:

1. npx create-next-app@latest bravy-{nome}-web (App Router, TypeScript, Tailwind, ESLint)
2. Instale: @tanstack/react-query, axios, zod, @hookform/resolvers, react-hook-form, zustand
3. Configure shadcn/ui: npx shadcn-ui@latest init
4. Adicione componentes shadcn base: button, input, form, dialog, dropdown-menu, table, toast
5. Crie src/lib/api.ts com Axios configurado (baseURL, interceptors para JWT)
6. Crie src/providers/query-provider.tsx com QueryClientProvider
7. Crie src/providers/auth-provider.tsx com contexto de auth
8. Crie src/components/layout/ com sidebar, header, main-layout
9. Configure rotas: (auth)/login e (dashboard)/layout

Passe o system prompt padrao como contexto.
```

### Etapa 6: Deploy staging

```
Configure deploy para staging:

1. Crie Dockerfile multi-stage para o backend:
   - Stage 1: install (npm ci)
   - Stage 2: build (npx prisma generate && npm run build)
   - Stage 3: production (node dist/main.js)
2. Crie Dockerfile para o frontend:
   - Stage 1: install
   - Stage 2: build (npm run build)
   - Stage 3: production (next start)
3. Crie docker-compose.staging.yml com:
   - postgres, redis, api, web, nginx
4. Configure nginx como reverse proxy:
   - / -> frontend (port 3000)
   - /api -> backend (port 3001)
   - SSL com certbot
5. Crie .env.staging.example

NAO inclua senhas reais. Use placeholders.
```

---

## 12.6 — Checklist de Nova Feature

Ao criar uma nova feature, siga esta ordem exata. Cada etapa depende da anterior.

| # | Etapa | Camada | Arquivo |
|---|-------|--------|---------|
| 1 | Model Prisma | Banco | `prisma/schema.prisma` |
| 2 | Migration | Banco | `prisma/migrations/` |
| 3 | Repository | Backend | `src/modules/{nome}/{nome}.repository.ts` |
| 4 | Service | Backend | `src/modules/{nome}/{nome}.service.ts` |
| 5 | DTOs | Backend | `src/modules/{nome}/dto/` |
| 6 | Controller | Backend | `src/modules/{nome}/{nome}.controller.ts` |
| 7 | Module | Backend | `src/modules/{nome}/{nome}.module.ts` |
| 8 | Registrar module | Backend | `src/app.module.ts` (imports) |
| 9 | Testar endpoints | Backend | Insomnia/Postman |
| 10 | Types | Frontend | `src/features/{nome}/types/{nome}.types.ts` |
| 11 | Service HTTP | Frontend | `src/features/{nome}/services/{nome}.service.ts` |
| 12 | Hooks | Frontend | `src/features/{nome}/hooks/` |
| 13 | Schema Zod | Frontend | `src/features/{nome}/schemas/{nome}.schema.ts` |
| 14 | Colunas tabela | Frontend | `src/features/{nome}/components/{nome}-columns.tsx` |
| 15 | Componente tabela | Frontend | `src/features/{nome}/components/{nome}-table.tsx` |
| 16 | Componente form | Frontend | `src/features/{nome}/components/{nome}-form.tsx` |
| 17 | Pagina listagem | Frontend | `src/app/(dashboard)/{nome}/page.tsx` |
| 18 | Pagina criacao | Frontend | `src/app/(dashboard)/{nome}/new/page.tsx` |
| 19 | Pagina edicao | Frontend | `src/app/(dashboard)/{nome}/[id]/page.tsx` |
| 20 | Adicionar rota sidebar | Frontend | `src/components/layout/sidebar.tsx` |

**Dica:** peca para a LLM uma etapa por vez. Valide antes de seguir.

---

## 12.7 — Checklist Pre-Deploy

Antes de mandar para staging ou producao, verifique cada item.

### Codigo

- [ ] Nenhum `any` no TypeScript (`npx tsc --noEmit`)
- [ ] Nenhum `console.log` no codigo (`grep -r "console.log" src/`)
- [ ] Todos os DTOs tem validacao com class-validator
- [ ] Todos os schemas de formulario usam Zod
- [ ] Nenhum TODO/FIXME critico pendente
- [ ] Imports nao tem circular dependencies
- [ ] ESLint sem erros (`npm run lint`)
- [ ] Testes passando (`npm run test`)

### Seguranca

- [ ] Senhas hasheadas com bcrypt (nunca plaintext)
- [ ] JWT com tempo de expiracao (15min access, 7d refresh)
- [ ] CORS configurado para o dominio correto (nao `*`)
- [ ] Helmet habilitado
- [ ] ValidationPipe global ativo (whitelist + forbidNonWhitelisted)
- [ ] Rate limiting configurado
- [ ] Dados sensiveis nao vazam nas responses (password, tokens)
- [ ] Variaveis de ambiente via ConfigService (nao process.env direto)
- [ ] .env nao esta no git (verificar .gitignore)
- [ ] Segredos diferentes entre staging e producao

### Banco de dados

- [ ] Migrations executam sem erro
- [ ] Soft delete implementado (nao DELETE fisico)
- [ ] Indices nos campos de busca frequente
- [ ] Queries com paginacao (nenhum findMany sem limit)
- [ ] Relacoes com onDelete correto
- [ ] Seed funciona para popular dados iniciais

### Frontend

- [ ] Loading states em todas as listagens
- [ ] Error states em todas as chamadas de API
- [ ] Empty states quando nao ha dados
- [ ] Formularios com validacao e mensagens em portugues
- [ ] Responsivo (testar em mobile)
- [ ] Sem memory leaks (verificar useEffect cleanups)
- [ ] Imagens otimizadas (next/image)
- [ ] Metadata configurado (title, description)

### Infraestrutura

- [ ] Dockerfile otimizado (multi-stage)
- [ ] docker-compose funciona do zero (`docker compose up`)
- [ ] Variaveis de ambiente documentadas no .env.example
- [ ] Healthcheck endpoint (`GET /api/health`)
- [ ] Logs estruturados (Logger do NestJS)
- [ ] Backup do banco configurado
- [ ] SSL/TLS configurado (HTTPS)
- [ ] Dominio apontando corretamente

---

## Proximos passos

- Precisa da referencia completa para passar para a LLM? -> [99-referencia-completa.md](99-referencia-completa.md)
- Precisa de padroes de nomenclatura? -> [03-nomenclatura-e-padroes.md](03-nomenclatura-e-padroes.md)
- Precisa entender a arquitetura? -> [02-arquitetura.md](02-arquitetura.md)
- Voltar ao indice -> [00-indice.md](00-indice.md)
