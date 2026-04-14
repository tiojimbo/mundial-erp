# 05 — Guia do Frontend Next.js

Este documento é o seu mapa completo para trabalhar no frontend. Ele vai do conceito básico até a implementação de uma feature inteira com código copiável. Se você está abrindo o projeto frontend pela primeira vez, comece por aqui.

---

## 5.1 — O que é o Next.js e por que usar?

O Next.js é um framework React que adiciona superpoderes ao React puro: roteamento por arquivos, renderização no servidor, otimização de imagens, fontes e muito mais.

### A analogia do restaurante

Pense num restaurante:

| Conceito | Analogia | O que acontece |
|----------|----------|----------------|
| **Server Component** | Cozinha do restaurante | O prato (HTML) chega pronto na mesa. O cliente (navegador) não precisa cozinhar nada. Mais rápido, mais seguro, menos JavaScript no browser. |
| **Client Component** | Cozinha na mesa do cliente | O cliente recebe os ingredientes (JS) e monta o prato na hora. Necessário quando ele precisa interagir: escolher tempero, pedir mais sal, etc. |

**Regra de ouro:** Sempre comece com Server Components. Só use `"use client"` quando *precisar* de interatividade no navegador.

### Por que Next.js (App Router)?

| Benefício | Como |
|-----------|------|
| SEO nativo | Server-side rendering por padrão |
| Performance | Menos JS enviado ao browser com Server Components |
| Roteamento simples | Pasta = rota. Sem configuração manual de rotas |
| Layouts aninhados | `layout.tsx` compartilha UI entre páginas filhas |
| Data fetching integrado | `fetch` no servidor com cache automático |
| Image/Font optimization | `next/image` e `next/font` integrados |
| TypeScript first | Suporte nativo, sem config extra |

---

## 5.2 — Estrutura de pastas completa

A estrutura segue o princípio de **colocação**: arquivos ficam perto de onde são usados.

### Regras de colocação

```
Pergunta: "Onde coloco este componente?"

1 feature usa?          → features/{feature}/components/
2+ features usam?       → components/shared/
UI genérico (botão)?    → components/ui/        (shadcn)
Layout (sidebar, header)? → components/layout/
Hook de 1 feature?      → features/{feature}/hooks/
Hook genérico?          → hooks/
Tipo de 1 feature?      → features/{feature}/types/
Tipo compartilhado?     → types/
```

### Árvore completa do projeto

