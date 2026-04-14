# Mundial ERP - Memory

> Arquivo de memoria do projeto. Toda alteracao relevante deve ser registrada aqui.
> Ultima atualizacao: 2026-04-10

---

## 1. Visao Geral do Projeto

**Mundial ERP** e um sistema ERP orientado a processos (BPM) que substitui o **Pro Financas**, um ERP tradicional baseado em menus. A inversao de logica e o diferencial: o sistema sabe em qual etapa do processo o usuario esta e mostra apenas o que ele precisa naquele momento.

**Empresa:** Mundial Telhas
**Metodologia:** BPM (Departamento > Setor > Processo > Atividade > Tarefa)
**Migracao:** Gradual - dados puxados da API do Pro Financas, armazenados no banco proprio, exibidos na nova interface. Migracao definitiva apos validacao completa.

---

## 2. Stack Tecnologica

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js (App Router) + TypeScript |
| Banco | PostgreSQL 16 + Prisma ORM |
| UI | Tailwind CSS v4 + Align UI v1.2 (Radix UI) |
| Design System | Align UI PRO v2.0 (Figma) + Code Library Free |
| Auth | JWT (access 15min + refresh 7d) |
| Server State | React Query |
| Client State | Zustand (apenas UI) |
| HTTP | Axios com interceptors |
| PDF | PDFKit (backend) + bwip-js (barcode EAN-13/Code-128) |
| Scanner | onScan.js (leitor hardware no frontend) |
| Busca | Elasticsearch 8 (@elastic/elasticsearch) |
| Containers | Docker + docker-compose |
| Package Manager | npm (backend e frontend) |

**Repositorios:** `mundial-erp-api/` (backend), `mundial-erp-web/` (frontend), `mundial-erp-mobile/` (futuro)

**Portas:**
- Frontend (Next.js): `localhost:3000`
- Backend (NestJS): `localhost:3001`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Elasticsearch: `localhost:9200`

---

## 3. Design System - Align UI

- **Figma PRO:** Arquivo v2.0, 48 paginas, file key `AjvK4iQOOs2wPcp53ZfIVr`
- **Code Library Free:** 40+ componentes React + Tailwind v4 + Radix UI
- **Code Library PRO:** Nao possui - implementar via Figma MCP (get_design_context)
- **Starter Template:** `alignui/alignui-nextjs-typescript-starter`
- **Documentacao:** https://www.alignui.com/docs/v1.2/introduction
- **Catalogo de paginas:** `pages.md` na raiz do projeto (48 paginas com node IDs)
- **Icones:** @remixicon/react (exclusivo - nenhum outro pacote de icones)
- **Cores/tipografia/sombras:** Via tokens do DS, nunca hardcoded
- **Dark Mode:** Ativado desde o inicio via next-themes

**Fundacoes (7 paginas Figma):**
- Color Palette: `553:14956`
- Typography: `553:14957`
- Icons: `41:136`
- Grid System: `553:14958`
- Shadow: `553:14959`
- Motions & Animations: `553:14960`
- Corner Radius: `553:14961`

**Templates Setoriais:**
- Finance & Banking: `3911:35677` (base para dashboards)
- HR Management: `3715:42038`
- Marketing & Sales: `6696:81119`
- Cryptocurrency: `6696:81120`
- AI Product: `191042:2378`

**Regra:** TODOS os elementos visuais devem vir do Design System Figma. Nenhum componente, icone, cor, sombra, tipografia ou espacamento deve ser inventado.

---

## 4. Departamentos e Processos

### Comercial
| Setor | Processo | Objetivo |
|---|---|---|
| Vendas | Pedidos | Criar pedido (comeca como orcamento EM_ORCAMENTO), montar itens, fechar, registrar pagamento 50%, enviar para faturamento |
| Gestao de Clientes | Cadastro e Manutencao | Dados completos e atualizados antes de qualquer operacao |

### Compras
| Setor | Processo | Objetivo |
|---|---|---|
| Suprimentos | Cotacao e Compra | Insumos disponiveis com melhor custo-beneficio |
| Suprimentos | Gestao de Fornecedores | Base de fornecedores qualificados |
| Catalogo | Gestao de Produtos | Catalogo com dados completos (preco, formula, tributacao, imagens) |

### Financeiro
| Setor | Processo | Objetivo |
|---|---|---|
| Faturamento | Emissao de NF-e | Gerar NF-e valida |
| Tesouraria | Contas a Receber | Recebimento dentro do prazo |
| Tesouraria | Contas a Pagar | Pagamentos sem duplicidade |
| Controladoria | Controle e Analise | Visao consolidada DRE, fluxo de caixa, indicadores |

### Producao
| Setor | Processo | Objetivo |
|---|---|---|
| Fabricacao | Producao do Pedido | Transformar pedidos em produtos acabados |

---

## 5. Maquina de Estados do Pedido