```
src/
├── app/                              # Rotas do Next.js (App Router)
│   ├── layout.tsx                    # Layout raiz — providers, fontes, metadata global
│   ├── page.tsx                      # Página inicial (/)
│   ├── loading.tsx                   # Loading global (Suspense boundary)
│   ├── error.tsx                     # Error boundary global
│   ├── not-found.tsx                 # Página 404 customizada
│   ├── globals.css                   # Estilos globais + variáveis Tailwind
│   │
│   ├── (auth)/                       # Grupo de rotas — sem layout autenticado
│   │   ├── layout.tsx                # Layout de auth (centralizado, sem sidebar)
│   │   ├── login/
│   │   │   └── page.tsx              # /login
│   │   ├── register/
│   │   │   └── page.tsx              # /register
│   │   └── forgot-password/
│   │       └── page.tsx              # /forgot-password
│   │
│   └── (dashboard)/                  # Grupo de rotas — com layout autenticado
│       ├── layout.tsx                # Layout do dashboard (sidebar + header + main)
│       ├── page.tsx                  # /dashboard (home)
│       │
│       ├── products/                 # Feature: Produtos
│       │   ├── page.tsx              # /products — listagem
│       │   ├── new/
│       │   │   └── page.tsx          # /products/new — cadastro
│       │   ├── [id]/
│       │   │   ├── page.tsx          # /products/:id — detalhes
│       │   │   └── edit/
│       │   │       └── page.tsx      # /products/:id/edit — edição
│       │   └── loading.tsx           # Loading específico de /products
│       │
│       ├── customers/                # Feature: Clientes
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       ├── page.tsx
│       │       └── edit/
│       │           └── page.tsx
│       │
│       ├── orders/                   # Feature: Pedidos
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       │
│       └── settings/                 # Feature: Configurações
│           ├── page.tsx
│           └── profile/
│               └── page.tsx
│
├── components/                       # Componentes compartilhados
│   ├── ui/                           # shadcn/ui — NÃO editar manualmente
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── table.tsx
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── toast.tsx
│   │   ├── toaster.tsx
│   │   ├── skeleton.tsx
│   │   ├── separator.tsx
│   │   ├── sheet.tsx
│   │   └── form.tsx
│   │
│   ├── layout/                       # Componentes de layout
│   │   ├── sidebar.tsx               # Sidebar com navegação
│   │   ├── header.tsx                # Header com user menu
│   │   ├── main-content.tsx          # Wrapper do conteúdo principal
│   │   └── breadcrumbs.tsx           # Breadcrumbs automáticos
│   │
│   └── shared/                       # Componentes usados em 2+ features
│       ├── data-table.tsx            # Tabela genérica com paginação/sort/filter
│       ├── page-header.tsx           # Cabeçalho de página (título + ações)
│       ├── empty-state.tsx           # Estado vazio padrão
│       ├── confirm-dialog.tsx        # Dialog de confirmação reutilizável
│       ├── search-input.tsx          # Input de busca com debounce
│       └── status-badge.tsx          # Badge de status genérico
│
├── features/                         # Código organizado por feature
│   ├── products/
│   │   ├── components/               # Componentes exclusivos de produtos
│   │   │   ├── product-form.tsx
│   │   │   ├── product-table.tsx
│   │   │   └── product-columns.tsx
│   │   ├── hooks/                    # Hooks exclusivos de produtos
│   │   │   ├── use-products.ts
│   │   │   └── use-create-product.ts
│   │   ├── services/                 # Chamadas HTTP de produtos
│   │   │   └── product.service.ts
│   │   ├── schemas/                  # Validações Zod de produtos
│   │   │   └── product.schema.ts
│   │   └── types/                    # Tipos exclusivos de produtos
│   │       └── product.types.ts
│   │
│   ├── customers/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── schemas/
│   │   └── types/
│   │
│   └── orders/
│       ├── components/
│       ├── hooks/
│       ├── services/
│       ├── schemas/
│       └── types/
│
├── hooks/                            # Hooks globais
│   ├── use-debounce.ts               # Debounce genérico
│   ├── use-media-query.ts            # Responsive breakpoints
│   └── use-local-storage.ts          # Persistência local
│
├── lib/                              # Utilitários e configuração
│   ├── api.ts                        # Instância Axios + interceptors
│   ├── utils.ts                      # cn() e helpers genéricos
│   ├── constants.ts                  # Constantes da aplicação
│   └── query-client.ts              # Configuração React Query
│
├── providers/                        # Context providers
│   ├── query-provider.tsx            # React Query Provider
│   ├── theme-provider.tsx            # Tema (dark/light)
│   └── auth-provider.tsx             # Contexto de autenticação
│
├── stores/                           # Estado global (Zustand)
│   ├── auth.store.ts                 # Store de autenticação
│   └── sidebar.store.ts             # Store da sidebar (aberta/fechada)
│
├── types/                            # Tipos compartilhados
│   ├── api.types.ts                  # Tipos de response da API
│   ├── auth.types.ts                 # Tipos de autenticação
│   └── common.types.ts              # Tipos utilitários genéricos
│
├── config/                           # Configuração
│   ├── navigation.ts                 # Itens do menu/sidebar
│   └── site.ts                       # Metadata do site
│
└── middleware.ts                      # Middleware Next.js (auth redirect)
```

### Explicação das pastas principais

| Pasta | Responsabilidade | Quem mexe |
|-------|-----------------|-----------|
| `app/` | Apenas roteamento e layouts. Páginas são finas — delegam para features | Quando cria nova rota |
| `components/ui/` | Componentes shadcn/ui. Gerados via CLI, não editados manualmente | `npx shadcn-ui@latest add button` |
| `components/layout/` | Sidebar, header, breadcrumbs — estrutura visual da app | Raramente |
| `components/shared/` | Componentes usados em 2+ features | Quando algo se repete |
| `features/` | Todo o código de domínio organizado por feature | Diariamente |
| `lib/` | Configuração e utilitários sem estado | Setup inicial |
| `providers/` | Wrappers de contexto (React Query, Auth, Theme) | Setup inicial |
| `stores/` | Estado global com Zustand | Quando precisa de estado cross-feature |
| `hooks/` | Hooks genéricos reutilizáveis | Quando algo se repete |
| `types/` | Tipos compartilhados entre features | Quando 2+ features usam o mesmo tipo |

---

## 5.3 — Server Component ou Client Component?

### Fluxograma de decisão

```
┌─────────────────────────────────────────────────────┐
│         Precisa de interatividade no browser?        │
│  (useState, useEffect, onClick, onChange, onSubmit,  │
│   hooks de browser, window, document, ref)           │
└──────────────────────┬──────────────────────────────┘
                       │
              ┌────────┴────────┐
              │                 │
           ✅ SIM            ❌ NÃO
              │                 │
              ▼                 ▼
     ┌────────────────┐  ┌──────────────────────┐
     │  "use client"  │  │  Server Component     │
     │  no topo do    │  │  (default, sem nada)  │
     │  arquivo       │  │                       │
     └────────────────┘  └──────────────────────┘
```

### Tabela comparativa

| Critério | Server Component | Client Component |
|----------|-----------------|------------------|
| **Diretiva** | Nenhuma (padrão) | `"use client"` no topo |
| **Onde executa** | Servidor (Node.js) | Navegador |
| **JS enviado ao browser** | Zero | Sim (bundle) |
| **Acesso a banco/filesystem** | Sim | Não |
| **useState / useEffect** | Não | Sim |
| **onClick / onChange** | Não | Sim |
| **Pode usar hooks de browser** | Não | Sim |
| **fetch com await direto** | Sim | Não (useEffect ou React Query) |
| **Pode importar Client Component** | Sim | Sim |
| **Pode importar Server Component** | Sim | Não (recebe como children) |
| **SEO** | Excelente (HTML puro) | Depende de hidratação |
| **Performance** | Superior | JS extra no bundle |
| **Quando usar** | Páginas, layouts, data fetching | Formulários, modais, interação |

### Exemplos práticos

```tsx
// ✅ Server Component — página que busca dados
// Sem "use client", sem hooks, sem eventos
export default async function ProductsPage() {
  const products = await fetch("/api/products").then((r) => r.json());

  return (
    <div>
      <h1>Produtos</h1>
      <ProductTable products={products} />
    </div>
  );
}
```

```tsx
// ✅ Client Component — formulário com interação
"use client";

import { useState } from "react";

export function ProductForm() {
  const [name, setName] = useState("");

  return (
    <input
      value={name}
      onChange={(e) => setName(e.target.value)}
    />
  );
}
```

### Padrão de composição: Server + Client juntos

```tsx
// page.tsx (Server Component)
import { ProductFilters } from "@/features/products/components/product-filters";

export default async function ProductsPage() {
  // Busca inicial no servidor (rápido, sem loading no client)
  const products = await getProducts();

  return (
    <div>
      {/* Client Component para interatividade */}
      <ProductFilters />

      {/* Server Component que recebe dados prontos */}
      <ProductList products={products} />
    </div>
  );
}
```

---

## 5.4 — Feature completa: Listagem e Cadastro de Produtos

Esta seção mostra **cada arquivo** necessário para implementar uma feature real. Copie, adapte e use como template para novas features.

### 5.4.1 — Types (`product.types.ts`)

```ts
// src/features/products/types/product.types.ts

export type ProductStatus = "active" | "inactive" | "draft";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  status: ProductStatus;
  categoryId: string;
  categoryName: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductPayload {
  name: string;
  description: string;
  price: number;
  status: ProductStatus;
  categoryId: string;
  imageUrl?: string;
}

export interface UpdateProductPayload extends Partial<CreateProductPayload> {
  id: string;
}

export interface ProductFilters {
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  page?: number;
  limit?: number;
}

export interface ProductsResponse {
  data: Product[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

### 5.4.2 — Schema Zod (`product.schema.ts`)

```ts
// src/features/products/schemas/product.schema.ts

import { z } from "zod";

export const productSchema = z.object({
  name: z
    .string()
    .min(3, "Nome deve ter no mínimo 3 caracteres")
    .max(120, "Nome deve ter no máximo 120 caracteres"),
  description: z
    .string()
    .min(10, "Descrição deve ter no mínimo 10 caracteres")
    .max(500, "Descrição deve ter no máximo 500 caracteres"),
  price: z
    .number({ invalid_type_error: "Preço deve ser um número" })
    .positive("Preço deve ser maior que zero")
    .multipleOf(0.01, "Preço deve ter no máximo 2 casas decimais"),
  status: z.enum(["active", "inactive", "draft"], {
    errorMap: () => ({ message: "Status inválido" }),
  }),
  categoryId: z
    .string()
    .uuid("Categoria inválida"),
  imageUrl: z
    .string()
    .url("URL da imagem inválida")
    .optional()
    .or(z.literal("")),
});