```
EM_ORCAMENTO -> FATURAR -> FATURADO -> PRODUZIR -> EM_PRODUCAO -> PRODUZIDO -> ENTREGUE
                  |
               CANCELADO (possivel ate FATURADO)
```

**Fluxo real:**
1. Vendedor cria orcamento -> `EM_ORCAMENTO`
2. Cliente fecha -> pagamento 50% + comprovante -> `FATURAR`
3. Financeiro concilia pagamento -> `FATURADO`
4. Producao aceita -> `PRODUZIR`
5. Producao em andamento -> `EM_PRODUCAO`
6. Producao concluida + insumos prontos -> `PRODUZIDO`
7. Conferencia + entrega + 50% restante -> `ENTREGUE` (final)

**Regra de pagamento:** 50/50 (50% entrada, 50% na entrega)

**Transicoes com guards:**
- EM_ORCAMENTO -> FATURAR: cliente valido, >=1 item, precos, 50% pago, comprovante
- FATURAR -> FATURADO: conciliacao bancaria confirmada
- FATURADO -> PRODUZIR: split automatico (ProductionOrder + SeparationOrder)
- PRODUZIR -> EM_PRODUCAO: coordenador inicia
- EM_PRODUCAO -> PRODUZIDO: todas POs COMPLETED + SeparationOrder CHECKED + todos supplies READY
- PRODUZIDO -> ENTREGUE: conferencia OK + 50% restante pago

---

## 6. Modelos de Dados Principais

### Produto - Cadastro em 4 Etapas (Wizard)
1. **Identificacao:** tipo, codigo auto-gerado ([PREFIXO]-[NNNN]), EAN-13 interno, nome, departamento, marca, unidade
2. **Especificacao Tecnica:** dimensoes, peso, classificacao (FABRICACAO_PROPRIA/REVENDA/MATERIA_PRIMA/INSUMO), estoque minimo
3. **Fiscal e Tributacao:** NCM, CFOP, IPI, cesta tributacao
4. **Precificacao e Formula:** custo, venda, tabela de preco, formula (obrigatoria se FABRICACAO_PROPRIA)

**Status:** DRAFT -> ACTIVE (quando 4 etapas completas) -> INACTIVE

**10 Tipos de Produto (Mundial Telhas):**
TT (Telhas Termicas), TG (Telhas Galvalume), PT (Painel Termico), PF (Parafusos), AC (Acabamentos), AX (Acessorio), MP (Materia Prima), IN (Insumos), IM (Imobilizado), OT (Outros)

### Pedido (objeto central)
- Numero auto-gerado (4 digitos sequencial continuo, nunca reinicia)
- Items com supplies (checklist insumos/acabamentos)
- Split automatico no FATURADO: ProductionOrder (FABRICACAO_PROPRIA) + SeparationOrder (REVENDA/INSUMO)
- AR com 2 parcelas (50% + 50%)

### Requisicoes de Estoque
- Tipo: VENDA ou INTERNO
- Codigo auto-gerado com barcode Code-128
- Processamento via scanner (onScan.js)
- Suporte UN (unidade) e CX (conjunto/caixa)

---

## 7. Integracao Pro Financas

- **Base URL:** `http://localhost:3000/api/v1/customer`
- **Auth:** POST `/auth/authenticate` com email+password -> JWT
- **39 endpoints:** clientes, produtos, pedidos, caixas, notas fiscais, pagamentos, transportadoras, estados/cidades
- **Entidades em portugues:** `/clientes`, `/produtos`, `/pedidos`, `/caixas`, `/transportadoras`
- **Colecao Postman:** `app-sales-force-api-v1.postman_collection.json` na raiz

**O que migra:**
- Clientes, Pedidos+Items, Companies, Payment Methods, Carriers, Order Types/Flows/Models, Classifications, Routes, States/Cities

**O que NAO migra (cadastrado do zero):**
- Produtos, Fornecedores, Tabelas de Preco, Formulas, NF-e, Production Orders, Estoque

**Regras:**
- Pedidos migrados mantem numero original do PF
- OrderSequence.lastNumber inicia acima do maior numero migrado
- Valores convertidos para centavos (Math.round(valor * 100))
- CPF/CNPJ limpos de formatacao
- Timestamps convertidos: new Date(timestamp)
- Pro Financas e source of truth durante migracao

---

## 8. Padroes de Codigo (Bravy)

- **Named exports obrigatorio** (nunca export default)
- **ResponseDto.fromEntity()** em todo endpoint
- **Arquivos em kebab-case:** `order-status-badge.tsx`
- **Componentes React:** arquivo kebab-case, export PascalCase
- **Hooks:** prefixo `use-` no arquivo
- **Booleanos:** prefixo is/has/can/should
- **Funcoes:** verbo no inicio
- **Enums:** PascalCase nome, UPPER_SNAKE_CASE valores
- **Event handlers:** handle interno, on na prop
- **Testes:** `.spec.ts` (unitario), `.e2e-spec.ts` (e2e)
- **Schema Prisma:** id cuid, createdAt, updatedAt, deletedAt (soft delete), valores monetarios em centavos (Int), @@map snake_case
- **Paginacao:** skip/take, max 100