export type ProductFormData = z.infer<typeof productSchema>;
```

### 5.4.3 — Service HTTP (`product.service.ts`)

```ts
// src/features/products/services/product.service.ts

import { api } from "@/lib/api";
import type {
  CreateProductPayload,
  Product,
  ProductFilters,
  ProductsResponse,
  UpdateProductPayload,
} from "../types/product.types";

const BASE_URL = "/products";

export const productService = {
  async getAll(filters?: ProductFilters): Promise<ProductsResponse> {
    const { data } = await api.get<ProductsResponse>(BASE_URL, {
      params: filters,
    });
    return data;
  },

  async getById(id: string): Promise<Product> {
    const { data } = await api.get<Product>(`${BASE_URL}/${id}`);
    return data;
  },

  async create(payload: CreateProductPayload): Promise<Product> {
    const { data } = await api.post<Product>(BASE_URL, payload);
    return data;
  },

  async update({ id, ...payload }: UpdateProductPayload): Promise<Product> {
    const { data } = await api.patch<Product>(`${BASE_URL}/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`${BASE_URL}/${id}`);
  },
};
```

### 5.4.4 — Hook de listagem (`use-products.ts`)

```ts
// src/features/products/hooks/use-products.ts

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services/product.service";
import type { ProductFilters } from "../types/product.types";

export const PRODUCTS_QUERY_KEY = ["products"];

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, filters],
    queryFn: () => productService.getAll(filters),
    placeholderData: (previousData) => previousData,
  });
}

export function useProduct(id: string) {
  return useQuery({
    queryKey: [...PRODUCTS_QUERY_KEY, id],
    queryFn: () => productService.getById(id),
    enabled: !!id,
  });
}

export function useInvalidateProducts() {
  const queryClient = useQueryClient();

  return () =>
    queryClient.invalidateQueries({ queryKey: PRODUCTS_QUERY_KEY });
}
```

### 5.4.5 — Hook de criação (`use-create-product.ts`)

```ts
// src/features/products/hooks/use-create-product.ts

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { productService } from "../services/product.service";
import { useInvalidateProducts } from "./use-products";
import type { CreateProductPayload } from "../types/product.types";

export function useCreateProduct() {
  const router = useRouter();
  const invalidateProducts = useInvalidateProducts();

  return useMutation({
    mutationFn: (payload: CreateProductPayload) =>
      productService.create(payload),

    onSuccess: () => {
      toast.success("Produto criado com sucesso!");
      invalidateProducts();
      router.push("/products");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Erro ao criar produto");
    },
  });
}

export function useUpdateProduct() {
  const router = useRouter();
  const invalidateProducts = useInvalidateProducts();

  return useMutation({
    mutationFn: productService.update,

    onSuccess: () => {
      toast.success("Produto atualizado com sucesso!");
      invalidateProducts();
      router.push("/products");
    },

    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar produto");
    },
  });
}

export function useDeleteProduct() {
  const invalidateProducts = useInvalidateProducts();

  return useMutation({
    mutationFn: productService.remove,

    onSuccess: () => {
      toast.success("Produto removido com sucesso!");
      invalidateProducts();
    },

    onError: (error: Error) => {
      toast.error(error.message || "Erro ao remover produto");
    },
  });
}
```

### 5.4.6 — Colunas da tabela (`product-columns.tsx`)

```tsx
// src/features/products/components/product-columns.tsx

"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import type { Product, ProductStatus } from "../types/product.types";

const statusConfig: Record<ProductStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  active: { label: "Ativo", variant: "default" },
  inactive: { label: "Inativo", variant: "secondary" },
  draft: { label: "Rascunho", variant: "outline" },
};

interface ColumnActions {
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

export function getProductColumns({ onEdit, onDelete }: ColumnActions): ColumnDef<Product>[] {
  return [
    {
      accessorKey: "name",
      header: "Nome",
      cell: ({ row }) => (
        <div className="font-medium">{row.getValue("name")}</div>
      ),
    },
    {
      accessorKey: "categoryName",
      header: "Categoria",
    },
    {
      accessorKey: "price",
      header: "Preço",
      cell: ({ row }) => {
        const price = parseFloat(row.getValue("price"));
        const formatted = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        }).format(price);
        return <div className="font-mono">{formatted}</div>;
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as ProductStatus;
        const config = statusConfig[status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const product = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(product)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(product)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}
```

### 5.4.7 — Tabela de produtos (`product-table.tsx`)

```tsx
// src/features/products/components/product-table.tsx

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { getProductColumns } from "./product-columns";
import { useProducts, useInvalidateProducts } from "../hooks/use-products";
import { useDeleteProduct } from "../hooks/use-create-product";
import type { Product, ProductFilters } from "../types/product.types";

interface ProductTableProps {
  filters?: ProductFilters;
}

export function ProductTable({ filters }: ProductTableProps) {
  const router = useRouter();
  const { data, isLoading } = useProducts(filters);
  const deleteProduct = useDeleteProduct();
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const columns = getProductColumns({
    onEdit: (product) => router.push(`/products/${product.id}/edit`),
    onDelete: (product) => setProductToDelete(product),
  });

  const table = useReactTable({
    data: data?.data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  Nenhum produto encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próximo
        </Button>
      </div>

      <ConfirmDialog
        open={!!productToDelete}
        onOpenChange={() => setProductToDelete(null)}
        title="Remover produto"
        description={`Tem certeza que deseja remover "${productToDelete?.name}"? Esta ação não pode ser desfeita.`}
        onConfirm={() => {
          if (productToDelete) {
            deleteProduct.mutate(productToDelete.id);
            setProductToDelete(null);
          }
        }}
        isLoading={deleteProduct.isPending}
      />
    </>
  );
}
```

### 5.4.8 — Formulário de produto (`product-form.tsx`)

```tsx
// src/features/products/components/product-form.tsx

"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { productSchema, type ProductFormData } from "../schemas/product.schema";
import type { Product } from "../types/product.types";

interface ProductFormProps {
  defaultValues?: Product;
  onSubmit: (data: ProductFormData) => void;
  isLoading?: boolean;
}

export function ProductForm({ defaultValues, onSubmit, isLoading }: ProductFormProps) {
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: defaultValues
      ? {
          name: defaultValues.name,
          description: defaultValues.description,
          price: defaultValues.price,
          status: defaultValues.status,
          categoryId: defaultValues.categoryId,
          imageUrl: defaultValues.imageUrl ?? "",
        }
      : {
          name: "",
          description: "",
          price: 0,
          status: "draft",
          categoryId: "",
          imageUrl: "",
        },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>
              {defaultValues ? "Editar produto" : "Novo produto"}
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Camiseta Premium" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva o produto..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Rascunho</SelectItem>
                        <SelectItem value="active">Ativo</SelectItem>
                        <SelectItem value="inactive">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input placeholder="ID da categoria" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da imagem (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://exemplo.com/imagem.jpg"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>

          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => window.history.back()}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {defaultValues ? "Salvar alterações" : "Criar produto"}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
```

### 5.4.9 — Página de listagem (`page.tsx`)

```tsx
// src/app/(dashboard)/products/page.tsx

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ProductTable } from "@/features/products/components/product-table";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Gerencie seus produtos",
};

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Gerencie o catálogo de produtos."
      >
        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
          </Link>
        </Button>
      </PageHeader>

      <ProductTable />
    </div>
  );
}
```

### 5.4.10 — Página de cadastro (`new/page.tsx`)

```tsx
// src/app/(dashboard)/products/new/page.tsx

"use client";

import { PageHeader } from "@/components/shared/page-header";
import { ProductForm } from "@/features/products/components/product-form";
import { useCreateProduct } from "@/features/products/hooks/use-create-product";

export default function NewProductPage() {
  const createProduct = useCreateProduct();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Novo produto"
        description="Preencha os dados para cadastrar um novo produto."
      />

      <div className="max-w-2xl">
        <ProductForm
          onSubmit={(data) => createProduct.mutate(data)}
          isLoading={createProduct.isPending}
        />
      </div>
    </div>
  );
}
```

### 5.4.11 — Rota no sidebar (`navigation.ts`)

```ts
// src/config/navigation.ts

import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: NavGroup[] = [
  {
    label: "Principal",
    items: [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    label: "Catálogo",
    items: [
      {
        title: "Produtos",
        href: "/products",
        icon: Package,
      },
    ],
  },
  {
    label: "Vendas",
    items: [
      {
        title: "Clientes",
        href: "/customers",
        icon: Users,
      },
      {
        title: "Pedidos",
        href: "/orders",
        icon: ShoppingCart,
      },
    ],
  },
  {
    label: "Sistema",
    items: [
      {
        title: "Configurações",
        href: "/settings",
        icon: Settings,
      },
    ],
  },
];
```

---

## 5.5 — Patterns de código

### 5.5.1 — Data fetching: RSC vs React Query

| Cenário | Abordagem | Exemplo |
|---------|-----------|---------|
| Dados estáticos ou SEO-critical | Server Component com `fetch` | Página de detalhes |
| Dados interativos com cache/refetch | React Query no Client Component | Tabela com filtros |
| Mutações (criar/editar/deletar) | React Query `useMutation` | Formulários |

**Server Component (fetch direto):**

```tsx
// page.tsx — Server Component
export default async function ProductPage({ params }: { params: { id: string } }) {
  const product = await productService.getById(params.id);

  return <ProductDetails product={product} />;
}
```

**Client Component (React Query):**

```tsx
// use-products.ts — Client-side com cache
"use client";

export function useProducts(filters?: ProductFilters) {
  return useQuery({
    queryKey: ["products", filters],
    queryFn: () => productService.getAll(filters),
    staleTime: 30 * 1000,          // 30s antes de considerar stale
    placeholderData: keepPreviousData, // mantém dados anteriores durante refetch
  });
}
```

### 5.5.2 — Formulários: React Hook Form + Zod

Padrão completo em 3 passos:

**Passo 1 — Schema Zod (fonte da verdade)**

```ts
const schema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type FormData = z.infer<typeof schema>;
```

**Passo 2 — Hook do formulário**

```tsx
const form = useForm<FormData>({
  resolver: zodResolver(schema),
  defaultValues: { email: "", password: "" },
});
```

**Passo 3 — Componentes com `FormField`**

```tsx
<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="email"
      render={({ field }) => (
        <FormItem>
          <FormLabel>E-mail</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

### 5.5.3 — Estado global: Zustand

Use Zustand para estado que precisa ser acessado por componentes que não estão na mesma árvore.

```ts
// src/stores/sidebar.store.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarState {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isOpen: true,
      toggle: () => set((state) => ({ isOpen: !state.isOpen })),
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
    }),
    { name: "sidebar-state" }
  )
);
```

```tsx
// Uso em qualquer componente
"use client";

import { useSidebarStore } from "@/stores/sidebar.store";

export function SidebarToggle() {
  const { isOpen, toggle } = useSidebarStore();

  return (
    <button onClick={toggle}>
      {isOpen ? "Fechar" : "Abrir"} menu
    </button>
  );
}
```

### 5.5.4 — HTTP Client: Axios + Interceptors

```ts
// src/lib/api.ts

import axios from "axios";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("access_token");
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.message ||
      error.message ||
      "Erro inesperado";

    return Promise.reject(new Error(message));
  }
);
```

### 5.5.5 — Loading e Error states

**Loading com Skeleton:**

```tsx
// src/app/(dashboard)/products/loading.tsx

import { Skeleton } from "@/components/ui/skeleton";

export default function ProductsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    </div>
  );
}
```

**Error boundary:**

```tsx
// src/app/(dashboard)/products/error.tsx

"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProductsError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Products error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Algo deu errado</h2>
      <p className="text-muted-foreground">
        Não foi possível carregar os produtos.
      </p>
      <Button onClick={reset} variant="outline">
        Tentar novamente
      </Button>
    </div>
  );
}
```

### 5.5.6 — Tailwind + cn()

A função `cn()` combina classes com `clsx` + `tailwind-merge`, evitando conflitos:

```ts
// src/lib/utils.ts

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Uso prático:**