---

## 9. Fases de Construcao

| Fase | Descricao | Duracao |
|---|---|---|
| 1 | Infraestrutura Backend (Docker, Prisma, Guards, ES) | 2 sem |
| 2 | Autenticacao Backend (JWT, RBAC) | 1 sem |
| 3 | Motor BPM Backend (definicoes, runtime, seeds) | 2 sem |
| 4A | Reference Data + Clientes + Fornecedores | 2 sem |
| 4B | Produtos + Cotacoes + Pedidos + Search | 3 sem |
| 4C | Financeiro + Producao + Dashboards | 3 sem |
| 5 | Integracao Pro Financas (sync via filas) | 2 sem |
| 6 | Frontend Base + Design System + Login + Layout | 2 sem |
| 7A | Inicio + Clientes (frontend) | 2 sem |
| **7B** | **Comercial: Pedidos - MVP MILESTONE** | **3 sem** |
| 7C | Compras + Financeiro + Producao (frontend) | 3 sem |
| 7D | Paineis + Relatorios + Integracao + Config | 2 sem |
| 8 | Polish, QA, Seguranca, Deploy | 2 sem |

**MVP:** Final da Fase 7B (~20 semanas / ~5 meses)
**Total:** ~33 semanas (~8 meses)

**Grafo de dependencias:**
```
F1 -> F2 -> F3 -> F4A -> F4B -> F4C -> F5         (backend)
      |
      +---> F6                                      (frontend apos auth)
            |
            +---> F7A -> F7B [MVP] -> F7C -> F7D    (frontend)
                                        |
                                        +---> F8    (polish + deploy)
```

---

## 10. Decisoes e Preferencias

- **Tailwind CSS v4** (nao CSS Modules ou Styled Components)
- **Align UI v1.2** como component library (nao shadcn/ui)
- **Dark Mode** desde o inicio (next-themes)
- **npm** como package manager (nao pnpm ou yarn)
- Componentes Align UI FREE primeiro; PRO via Figma MCP get_design_context
- Layout baseado no template Finance & Banking do Figma

**Prioridades de fase (definidas pelo usuario):**
1. Component Library (Align UI starter setup)
2. Login + Auth
3. Dashboard + Sidebar (layout shell)
4. Comercial - Pedidos (tables, forms, modals)

---

## 11. Documentos PDF do Sistema

| Documento | Endpoint | Descricao |
|---|---|---|
| Proposta de Venda | GET /orders/:id/pdf/proposal | PDF completo com dados cliente, itens, financeiro |
| Etiqueta Producao | GET /orders/:id/pdf/production-label | Colada no produto fabricado (itens FABRICACAO_PROPRIA) |
| Etiqueta Separacao | GET /orders/:id/pdf/separation-label | Itens REVENDA/INSUMO (404 se nao houver) |
| Ficha OP | GET /production-orders/:id/pdf | Documento completo de producao |
| PDF Requisicao | GET /stock-requisitions/:id/pdf | Com barcode Code-128 para scanner |

---

## 12. Rotas Frontend Principais

```
(auth)/login
(dashboard)/
  inicio/                          <- tela inicial (saudacao + atividades)
  paineis/                         <- dashboards configuraveis
  comercial/clientes/              <- CRUD clientes
  comercial/pedidos/               <- lista + dossie do pedido (tela principal)
  compras/produtos/                <- wizard 4 etapas
  compras/fornecedores/            <- CRUD fornecedores
  compras/cotacoes/                <- fluxo cotacao
  compras/tabelas-preco/           <- edicao precos
  compras/requisicoes/             <- requisicoes estoque + scanner
  financeiro/contas-a-receber/     <- AR
  financeiro/contas-a-pagar/       <- AP
  financeiro/notas-fiscais/        <- NF-e
  financeiro/caixa/                <- reconciliacao
  financeiro/analise/              <- controle financeiro
  producao/ordens/                 <- kanban producao + dossie OP
  relatorios/                      <- DRE, vendas, fluxo de caixa
  integracao/                      <- status sync Pro Financas
  configuracoes/                   <- usuarios, departamentos, processos, empresa
```

---

## 13. Historico de Alteracoes

| Data | Alteracao |
|---|---|
| 2026-04-02 | Projeto iniciado - definicao do plano master |
| 2026-04-05 | Stack e UI decisions definidas (Tailwind v4, Align UI, dark mode) |
| 2026-04-06 | Plano master completo (PLANO.md) com todas as fases |
| 2026-04-10 | Criacao do arquivo MEMORY.md consolidando toda a documentacao do projeto |