```tsx
<div
  className={cn(
    "rounded-lg border p-4",
    isActive && "border-primary bg-primary/5",
    isDisabled && "opacity-50 pointer-events-none"
  )}
>
```

### 5.5.7 — shadcn/ui: Instalação e customização

**Instalando um componente:**

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input select dialog table card
```

**Customizando variantes (sem editar o arquivo shadcn):**

```tsx
// src/components/shared/submit-button.tsx
// Composição sobre o Button do shadcn, sem modificar components/ui/button.tsx

"use client";

import { Button, type ButtonProps } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SubmitButtonProps extends ButtonProps {
  isLoading?: boolean;
}

export function SubmitButton({
  children,
  isLoading,
  className,
  disabled,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      type="submit"
      disabled={disabled || isLoading}
      className={cn("min-w-[120px]", className)}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
```

---

## 5.6 — Performance e SEO

### 5.6.1 — Otimização de imagens com `next/image`

```tsx
import Image from "next/image";

// Imagem com dimensões conhecidas
<Image
  src="/hero.png"
  alt="Hero banner"
  width={1200}
  height={600}
  priority  // Carrega imediatamente (acima da dobra)
/>

// Imagem responsiva que preenche o container
<div className="relative aspect-video">
  <Image
    src={product.imageUrl}
    alt={product.name}
    fill
    className="object-cover rounded-lg"
    sizes="(max-width: 768px) 100vw, 50vw"
  />
</div>
```

| Prop | Quando usar |
|------|-------------|
| `priority` | Imagens acima da dobra (hero, logo) |
| `fill` | Quando não sabe as dimensões exatas |
| `sizes` | Sempre com `fill` — evita download de imagem maior que o necessário |
| `placeholder="blur"` | Com `blurDataURL` para imagens locais |

### 5.6.2 — Dynamic imports (code splitting)

Carregue componentes pesados apenas quando necessário:

```tsx
import dynamic from "next/dynamic";

const HeavyChart = dynamic(
  () => import("@/components/shared/chart"),
  {
    loading: () => <Skeleton className="h-80 w-full" />,
    ssr: false, // Desabilita SSR para componentes que dependem de window
  }
);

export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <HeavyChart data={chartData} />
    </div>
  );
}
```

**Quando usar dynamic import:**
- Componentes que dependem de `window`/`document` (gráficos, editores rich text)
- Componentes pesados que não aparecem na primeira renderização (modais, tabs secundárias)
- Bibliotecas grandes que só são usadas em uma página específica

### 5.6.3 — Metadata API (SEO)

**Metadata estática (Server Components):**

```tsx
// src/app/(dashboard)/products/page.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Produtos",
  description: "Gerencie o catálogo de produtos da sua loja.",
};
```

**Metadata dinâmica (baseada em dados):**

```tsx
// src/app/(dashboard)/products/[id]/page.tsx

import type { Metadata } from "next";

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await productService.getById(params.id);

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.imageUrl ? [product.imageUrl] : [],
    },
  };
}
```

**Layout raiz com metadata global:**

```tsx
// src/app/layout.tsx

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Bravy Admin",
    template: "%s | Bravy Admin",
  },
  description: "Painel administrativo Bravy",
};
```

Com o `template`, a página de Produtos terá o título: **"Produtos | Bravy Admin"**.

### 5.6.4 — Fontes otimizadas com `next/font`

```tsx
// src/app/layout.tsx

import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
```

```css
/* src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: var(--font-inter);
}
```

**Benefícios do `next/font`:**
- Zero layout shift (fonte carrega antes da renderização)
- Self-hosted (sem chamadas externas ao Google Fonts)
- Otimização automática do subset

---

## Componentes compartilhados de apoio

Estes componentes são referenciados ao longo do guia. Inclua-os em `components/shared/`.

### `page-header.tsx`

```tsx
// src/components/shared/page-header.tsx

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
```

### `confirm-dialog.tsx`

```tsx
// src/components/shared/confirm-dialog.tsx

"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  isLoading,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
}: ConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### `query-client.ts` e `query-provider.tsx`

```ts
// src/lib/query-client.ts

import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}
```

```tsx
// src/providers/query-provider.tsx

"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { makeQueryClient } from "@/lib/query-client";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => makeQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## Próximos passos

| Documento | Quando consultar |
|-----------|-----------------|
| [02-arquitetura.md](02-arquitetura.md) | Entender como frontend, backend e banco se conectam |
| [03-nomenclatura-e-padroes.md](03-nomenclatura-e-padroes.md) | Antes de nomear qualquer arquivo, variável ou componente |
| [04-backend.md](04-backend.md) | Ao criar ou consumir endpoints da API NestJS |
| [06-banco-de-dados.md](06-banco-de-dados.md) | Ao definir schema/migrations no Prisma |
| [07-autenticacao.md](07-autenticacao.md) | Ao implementar login, guards e proteção de rotas |
| [08-api.md](08-api.md) | Ao definir contratos de request/response |
| [12-guia-vibecoding.md](12-guia-vibecoding.md) | Ao usar LLMs para gerar código frontend |
