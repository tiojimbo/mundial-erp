# Plano Master — Mundial ERP

## Contexto

A empresa utiliza hoje o **Pro Finanças**, um ERP tradicional baseado em menus onde o usuário precisa saber onde está no sistema para executar uma tarefa. O novo sistema (**Mundial ERP**) inverte essa lógica: **o sistema sabe em qual etapa do processo o usuário está** e mostra apenas o que ele precisa naquele momento.

A migração é gradual — inicialmente os dados são puxados da API do Pro Finanças, armazenados no banco do Mundial ERP e exibidos na nova interface. Somente após validação completa a migração definitiva acontece.

O sistema é guiado pela metodologia BPM: **Departamento → Setor → Processo → Atividade → Tarefa**, com handoffs mapeados entre processos.

---

## Departamentos, Setores e Processos

### Comercial
Responsável pelo relacionamento com o cliente, desde a criação do pedido até o envio para faturamento.

| Setor | Processo | Objetivo |
|---|---|---|
| Vendas | Pedidos | Criar pedido (começa como orçamento em EM_ORCAMENTO), montar itens com insumos, fechar com cliente, registrar pagamento 50% e enviar para faturamento. **Não existe processo separado de "Orçamento" — o pedido É o orçamento até ser fechado** |
| Gestão de Clientes | Cadastro e Manutenção de Clientes | Garantir que todo cliente tenha dados completos e atualizados antes de qualquer operação comercial |

### Compras
Responsável por abastecer a operação com matéria-prima, produtos e fornecedores.

| Setor | Processo | Objetivo |
|---|---|---|
| Suprimentos | Cotação e Compra de Matéria-Prima | Garantir insumos disponíveis para produção com melhor custo-benefício |
| Suprimentos | Gestão de Fornecedores | Manter base de fornecedores qualificados com dados atualizados |
| Catálogo | Gestão de Produtos | Manter catálogo de produtos com dados completos (preço, fórmula, tributação, imagens) |

### Financeiro
Responsável pelo controle financeiro completo: entrada, saída, faturamento e análise.

| Setor | Processo | Objetivo |
|---|---|---|
| Faturamento | Emissão de Nota Fiscal | Gerar NF-e válida para cada pedido faturado |
| Tesouraria | Contas a Receber | Garantir recebimento dentro do prazo com rastreamento de inadimplência |
| Tesouraria | Contas a Pagar | Garantir pagamentos a fornecedores dentro do prazo sem duplicidade |
| Controladoria | Controle e Análise Financeira | Fornecer visão consolidada de DRE, fluxo de caixa e indicadores |

### Produção
Responsável por transformar pedidos em produtos acabados.

| Setor | Processo | Objetivo |
|---|---|---|
| Fabricação | Produção do Pedido | Produzir os itens do pedido conforme fórmula, com controle de insumos e qualidade |

---

## Stack (padrão Bravy — `99-referencia-completa.md`)

| Camada | Tecnologia |
|---|---|
| Backend | NestJS + TypeScript |
| Frontend | Next.js (App Router) + TypeScript |
| Banco | PostgreSQL 16 + Prisma ORM |
| UI | Tailwind CSS v4 + Align UI v1.2 (baseado em Radix UI) |
| Design System | Align UI PRO v2.0 (Figma) + Code Library Free |
| Auth | JWT (access 15min + refresh 7d) |
| Server state | React Query |
| Client state | Zustand (apenas UI) |
| HTTP | Axios com interceptors |
| PDF | PDFKit (backend) + bwip-js (geração de barcode EAN-13/Code-128 no PDF) |
| Scanner | onScan.js (detecção de leitor hardware no frontend via timing) |
| Busca | Elasticsearch 8 (`@elastic/elasticsearch`) |
| Containers | Docker + docker-compose |
| Package manager | `npm` (backend e frontend) |

Repositórios: `mundial-erp-api/` (backend), `mundial-erp-web/` (frontend), `mundial-erp-mobile/` (futuro)

> **Nota sobre package manager:** Align UI suporta npm, pnpm e yarn igualmente. Optamos por **npm** em ambos os repositórios para manter consistência e alinhar com o padrão Bravy (Dockerfiles usam `npm ci`).

> **Nota:** O padrão Bravy sugere `bravy-{projeto}-api/web`, mas optamos por `mundial-erp-*` por ser projeto específico desta empresa, não um projeto genérico Bravy.

> **Nota sobre UI:** O padrão Bravy sugere `shadcn/ui`, mas optamos por **Align UI v1.2** porque a empresa possui o **Design System completo no Figma (Align UI PRO v2.0)** com 48 páginas de componentes, fundações e templates setoriais (incluindo Finance & Banking). Align UI usa a mesma base técnica (Radix UI + Tailwind CSS), mesma abordagem copy/paste, mas garante **fidelidade 1:1** entre design (Figma) e código. O padrão Bravy de arquitetura (Controller/Service/Repository, React Query, Zod, etc.) permanece 100% inalterado.

### Portas Locais (evitar conflito com Pro Finanças em :3000)

| Serviço | Porta |
|---|---|
| Frontend (Next.js) | `localhost:3000` |
| Backend (NestJS) | `localhost:3001` |
| PostgreSQL | `localhost:5432` |
| Redis | `localhost:6379` |
| Elasticsearch | `localhost:9200` |
| Pro Finanças API (externo) | `localhost:3000` ← conflito! Usar variável `PRO_FINANCAS_URL` apontando para IP/porta real do servidor PF |

---

## Design System — Align UI

### Referências

| Recurso | Acesso | Detalhes |
|---|---|---|
| **Figma PRO** | ✅ | Arquivo completo v2.0, 48 páginas, file key `AjvK4iQOOs2wPcp53ZfIVr` |
| **Code Library Free** | ✅ | 40+ componentes React + Tailwind CSS v4 + Radix UI + TypeScript |
| **Code Library PRO** | ❌ | Componentes PRO implementados via Figma MCP (get_design_context) |
| **Starter Template** | ✅ | `alignui/alignui-nextjs-typescript-starter` (pnpm) |
| **Documentação** | ✅ | `https://www.alignui.com/docs/v1.2/introduction` |
| **Catálogo de páginas** | ✅ | `pages.md` na raiz do projeto (48 páginas com node IDs) |

### Fundações (7 páginas Figma)

Configuram tokens globais — base para TODOS os componentes. Configurados via `npx @alignui/cli tailwind`.

| Fundação | Node ID | Implementação |
|---|---|---|
| Color Palette | `553:14956` | CSS variables (light/dark mode) via Align UI CLI |
| Typography | `553:14957` | Tailwind CSS classes, fonte Inter (`next/font/google`) |
| Icons | `41:136` | `@remixicon/react` |
| Grid System | `553:14958` | Tailwind grid/flex utilities |
| Shadow | `553:14959` | Tailwind shadow tokens |
| Motions & Animations | `553:14960` | CSS transitions/Tailwind |
| Corner Radius | `553:14961` | Tailwind rounded tokens |

### Componentes (36 páginas Figma)

Cada página contém: Description, Variants, Code Library, Guidelines, Examples, Blocks.

| # | Componente | Node ID | Uso no ERP |
|---|---|---|---|
| 1 | Avatar | `210:4129` | Perfil usuário, atribuições de atividades |
| 2 | Activity Feed | `164611:26451` | Timeline de atividades BPM, histórico de pedidos |
| 3 | Badge | `119:2863` | Contadores em sidebar, status de handoffs |
| 4 | Breadcrumbs | `447:8760` | Navegação: Comercial > Pedidos > #0123 |
| 5 | Button | `129:605` | CTAs (5 tipos: standard, link, social, compact, fancy) |
| 6 | Button Group | `225:2363` | Ações agrupadas (ex: dropdown de impressão) |
| 7 | Checkbox | `227:1986` | Formulários, checklist de insumos |
| 8 | Content Divider | `414:4397` | Separadores em dossiês e formulários |
| 9 | Command Menu | `4152:24764` | Busca global (Cmd+K) |
| 10 | Date Picker | `435:8548` | Datas de entrega, vencimentos |
| 11 | Drawer | `486:7366` | Painéis laterais (detalhes de pedido, OP) |
| 12 | Dropdown | `166999:140904` | Menu "Ações" do pedido (imprimir, avançar) |
| 13 | File Upload | `450:9364` | Comprovante de pagamento, imagens de produto, NF-e |
| 14 | Filter | `3880:66172` | Filtros de listagem (status, departamento, período) |
| 15 | Key Components | `263:1844` | Componentes-chave reutilizáveis |
| 16 | Modal | `4096:21398` | Confirmação de transição de status, handoff accept/reject |
| 17 | Notification Feed | `4096:21398` | Central de notificações e handoffs pendentes |
| 18 | Pagination | `486:8465` | Navegação de tabelas (skip/take, max 100 — padrão Bravy) |
| 19 | Progress Bar | `450:17758` | Progresso de produção, sync, processos BPM |
| 20 | Popover | `553:22099` | Menus contextuais, detalhes on-hover |
| 21 | Radio | `515:3884` | Seleção única (tipo pessoa F/J, classificação) |
| 22 | Rating | `532:4130` | Avaliações (futuro) |
| 23 | Rich Editor | `164611:20259` | Observações de pedido, notas |
| 24 | Scroll | `165475:768` | Scrollbars customizados |
| 25 | Select | `270:1084` | Dropdowns (cliente, produto, status, tabela de preço) |
| 26 | Slider | `2604:3416` | Controles de range (filtros de valor) |
| 27 | Step Indicator | `479:14388` | Stepper do pedido (EM_ORCAMENTO → ENTREGUE), wizard 4 etapas de produto |
| 28 | Tab Menu | `553:734` | Abas do dossiê (Itens, Financeiro, Produção, NF-e, Timeline) |
| 29 | Table | `553:14955` | Listagens (pedidos, clientes, produtos, AR, AP, NF-e) |
| 30 | Tag | `417:12348` | Status de pedido (EM_ORCAMENTO, FATURAR, etc.), classificação de produto |
| 31 | Text Area | `434:6100` | Observações, notas, descrições longas |
| 32 | Text Input | `266:5230` | Campos de formulário (com máscaras, ícones, hints) |
| 33 | Time Picker | `164611:83414` | Seleção de horários |
| 34 | Switch | `379:6649` | Flags: produzir, revenda, subst. tributária |
| 35 | Segmented Control | `553:14953` | Controles segmentados (tipo requisição: VENDA/INTERNO) |
| 36 | Tooltip | `553:14954` | Dicas contextuais em campos e ações |

### Templates Setoriais (5 páginas Figma)

Layouts prontos para adaptar diretamente às telas do ERP.

| Template | Node ID | Aplicação no ERP |
|---|---|---|
| **Finance & Banking** | `3911:35677` | **Base para dashboards** (3 layouts KPI), dialogs financeiros, settings (7 tabs), fluxos admin, detail views |
| HR Management | `3715:42038` | Referência para gestão de usuários e departamentos |
| Marketing & Sales | `6696:81119` | Referência para módulo Comercial (pedidos, clientes) |
| Cryptocurrency | `6696:81120` | Referência para dashboards financeiros avançados |
| AI Product | `191042:2378` | Referência para interface moderna |

### Regra: Todo UI vem do Design System

> **TODOS os elementos visuais do frontend devem vir do Design System Figma (`FIGMA.md`).** Nenhum componente, ícone, cor, sombra, tipografia ou espaçamento deve ser inventado ou copiado de outra fonte. Se não existe no DS, busca-se no Figma via MCP e implementa-se baseado no código de referência gerado.

**Componentes:** Os 36 componentes listados acima (Button, Table, Modal, etc.) são a fonte de verdade para toda interação visual. Usar exatamente as variantes, estados e tamanhos definidos no Figma.

**Ícones:** A biblioteca de ícones do DS (node `41:136`) usa **Remix Icons**. No código, usar exclusivamente `@remixicon/react`. Nenhum outro pacote de ícones (Lucide, Heroicons, FontAwesome, etc.) deve ser instalado.

**Cores, tipografia, sombras, radius:** Definidos nas 7 fundações. Configurados via `npx @alignui/cli tailwind` e consumidos via classes Tailwind. Nunca usar valores hardcoded (ex: `#3b82f6`, `text-[14px]`). Sempre usar tokens do DS (ex: `text-primary-500`, `text-label-sm`).

**Templates setoriais:** As 5 páginas de templates (Finance & Banking, HR, Marketing, etc.) servem como referência de layout para as telas do ERP. Cada template tem telas completas com node IDs no `FIGMA.md` — usar `get_design_context` para obter o código de referência.

**Referência completa:** `FIGMA.md` na raiz do projeto documenta todos os node IDs, variantes, tokens e telas por módulo setorial.

### Processo de Implementação por Componente

Para cada tela do ERP:
1. **Buscar design:** `get_design_context(fileKey: "AjvK4iQOOs2wPcp53ZfIVr", nodeId: "<id>")` → código React + Tailwind de referência
2. **Verificar code library:** se existe na lib Free → usar direto (match 1:1 com Figma)
3. **Se não existe:** implementar baseado no código de referência gerado, usando as utils e tokens já configurados
4. **Validar:** `get_screenshot(fileKey, nodeId)` → comparar com implementação renderizada (light + dark mode)

### Dark Mode

Ativado desde o início via `next-themes`. O Align UI suporta dark mode nativamente — todas as CSS variables possuem variantes light/dark. Toggle no header do layout.

---

## 1. Schema do Banco (Prisma)

### 1.1 Enums

```prisma
enum Role { ADMIN  MANAGER  OPERATOR  VIEWER }
enum ProcessStatus { DRAFT  ACTIVE  SUSPENDED  COMPLETED  CANCELLED }
enum ActivityStatus { PENDING  IN_PROGRESS  BLOCKED  COMPLETED  SKIPPED }
enum TaskStatus { PENDING  DONE }
enum HandoffStatus { PENDING  ACCEPTED  REJECTED  TIMED_OUT }
enum OrderStatus {
  EM_ORCAMENTO        // Orçamento criado, vendedor montando proposta
  FATURAR             // Cliente fechou, pagamento informado, aguardando conciliação financeira
  FATURADO            // Financeiro conciliou pagamento, liberado para produção
  PRODUZIR            // Pedido chegou na produção, aguardando início
  EM_PRODUCAO         // Produção em andamento
  PRODUZIDO           // Produção concluída, todos os insumos prontos
  ENTREGUE            // Conferência + entrega realizada (status final)
  CANCELADO           // Cancelado (possível até FATURADO)
}
enum PaymentStatus { PENDING  PARTIAL  PAID  OVERDUE  CANCELLED }
enum InvoiceDirection { INBOUND  OUTBOUND }
enum ProductionOrderStatus { PENDING  IN_PROGRESS  COMPLETED  CANCELLED }
enum OrderItemSupplyStatus { PENDING  READY }  // Status de cada insumo/acabamento
enum SyncStatus { PENDING  IN_PROGRESS  SUCCESS  FAILED }
enum SyncEntity { CLIENT  ORDER  COMPANY  CARRIER  PAYMENT_METHOD  CLIENT_CLASSIFICATION  DELIVERY_ROUTE  ORDER_TYPE  ORDER_FLOW  ORDER_MODEL }
enum PersonType { F  J }
enum AuditAction { CREATE  UPDATE  DELETE  STATUS_CHANGE  LOGIN  LOGOUT  SYNC }
```

### 1.2 Auth e Organização

- **User** — id, email, name, passwordHash, refreshToken, role, isActive, departmentId → Department
- **Permission** — id, action (ex: "order:create"), resource, description
- **RolePermission** — role + permissionId (pivot, unique)

### 1.3 BPM — Camada de Definição (template)

- **Department** — id, name, slug, description, sortOrder → sectors[], users[]
- **Sector** — id, name, slug, departmentId → Department, → processes[]
- **Process** — id, name, slug, sectorId → Sector, status, sortOrder → activities[], handoffsFrom[], handoffsTo[]
- **Activity** — id, name (verbo infinitivo + objeto), slug, processId → Process, ownerRole, inputDescription, outputDescription, slaMinutes, exceptions, sortOrder, isAutomatic, triggerOnStatus (OrderStatus?) → tasks[], activityInstances[]
- **Task** — id, activityId → Activity, description, sortOrder, isMandatory
- **Handoff** — fromProcessId → Process, toProcessId → Process, triggerOnStatus (OrderStatus), validationRules (JSON), autoAdvance (bool)

### 1.4 BPM — Camada de Runtime (por pedido)

- **ProcessInstance** — processId → Process, orderId → Order, status, startedAt, completedAt → activityInstances[]
- **ActivityInstance** — activityId → Activity, processInstanceId → ProcessInstance, assignedUserId → User, status, startedAt, completedAt, dueAt (SLA), notes → taskInstances[]
- **TaskInstance** — taskId → Task, activityInstanceId → ActivityInstance, status, completedByUserId → User
- **HandoffInstance** — handoffId → Handoff, orderId → Order, fromProcessInstanceId, toProcessInstanceId, status, rejectionReason

### 1.5 Negócio — Comercial (Clientes)

- **Client** — personType (F/J), cpfCnpj, name, tradeName, ie, rg, email, phone, address, addressNumber, neighborhood, complement, city, state, zipCode, classificationId → ClientClassification, deliveryRouteId → DeliveryRoute, defaultPriceTableId → PriceTable, defaultPaymentMethodId → PaymentMethod, proFinancasId
- **ClientClassification** — name, proFinancasId
- **DeliveryRoute** — name, proFinancasId

### 1.5b Negócio — Compras (Produtos, Fornecedores, Cotações)

- **Supplier** — personType (F/J), cpfCnpj, name, tradeName, ie, email, phone, address, city, state, zipCode, isActive, proFinancasId → purchaseQuotations[]
- **Product** — Cadastro em **4 etapas obrigatórias** (wizard):

  **Etapa 1 — Identificação:**
  - productTypeId → ProductType (**obrigatório** — determina prefixo do código e dept EAN)
  - code (String, **gerado automaticamente, não editável, imutável**: `[PREFIXO]-[NNNN]` ex: TT-0001, PF-0001)
  - barcode (String — **EAN-13 interno gerado automaticamente**: `2[DDDD][SSSSS][C]`)
  - name (String — descrição)
  - departmentCategoryId → ProductDepartment (**obrigatório**)
  - brandId → Brand (**obrigatório**)
  - unitMeasureId → UnitMeasure (**obrigatório** — unidade base: UN, M2, KG, etc.)
  - boxUnitMeasureId? → UnitMeasure (unidade de conjunto/caixa, ex: CX)
  - unitsPerBox (Int? — quantos da unidade base cabem em 1 caixa, ex: 1000 parafusos/caixa)
  - step1Complete (Bool, default false)

- **ProductType** — prefixo (String, unique, 2 chars), name, eanDeptCode (String, 4 digits), lastSequential (Int, default 0)

  Seed dos 10 tipos da Mundial Telhas:
  | Tipo | Prefixo | Código EAN Dept | Primeiro código |
  |---|---|---|---|
  | Telhas Térmicas | TT | 0001 | TT-0001 |
  | Telhas Galvalume | TG | 0001 | TG-0001 |
  | Painel Térmico | PT | 0004 | PT-0001 |
  | Parafusos | PF | 0002 | PF-0001 |
  | Acabamentos | AC | 0010 | AC-0001 |
  | Acessório | AX | 0003 | AX-0001 |
  | Matéria Prima | MP | 0005 | MP-0001 |
  | Insumos | IN | 0006 | IN-0001 |
  | Imobilizado | IM | 0007 | IM-0001 |
  | Outros | OT | 0008 | OT-0001 |

  **Regras de geração de código:**
  1. Ao selecionar o tipo, sistema consulta `ProductType.lastSequential` e preenche automaticamente
  2. Campo visível mas **não editável** — operador vê, não altera
  3. Formato validado: `[2 letras]-[4 dígitos]`. Rejeita qualquer formato diferente
  4. **Imutável após criação** — código nunca muda, se desativado é "aposentado"

  **Regras de geração de EAN-13 interno:**
  1. Formato: `2[DDDD][SSSSS][C]` — total 13 dígitos
  2. `2` = prefixo GS1 de uso interno (nunca conflita com produtos externos)
  3. `DDDD` = `ProductType.eanDeptCode` (4 dígitos)
  4. `SSSSS` = sequencial do produto zero-padded (5 dígitos)
  5. `C` = dígito verificador calculado pelo algoritmo EAN-13:
     - S1 = soma dos dígitos ímpares, S2 = soma dos dígitos pares
     - Total = S1 + (S2 × 3)
     - C = (10 - (Total mod 10)) mod 10

  **Unidade vs Conjunto/Caixa:**
  - Produtos podem ser vendidos/requisitados em unidade (UN) ou caixa (CX)
  - `unitsPerBox` define a conversão (ex: 1 CX = 1000 parafusos)
  - Estoque sempre armazenado na unidade base; conversão na entrada/saída
  - Produtos com conjunto: cola, parafuso, manta asfáltica, EPS, tampa de vedação, soquete, EPU, disco, espuma expansiva, aplicador PU, fita personalizada, fita transparente, EPI/luvas, eletrodo

  **Etapa 2 — Especificação Técnica:**
  - weight (Float — **obrigatório**), width (Float — **obrigatório**), height (Float — **obrigatório**), length (Float — **obrigatório**)
  - weightM3 (Float? — m³)
  - productionCapacity (Float? — capacidade produtiva)
  - stockLocation (String? — endereçamento no estoque)
  - minStock (Float — **obrigatório**, ≠ 0 para FABRICACAO_PROPRIA e MATERIA_PRIMA)
  - currentStock (Float, default 0)
  - piecesPerUnit (Float? — peças por unidade, ex: 10.0)
  - size (Float? — tamanho, ex: 3.5)
  - **classification** (ProductClassification — **obrigatório**: FABRICACAO_PROPRIA, REVENDA, MATERIA_PRIMA, INSUMO)
  - loadCapacity (Float? — S/Carga kg/m²)
  - beta (Float?)
  - fckMpa (Float? — FCK Mpa)
  - step2Complete (Bool, default false)

  **Etapa 3 — Fiscal e Tributação:**
  - ncmCode (String — **obrigatório**)
  - nfeOriginId (String? — origem NFe)
  - cfopDefault (String? — CFOP padrão)
  - ipiRate (Float? — alíquota IPI)
  - taxBasketId? (String? — vinculação com cesta de tributação)
  - step3Complete (Bool, default false)

  **Etapa 4 — Precificação e Fórmula:**
  - costPrice (Int — centavos)
  - salePrice (Int — centavos, **obrigatório**)
  - minSalePrice (Int — centavos)
  - defaultPriceTableId? → PriceTable
  - formulaId? → ProductionFormula (**obrigatório se FABRICACAO_PROPRIA** — fórmula como aba dentro do produto)
  - step4Complete (Bool, default false)

  **Status e controle:**
  - status (ProductStatus: DRAFT / ACTIVE / INACTIVE — só vira ACTIVE quando steps 1-4 completos)
  - proFinancasId (Int?)
  - → images[], priceTableItems[]

> **Regras do cadastro:**
> 1. Código gerado automaticamente: prefixo do departamento + sequencial (TEL-001, PAR-001)
> 2. Produto só fica ACTIVE (disponível para venda) quando as 4 etapas estão completas
> 3. Se classificação = FABRICACAO_PROPRIA, fórmula de composição é **obrigatória** (aba dentro do produto, não módulo separado)
> 4. Estoque mínimo ≠ 0 é obrigatório para itens de produção e matéria-prima
> 5. Nada avança para etapa 4 sem tributação configurada na etapa 3

```prisma
enum ProductClassification {
  FABRICACAO_PROPRIA   // Produto fabricado internamente (telhas) → gera Ordem de Produção
  REVENDA              // Produto comprado para revenda → gera Ordem de Separação
  MATERIA_PRIMA        // Insumo de produção (EPS, cimento) → consumido na fórmula
  INSUMO               // Material auxiliar (parafusos, cola, acabamentos) → gera Ordem de Separação
}

enum ProductStatus {
  DRAFT                // Cadastro incompleto (nem todas as 4 etapas concluídas)
  ACTIVE               // Ativo para venda (todas as etapas completas)
  INACTIVE             // Desativado manualmente
}
```

> **Classificação Operacional** resolve o split automático dos pedidos:
> - `FABRICACAO_PROPRIA` → gera **Ordem de Produção** (com fórmula obrigatória)
> - `REVENDA` + `INSUMO` → gera **Ordem de Separação** (itens a separar do estoque)
> - `MATERIA_PRIMA` → não aparece em pedidos de venda, é consumida nas fórmulas de produção
> O vendedor NÃO separa pedidos — é um pedido único. O sistema divide automaticamente.
- **ProductImage** — productId → Product, url, sortOrder
- **UnitMeasure** / **Brand** / **ProductDepartment** — name, proFinancasId
- **PriceTable** — name, isDefault, proFinancasId → items[]
- **PriceTableItem** — priceTableId + productId (unique), priceInCents
- **PurchaseQuotation** — supplierId → Supplier, status (DRAFT/SENT/RECEIVED/SELECTED/REJECTED), requestedAt, receivedAt, totalCents, notes
- **PurchaseQuotationItem** — quotationId → PurchaseQuotation, productId → Product, quantity, unitPriceCents
- **PurchaseOrder** — supplierId → Supplier, quotationId? → PurchaseQuotation, status (PENDING/CONFIRMED/RECEIVED/CANCELLED), totalCents, expectedDeliveryDate, notes → accountPayable?

### 1.5c Negócio — Referência

- **Company** — name, tradeName, cnpj, ie, phone, email, logoUrl, address, city, state, zipCode, proFinancasId
- **PaymentMethod** — name, isActive, proFinancasId
- **Carrier** — name, proFinancasId

### 1.5d Painéis (Dashboards)

- **Dashboard** — name, description, ownerId → User, isPublic (bool), autoRefreshSeconds (Int?), sortOrder
- **DashboardCard** — dashboardId → Dashboard, type (enum: BAR_CHART, LINE_CHART, PIE_CHART, KPI_NUMBER, TABLE, DONUT, AREA_CHART, STACKED_BAR), title, dataSource (JSON: `{ entity, processId?, departmentId?, statusFilter?, dateRange? }`), filters (JSON), axisConfig (JSON: `{ xField, yField, groupBy? }`), layoutX (Int), layoutY (Int), layoutW (Int), layoutH (Int), config (JSON: tipo-specific settings), sortOrder
- **DashboardFilter** — dashboardId → Dashboard, field, operator (EQUALS/NOT_EQUALS/GREATER/LESS/BETWEEN/IN), value (JSON), label

```
Enum CardType {
  BAR_CHART
  LINE_CHART
  PIE_CHART
  KPI_NUMBER
  TABLE
  DONUT
  AREA_CHART
  STACKED_BAR
}
```

> **Arquitetura dos Painéis (conforme dashboard.md):**
> - Dashboard NÃO armazena dados próprios — cada Card faz queries nos dados já existentes do sistema
> - Um Card aponta para uma `dataSource` (entidade + filtros) e renderiza visualmente
> - Um único Dashboard pode ter Cards apontando para diferentes departamentos/processos simultaneamente
> - DashboardFilters são filtros globais aplicados a todos os Cards do dashboard ao mesmo tempo
> - Layout dos Cards segue grid com posição (x, y) e dimensões (w, h) — drag-and-drop no frontend

### 1.6 Pedido (objeto central)

- **Order** — orderNumber (String, unique, **gerado automaticamente** — ver regras abaixo), title (ex: "Marcelo - TR25"), status (OrderStatus), clientId, companyId, paymentMethodId, carrierId, priceTableId, createdByUserId, assignedUserId, issueDate, deliveryDeadline (prazo de entrega), proposalValidityDays (Int, default 7 — validade da proposta), deliveryAddress, deliveryNeighborhood, deliveryCity, deliveryState, deliveryCep, deliveryReferencePoint, contactName, subtotalCents, freightCents (frete), discountCents, taxSubstitutionCents (substituição tributária/IPI), totalCents, paidAmountCents (valor já pago — 50% entrada), paymentProofUrl (comprovante de pagamento), shouldProduce (Bool — flag "produzir"), isResale (Bool — flag "revenda"), hasTaxSubstitution (Bool — flag "substituição tributária"), notes, proFinancasId, orderTypeId, orderFlowId, orderModelId → items[], statusHistory[], processInstances[], invoices[], productionOrders[], accountsReceivable[]
- **OrderItem** — orderId, productId, quantity, unitPriceCents, discountCents, totalCents, sortOrder, **pieces** (Float? — ex: 10.0), **size** (Float? — ex: 3.5), **classificationSnapshot** (ProductClassification) → supplies[]
- **OrderItemSupply** — orderItemId → OrderItem, productId? → Product (o insumo/acabamento do catálogo), name (String — "Acabamento frontal", "Parafusos", "Cola"), quantity (Int, default 1), status (OrderItemSupplyStatus: PENDING/READY), readyAt (DateTime?), checkedByUserId? → User, separationOrderItemId? → SeparationOrderItem

> **Checklist de insumos/acabamentos dentro do pedido:**
> Cada OrderItem de classificação FABRICACAO_PROPRIA pode ter N supplies (acabamentos, parafusos, cola). Esses supplies:
> - Aparecem como **checklist dentro do item no dossiê do pedido** (ex: TELHA TR25 → [○ Acabamento frontal, ○ Parafusos, ○ Cola])
> - São marcados como READY conforme são separados/conferidos
> - Ficam vinculados à SeparationOrder (se gerada) para controle de estoque
> - NÃO têm valor separado — fazem parte do preço do item principal
> - **Nem todo OrderItem tem supplies** — o sistema detecta automaticamente
- **OrderStatusHistory** — orderId, fromStatus, toStatus, changedByUserId, reason, metadata (JSON)
- **OrderType** / **OrderFlow** / **OrderModel** — name, proFinancasId
- **OrderSequence** — id (String, singleton), lastNumber (Int) — tabela auxiliar para geração atômica do número

> **Geração automática do número do pedido:**
>
> Formato: **4 dígitos sequencial contínuo** → `0001`, `0002`, ..., `9999`, `10000`, ...
>
> - Sequencial contínuo, **sem reset** — nunca reinicia
> - Campo **não editável, imutável** — preenchido automaticamente na criação
> - Implementação: tabela `OrderSequence` com `lastNumber`, incremento atômico:
>
> ```typescript
> async generateOrderNumber(): Promise<string> {
>   const seq = await this.prisma.$transaction(async (tx) => {
>     const record = await tx.orderSequence.upsert({
>       where: { id: 'singleton' },
>       create: { id: 'singleton', lastNumber: 1 },
>       update: { lastNumber: { increment: 1 } },
>     });
>     return record.lastNumber;
>   });
>   return String(seq).padStart(4, '0');
> }
> ```
>
> - Garante unicidade mesmo com requests concorrentes (transação atômica)
> - Quando ultrapassar 9999 → vira 10000 naturalmente (sem limite)
> - Documentos derivados herdam o número do pedido:
>   - **Ordem de Produção:** `OP-0001`
>   - **Ordem de Separação:** `OS-0001`
>   - **Requisição de Estoque:** `REQ-0001` (sequencial próprio contínuo)

> **Regra dos Insumos/Acabamentos:** Cada item do pedido (OrderItem) pode ter N supplies (acabamentos, insumos de instalação — parafusos, cola, acabamento frontal/lateral). Esses supplies NÃO têm valor separado — fazem parte do preço do item. Funcionam como **checklist de conclusão**: o item do pedido só é considerado completo quando TODOS os supplies estão com status READY. O pedido só pode avançar para PRODUZIDO quando TODOS os itens têm `isAllSuppliesReady = true`.

### 1.7 Financeiro

- **AccountReceivable** — orderId?, clientId, description, amountCents, paidAmountCents, dueDate, paidDate, status (PaymentStatus), invoiceId?
- **AccountPayable** — supplierId?, description, amountCents, paidAmountCents, dueDate, paidDate, status, categoryId → FinancialCategory
- **FinancialCategory** — name, type ("RECEITA"/"DESPESA"), parentId (self-referencing)
- **Invoice (NF-e)** — invoiceNumber, direction (IN/OUT), orderId?, clientId?, companyId, totalCents, issuedAt, cancelledAt, xmlContent, pdfUrl, accessKey (44 dígitos), proFinancasId
- **CashRegister** — companyId, openedByUserId, closedByUserId, openedAt, closedAt, openingBalanceCents, closingBalanceCents, proFinancasId

### 1.8 Produção e Separação

- **ProductionFormula** — productId → Product (produto acabado), name, yieldQuantity → ingredients[]
- **ProductionFormulaIngredient** — formulaId, ingredientId → Product (matéria-prima), quantity, unitMeasureId

- **ProductionOrder** (Ordem de Produção — apenas itens FABRICACAO_PROPRIA)
  - orderId → Order, code (String — código da OP), status (ProductionOrderStatus), type (String — "SIM"/"NÃO"), machineId? (String — "Padrão"), batch? (String — lote), scheduledDate, completedDate, assignedUserId, notes → items[], consumptions[]
  - **ProductionOrderItem** — productionOrderId, orderItemId → OrderItem, productId → Product, quantity, pieces, size, unitMeasureId
  - **ProductionConsumption** (Matéria-Prima) — productionOrderId, ingredientId → Product, unitMeasureId, plannedQuantity, actualQuantity, weightM3?, weight?, costCents, totalCostCents, operation (String — "S" = saída)
  - **ProductionOutput** (Produto Acabado) — productionOrderId, productId → Product, unitMeasureId, quantity, operation (String — "E" = entrada)
  - **ProductionLoss** — productionOrderId, description?, quantity?, costCents?

- **SeparationOrder** (Ordem de Separação — apenas itens REVENDA_ESTOQUE, quando existirem)
  - orderId → Order, code (String), status (SeparationOrderStatus: PENDING/IN_PROGRESS/SEPARATED/CHECKED), assignedUserId, scheduledDate, completedDate → items[]
  - **SeparationOrderItem** — separationOrderId, orderItemId → OrderItem, productId → Product, quantity, pieces?, stockLocation? (String — localização no estoque), isSeparated (Bool, default false), isChecked (Bool, default false)

```prisma
enum SeparationOrderStatus { PENDING  IN_PROGRESS  SEPARATED  CHECKED }
```

> **Split automático no FATURADO:** Quando o pedido move para FATURADO, o sistema:
> 1. Filtra `OrderItems` onde `classificationSnapshot = FABRICACAO_PROPRIA` → cria **ProductionOrder** com esses itens + carrega fórmulas para matéria-prima
> 2. Filtra `OrderItems` onde `classificationSnapshot IN (REVENDA, INSUMO)` → se existirem, cria **SeparationOrder** com esses itens
> 3. Itens `MATERIA_PRIMA` não aparecem em pedidos de venda (são consumidos via fórmula)
> 4. Se NÃO houver itens REVENDA/INSUMO, nenhuma SeparationOrder é criada (nem todo pedido tem)
> 5. Ambos herdam o mesmo número do pedido, endereço e condição de pagamento

### 1.8b Requisições Internas de Estoque

- **StockRequisition** — code (String, auto-gerado), type (StockRequisitionType: VENDA / INTERNO), status (StockRequisitionStatus: PENDING / APPROVED / PROCESSED / CANCELLED), requestedByUserId → User, approvedByUserId? → User, orderId? → Order (se for para venda, vincula ao pedido), notes, requestedAt, processedAt → items[]
- **StockRequisitionItem** — requisitionId → StockRequisition, productId → Product, requestedQuantity (Float — na unidade selecionada), unitType (String — "UN" ou "CX"), unitsPerBox (Int? — copiado do produto se CX), quantityInBaseUnit (Float — calculado: se CX, requestedQuantity × unitsPerBox), actualQuantity (Float? — quantidade real retirada)

```prisma
enum StockRequisitionType { VENDA  INTERNO }
enum StockRequisitionStatus { PENDING  APPROVED  PROCESSED  CANCELLED }
```

> **Departamento:** Requisições pertencem ao departamento de **Compras** (setor Suprimentos), pois envolvem gestão de estoque e saída de materiais.

> **Fluxo completo da requisição:**
>
> **1. Criação no sistema:**
> - Solicitante cria requisição no sistema informando itens e quantidades
> - Requisição recebe código auto-gerado (ex: REQ-20260402-001)
> - **O próprio código da requisição gera um código de barras** (Code-128) que é impresso no documento
> - Status: PENDING
>
> **2. Impressão física (mesmo layout da Etiqueta 1 — Fabricação Própria):**
> - Sistema gera PDF da requisição seguindo a estrutura da Etiqueta 1:
>   - Cabeçalho: dados da empresa (nome, CNPJ, IE, endereço)
>   - Identificação: "Requisição de Estoque Código: [REQ-XXXX]" + data
>   - **Código de barras Code-128 da requisição** (para scan de finalização)
>   - Tabela de itens: Código | Descrição | Qtde | UN/CX
>   - Totalização: quantidade total
>   - Dados do solicitante + setor
>   - Campo de assinatura do solicitante e do responsável pelo estoque
> - Documento impresso entregue ao solicitante → leva ao estoque
>
> **3. Separação física (papel em mãos):**
> - Responsável recebe o papel impresso, **lê visualmente** o que precisa separar
> - Separa fisicamente os itens conforme listado no documento
>
> **4. Registro via leitor de código de barras:**
> - Responsável abre tela "Processar Requisição" no sistema
> - Frontend usa `onScan.js` para detectar input de scanner (HID keyboard, < 50ms entre chars)
> - Campo invisível com foco automático captura cada scan
> - **Para cada produto separado:** escaneia EAN-13 do produto (etiqueta na caixa/conjunto)
>   - Sistema identifica via `GET /products/barcode/:ean`
>   - Tela mostra nome, estoque atual
>   - Operador seleciona **[Unidade] ou [Conjunto]** + **quantidade**
>   - Sistema registra: `PATCH /stock-requisitions/:id/items/:itemId/process` → baixa estoque
> - **Por último:** escaneia o **código de barras da requisição** (Code-128 no topo do documento)
>   - Sistema identifica via `GET /stock-requisitions/code/:code`
>   - Se todos os itens já foram processados → **requisição é FINALIZADA automaticamente**
>   - Se faltam itens → sistema alerta quais faltam
>
> **IMPORTANTE:** Nenhum código (requisição ou produto) é digitado manualmente. Tudo é lido pelo scanner.
>
> **Implementação técnica do scanner no frontend:**
> - Biblioteca: `onScan.js` (detecção de hardware scanner via timing)
> - Configuração: `onScan.attachTo(document, { minLength: 8, suffixKeyCodes: [13], onScan: callback })`
> - O scanner envia caracteres em < 50ms entre cada → `onScan.js` detecta como scan, não como digitação
> - Fallback: campo de input aceita cole (Ctrl+V) para testes sem scanner físico
> - Geração de barcode no PDF: biblioteca `bwip-js` (gera Code-128 e EAN-13 como imagem para PDFKit)
>
> **Dois cenários de quantidade:**
> - **Unidade:** scan EAN → seleciona "Unidade" → informa qtd (ex: 50). Baixa = 50 UN
> - **Conjunto:** scan EAN → seleciona "Conjunto" → informa qtd (ex: 1 caixa). Baixa = 1 × 1000 = 1000 UN
>
> **Produtos de venda com conjunto:** cola, parafuso, manta asfáltica, EPS, tampa vedação, soquete, EPU, disco, espuma expansiva, aplicador PU, fita personalizada
> **Produtos de uso interno:** fita transparente, EPI/luvas, disco amarelo/verde, eletrodo
> Ambos usam o mesmo fluxo, diferenciados por `type`

### 1.9 Sincronização

- **SyncLog** — entity (SyncEntity), status, totalRecords, syncedRecords, failedRecords, startedAt, completedAt, errorMessage, metadata
- **SyncMapping** — entity + proFinancasId (unique), mundialErpId, lastSyncedAt, checksum (hash para detecção de mudança)

### 1.10 Auditoria

- **AuditLog** — userId, action (AuditAction), entity, entityId, changes (JSON: `{ field: { from, to } }`), ipAddress, userAgent

> **Regras de Schema (Bravy + CTO):**
> - Todos os models têm `id (cuid)`, `createdAt`, `updatedAt`, `deletedAt` (soft delete)
> - Valores monetários em centavos (Int) — elimina erros de ponto flutuante
> - `@@map("snake_case_plural")` para tabelas, `@map("snake_case")` para colunas (`created_at`, `updated_at`, `deleted_at`, etc.)
> - Índices nomeados em todo campo usado em WHERE/ORDER BY/JOIN frequente: `@@index([field], name: "idx_tabela_campo")`
> - Relações explícitas com `@relation(fields: [...], references: [id])`

> **Regras de Código (Bravy — `03-nomenclatura-e-padroes.md` + `99-referencia-completa.md`):**
> - **`named exports` obrigatório** — nunca `export default`. Componentes: `export function OrderDossier`, Services: `export class OrdersService`
> - **`ResponseDto.fromEntity()` obrigatório** — todo endpoint retorna um ResponseDto com método estático `fromEntity()` que mapeia a entidade Prisma para o DTO de saída. Nunca retornar entidade do banco diretamente
> - **Arquivos em `kebab-case`** — `order-status-badge.tsx`, `create-order.dto.ts`, `jwt-auth.guard.ts`
> - **Componentes React: arquivo `kebab-case.tsx`, export `PascalCase`** — `order-dossier.tsx` → `export function OrderDossier`
> - **Hooks: prefixo `use-` no arquivo** — `use-orders.ts` → `export function useOrders`
> - **Booleanos: prefixo `is/has/can/should`** — `isActive`, `hasPermission`, `canEdit`, `shouldProduce`
> - **Funções: verbo no início** — `calculateTotal()`, `fetchOrders()`, `validateEmail()`
> - **Enums: `PascalCase` nome, `UPPER_SNAKE_CASE` valores** — `OrderStatus.EM_ORCAMENTO`
> - **Event handlers: `handle` interno, `on` na prop** — `handleSubmit` dentro do componente, `onSubmit` na interface de props
> - **Testes: `.spec.ts` (unitário), `.e2e-spec.ts` (e2e)** — `orders.service.spec.ts`, `auth.e2e-spec.ts`

### Índices Obrigatórios (definidos no schema, não deixar para depois)

```
Order:     @@index([clientId, status], name: "idx_orders_client_status")
           @@index([status, createdAt], name: "idx_orders_status_created")
           @@index([createdByUserId], name: "idx_orders_created_by")
           @@index([proFinancasId], name: "idx_orders_pf_id")
Client:    @@index([name], name: "idx_clients_name")
           @@index([cpfCnpj], name: "idx_clients_cpf_cnpj")
           @@index([proFinancasId], name: "idx_clients_pf_id")
Product:   @@index([name], name: "idx_products_name")
           @@index([code], name: "idx_products_code")
           @@index([proFinancasId], name: "idx_products_pf_id")
AR:        @@index([clientId, status], name: "idx_ar_client_status")
           @@index([dueDate, status], name: "idx_ar_due_status")
AP:        @@index([dueDate, status], name: "idx_ap_due_status")
AuditLog:  @@index([entity, entityId], name: "idx_audit_entity")
           @@index([userId, createdAt], name: "idx_audit_user")
SyncMapping: @@index([entity, mundialErpId], name: "idx_sync_entity_erp")
ActivityInstance: @@index([assignedUserId, status], name: "idx_ai_user_status")
                  @@index([processInstanceId], name: "idx_ai_process_instance")
```

---

## 2. Módulos Backend (NestJS)

### 2.1 Infraestrutura
- **DatabaseModule** — PrismaService com soft-delete middleware, `@Global`
- **ConfigModule** — variáveis de ambiente validadas (DATABASE_URL, JWT secrets, PRO_FINANCAS_URL/EMAIL/PASSWORD, REDIS_URL). Validação de env pode usar Zod ou Joi; DTOs de API usam **class-validator** (padrão Bravy backend)
- **CommonModule** — Guards (JwtAuth, Roles), Interceptors (Response com envelope `{data, meta}`, Logging com requestId UUID), Filters (HttpException), Pipes (ParseCuid, ValidationPipe global com `whitelist: true`), Decorators (@CurrentUser, @Roles, @Public), PaginationDto (skip/take, max 100)
- **main.ts** — Helmet (primeiro middleware), CORS restritivo, ValidationPipe global, Swagger, prefixo `/api/v1`
- **BullMQ + Redis** — Filas para operações pesadas (sync, geração PDF, envio email)
- **Elasticsearch 8** — Motor de busca full-text para pesquisa global (clientes, produtos, pedidos, NF-e). Índices separados por entidade. Sync via listeners nos events de criação/atualização/exclusão (EventEmitter2). Biblioteca: `@elastic/elasticsearch` (client oficial)
- **Throttler** — Rate limiting global + restritivo em `/auth/login` e `/auth/register`
- **RequestId** — Interceptor que gera UUID por request, propaga nos logs, retorna no header `X-Request-Id`

### 2.2 Auth (`/api/v1/auth`)
| Método | Rota | Ação |
|---|---|---|
| POST | `/auth/register` | Registrar usuário |
| POST | `/auth/login` | Login → tokens |
| POST | `/auth/refresh` | Renovar tokens |
| POST | `/auth/logout` | Invalidar refresh |
| GET | `/auth/me` | Perfil do usuário |

### 2.3 Users (`/api/v1/users`) — CRUD padrão

### 2.4 BPM Engine (`/api/v1/...`)
- **Definição:** CRUD de departments, sectors, processes, activities, tasks, handoffs
- **Runtime:**
  - `GET /process-instances` — listar instâncias (filtro por order/user/status)
  - `GET /process-instances/:id` — instância com activities/tasks
  - `POST /process-instances` — iniciar processo para um pedido
  - `PATCH /activity-instances/:id/complete` — completar atividade
  - `PATCH /task-instances/:id/toggle` — marcar/desmarcar item do checklist
  - `PATCH /handoff-instances/:id/accept` — aceitar handoff
  - `PATCH /handoff-instances/:id/reject` — rejeitar handoff

### 2.5 Clients (`/api/v1/clients`) — Departamento Comercial
- CRUD completo + search + client classifications + delivery routes
- `GET /clients/:id/orders` — pedidos do cliente
- `GET /clients/:id/financials` — resumo financeiro (AR total, pago, pendente, vencido)

### 2.6 Products (`/api/v1/products`) — Departamento Compras
- CRUD completo (wizard 4 etapas) + images + brands + unit measures + product departments + price tables
- `GET /products/:id/formula` — fórmula de produção do produto (aba inline)
- `GET /products/:id/stock-movements` — histórico de movimentação de estoque
- `GET /products/barcode/:ean` — **busca por EAN-13** (usado pelo leitor de código de barras)
- `GET /products/types` — listar ProductTypes com prefixos e sequenciais
- `GET /products/next-code/:typeId` — gerar próximo código disponível para o tipo

### 2.6b Suppliers (`/api/v1/suppliers`) — Departamento Compras
- CRUD completo + search
- `GET /suppliers/:id/purchase-history` — histórico de compras

### 2.6c Purchase Quotations (`/api/v1/purchase-quotations`) — Departamento Compras
| Método | Rota | Ação |
|---|---|---|
| GET | `/purchase-quotations` | Listar cotações (filtro por status/fornecedor) |
| GET | `/purchase-quotations/:id` | Detalhe com itens e propostas |
| POST | `/purchase-quotations` | Criar solicitação de cotação |
| PATCH | `/purchase-quotations/:id` | Atualizar (registrar proposta recebida) |
| PATCH | `/purchase-quotations/:id/select` | Selecionar cotação vencedora |
| POST | `/purchase-orders` | Efetivar compra (cria AP automaticamente) |
| GET | `/purchase-orders` | Listar pedidos de compra |

### 2.6d Dashboards/Painéis (`/api/v1/dashboards`)
| Método | Rota | Ação |
|---|---|---|
| GET | `/dashboards` | Listar dashboards do usuário + públicos |
| GET | `/dashboards/:id` | Dashboard com cards e filtros |
| POST | `/dashboards` | Criar dashboard |
| PATCH | `/dashboards/:id` | Atualizar (nome, visibilidade) |
| DELETE | `/dashboards/:id` | Soft delete |
| POST | `/dashboards/:id/cards` | Adicionar card ao dashboard |
| PATCH | `/dashboards/:id/cards/:cardId` | Atualizar card (tipo, data source, layout) |
| DELETE | `/dashboards/:id/cards/:cardId` | Remover card |
| PATCH | `/dashboards/:id/layout` | Atualizar layout de todos os cards (batch: posições x,y,w,h) |
| GET | `/dashboards/:id/cards/:cardId/data` | **Executar query do card** — retorna dados renderizáveis conforme dataSource + filtros |
| POST | `/dashboards/:id/filters` | Adicionar filtro global |
| DELETE | `/dashboards/:id/filters/:filterId` | Remover filtro global |

> **Arquitetura do endpoint `/cards/:cardId/data`:** Este endpoint é o coração dos Painéis. Ele recebe os filtros globais do dashboard + filtros do card e monta uma query dinâmica na entidade alvo (Orders, AR, AP, Products, etc.). Retorna dados no formato esperado pelo tipo de gráfico (ex: `[{ label, value }]` para pie, `[{ x, y }]` para line). A lógica vive no `DashboardCardQueryService` que sabe traduzir `dataSource` em queries Prisma.

### 2.7 Orders (`/api/v1/orders`) — O módulo central
| Método | Rota | Ação |
|---|---|---|
| GET | `/orders` | Listar (filtro status/cliente/usuário) |
| GET | `/orders/:id` | Dossiê completo (items com supplies, histórico, processo, financeiro, produção) |
| POST | `/orders` | Criar (inicia como EM_ORCAMENTO) |
| PATCH | `/orders/:id` | Atualizar dados (items, pagamento, comprovante) |
| PATCH | `/orders/:id/status` | Avançar status → **dispara BPM engine** (valida guards conforme 3.2) |
| GET | `/orders/:id/timeline` | Timeline completa do processo |
| GET | `/orders/:id/pdf` | Gerar PDF "Proposta de Venda" (ver seção 4 para estrutura completa) |
| PATCH | `/orders/:id/items/:itemId/supplies/:supplyId` | Marcar supply como READY/PENDING (toggle checklist insumos) |
| POST | `/orders/:id/items/:itemId/supplies` | Adicionar supply a um item (acabamento, insumo) |
| PATCH | `/orders/:id/payment` | Registrar pagamento (paidAmountCents + paymentProofUrl) |

### 2.8 Financial (`/api/v1/...`)
- Contas a Receber: CRUD + registro de pagamento (com `Idempotency-Key` no header)
- Contas a Pagar: CRUD + registro de pagamento (com `Idempotency-Key`)
- Invoices (NF-e): CRUD + PDF (emissão com `Idempotency-Key` — operação crítica)
- Cash Register: abrir/fechar caixa
- Summary: dashboard financeiro (totais, vencidos, projeção)
- Payment Methods + Financial Categories

> **Idempotência (princípio CTO):** Operações financeiras (criar AR/AP, registrar pagamento, emitir NF-e) exigem header `Idempotency-Key`. Guard middleware valida e evita duplicatas.

### 2.8b Stock Requisitions (`/api/v1/stock-requisitions`)
| Método | Rota | Ação |
|---|---|---|
| GET | `/stock-requisitions` | Listar (filtro por type, status, data) |
| GET | `/stock-requisitions/:id` | Detalhe com itens e status de processamento |
| POST | `/stock-requisitions` | Criar requisição (type: VENDA ou INTERNO) |
| PATCH | `/stock-requisitions/:id/approve` | Aprovar requisição |
| PATCH | `/stock-requisitions/:id/items/:itemId/process` | **Processar item individual** (após scan do EAN): recebe `{ unitType: "UN"/"CX", actualQuantity }`, calcula baixa e atualiza estoque |
| PATCH | `/stock-requisitions/:id/complete` | Marcar como PROCESSED quando todos os itens estão processados |
| GET | `/stock-requisitions/:id/pdf` | **Gerar PDF** da requisição com barcode Code-128 para impressão |
| GET | `/stock-requisitions/code/:code` | **Buscar por código** (usado pelo scan da requisição impressa) |
| DELETE | `/stock-requisitions/:id` | Cancelar |

### 2.9 Production (`/api/v1/...`)
- Fórmulas: CRUD com ingredientes
- Ordens de Produção: CRUD + start + complete (ajusta estoque) + PDF Ficha OP (`GET /production-orders/:id/pdf`)
- Consumptions: registro de matéria-prima consumida (ProductionConsumption)
- Outputs: registro de produto acabado (ProductionOutput)
- Losses: registro de perdas (ProductionLoss)
- Ordens de Separação: CRUD + separar + conferir (SeparationOrder/SeparationOrderItem)
- Etiquetas: `GET /orders/:id/pdf/production-label` + `GET /orders/:id/pdf/separation-label`

### 2.10 Sync — Integração Pro Finanças (`/api/v1/sync`)
| Método | Rota | Ação |
|---|---|---|
| POST | `/sync/clients` | Enfileira sync de clientes → retorna `202 Accepted` + jobId |
| POST | `/sync/orders` | Enfileira sync de pedidos (com itens) → `202` |
| POST | `/sync/reference-data` | Enfileira sync de dados de referência (companies, carriers, payment methods, classifications, routes, order types/flows/models) → `202` |
| POST | `/sync/all` | Enfileira sync completo na ordem: reference-data → clients → orders → `202` |
| GET | `/sync/logs` | Histórico de sincronizações |
| GET | `/sync/status` | Saúde da integração + status dos jobs na fila |
| GET | `/sync/jobs/:jobId` | Status de um job específico |

> **IMPORTANTE (princípio CTO):** Sync é operação pesada (>500ms). NUNCA processa no ciclo request-response. Usa BullMQ com Redis: endpoint enfileira job, retorna 202 Accepted, worker processa em background. Frontend faz polling em `/sync/jobs/:jobId` ou recebe update via SSE.

### 2.11 Reports/Dashboard (`/api/v1/dashboard`, `/api/v1/reports`)
- KPI summary, sales chart, cashflow, DRE, sales report

### 2.12 Reference Data — companies, carriers, states/cities, neighborhoods

### 2.13 Search — Busca Global (`/api/v1/search`)

Motor de busca full-text via Elasticsearch para pesquisa unificada (Command Menu `Cmd+K` no frontend).

| Método | Rota | Ação |
|---|---|---|
| GET | `/search?q=termo&type=all` | Busca global em todas as entidades |
| GET | `/search?q=termo&type=clients` | Busca apenas em clientes |
| GET | `/search?q=termo&type=products` | Busca apenas em produtos |
| GET | `/search?q=termo&type=orders` | Busca apenas em pedidos |
| POST | `/search/reindex` | Reindexar todas as entidades (admin, via fila BullMQ) |
| GET | `/search/health` | Status do cluster Elasticsearch |

**Índices Elasticsearch:**

| Índice | Campos indexados | Entidade PostgreSQL |
|---|---|---|
| `mundial_clients` | name, tradeName, cpfCnpj, email, phone, city | Client |
| `mundial_products` | name, code, barcode, description | Product |
| `mundial_orders` | orderNumber, title, clientName, status | Order |
| `mundial_invoices` | invoiceNumber, accessKey, clientName | Invoice |
| `mundial_suppliers` | name, tradeName, cpfCnpj, email | Supplier |

**Arquitetura:**

```
PostgreSQL (source of truth)
    ↓ EventEmitter2 (client.created, product.updated, order.deleted...)
SearchIndexerService (listener)
    ↓ bulk index/update/delete
Elasticsearch 8 (índices de busca)
    ↑ query
SearchService.search(query, type, pagination)
    ↑ chamado pelo Controller
GET /search?q=telha&type=products → SearchController
```

**Padrões (CTO):**
- **PostgreSQL continua sendo source of truth.** Elasticsearch é read-only replica otimizada para busca. Nunca gravar direto no ES.
- **Sync via eventos, não via cron.** Listeners no `EventEmitter2` indexam em near real-time quando entidades são criadas/atualizadas/removidas.
- **Reindexação completa via fila.** `POST /search/reindex` enfileira job no BullMQ (operação pesada, 202 Accepted). Útil para rebuild do índice após mudanças de mapping.
- **Fallback gracioso.** Se o Elasticsearch estiver down, a busca faz fallback para `WHERE name ILIKE '%termo%'` no PostgreSQL (mais lento, mas funcional). Circuit breaker no client ES.
- **Debounce no frontend.** Campo de busca com 300ms de debounce (padrão CTO). Sem request a cada keystroke.
- **Paginação.** Resultados paginados com `from/size` (ES) mapeados para `skip/take` (padrão Bravy). Max 100 resultados.

**Implementação NestJS (padrão Bravy — Controller/Service/Repository):**

```
src/modules/search/
├── search.module.ts
├── search.controller.ts          ← GET /search, POST /search/reindex
├── search.service.ts             ← lógica de busca, fallback PostgreSQL
├── search.repository.ts          ← abstrai @elastic/elasticsearch client
├── search-indexer.service.ts     ← listener EventEmitter2 → index/update/delete
├── search-reindex.processor.ts   ← BullMQ worker para reindexação completa
└── dto/
    ├── search-query.dto.ts       ← q, type, page, limit (class-validator)
    └── search-result.dto.ts      ← ResponseDto com fromEntity()
```

---

## 3. Motor BPM — Processos, Atividades e Handoffs Completos

> **Nota sobre BPMN:** BPMN (Business Process Model and Notation) é a **metodologia de processos** que fundamenta toda a arquitetura do sistema. Não é um módulo — é o modelo mental. Cada tela, cada endpoint, cada transição de status é derivado do mapeamento de processos abaixo.

### 3.1 Máquina de Estados do Pedido

```
EM_ORCAMENTO → FATURAR → FATURADO → PRODUZIR → EM_PRODUCAO → PRODUZIDO → ENTREGUE
                  ↓
               CANCELADO (possível até FATURADO)
```

**Fluxo real do negócio:**
1. Vendedor cria orçamento → `EM_ORCAMENTO`
2. Cliente fecha negócio → vendedor adiciona info de pagamento (50% entrada) + comprovante → move para `FATURAR`
3. Financeiro acessa o pedido, faz conciliação bancária, confirma pagamento → move para `FATURADO`
4. Pedido chega na Produção → coordenador aceita → move para `PRODUZIR`
5. Produção em andamento → move para `EM_PRODUCAO`
6. Produção concluída + TODOS os insumos/acabamentos prontos (checklist completo) → move para `PRODUZIDO`
7. Setor de conferência valida e entrega ao cliente (50% restante pago) → move para `ENTREGUE` (final)

**Regra de pagamento:** 50/50 — 50% do valor no início (informado ao mover para FATURAR), 50% restante na retirada/entrega.

### 3.2 Mapa de Transições com Guards e Efeitos

| De | Para | Guard (validação) | Efeito Automático | Handoff |
|---|---|---|---|---|
| EM_ORCAMENTO | FATURAR | Cliente válido, ≥1 item, preços preenchidos, `paidAmountCents` ≥ 50% do total, `paymentProofUrl` anexado | Cria AR com 2 parcelas (50% pago + 50% pendente para entrega). Notifica Financeiro | Comercial → Financeiro |
| FATURAR | FATURADO | Conciliação bancária confirmada pelo Financeiro | Registra pagamento da 1ª parcela (50%) no AR. Notifica Produção | Financeiro → Produção |
| FATURADO | PRODUZIR | Pedido com faturamento conciliado | **Split automático:** cria ProductionOrder com itens FABRICACAO_PROPRIA + cria SeparationOrder com itens REVENDA_ESTOQUE (se houver). Gera etiquetas | — |
| PRODUZIR | EM_PRODUCAO | Coordenador inicia produção | Registra `startedAt` nas ProductionOrders | — |
| EM_PRODUCAO | PRODUZIDO | Todas ProductionOrders COMPLETED + SeparationOrder CHECKED (se existir) | Baixa insumos do estoque, entrada produto acabado. Notifica conferência/entrega | — |
| PRODUZIDO | ENTREGUE | Conferência OK + 50% restante pago | Registra 2ª parcela no AR. Encerra ProcessInstances. Pedido concluído | — |
| EM_ORCAMENTO/FATURAR/FATURADO | CANCELADO | Motivo obrigatório | Estorna AR, cancela POs pendentes | — |

> **IMPORTANTE:** Cancelamento só é possível até FATURADO. Após entrar em produção (PRODUZIR em diante), cancelar exige tratamento especial fora do fluxo padrão.

### 3.3 Mapeamento Completo de Atividades por Processo

Cada atividade segue os **7 campos obrigatórios** da metodologia:

---

#### COMERCIAL > Pedidos (o pedido nasce como orçamento e transita)

**Atividade 1: Criar Pedido / Elaborar Orçamento**
| Campo | Valor |
|---|---|
| Nome | Criar pedido e montar proposta |
| Dono | Vendedor (OPERATOR) |
| Entrada | Cliente identificado (cadastrado ou novo) + demanda verbalizada |
| Checklist | 1. Registrar cliente (se não cadastrado, acionar Cadastro de Clientes) · 2. Selecionar produtos da tabela de preços · 3. Definir quantidades · 4. Adicionar insumos/acabamentos por item (acabamento frontal, lateral, parafusos, etc.) · 5. Aplicar descontos se autorizados · 6. Preencher dados de entrega (endereço, bairro, cidade, UF, CEP, referência) · 7. Definir prazo de entrega e validade da proposta · 8. Registrar observações |
| Saída | Pedido com status EM_ORCAMENTO. Pode gerar PDF "Proposta de Venda" via dropdown de ações |
| SLA | 2 horas |
| Exceções | Cliente sem cadastro → cadastrar inline ou handoff. Produto sem preço → handoff para "Gestão de Produtos" |

**Atividade 2: Fechar Negócio e Enviar para Faturamento**
| Campo | Valor |
|---|---|
| Nome | Registrar fechamento e pagamento inicial |
| Dono | Vendedor (OPERATOR) |
| Entrada | Pedido em EM_ORCAMENTO + aceite do cliente |
| Checklist | 1. Confirmar aceite do cliente · 2. Adicionar informações de pagamento (forma de pagamento) · 3. Registrar valor pago (50% entrada) no campo `paidAmountCents` · 4. Anexar comprovante de pagamento (`paymentProofUrl`) · 5. Verificar dados cadastrais completos · 6. Mover para FATURAR |
| Saída | Pedido com status FATURAR + comprovante de pagamento 50% → **handoff para Financeiro** |
| SLA | 4 horas após aceite |
| Exceções | Cliente não paga os 50% → pedido permanece em EM_ORCAMENTO. Comprovante não anexado → sistema bloqueia avanço |

**Handoff: Comercial → Financeiro (trigger: FATURAR)**
| Campo | Valor |
|---|---|
| O que é entregue | Pedido com status FATURAR + valor pago (50%) + comprovante de pagamento |
| Quem entrega | Vendedor |
| Quem recebe | Analista Financeiro |
| Dados obrigatórios na passagem | clienteId, totalCents, paidAmountCents (≥50%), paymentProofUrl, paymentMethodId |
| Se incompleto | Pedido não avança — permanece em EM_ORCAMENTO com indicação dos campos faltantes |
| Trigger | Status muda para FATURAR |

---

#### COMERCIAL > Cadastro e Manutenção de Clientes

**Atividade 5: Cadastrar Cliente**
| Campo | Valor |
|---|---|
| Nome | Cadastrar novo cliente no sistema |
| Dono | Vendedor (OPERATOR) |
| Entrada | Solicitação de cadastro (vinda do processo de Orçamento ou Pedidos) |
| Checklist | 1. Coletar tipo pessoa (F/J) · 2. Preencher CPF/CNPJ e validar · 3. Preencher razão social e nome fantasia · 4. Preencher endereço completo · 5. Preencher contato (telefone, email) · 6. Definir classificação do cliente · 7. Definir rota de entrega · 8. Definir tabela de preços padrão |
| Saída | Cliente cadastrado com todos os campos obrigatórios preenchidos |
| SLA | 1 hora |
| Exceções | CNPJ/CPF inválido → rejeitar cadastro. Cliente já existe → vincular ao existente |

---

#### COMPRAS > Gestão de Produtos

**Atividade 6: Cadastrar Produto (Wizard 4 Etapas)**
| Campo | Valor |
|---|---|
| Nome | Cadastrar novo produto no catálogo |
| Dono | Analista de Compras (OPERATOR) |
| Entrada | Necessidade de novo produto (demanda de vendas ou produção) |
| Checklist | 1. **Etapa 1 — Identificação:** preencher tipo, descrição, departamento, marca, unidade (código auto-gerado, EAN obrigatório) · 2. **Etapa 2 — Especificação:** dimensões obrigatórias, classificação operacional (Fabricação/Revenda/Matéria-Prima/Insumo), estoque mínimo (≠0 para produção), campos técnicos · 3. **Etapa 3 — Fiscal:** NCM, origem, CFOP, IPI, cesta tributação (nada avança sem tributação) · 4. **Etapa 4 — Precificação + Fórmula:** custo, venda obrigatório, tabela preço, fórmula (obrigatória se Fabricação Própria — criada inline como aba do produto) · 5. Upload de imagens · 6. Ativar produto (status DRAFT → ACTIVE quando 4 etapas completas) |
| Saída | Produto com status ACTIVE, disponível para venda |
| SLA | 4 horas |
| Exceções | NCM inválido → consultar contador. Produto Fabricação Própria sem fórmula → bloqueia ativação |

**Atividade 7: Manter Tabela de Preços**
| Campo | Valor |
|---|---|
| Nome | Atualizar tabela de preços |
| Dono | Gerente de Compras (MANAGER) |
| Entrada | Alteração de custos ou decisão comercial de repricing |
| Checklist | 1. Identificar produtos afetados · 2. Calcular novo preço com base no custo atualizado · 3. Validar margem mínima · 4. Aplicar alteração na tabela · 5. Notificar equipe comercial |
| Saída | Tabela de preços atualizada e vigente |
| SLA | 24 horas |
| Exceções | Redução de margem abaixo do mínimo → aprovação da diretoria |

---

#### COMPRAS > Cotação e Compra de Matéria-Prima

**Atividade 8: Solicitar Cotação**
| Campo | Valor |
|---|---|
| Nome | Solicitar cotação a fornecedores |
| Dono | Analista de Compras (OPERATOR) |
| Entrada | Estoque abaixo do mínimo ou demanda de produção |
| Checklist | 1. Identificar insumos necessários · 2. Selecionar fornecedores qualificados · 3. Enviar solicitação de cotação · 4. Registrar cotações recebidas · 5. Comparar preço/prazo/qualidade |
| Saída | Cotação vencedora selecionada |
| SLA | 48 horas |
| Exceções | Nenhum fornecedor responde → escalar para gerente. Preço acima do orçamento → negociar ou buscar alternativa |

**Atividade 9: Efetivar Compra**
| Campo | Valor |
|---|---|
| Nome | Efetivar pedido de compra ao fornecedor |
| Dono | Gerente de Compras (MANAGER) |
| Entrada | Cotação vencedora selecionada e aprovada |
| Checklist | 1. Aprovar cotação vencedora · 2. Emitir pedido de compra · 3. Confirmar prazo de entrega · 4. Registrar no contas a pagar |
| Saída | Pedido de compra emitido → AccountPayable criado automaticamente |
| SLA | 4 horas |
| Exceções | Fornecedor cancela → retornar para cotação |

**Handoff: Compras → Financeiro (trigger: compra efetivada)**
| Campo | Valor |
|---|---|
| O que é entregue | Pedido de compra com valor, fornecedor e data de vencimento |
| Quem entrega | Gerente de Compras |
| Quem recebe | Analista Financeiro (Contas a Pagar) |
| Dados obrigatórios | fornecedorId, valor, data vencimento, descrição dos itens |
| Se incompleto | Compra não gera AP — volta para Compras |

---

#### PRODUÇÃO > Produção do Pedido

**Atividade 10: Aceitar Pedido e Iniciar Produção + Separação**
| Campo | Valor |
|---|---|
| Nome | Aceitar pedido e iniciar processos paralelos |
| Dono | Coordenador de Produção (MANAGER) |
| Entrada | Pedido em PRODUZIR. ProductionOrder (itens FABRICACAO_PROPRIA) + SeparationOrder (itens REVENDA_ESTOQUE, se houver) criadas automaticamente |
| Checklist | 1. Revisar ProductionOrder: itens, quantidades, fórmulas · 2. Revisar SeparationOrder (se existir): itens de revenda a separar · 3. Consultar fórmula de produção de cada produto fabricado · 4. Verificar disponibilidade de matéria-prima no estoque · 5. Reservar/separar matéria-prima · 6. Mover para EM_PRODUCAO |
| Saída | Matéria-prima separada, pedido em EM_PRODUCAO, produção e separação em paralelo |
| SLA | 4 horas |
| Exceções | Matéria-prima insuficiente → notificar Compras (handoff para Cotação) |

**Atividade 11: Executar Produção (itens FABRICACAO_PROPRIA)**
| Campo | Valor |
|---|---|
| Nome | Executar produção conforme fórmula |
| Dono | Operador de Produção (OPERATOR) |
| Entrada | Matéria-prima separada, ProductionOrder em andamento |
| Checklist | 1. Seguir fórmula de produção · 2. Registrar consumo real de cada matéria-prima (ProductionConsumption) · 3. Registrar quantidade produzida (ProductionOutput) · 4. Registrar perdas se houver (ProductionLoss) · 5. Colar **Etiqueta de Produção** no produto acabado |
| Saída | Produto(s) fabricado(s) com consumo real registrado. ProductionOrder COMPLETED |
| SLA | Variável conforme fórmula |
| Exceções | Perda de material → registrar em ProductionLoss. Problema de qualidade → retrabalho |

**Atividade 11b: Separar Itens de Revenda (itens REVENDA_ESTOQUE — SE HOUVER)**
| Campo | Valor |
|---|---|
| Nome | Separar itens de revenda/estoque |
| Dono | Operador de Estoque (OPERATOR) |
| Entrada | SeparationOrder criada automaticamente (só existe se pedido tem itens REVENDA_ESTOQUE) |
| Checklist | 1. Consultar localização no estoque de cada item · 2. Separar fisicamente cada item (marcar `isSeparated = true`) · 3. Conferir quantidades · 4. Colar **Etiqueta de Separação** nos itens · 5. Marcar SeparationOrder como SEPARATED |
| Saída | Itens de revenda separados e etiquetados. SeparationOrder SEPARATED |
| SLA | 4 horas |
| Exceções | Item não encontrado no estoque → notificar Compras |

**Atividade 12: Controlar Qualidade e Finalizar**
| Campo | Valor |
|---|---|
| Nome | Verificar qualidade e finalizar produção |
| Dono | Coordenador de Produção (MANAGER) |
| Entrada | ProductionOrders COMPLETED + SeparationOrder SEPARATED (se existir) |
| Checklist | 1. Inspecionar produtos fabricados conforme critérios de qualidade · 2. Conferir itens separados (marcar `isChecked = true` em cada SeparationOrderItem → SeparationOrder CHECKED) · 3. Se reprovado, definir ação (retrabalho/descarte) · 4. Confirmar entrada no estoque de produto acabado · 5. Imprimir **Ficha OP** para arquivo · 6. Mover para PRODUZIDO |
| Saída | Pedido PRODUZIDO → notifica conferência/entrega |
| SLA | 2 horas |
| Exceções | Item reprovado → retrabalho. Conferência de separação diverge → investigar |

> **Regra crítica:** O pedido **SÓ** pode avançar de EM_PRODUCAO para PRODUZIDO quando:
> 1. Todas as ProductionOrders estão com status COMPLETED
> 2. SeparationOrder (se existir) está com status CHECKED
> 3. Se não houver SeparationOrder (pedido sem itens revenda), a validação 2 passa automaticamente
> O sistema valida todas as condições no guard da transição.

---

#### CONFERÊNCIA E ENTREGA

**Atividade 13: Conferir e Entregar Pedido**
| Campo | Valor |
|---|---|
| Nome | Conferir itens e entregar ao cliente |
| Dono | Operador de Conferência/Entrega (OPERATOR) |
| Entrada | Pedido com status PRODUZIDO + todos os itens e insumos prontos |
| Checklist | 1. Conferir cada produto contra o pedido · 2. Conferir acabamentos e insumos (checklist do pedido) · 3. Verificar embalagem · 4. Confirmar pagamento dos 50% restantes · 5. Registrar entrega · 6. Mover para ENTREGUE |
| Saída | Pedido com status ENTREGUE (final) → 2ª parcela AR registrada como PAID |
| SLA | Conforme prazo de entrega do pedido |
| Exceções | Item faltante na conferência → retornar para produção. Cliente não paga 50% restante → reter entrega |

---

#### FINANCEIRO > Conciliação e Faturamento

**Atividade 14: Conciliar Pagamento**
| Campo | Valor |
|---|---|
| Nome | Conciliar pagamento do pedido |
| Dono | Analista Financeiro (OPERATOR) |
| Entrada | Pedido com status FATURAR + comprovante de pagamento (50%) |
| Checklist | 1. Acessar pedido no sistema · 2. Verificar comprovante de pagamento · 3. Conferir valor pago no extrato bancário (conciliação bancária) · 4. Confirmar que o valor corresponde a ≥50% do total · 5. Registrar conciliação no sistema · 6. Mover para FATURADO |
| Saída | Pedido com status FATURADO → 1ª parcela do AR registrada como PAID → **handoff para Produção** |
| SLA | 8 horas |
| Exceções | Valor não confere → devolver para Comercial. Comprovante inválido → solicitar novo comprovante |

**Handoff: Financeiro → Produção (trigger: FATURADO)**
| Campo | Valor |
|---|---|
| O que é entregue | Pedido com status FATURADO + pagamento 50% confirmado + lista de itens com insumos |
| Quem entrega | Analista Financeiro |
| Quem recebe | Coordenador de Produção |
| Dados obrigatórios | pedidoId, itens (productId + quantity + supplies), prazo de entrega, fórmulas de produção |
| Se incompleto | Pedido não avança |
| Trigger | Status muda para FATURADO |

---

#### FINANCEIRO > Emissão de Nota Fiscal

**Atividade 15: Gerar NF-e**
| Campo | Valor |
|---|---|
| Nome | Gerar nota fiscal eletrônica |
| Dono | Analista Fiscal (OPERATOR) |
| Entrada | Pedido FATURADO ou PRODUZIDO (conforme regra fiscal da operação) |
| Checklist | 1. Verificar dados fiscais do cliente (CNPJ, IE, endereço) · 2. Verificar NCM e tributação de cada item · 3. Gerar XML da NF-e · 4. Transmitir para SEFAZ · 5. Registrar chave de acesso (44 dígitos) |
| Saída | NF-e autorizada com chave de acesso vinculada ao pedido |
| SLA | 4 horas |
| Exceções | SEFAZ rejeita → corrigir dados e retransmitir. Dados fiscais incompletos → devolver para Comercial |

---

#### FINANCEIRO > Contas a Receber

**Atividade 16: Acompanhar Recebimento**
| Campo | Valor |
|---|---|
| Nome | Acompanhar recebimento de parcelas |
| Dono | Analista Financeiro (OPERATOR) |
| Entrada | AccountReceivable criado automaticamente quando pedido move para FATURAR (2 parcelas: 50% paga, 50% pendente) |
| Checklist | 1. Verificar vencimentos do dia · 2. Conferir pagamentos recebidos · 3. Registrar pagamento parcial ou total · 4. Identificar inadimplentes · 5. Cobrar 50% restante na entrega |
| Saída | Parcela(s) com status PAID ou OVERDUE |
| SLA | Diário (rotina) |
| Exceções | Pagamento não identificado → contatar cliente. Inadimplência > 30 dias → notificar Comercial

---

#### FINANCEIRO > Contas a Pagar

**Atividade 17: Executar Pagamento**
| Campo | Valor |
|---|---|
| Nome | Executar pagamento a fornecedor |
| Dono | Analista Financeiro (OPERATOR) |
| Entrada | AccountPayable com vencimento próximo ou no dia |
| Checklist | 1. Verificar saldo disponível · 2. Confirmar dados bancários do fornecedor · 3. Executar transferência/boleto · 4. Registrar pagamento no sistema · 5. Anexar comprovante |
| Saída | Parcela com status PAID + comprovante registrado |
| SLA | No vencimento |
| Exceções | Saldo insuficiente → escalar para gerente financeiro para priorização |

---

#### FINANCEIRO > Controle e Análise Financeira

**Atividade 18: Reconciliar Caixa**
| Campo | Valor |
|---|---|
| Nome | Reconciliar caixa diário |
| Dono | Controller Financeiro (MANAGER) |
| Entrada | CashRegister aberto + movimentações do dia |
| Checklist | 1. Conferir entradas do dia vs. recebíveis baixados · 2. Conferir saídas do dia vs. pagáveis baixados · 3. Identificar divergências · 4. Fechar caixa com saldo correto |
| Saída | Caixa fechado e reconciliado |
| SLA | Final do dia |
| Exceções | Divergência não identificada → registrar como pendência para investigação |

### 3.4 Fluxo Programático (como o motor BPM executa)

1. **`OrdersService.changeStatus(orderId, newStatus, userId)`** — valida guards da transição (tabela 3.2), atualiza status, cria `OrderStatusHistory`
2. **Emite evento** `order.status.changed` via `EventEmitter2` com payload `{ orderId, fromStatus, toStatus, userId }`
3. **`BpmEngineService.handleOrderStatusChange()`** escuta o evento e:
   - Busca todas `Activity` onde `triggerOnStatus` = novo status
   - Para cada: cria `ActivityInstance` (status PENDING, `dueAt` = now + SLA)
   - Cria `TaskInstance` para cada `Task` do checklist da atividade
   - Busca todos `Handoff` onde `triggerOnStatus` = novo status
   - Para cada: valida dados obrigatórios (`validationRules`). Se válido e `autoAdvance = true`, cria `ProcessInstance` no processo destino. Senão, cria `HandoffInstance` com status PENDING para aceite manual.
4. **Listeners de side-effects** (desacoplados do BPM engine):
   - `OrderFaturarListener` → cria `AccountReceivable` com 2 parcelas (50% PAID + 50% PENDING)
   - `OrderFaturadoListener` → **split automático**: filtra itens por `classificationSnapshot`, cria `ProductionOrder` (FABRICACAO_PROPRIA) + cria `SeparationOrder` (REVENDA_ESTOQUE, se houver)
   - `ProductionCompletedListener` → baixa estoque de insumos, entrada de produto acabado
   - `OrderEntregueListener` → registra 2ª parcela AR como PAID, encerra ProcessInstances
5. **Guard especial para EM_PRODUCAO → PRODUZIDO:**
   ```
   const allPOsCompleted = productionOrders.every(po => po.status === COMPLETED)
   const allSuppliesReady = orderItems.flatMap(i => i.supplies).every(s => s.status === READY)
   const separationOk = !separationOrder || separationOrder.status === CHECKED
   if (!allPOsCompleted || !allSuppliesReady || !separationOk) throw BadRequestException
   ```
   Todas as condições devem ser verdadeiras:
   - ProductionOrders concluídas
   - Todos os supplies (checklist de insumos/acabamentos) marcados como READY
   - SeparationOrder conferida (se existir)
   Se o pedido não tem supplies, a validação passa. Se não tem SeparationOrder, idem.

### 3.5 Como a UI se Adapta por Etapa do Processo

| Contexto | Fonte | O que muda na tela |
|---|---|---|
| Departamento/Processo atual | Rota (`/comercial/pedidos/:id`) | Sidebar destaca seção, ProcessContextBar mostra departamento + processo |
| Etapa atual do pedido | `order.status` da API | Stepper horizontal destaca etapa (EM_ORCAMENTO → ENTREGUE), botões de ação mudam |
| Atividade em andamento | `ActivityInstance` com status IN_PROGRESS | Sidebar direita mostra checklist da atividade, timer de SLA |
| Permissão do usuário | `user.role` + `activity.ownerRole` | Botões de ação habilitados/desabilitados conforme role |
| Handoffs pendentes | `HandoffInstance` com status PENDING | Banner: "Pedido aguardando conciliação do Financeiro" |
| Insumos/Acabamentos | `OrderItemSupply[]` com status PENDING/READY | **Checklist de insumos dentro do dossiê do pedido**: cada item mostra seus acabamentos/insumos com toggle (✓ pronto / ○ pendente). Pedido só avança quando todos estão ✓ |
| Pagamento | `order.paidAmountCents` vs `order.totalCents` | Indicador visual: "50% pago" / "Aguardando conciliação" / "100% pago" |

**Princípio:** Nenhuma tela mostra todas as ações possíveis. O sistema filtra e mostra **apenas** o que o usuário pode e precisa fazer naquele momento, baseado em: status do pedido + role do usuário + atividade em andamento.

---

## 4. Geração de PDF — Proposta de Venda

Cada pedido pode gerar um PDF de "PROPOSTA DE VENDA" acessível via dropdown de ações na lista de pedidos.

### 4.1 Estrutura do PDF

```
┌─────────────────────────────────────────────────────────┐
│ [LOGO]  PROPOSTA DE VENDA    Data: DD/MM/AAAA           │
│                               Página: 1/N               │
│                               Pedido nº: 00123          │
├─────────────────────────────────────────────────────────┤
│ DADOS DO CLIENTE                                        │
│ Nome: ___________  CNPJ/CPF: ___________                │
│ IE: ___________    Tel: ___________                     │
│ Celular: _______   Email: ___________                   │
│ Endereço: ______________________________________        │
├────────────────────────┬────────────────────────────────┤
│ INFO COMERCIAL         │ INFO DE ENTREGA               │
│ Prazo entrega: 15 dias │ Endereço: ________________    │
│ Pagamento: A VISTA     │ Bairro: ________ Cidade: ____ │
│ Validade: 7 dias       │ UF: __ CEP: _______           │
│ Produzir: [x]          │ Ref: ___________              │
│ Revenda: [ ]           │ Obs: ___________              │
│ Subst. Trib.: [ ]      │                               │
├────────────────────────┴────────────────────────────────┤
│ PRODUTOS                                                │
│ Produto  | S/Carga | Beta | FCK | Qtd | Un | V.Un | VT │
│ ---------|---------|------|-----|-----|----|------|--- │
│ TELHA 25 |  500    | 1.2  | 30  |  2  | M2 | 1500 |3000│
│ PARAFUSO |  -      | -    | -   | 100 | UN |  0.5 |  50│
├─────────────────────────────────────────────────────────┤
│ RESUMO FINANCEIRO                                       │
│ Subtotal: R$ 5.000  Frete: R$ 200  Desconto: R$ 0      │
│ Subst. Trib./IPI: R$ 0   TOTAL A PAGAR: R$ 5.200       │
├─────────────────────────────────────────────────────────┤
│ ________________          ________________              │
│ Vendedor                  Cliente                       │
└─────────────────────────────────────────────────────────┘
```

### 4.2 Implementação

**Backend:**
- Endpoint: `GET /api/v1/orders/:id/pdf` → retorna PDF binário (Content-Type: application/pdf)
- Service: `OrderPdfService` que monta o documento usando dados de Order + Client + Company + OrderItems (com campos técnicos)
- Biblioteca: **PDFKit** (Node.js, leve, server-side, controle total do layout)
- Template com logo da empresa carregado de `Company.logoUrl`

### 4.2b Etiqueta de Produção (ETIQUETA 1 — itens FABRICACAO_PROPRIA)

Colada no produto fabricado ao sair da linha de produção.

```
┌─────────────────────────────────────────────────┐
│ BRASILIA                                        │
│ CNPJ: XX.XXX.XXX/XXXX-XX  IE: XXXXXXXXX        │
│ Endereço: Quadra X, QD X, LT X                 │
│ Cidade, Estado                                  │
├─────────────────────────────────────────────────┤
│ Ordem de Produção Codigo: 00456                 │
│ Data Prevista: 15/04/2026                       │
├──────┬──────────────────────┬──────┬────┬───┬───┤
│ Cod  │ Descrição            │ Qtde │ Un │Pçs│Tam│
├──────┼──────────────────────┼──────┼────┼───┼───┤
│TT-001│ TELHA TR25 BANDEJA   │35,00 │ M2 │10 │3.5│
│      │ FACE INF BRANCA EPS  │      │    │   │   │
│      │ 3CM 0,43MM - ()      │      │    │   │   │
├──────┴──────────────────────┴──────┴────┴───┴───┤
│ Qtd. Total de Itens: 35,00                      │
├─────────────────────────────────────────────────┤
│ CONSUMIDOR - CPF XXX.XXX.XXX-XX                 │
│ Nome Completo do Cliente                        │
│ Endereço Entrega:                               │
│ Logradouro, Bairro, Cidade - UF - CEP          │
├─────────────────────────────────────────────────┤
│ Pedido n.: 00123 | Data: 01/04/2026   (pág. 2) │
└─────────────────────────────────────────────────┘
```

> Código do produto usa o formato interno (TT-001, PF-001, etc.).

### 4.2c Etiqueta de Separação (ETIQUETA 2 — itens REVENDA/INSUMO)

Estrutura idêntica à Etiqueta 1, mas com itens de revenda/insumo (parafusos, cola, acabamentos). Códigos usam formato interno (PF-001, AC-001, IN-001). Só é gerada se o pedido tiver itens REVENDA/INSUMO.

### 4.2d Ficha da Ordem de Produção (DOCUMENTO 3 — PDF completo)

Documento de produção completo, não é etiqueta.

```
┌─────────────────────────────────────────────────────────┐
│ ORDEM DE PRODUÇÃO                                       │
├──────┬────────┬──────────┬───────────────┬──────────────┤
│NUM OP│ DATA   │TIPO(S/N) │DATA PREV/FIN  │ SITUAÇÃO     │
│ 456  │01/04/26│ SIM      │15/04/26       │ EM ANDAMENTO │
├──────┴────────┴──────────┴───────────────┴──────────────┤
│ DADOS OPERACIONAIS                                      │
│ Fluxo: Produção | Máquina: Padrão | Lote: -- | Ctrl: 123│
├─────────────────────────────────────────────────────────┤
│ PEDIDO VINCULADO                                        │
│ Cod: 123 | Emissão: 01/04 | Prev Entrega: 15/04        │
│ Liberado: Sim | Faturado: Sim | OC: --                  │
├─────────────────────────────────────────────────────────┤
│ DADOS DO CLIENTE                                        │
│ Nome | CPF | Tel | Cel | Email                          │
│ ENDEREÇO DE ENTREGA: Logradouro completo com CEP        │
│ OBSERVAÇÕES: (campo livre)                              │
├─────────────────────────────────────────────────────────┤
│ PRODUTOS / SERVIÇOS                                     │
│ Código │ Produto         │ UNID │ PEÇAS │ TAMANHO │QUANT│
│ TT-001 │ TELHA TR25 BAND │  M2  │  10   │   3.5   │ 35 │
├─────────────────────────────────────────────────────────┤
│ MATÉRIA PRIMA                                           │
│ Cod │ Produto │ UN │ Qtde │ M3 │ Peso │Custo│CustoTot│OP│
│ 100 │ EPS 3CM │ KG │ 50   │0.5 │ 25   │ 10  │  500   │ S│
├─────────────────────────────────────────────────────────┤
│ PRODUTO ACABADO                                         │
│ Cod │ Produto         │ UN │ Qtde │ OP                  │
│ 039 │ TELHA TR25 BAND │ M2 │ 35   │ E                   │
├─────────────────────────────────────────────────────────┤
│ PERDA: (vazia ou com registros)                         │
├─────────────────────────────────────────────────────────┤
│ CUSTOS                                                  │
│ Custo Total: R$ 500 | Custo Unit: R$ 14,28             │
│ Custo Perda: R$ 0   | Custo Unit c/ Perda: R$ 14,28    │
└─────────────────────────────────────────────────────────┘
```

### 4.3 Implementação

**Backend — Endpoints de geração de documentos:**
| Método | Rota | Documento |
|---|---|---|
| GET | `/orders/:id/pdf/proposal` | PDF "Proposta de Venda" |
| GET | `/orders/:id/pdf/production-label` | Etiqueta 1 (produção — itens FABRICACAO_PROPRIA) |
| GET | `/orders/:id/pdf/separation-label` | Etiqueta 2 (separação — itens REVENDA_ESTOQUE, retorna 404 se não houver) |
| GET | `/production-orders/:id/pdf` | Ficha completa da OP (matéria-prima, produto acabado, custos, perda) |

**Serviços:**
- `ProposalPdfService` — gera Proposta de Venda (PDFKit)
- `LabelPdfService` — gera Etiquetas 1 e 2 (PDFKit, formato menor)
- `ProductionOrderPdfService` — gera Ficha OP completa (PDFKit)

**Biblioteca:** PDFKit (Node.js, server-side, controle total do layout)

**Frontend — Dropdown "Ações" na lista de pedidos:**
- "Imprimir Proposta de Venda" → `GET /orders/:id/pdf/proposal`
- "Imprimir Etiqueta Produção" → `GET /orders/:id/pdf/production-label`
- "Imprimir Etiqueta Separação" → `GET /orders/:id/pdf/separation-label` (oculto se pedido não tem itens REVENDA_ESTOQUE)
- "Imprimir Ficha OP" → `GET /production-orders/:id/pdf` (disponível após FATURADO)

**Dados consumidos do banco:**
- `Company` → nome, logo, CNPJ, endereço (cabeçalho)
- `Client` → nome, CPF/CNPJ, IE, telefone, celular, email, endereço (dados do cliente)
- `Order` → número, data emissão, prazo entrega, validade proposta, forma pagamento, flags (produzir, revenda, subst. trib.), notas, endereço entrega (info comercial + entrega)
- `OrderItem` + `Product` → nome produto, loadCapacity, beta, fckMpa, quantidade, unidade, preço unitário, total (tabela de produtos)
- Totais calculados → subtotal, frete, desconto, subst. tributária/IPI, total geral (rodapé)

---

## 5. Integração Pro Finanças

### 5.1 Arquitetura

```
Pro Finanças API (localhost:3000/api/v1/customer)
    ↓ GET endpoints
ProFinancasClientService (Axios + auto-auth JWT + retry + circuit breaker)
    ↓ raw data
EntityMapper (transforma PF response → Mundial ERP DTO)
    ↓ DTOs
Repository.upsertByProFinancasId() (upsert usando proFinancasId como chave)
    ↓ persisted
SyncLog + SyncMapping (rastreia status, contagens, checksums)
```

### 5.2 Escopo da Migração

> **Regra:** Migram-se apenas **Clientes** e seus **Pedidos** (com itens). Produtos, fornecedores, fórmulas, tabelas de preço e demais entidades **NÃO são migrados** — serão cadastrados do zero no padrão do Mundial ERP. Dados de referência (companies, payment methods, carriers, order types/flows/models) são migrados apenas como suporte para os pedidos.

| Entidade | Migra? | Motivo |
|---|---|---|
| **Clients** | ✅ Sim | Base de clientes é o ativo mais importante. Migrados no padrão novo (campos separados, CPF/CNPJ limpo) |
| **Orders + OrderItems** | ✅ Sim | Histórico de pedidos do cliente. **Número do pedido mantém o formato original do PF** (ver 5.5) |
| **Companies** | ✅ Sim | Dados da empresa para vincular pedidos migrados |
| **Payment Methods** | ✅ Sim | Referenciados pelos pedidos migrados |
| **Carriers** | ✅ Sim | Referenciados pelos pedidos migrados |
| **Order Types/Flows/Models** | ✅ Sim | Referenciados pelos pedidos migrados |
| **Client Classifications** | ✅ Sim | Referenciados pelos clientes |
| **Delivery Routes** | ✅ Sim | Referenciados pelos clientes |
| **States/Cities** | ✅ Sim | Referenciados pelos clientes |
| Products | ❌ Não | Cadastrados do zero com wizard 4 etapas, código `[PREFIXO]-[NNNN]`, EAN-13 interno |
| Suppliers | ❌ Não | Cadastrados do zero |
| Price Tables | ❌ Não | Criadas do zero com preços em centavos |
| Formulas | ❌ Não | Criadas inline no cadastro de produto |
| Invoices (NF-e) | ❌ Não | Histórico fiscal fica no PF |
| Production Orders | ❌ Não | Geradas automaticamente pelo novo sistema |
| Stock / Requisitions | ❌ Não | Estoque começa zerado no novo sistema |

### 5.3 Ordem de Sync (por dependência)

1. Companies
2. States/Cities
3. Client Classifications, Delivery Routes
4. Payment Methods, Carriers
5. Order Types, Order Flows, Order Models
6. Clients
7. Orders (com items)

### 5.4 Detecção de Mudanças

Cada registro sincronizado gera um `checksum` (MD5 dos campos-chave). No próximo sync, se o checksum mudou, o registro é atualizado. Se não, é ignorado. Isso permite sync incremental eficiente.

### 5.5 Regra do Número de Pedido na Migração

> **Exceção única:** Pedidos migrados do Pro Finanças **mantêm o número original do PF** como `orderNumber`. Essa é a ÚNICA exceção ao padrão de numeração do Mundial ERP. Todo o restante (formato de dados, campos, status, valores) segue o padrão do novo sistema.

| Aspecto | Regra |
|---|---|
| **Pedidos migrados** | `orderNumber` = número original do PF (ex: `"207"`, `"7058"`). Campo `proFinancasId` armazena o ID do PF |
| **Pedidos novos** | `orderNumber` = sequencial do Mundial ERP via `OrderSequence` atômico (`0001`, `0002`, ...) |
| **OrderSequence.lastNumber** | Após migração, inicializado com valor **maior que o maior número de pedido migrado** para evitar colisão. Ex: se o maior pedido PF é `7058`, `OrderSequence.lastNumber` inicia em `7058`. Próximo pedido novo será `7059` |
| **Unicidade** | `orderNumber` é `@unique` no schema. Não há risco de colisão porque o sequencial começa acima do maior migrado |

**Fluxo no EntityMapper de pedidos:**
```
1. Buscar pedido PF: GET /pedidos/:id → { codigo: 207, ... }
2. orderNumber = String(pedido.codigo) → "207" (mantém original)
3. Demais campos: converter para padrão Mundial ERP
4. Upsert by proFinancasId
5. Após migrar todos: OrderSequence.lastNumber = MAX(orderNumber migrados)
```

### 5.6 Regras de Conversão de Dados (PF → Mundial ERP)

Todos os dados migrados — exceto o número do pedido — seguem o padrão do novo sistema.

| Campo PF | Conversão | Campo Mundial ERP |
|---|---|---|
| `cnpj_cpf` (`"30.099.668/0001-07"`) | Limpar formatação: `replace(/[.\-\/]/g, '')` | `cpfCnpj` (`"30099668000107"`) |
| `tipo` (`"J"` ou `"F"`) | Direto | `personType` (enum `F` / `J`) |
| `razao_social` | Direto | `name` |
| `nome_fantasia` | Direto | `tradeName` |
| `end_formatado` (`"AV X, 289, 75023150 - Anápolis - GO"`) | Parsear ou armazenar em `address` como string única | `address` (melhor parsear se possível, senão campo único) |
| `cod_postal` | Limpar formatação | `zipCode` |
| `telefone` (`"6291096928"`) | Direto (já limpo) | `phone` |
| `valor_venda` / `valor_total` (`99`, `3400`) | `Math.round(valor * 100)` | `*Cents` (`9900`, `340000`) |
| `dt_emissao_tt` (`1742256000000`) | `new Date(timestamp)` | `issueDate` (DateTime) |
| `dt_entrega_tt` (`1742256000000`) | `new Date(timestamp)` | `deliveryDeadline` (DateTime) |
| `finalizado`/`pago`/`entregue`/`liberado` (booleans) | Mapear combinação → OrderStatus | `status` (enum) |
| `pedido_fluxo_id` (1=Orçamento, 4=Venda) | Mapear → OrderStatus/OrderFlow | `orderFlowId` + `status` |
| `qcom` (`"5.0"`) | `parseFloat()` | `quantity` (Float) |
| `vuncom` (`28`) | `Math.round(valor * 100)` | `unitPriceCents` (Int) |
| `vundesc` (`0.5`) | `Math.round(valor * 100)` | `discountCents` (Int) |

**Mapeamento de Status PF → OrderStatus:**

| Flags PF | OrderStatus Mundial ERP |
|---|---|
| `pedido_fluxo_id = 1` (Em orçamento) | `EM_ORCAMENTO` |
| `pedido_fluxo_id = 3` (Recusado) | `CANCELADO` |
| `liberado = true, pago = false` | `FATURAR` |
| `liberado = true, pago = true, entregue = false` | `FATURADO` |
| `finalizado = true, entregue = true` | `ENTREGUE` |
| Demais combinações | `EM_ORCAMENTO` (default seguro) |

> **Nota:** Pedidos migrados com status intermediário (PRODUZIR, EM_PRODUCAO, PRODUZIDO) não existem no PF — esses estados são exclusivos do novo sistema e só se aplicam a pedidos criados no Mundial ERP.

### 5.7 OrderItems Migrados sem Produto Vinculado

Como produtos **não são migrados**, os itens de pedidos migrados não terão `productId` vinculado a um produto do novo sistema. Regra:

| Campo | Valor para itens migrados |
|---|---|
| `productId` | `null` (nullable no schema para itens migrados) |
| `productName` | Novo campo (String) — armazena `xprod` do PF (ex: `"CAIXA SORVETE 5 LT"`) para exibição |
| `quantity` | Convertido de `qcom` |
| `unitPriceCents` | Convertido de `vuncom` × 100 |
| `discountCents` | Convertido de `vundesc` × 100 |

> **No schema Prisma:**
> ```prisma
> model OrderItem {
>   productId    String?  // nullable — null para itens migrados sem produto no novo sistema
>   productName  String?  @map("product_name") // nome do produto original do PF (xprod)
>   // ... demais campos
> }
> ```
> Se o `productId` é null, a UI exibe `productName` no lugar. Quando o produto for cadastrado no novo sistema, o vínculo pode ser feito manualmente (opcional).

### 5.8 Migração de Documentos (PDF, Etiquetas, NF-e)

> **Princípio:** A migração é modular e desacoplada. Na primeira fase, migram-se apenas dados estruturados (clientes + pedidos). Documentos (PDF, etiquetas, NF-e) serão migrados posteriormente quando os endpoints do Pro Finanças estiverem disponíveis, **sem impacto no que já foi migrado**.

| Documento | Fase 1 (agora) | Fase futura (quando PF criar endpoints) |
|---|---|---|
| **PDF Proposta de Venda** | ❌ Não migra — PF não tem endpoint | ✅ Migrar PDF original e armazenar como arquivo vinculado ao pedido |
| **Etiqueta de Produção** | ❌ Não migra — PF não tem endpoint | ✅ Migrar quando endpoint disponível |
| **NF-e** | ❌ Não migra — só alguns pedidos têm | ✅ Migrar XML + PDF + chave de acesso quando endpoint disponível |

**Para pedidos migrados:** O sistema **NÃO gera** PDF, etiqueta ou NF-e novos. Esses pedidos são histórico — seus documentos virão do PF quando os endpoints existirem.

**Para pedidos novos (criados no Mundial ERP):** O sistema gera tudo no padrão próprio — PDF Proposta de Venda, Etiqueta de Produção, Etiqueta de Separação, Ficha OP, NF-e — conforme Seção 4.

**Distinção na UI:**
- Pedido migrado (`proFinancasId != null`): botões "Imprimir Proposta", "Imprimir Etiqueta", "Emitir NF-e" ficam **desabilitados ou ocultos**. Se documentos do PF já foram migrados (fase futura), exibe link para o arquivo importado.
- Pedido novo (`proFinancasId == null`): todos os botões de geração de documentos disponíveis conforme status.

**Arquitetura desacoplada para migração futura de documentos:**

```prisma
model OrderDocument {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now()) @map("created_at")

  orderId   String   @map("order_id")
  order     Order    @relation(fields: [orderId], references: [id])

  type      OrderDocumentType  // PROPOSAL_PDF, PRODUCTION_LABEL, SEPARATION_LABEL, PRODUCTION_SHEET, NFE_XML, NFE_PDF
  source    DocumentSource     // GENERATED (novo sistema) | MIGRATED (importado do PF)
  url       String             // URL do arquivo armazenado
  metadata  Json?              // dados extras (ex: chave acesso NF-e, número NF-e)

  @@map("order_documents")
  @@index([orderId, type], name: "idx_order_documents_order_type")
}

enum OrderDocumentType { PROPOSAL_PDF  PRODUCTION_LABEL  SEPARATION_LABEL  PRODUCTION_SHEET  NFE_XML  NFE_PDF }
enum DocumentSource { GENERATED  MIGRATED }
```

> **Quando o PF criar os endpoints de documentos:** basta adicionar um novo mapper no `SyncService` que busca os documentos, salva o arquivo (S3 ou disco), e cria o registro `OrderDocument` com `source = MIGRATED`. Zero impacto nos pedidos/clientes já migrados.

### 5.9 Regra de Conflito

Durante a fase de migração: **Pro Finanças é source of truth para clientes e pedidos migrados**. Se o registro existe em ambos e PF é mais recente (checksum diferente), dados do PF prevalecem. Após migração completa e desligamento do PF, essa regra se inverte — Mundial ERP vira source of truth.

---

## 5. Rotas Frontend (Next.js App Router)

> **Princípio:** Nenhuma rota existe como "menu isolado". Toda rota pertence a um departamento e processo. A navegação lateral (sidebar) é organizada por departamento, não por tipo de entidade.

```
src/app/
├── (auth)/
│   └── login/page.tsx
│
└── (dashboard)/                              ← layout com sidebar + header + ProcessContextBar
    │
    ├── inicio/page.tsx                       ← TELA INICIAL (saudação + atividades do dia)
    │
    ├── paineis/                              ← PAINÉIS (dashboards configuráveis)
    │   ├── page.tsx                          ← lista de dashboards do usuário
    │   ├── novo/page.tsx                     ← criar novo dashboard
    │   └── [id]/
    │       ├── page.tsx                      ← visualizar dashboard com cards
    │       └── editar/page.tsx               ← editar layout/cards do dashboard
    │
    ├── comercial/                            ← DEPARTAMENTO COMERCIAL
    │   ├── clientes/                         ← Processo: Cadastro e Manutenção de Clientes
    │   │   ├── page.tsx                      ← listar clientes (tabela paginada + busca)
    │   │   ├── novo/page.tsx                 ← cadastrar cliente (formulário com validação)
    │   │   └── [id]/
    │   │       ├── page.tsx                  ← detalhe: dados + histórico de pedidos + financeiro
    │   │       └── editar/page.tsx
    │   └── pedidos/                          ← Processo: Pedidos (inclui orçamentos — tudo é pedido)
    │       ├── page.tsx                      ← listar TODOS os pedidos com filtro por status (EM_ORCAMENTO = orçamentos, demais = pedidos em andamento)
    │       ├── novo/page.tsx                 ← criar pedido (inicia como EM_ORCAMENTO, registra cliente)
    │       └── [id]/page.tsx                 ← DOSSIÊ DO PEDIDO (tela principal). Coluna "Ações" com dropdown: imprimir proposta (PDF), avançar status, etc.
    │
    ├── compras/                              ← DEPARTAMENTO COMPRAS (novo)
    │   ├── produtos/                         ← Processo: Gestão de Produtos
    │   │   ├── page.tsx                      ← catálogo (tabela + busca + filtro classificação/dept/status)
    │   │   ├── novo/page.tsx                 ← WIZARD 4 etapas (Identificação → Especificação → Fiscal → Precificação+Fórmula)
    │   │   └── [id]/
    │   │       ├── page.tsx                  ← detalhe: tabs (Dados, Especificação, Fiscal, Preços, Fórmula como aba inline, Imagens, Estoque)
    │   │       └── editar/page.tsx           ← wizard com etapas pré-preenchidas
    │   ├── fornecedores/                     ← Processo: Gestão de Fornecedores
    │   │   ├── page.tsx                      ← listar fornecedores
    │   │   ├── novo/page.tsx
    │   │   └── [id]/page.tsx                 ← detalhe + histórico de compras
    │   ├── cotacoes/                         ← Processo: Cotação e Compra
    │   │   ├── page.tsx                      ← listar cotações com status
    │   │   ├── nova/page.tsx                 ← criar solicitação de cotação
    │   │   └── [id]/page.tsx                 ← dossiê da cotação (comparar propostas)
    │   ├── tabelas-preco/                    ← Atividade: Manter Tabela de Preços
    │   │   ├── page.tsx                      ← listar tabelas
    │   │   └── [id]/page.tsx                 ← editar preços por produto
    │   └── requisicoes/                      ← Requisições Internas de Estoque
    │       ├── page.tsx                      ← listar requisições (filtro type/status)
    │       ├── nova/page.tsx                 ← criar requisição (VENDA/INTERNO)
    │       ├── [id]/page.tsx                 ← detalhe + imprimir PDF
    │       └── processar/page.tsx            ← tela de processamento via scanner
    │
    ├── financeiro/                           ← DEPARTAMENTO FINANCEIRO
    │   ├── contas-a-receber/                 ← Processo: Contas a Receber
    │   │   ├── page.tsx                      ← listar (filtro vencimento, status, cliente)
    │   │   └── [id]/page.tsx                 ← detalhe + registrar pagamento
    │   ├── contas-a-pagar/                   ← Processo: Contas a Pagar
    │   │   ├── page.tsx
    │   │   └── [id]/page.tsx
    │   ├── notas-fiscais/                    ← Processo: Emissão de NF-e
    │   │   ├── page.tsx
    │   │   └── [id]/page.tsx                 ← detalhe NF-e + PDF + XML
    │   ├── caixa/page.tsx                    ← Atividade: Reconciliar Caixa
    │   └── analise/page.tsx                  ← Processo: Controle e Análise Financeira
    │
    ├── producao/                             ← DEPARTAMENTO PRODUÇÃO
    │   ├── ordens/                           ← Processo: Produção do Pedido
    │   │   ├── page.tsx                      ← fila de produção (kanban por status) + fila de separação
    │   │   └── [id]/page.tsx                 ← dossiê OP: itens, matéria-prima, produto acabado, perdas, custos
    │   │                                     ← Fórmulas NÃO têm rota separada — são aba dentro de /compras/produtos/[id]
    │
    ├── relatorios/                           ← Relatórios cross-departamento
    │   ├── page.tsx                          ← hub de relatórios
    │   ├── dre/page.tsx
    │   ├── vendas/page.tsx
    │   └── fluxo-caixa/page.tsx
    │
    ├── integracao/page.tsx                   ← status sync PF, logs, trigger manual
    │
    └── configuracoes/
        ├── usuarios/page.tsx
        ├── departamentos/page.tsx            ← config BPM: departamentos, setores
        ├── processos/page.tsx                ← config BPM: processos, atividades, handoffs
        └── empresa/page.tsx
```

### Organização por Feature (padrão Bravy)

Cada feature segue a estrutura `src/features/{nome}/` com subpastas:

```
src/features/
├── auth/          → components/, hooks/, services/, schemas/, types/
├── home/          → components/ (greeting, daily-activities, activity-card)
├── dashboards/    → components/ (dashboard-grid, card-renderer, card-editor, filter-bar)
│                    hooks/ (use-dashboards, use-dashboard-cards)
│                    services/ (dashboard.service)
│                    schemas/ (dashboard.schema, card.schema)
│                    types/ (dashboard.types, card.types)
├── bpm/           → components/ (process-context-bar, activity-card, task-checklist,
│                                  handoff-dialog, order-timeline, status-stepper)
├── clients/       → components/, hooks/, services/, schemas/, types/
├── products/      → components/, hooks/, services/, schemas/, types/
├── suppliers/     → components/, hooks/, services/, schemas/, types/
├── quotations/    → components/, hooks/, services/, schemas/, types/
├── orders/        → components/ (order-form, order-dossier, order-items-table,
│                                  order-status-badge, order-pdf-preview)
│                    hooks/, services/, schemas/, types/
├── financial/     → components/, hooks/, services/, schemas/, types/
├── production/    → components/, hooks/, services/, schemas/, types/
├── reports/       → components/, hooks/, services/, types/
├── sync/          → components/, hooks/, services/, types/
└── settings/      → components/, hooks/, services/, schemas/, types/
```

---

### Tela: Início (`/inicio`)

A primeira tela que o usuário vê após login. Não é um dashboard de KPIs — é uma **tela operacional personalizada**.

| Elemento | Descrição |
|---|---|
| Saudação | "Bom dia, João" / "Boa tarde, João" / "Boa noite, João" (baseado na hora do sistema + `user.name`) |
| Atividades do dia | Lista de `ActivityInstance` onde `assignedUserId = currentUser` AND (`dueAt` é hoje OR status = IN_PROGRESS). Cada card mostra: nome da atividade, processo, pedido vinculado, SLA restante, progresso do checklist |
| Handoffs pendentes | `HandoffInstance` com status PENDING onde o departamento destino é o do usuário |
| Ação rápida | Clicar em uma atividade abre o dossiê do pedido diretamente na aba da atividade |

---

### Tela: Painéis (`/paineis`)

Sistema de dashboards configuráveis baseado na arquitetura do `dashboard.md`.

| Elemento | Descrição |
|---|---|
| Lista de Dashboards | Cada usuário vê seus painéis + painéis públicos. Card com nome, descrição, owner, última atualização |
| Criar Dashboard | Nome, descrição, visibilidade (privado/público) |
| Visualizar Dashboard | Grid de Cards renderizados conforme `layoutX/Y/W/H`. Auto-refresh opcional. Filtros globais no topo |
| Editar Dashboard | Drag-and-drop de Cards no grid. Adicionar/remover/configurar Cards. Cada Card: tipo de gráfico, data source (selecionar entidade + filtros), eixos, cores |
| Tipos de Card | `KPI_NUMBER` (número grande com trend), `BAR_CHART`, `LINE_CHART`, `PIE_CHART`, `DONUT`, `AREA_CHART`, `STACKED_BAR`, `TABLE` |
| Data Source | Cada Card aponta para uma entidade do sistema (Orders, AR, AP, Products, ProductionOrders) + filtros (departamento, processo, status, período). **Dashboard não armazena dados — faz query nos dados existentes** |

---

### Tela: Dossiê do Pedido (`/comercial/pedidos/[id]`)

A tela mais importante do sistema — o "dossiê vivo" do pedido que atravessa todos os departamentos.

| Elemento | Descrição |
|---|---|
| **Stepper horizontal** | Etapas: EM_ORCAMENTO → FATURAR → FATURADO → PRODUZIR → EM_PRODUCAO → PRODUZIDO → ENTREGUE. Atual destacada. Clicável para ver histórico |
| **ProcessContextBar** | Topo: departamento atual + processo + atividade em andamento + timer SLA |
| **Indicador de pagamento** | Badge: "50% pago (R$ X)" / "Aguardando conciliação" / "100% pago". Comprovante clicável |
| **Tab: Itens** | Tabela de itens. Cada item é clicável/expansível e mostra: (a) info do produto (S/Carga, Beta, FCK, peças, tamanho, preço) + (b) **checklist de insumos/acabamentos** (se houver): [○ Acabamento frontal, ○ Acabamento lateral, ○ Parafusos, ○ Cola] com toggle PENDING/READY + (c) info da OP vinculada (matéria-prima consumida, produto acabado, perdas, custos) — visível após FATURADO. Editável em EM_ORCAMENTO |
| **Tab: Financeiro** | AR vinculados: 2 parcelas (50% entrada + 50% entrega), vencimentos, status. Comprovante anexado |
| **Tab: Produção** | Visão consolidada: ProductionOrder (itens fabricados, matéria-prima, produto acabado, perdas, custos) + SeparationOrder se houver (itens separados, conferidos). Visível após FATURADO |
| **Tab: NF-e** | Invoices vinculadas: número, chave de acesso, PDF, status |
| **Tab: Timeline** | Histórico completo: mudanças de status, atividades completadas, handoffs, quem fez o quê e quando |
| **Botões contextuais** | Conforme status + role: "Enviar para Faturamento" (EM_ORCAMENTO→FATURAR, requer 50% pago + comprovante), "Conciliar Pagamento" (FATURAR→FATURADO, role Financeiro), "Iniciar Produção" (PRODUZIR→EM_PRODUCAO), "Finalizar Produção" (EM_PRODUCAO→PRODUZIDO, requer POs COMPLETED + SeparationOrder CHECKED se existir), "Entregar" (PRODUZIDO→ENTREGUE, requer 50% restante) |
| **Dropdown Ações** | "Imprimir Proposta de Venda", "Imprimir Etiqueta Produção", "Imprimir Etiqueta Separação" (oculto se sem itens revenda), "Imprimir Ficha OP" (após FATURADO) |

---

## Glossário Scrum

| Termo | Definição neste projeto |
|---|---|
| **Sprint** | Cada Fase (1-8) é um Sprint. Fases grandes (4, 7) são divididas em sub-sprints (4A/4B/4C, 7A/7B/7C/7D) |
| **Sprint Goal** | Objetivo em 1 frase — o que o sprint entrega de valor |
| **User Story** | "Como [role], posso [ação], para que [valor]" — unidade de trabalho |
| **Acceptance Criteria (AC)** | Critérios testáveis que definem quando uma story está pronta |
| **Definition of Done (DoD)** | Checklist para considerar o sprint completo e avançar para o próximo |
| **MVP** | Minimum Viable Product — sistema utilizável com valor de negócio |
| **Product Backlog** | Seções 1-5 deste PLANO.md — toda a especificação detalhada |

### Definição de MVP

O MVP é atingido ao final da **Fase 7B** (frontend Comercial: Pedidos). Nesse ponto:
- Um vendedor pode criar pedido, avançar por todos os status até ENTREGUE
- BPM automático cria atividades, handoffs e checklists
- Financeiro tem AR com 2 parcelas (50%/50%)
- Produção faz split automático (OP + OS)
- PDFs (proposta, etiquetas, ficha OP) podem ser impressos
- Dossiê do pedido funciona no browser com stepper, tabs e ações contextuais

**Estimativa até MVP:** ~20 semanas (~5 meses)
**Estimativa total (até Fase 8):** ~33 semanas (~8 meses)

---

## 6. Ordem de Construção (Fase a Fase)

> **Regra Bravy:** Construa UMA camada por vez. Backend completo antes de frontend. Depois de cada fase, testar antes de avançar.

### Fase 1 — Infraestrutura Backend

**Sprint Goal:** Ambiente de desenvolvimento funcional com API rodando, schema completo migrado e todos os guards globais configurados.

**User Stories:**
- **F1-1:** Como desenvolvedor, posso rodar `docker-compose up` e ter PostgreSQL 16 + Redis 7, para que eu tenha infraestrutura local funcional.
  - AC: Portas 5432/6379 acessíveis. Dados persistem entre restarts via volumes. Healthcheck no container Postgres.
- **F1-2:** Como desenvolvedor, posso rodar `npm run start:dev` e a API responde em :3001, para que eu tenha o backend operacional.
  - AC: `GET /health` → 200. `GET /health/ready` → verifica DB + Redis. Swagger em `/docs`. Helmet, CORS, ValidationPipe, ResponseInterceptor, LoggingInterceptor, HttpExceptionFilter, Throttler configurados.
- **F1-3:** Como desenvolvedor, o schema Prisma completo (Seções 1.1-1.10) está migrado com todos os índices, para que o modelo de dados esteja pronto.
  - AC: `prisma migrate dev --name init` sucesso. Prisma Studio mostra todas as tabelas. Todos os índices nomeados da seção "Índices Obrigatórios" criados.
- **F1-4:** Como desenvolvedor, PaginationDto, ConfigModule, BullMQ e RequestId estão disponíveis, para que eu possa construir módulos de negócio.
  - AC: PaginationDto (skip/take, max 100). ConfigModule valida env vars (incluindo `ELASTICSEARCH_URL`). BullMQ com filas `sync`, `reports` e `search-reindex`. RequestId UUID por request no header `X-Request-Id`.
- **F1-5:** Como desenvolvedor, o Elasticsearch 8 roda no docker-compose e o client NestJS conecta, para que a busca full-text esteja disponível.
  - AC: Container `elasticsearch:8` no docker-compose (single-node, segurança desabilitada para dev). `GET localhost:9200` retorna cluster info. `ElasticsearchModule` com `@elastic/elasticsearch` registrado como provider. `GET /search/health` retorna status do cluster.

**Definition of Done:**
- [ ] `docker-compose up` → PostgreSQL + Redis + Elasticsearch up
- [ ] `npm run start:dev` → API :3001/health 200
- [ ] Swagger acessível em :3001/docs
- [ ] Prisma Studio mostra todas as tabelas
- [ ] Nenhuma lógica de negócio — apenas infraestrutura

**Dependências:** Nenhuma (primeiro sprint).

#### Conteúdo técnico:
1. Scaffold NestJS: `nest new mundial-erp-api` (porta `3001`)
2. `docker-compose.yml` com PostgreSQL 16 + Redis 7 + Elasticsearch 8
3. PrismaService + DatabaseModule + schema completo (seção 1) com todos os índices nomeados
4. `.env` com todas variáveis (DATABASE_URL, JWT secrets, REDIS_URL, ELASTICSEARCH_URL, PRO_FINANCAS_URL/EMAIL/PASSWORD)
5. ConfigModule com validação Zod
6. Global: Helmet, CORS, ValidationPipe (`whitelist: true, forbidNonWhitelisted: true`), ResponseInterceptor (envelope `{data, meta}`), LoggingInterceptor (com requestId UUID), HttpExceptionFilter, Throttler (`@nestjs/throttler`)
7. PaginationDto (skip/take, max 100)
8. Swagger setup
9. BullMQ setup com Redis (fila `sync`, fila `reports`)
10. Health check endpoints: `GET /health` e `GET /health/ready` (verifica banco + Redis + Elasticsearch)
11. `prisma migrate dev --name init`

**Testar:** `docker-compose up` → API responde em `localhost:3001/health` → Swagger em `localhost:3001/docs` → Prisma Studio funciona

### Fase 2 — Autenticação Backend

**Sprint Goal:** Usuários podem registrar, logar e acessar rotas protegidas com RBAC.

**User Stories:**
- **F2-1:** Como usuário, posso registrar e logar para receber tokens JWT, para que eu tenha acesso ao sistema.
  - AC: `POST /auth/register` cria usuário com bcrypt 12 rounds, retorna access (15min) + refresh (7d). Email duplicado → 409. `POST /auth/login` valida credenciais, retorna tokens. Rate limit restritivo em login.
- **F2-2:** Como usuário, posso renovar meu token antes de expirar, para que eu não perca a sessão.
  - AC: `POST /auth/refresh` com refresh token válido retorna novo par (rotation). Expirado → 401. `POST /auth/logout` invalida refresh.
- **F2-3:** Como admin, posso gerenciar usuários (CRUD), para que eu controle o acesso ao sistema.
  - AC: `GET/POST/PATCH/DELETE /users`. Apenas ADMIN cria/edita/remove. `GET /auth/me` retorna dados do usuário (sem hash).
- **F2-4:** Como sistema, guards globais protegem todas as rotas por padrão, para que nenhuma rota fique exposta acidentalmente.
  - AC: JwtAuthGuard e RolesGuard como APP_GUARD. `@Public()` para rotas abertas. `@CurrentUser()` e `@Roles()` funcionais.

**Definition of Done:**
- [ ] E2E: register → login → refresh → me → logout → 401 sem token
- [ ] Rate limit em login bloqueia após N tentativas
- [ ] Testes unitários passam (auth.service.spec.ts, users.service.spec.ts)
- [ ] Teste E2E passa (auth.e2e-spec.ts)

**Dependências:** Fase 1.

#### Conteúdo técnico:
1. Auth module: register, login, refresh, logout, me
2. JWT strategies: access (15min) + refresh (7d com rotation)
3. Bcrypt 12 rounds
4. Guards globais: JwtAuthGuard (APP_GUARD), RolesGuard (APP_GUARD)
5. Decorators: @CurrentUser(), @Roles(), @Public()
6. Users module: CRUD completo
7. Rate limiting restritivo em `/auth/login` e `/auth/register`
8. Testes unitários: auth.service.spec.ts, users.service.spec.ts
9. Testes E2E: auth.e2e-spec.ts (register → login → refresh → me → logout)

**Testar:** Swagger/Postman — login retorna tokens, refresh funciona, rota protegida rejeita sem token, rate limit funciona

### Fase 3 — Motor BPM Backend

**Sprint Goal:** Motor BPM operacional com definições semeadas e runtime pronto para integrar com pedidos.

**User Stories:**
- **F3-1:** Como admin, posso gerenciar definições BPM (departamentos, setores, processos, atividades, tarefas, handoffs), para que o mapeamento de processos esteja configurável.
  - AC: CRUD completo para cada entidade de definição. Atividades com 7 campos obrigatórios (Seção 3.3).
- **F3-2:** Como sistema, instâncias de processo são criáveis e avançáveis, para que o runtime BPM funcione de forma isolada.
  - AC: `GET/POST /process-instances`, `PATCH /activity-instances/:id/complete`, `PATCH /task-instances/:id/toggle`, `PATCH /handoff-instances/:id/accept|reject` — todos funcionais em isolamento.
- **F3-3:** Como desenvolvedor, o seed script popula todas as definições BPM da Seção 3.3, para que o sistema tenha dados de processo prontos.
  - AC: 4 departamentos, setores correspondentes, 8+ processos, 18 atividades com checklists, 3 handoffs. Tudo visível no Prisma Studio.
- **F3-4:** Como sistema, a máquina de estados do pedido valida transições com guards, para que nenhuma transição inválida ocorra.
  - AC: `OrderStatusMachine` implementa guards da Seção 3.2. Transição inválida → `BadRequestException`.

**Definition of Done:**
- [ ] Seed executado, dados BPM visíveis no Prisma Studio
- [ ] Endpoints de runtime testáveis via Postman
- [ ] Testes de integração: cada transição verifica instances criadas
- [ ] Guards da máquina de estados validam todas as regras

**Dependências:** Fase 2 (auth guards necessários para endpoints BPM).

#### Conteúdo técnico:
1. BPM sub-modules: departments, sectors, processes, activities, tasks, handoffs (CRUD definição)
2. BPM runtime: process-instances, activity-instances, task-instances, handoff-instances
3. `BpmEngineService` com EventEmitter2 (`order.status.changed`)
4. `OrderStatusMachine` com guards e regras de transição (seção 3.2)
5. Seed script com dados BPM (departamentos, processos, atividades, handoffs conforme mapa)
6. Testes integração: cada transição de status verifica que instances corretas são criadas

**Testar:** Via Postman — criar pedido → avançar status → verificar ActivityInstances e HandoffInstances no banco

### Fase 4 — Módulos de Negócio Backend

Fase dividida em 3 sub-sprints por dependência de dados.

---

#### Fase 4A — Reference Data + Clientes + Fornecedores (2 semanas)

**Sprint Goal:** Dados de referência, gestão de clientes e fornecedores operacionais no backend.

**User Stories:**
- **F4A-1:** Como admin, posso cadastrar empresas, transportadoras, formas de pagamento e dados geográficos, para que o sistema tenha dados de referência.
  - AC: CRUD para Company, Carrier, PaymentMethod, ClientClassification, DeliveryRoute. Seed de ProductTypes (10 tipos da Mundial Telhas).
- **F4A-2:** Como vendedor, posso cadastrar e buscar clientes com dados completos, para que eu possa criar pedidos.
  - AC: CRUD + search por name/cpfCnpj. Validação CPF/CNPJ. PersonType F/J. `GET /clients/:id/orders` e `GET /clients/:id/financials`.
- **F4A-3:** Como analista de compras, posso cadastrar fornecedores e ver histórico de compras, para que eu possa gerenciar fornecimento.
  - AC: CRUD + `GET /suppliers/:id/purchase-history`.

**Definition of Done:**
- [ ] Criar empresa, cliente (F/J), fornecedor via Swagger
- [ ] Buscar cliente por cpfCnpj funciona
- [ ] Seed de 10 ProductTypes executado
- [ ] Todos os endpoints com ResponseDto.fromEntity()

**Dependências:** Fase 3 (BPM para vínculo departamental).

#### Conteúdo técnico:
1. **Reference Data** — companies, carriers, states/cities, neighborhoods, payment methods
2. **Clients** (Comercial) — CRUD + classifications + delivery routes + pedidos do cliente + resumo financeiro
3. **Suppliers** (Compras) — CRUD + histórico de compras

---

#### Fase 4B — Produtos + Cotações + Pedidos + Search (3 semanas)

**Sprint Goal:** Catálogo de produtos com wizard 4 etapas, módulo central de pedidos com ciclo completo, e busca global via Elasticsearch.

**User Stories:**
- **F4B-1:** Como analista de compras, posso cadastrar produto em 4 etapas obrigatórias, para que o catálogo tenha dados completos.
  - AC: Código auto-gerado (prefixo + sequencial). EAN-13 auto-gerado. Produto DRAFT até 4 etapas completas. Fórmula obrigatória para FABRICACAO_PROPRIA. `GET /products/barcode/:ean` funciona.
- **F4B-2:** Como gerente, posso gerenciar tabelas de preço com itens por produto, para que vendedores tenham preços atualizados.
  - AC: CRUD PriceTable + PriceTableItem. Preços em centavos. Default flaggable.
- **F4B-3:** Como analista de compras, posso criar cotações, receber propostas e efetivar compra, para que matéria-prima seja adquirida.
  - AC: Fluxo: criar cotação → registrar propostas → selecionar vencedora → `POST /purchase-orders` cria pedido de compra + AP automaticamente.
- **F4B-4:** Como vendedor, posso criar pedidos e avançar por todos os status com automações BPM, para que o fluxo do negócio funcione end-to-end.
  - AC: Número auto-gerado (4 dígitos atômico). Status machine com guards (Seção 3.2). EventEmitter2 dispara BPM em cada transição. OrderItemSupply checklist. Timeline completa. PDF "Proposta de Venda".
- **F4B-5:** Como usuário, posso buscar clientes, produtos, pedidos e fornecedores via endpoint unificado, para que a busca global funcione.
  - AC: `SearchModule` implementado (Seção 2.13). `SearchIndexerService` escuta eventos `client.created/updated/deleted`, `product.*`, `order.*`, `supplier.*` via EventEmitter2. `GET /search?q=telha&type=products` retorna resultados do Elasticsearch. Fallback para PostgreSQL `ILIKE` se ES offline. `POST /search/reindex` enfileira reindexação via BullMQ.

**Definition of Done:**
- [ ] Produto criado via wizard 4 etapas, ativado
- [ ] Cotação → seleção → compra → AP criado automaticamente
- [ ] Pedido: EM_ORCAMENTO → ENTREGUE com todos os side-effects (AR 2 parcelas, PO, SO, estoque)
- [ ] `GET /search?q=termo` retorna resultados de múltiplas entidades
- [ ] Indexação near real-time: criar produto → buscar imediatamente → encontra
- [ ] Swagger completo com DTOs

**Dependências:** Fase 4A (clientes, fornecedores, reference data).

#### Conteúdo técnico:
4. **Products** (Compras) — CRUD + images + brands + units + departments + price tables + fórmula
5. **Purchase Quotations/Orders** (Compras) — cotações + seleção + efetivação (gera AP)
6. **Orders** (Comercial) — CRUD + status machine (integra com BPM) + timeline + **PDF "Proposta de Venda" (PDFKit)** + OrderItemSupply (insumos checklist) — **módulo central**

---

#### Fase 4C — Financeiro + Produção + Dashboards (3 semanas)

**Sprint Goal:** Módulos financeiro, produção (com separação/requisições) e dashboards configuráveis completos.

**User Stories:**
- **F4C-1:** Como analista financeiro, posso gerenciar AR/AP/NF-e/caixa com idempotência, para que o controle financeiro seja confiável.
  - AC: CRUD AR/AP com Idempotency-Key. NF-e com chave de acesso 44 dígitos. CashRegister open/close. Categorias financeiras hierárquicas. Summary com totais.
- **F4C-2:** Como coordenador de produção, posso gerenciar ordens de produção/separação com consumo e perdas, para que a produção seja rastreável.
  - AC: ProductionOrder CRUD + start/complete. Consumptions, Outputs, Losses. SeparationOrder com isSeparated/isChecked. Ajuste de estoque automático no complete.
- **F4C-3:** Como operador de estoque, posso criar e processar requisições com barcode, para que a saída de materiais seja controlada.
  - AC: StockRequisition CRUD. Código auto-gerado. PDF com Code-128 (bwip-js). `GET /stock-requisitions/code/:code`. `PATCH .../items/:itemId/process` com unitType UN/CX.
- **F4C-4:** Como gestor, posso criar dashboards com cards configuráveis, para que eu tenha visibilidade dos KPIs.
  - AC: Dashboard CRUD. Cards com 8 tipos de gráfico. Query engine dinâmica por data source. Filtros globais. Layout grid (x, y, w, h).
- **F4C-5:** Como gestor, posso gerar relatórios (DRE, vendas, fluxo de caixa), para que eu tenha análises financeiras.
  - AC: Endpoints de relatórios reusam query engine dos dashboards.

**Definition of Done:**
- [ ] AR/AP CRUD com idempotência funciona
- [ ] Produção: PO start → consumo → output → complete → estoque ajustado
- [ ] Requisição: criar → PDF com barcode → processar item → finalizar
- [ ] Dashboard: criar → adicionar cards → dados renderizam
- [ ] Testes unitários por service de cada módulo
- [ ] Swagger completo com DTOs documentados

**Dependências:** Fase 4B (pedidos criam AR/AP/PO automaticamente).

#### Conteúdo técnico:
7. **Financial** (Financeiro) — AR + AP + Invoices + Cash Register + Summary + Idempotency-Key guard + categorias financeiras
8. **Production** (Produção) — Formulas + Production Orders + Consumptions + ajuste estoque
9. **Dashboards/Painéis** — CRUD de dashboards + cards + query engine para data sources + filtros
10. **Reports** — DRE, vendas, fluxo de caixa (podem reusar a mesma query engine dos painéis)

**Testar (Fase 4 completa):** Fluxo E2E via Postman: EM_ORCAMENTO → FATURAR (paga 50% + comprovante, cria AR 2 parcelas) → FATURADO (conciliação, parcela 1 PAID) → PRODUZIR (cria PO + OrderItemSupply) → EM_PRODUCAO → marcar cada supply como READY → PRODUZIDO (valida todos supplies READY) → ENTREGUE (parcela 2 PAID). Também: criar cotação → selecionar → efetivar compra → AP criado

### Fase 5 — Integração Pro Finanças Backend (2 semanas)

**Sprint Goal:** Sincronização com Pro Finanças operacional via filas em background com detecção de mudanças.

**User Stories:**
- **F5-1:** Como sistema, posso autenticar na API PF com retry e circuit breaker, para que a integração seja resiliente.
  - AC: Axios com auto-auth JWT. Retry exponencial (1s/2s/4s, max 3). Circuit breaker: abre após N falhas, semi-aberto testa com 1 request.
- **F5-2:** Como admin, posso disparar sync e acompanhar progresso, para que a migração de dados seja controlável.
  - AC: `POST /sync/all` → 202 + jobId. `GET /sync/jobs/:jobId` mostra progresso. `GET /sync/status` mostra saúde. `GET /sync/logs` histórico.
- **F5-3:** Como sistema, sync respeita ordem de dependência e detecta mudanças via checksum, para que o sync seja incremental e eficiente.
  - AC: Sync na ordem da Seção 5.2 (Companies → States → ... → Orders). Checksum MD5 por registro. Re-sync pula registros inalterados.

**Definition of Done:**
- [ ] `POST /sync/all` → dados PF no banco
- [ ] Re-sync só atualiza registros com checksum diferente
- [ ] Logs completos com contagens e erros
- [ ] Circuit breaker testado (simular falha da API PF)

**Dependências:** Fase 4A-4C (modelos de destino devem existir). External: API Pro Finanças acessível.

#### Conteúdo técnico:
1. `ProFinancasClientService` (Axios + auto-auth JWT + retry exponencial + circuit breaker)
2. Entity mappers para cada tipo de entidade
3. `SyncService` com BullMQ: endpoint enfileira job → worker processa em background
4. Sync por dependência (seção 4.2) com checksum para detecção de mudanças
5. Endpoints de sync (retornam 202) + logs + status de jobs
6. Seed script que roda sync inicial completo

**Testar:** `POST /sync/all` retorna 202 → `GET /sync/jobs/:jobId` mostra progresso → dados aparecem no banco → `GET /sync/logs` mostra histórico

### Fase 6 — Frontend Base + Design System (2 semanas)

> **Paralelização:** Esta fase pode iniciar em paralelo com as Fases 3-5 se houver 2 desenvolvedores. Só depende da Fase 2 (API de auth para login).

**Sprint Goal:** Frontend rodando com Align UI configurado, login funcional, layout shell com sidebar/header/dark mode — pronto para receber features.

**User Stories:**
- **F6-1:** Como desenvolvedor, o Next.js roda com Align UI reorganizado para padrão Bravy, para que a base de código esteja padronizada.
  - AC: Estrutura `src/` conforme documentado (app/, components/ui/, features/, lib/, providers/, stores/, types/). Path alias `@/` funciona. `npm run dev` inicia em :3000.
- **F6-2:** Como desenvolvedor, os tokens do Design System estão configurados e validados contra o Figma, para que a fidelidade visual esteja garantida.
  - AC: `npx @alignui/cli tailwind` executado. Cores, tipografia, sombras, radius coincidem com Figma (validar via `get_design_context`). `@remixicon/react` instalado. Dark mode via `next-themes`.
- **F6-3:** Como usuário, posso logar e ver o layout autenticado com sidebar por departamento, para que eu tenha acesso ao sistema.
  - AC: Login com React Hook Form + Zod + Align UI (TextInput, Button). Redirect após login. Sidebar com navegação por departamento (Comercial, Compras, Financeiro, Produção). Header com Avatar + dark mode toggle. ProcessContextBar placeholder. `middleware.ts` protege rotas.

**Definition of Done:**
- [ ] Login funciona contra a API (Fase 2)
- [ ] Refresh silencioso em 401
- [ ] Sidebar renderiza departamentos
- [ ] Dark mode toggle funciona em light + dark
- [ ] Componentes Align UI visualmente idênticos ao Figma
- [ ] Layout baseado no template Finance & Banking (`3911:35677`)
- [ ] Command Menu (`Cmd+K`) integrado com `GET /search` — busca global funcional

**Dependências:** Fase 2 (API de auth para login). Fase 4B (API de search para Command Menu).

#### Conteúdo técnico:
1. Clonar Align UI Starter Template: `git clone https://github.com/alignui/alignui-nextjs-typescript-starter.git mundial-erp-web` (porta `3000`)
   - Starter já inclui: Tailwind CSS v4 configurado, componentes base, utils (`cn`, `tv`, `recursiveCloneChildren`, `Polymorphic`), fonte Inter, dark mode toggle
   - Remover `.git` e `pnpm-lock.yaml` do starter, inicializar repositório próprio: `rm -rf .git && rm pnpm-lock.yaml && git init`
2. **Reorganizar estrutura para padrão Bravy.** O starter usa estrutura própria (`components/`, `hooks/`, `utils/`). Reorganizar para:
   ```
   src/
   ├── app/                          ← Next.js App Router (rotas)
   │   ├── (auth)/                   ← grupo de rotas auth
   │   ├── (dashboard)/              ← grupo de rotas protegidas
   │   ├── layout.tsx
   │   └── globals.css
   ├── components/
   │   ├── ui/                       ← componentes Align UI (migrar do starter)
   │   ├── layout/                   ← sidebar, header, process-context-bar
   │   └── shared/                   ← data-table, dialogs, spinners
   ├── features/                     ← código por feature (components/, hooks/, services/, schemas/, types/)
   ├── hooks/                        ← hooks globais
   ├── lib/
   │   ├── api.ts                    ← Axios setup
   │   ├── cn.ts                     ← classnames (manter do starter)
   │   ├── tv.ts                     ← tailwind-variants (manter do starter)
   │   └── utils.ts
   ├── providers/                    ← auth-provider, query-provider
   ├── stores/                       ← Zustand (auth, sidebar, process-context)
   └── types/                        ← tipos globais
   ```
   - Mover componentes Align UI de `components/` para `src/components/ui/`
   - Mover utils (`cn`, `tv`, `recursiveCloneChildren`, `Polymorphic`) para `src/lib/`
   - Mover hooks do starter para `src/hooks/`
   - Garantir que imports funcionam com path alias `@/` configurado no `tsconfig.json`
3. Configurar tokens do Design System: `npx @alignui/cli tailwind`
   - Primary color: cor do brand Mundial Telhas
   - Neutral: Gray ou Slate
   - Format: oklch (recomendado para Tailwind v4)
   - CSS file: `src/app/globals.css`
4. Instalar dependências: `npm install` (gera `package-lock.json`), depois adicionar: `npm install @remixicon/react next-themes axios @tanstack/react-query zustand react-hook-form zod @hookform/resolvers`
5. Validar fundações do Design System contra Figma:
   - `get_design_context("AjvK4iQOOs2wPcp53ZfIVr", "553:14956")` → Color tokens
   - `get_design_context("AjvK4iQOOs2wPcp53ZfIVr", "553:14957")` → Typography
   - `get_design_context("AjvK4iQOOs2wPcp53ZfIVr", "553:14959")` → Shadows
   - `get_design_context("AjvK4iQOOs2wPcp53ZfIVr", "553:14961")` → Corner Radius
6. `src/lib/api.ts` (Axios instance + interceptors: Bearer token, refresh automático em 401)
7. `src/providers/query-provider.tsx` (React Query)
8. `src/providers/auth-provider.tsx`
9. `src/stores/` — Zustand: `auth.store.ts`, `sidebar.store.ts`, `process-context.store.ts`
10. Layout base usando template **Finance & Banking** (`3911:35677`) do Figma como referência:
    - Sidebar (navegação por departamento) — componente Align UI
    - Header com Avatar, Badge, Notification Feed
    - ProcessContextBar (Breadcrumbs + Step Indicator + Tag de status)
    - Main content area
    - Dark mode toggle no header
11. `src/app/middleware.ts` para redirect auth
12. Login page com React Hook Form + Zod + componentes Align UI (Text Input, Button, Checkbox)

**Testar:** Login funciona, refresh silencioso, sidebar renderiza, dark mode toggle funciona, rotas protegidas redirecionam, componentes Align UI visualmente idênticos ao Figma

### Fase 7 — Features Frontend

Cada feature segue a estrutura `src/features/{nome}/` com: `components/`, `hooks/`, `services/`, `schemas/`, `types/`. Fase dividida em 4 sub-sprints.

---

#### Fase 7A — Início + Clientes (2 semanas)

**Sprint Goal:** Tela inicial personalizada e CRUD de clientes completo no browser.

**User Stories:**
- **F7A-1:** Como usuário, vejo uma tela inicial com saudação e minhas atividades do dia, para que eu saiba o que fazer ao entrar no sistema.
  - AC: `/inicio` mostra "Bom dia/tarde/noite, [Nome]". Cards de ActivityInstance (assigned ao usuário, dueAt hoje ou IN_PROGRESS). Handoffs pendentes. Click abre dossiê do pedido.
- **F7A-2:** Como vendedor, posso cadastrar, buscar e visualizar clientes no browser, para que eu gerencie minha carteira.
  - AC: `/comercial/clientes` com Table paginada + search. `/comercial/clientes/novo` com form (React Hook Form + Zod). `/comercial/clientes/[id]` com Tab Menu: Dados, Pedidos, Financeiro. `/comercial/clientes/[id]/editar`.

**Definition of Done:**
- [ ] Home mostra atividades reais do usuário logado
- [ ] Cliente: criar, editar, buscar, visualizar com tabs

**Dependências:** Fase 6 (shell frontend), Fase 4A (API clientes), Fase 3 (API BPM para atividades).

#### Conteúdo técnico:
1. **Início** — saudação dinâmica (bom dia/tarde/noite + nome), atividades do dia, handoffs pendentes
2. **Comercial: Clientes** — tabela paginada + busca, formulário cadastro, detalhe (dados + pedidos + financeiro)

---

#### Fase 7B — Comercial: Pedidos — TELA PRINCIPAL (3 semanas) ← **MVP MILESTONE**

**Sprint Goal:** Dossiê do pedido completo — a tela mais importante do sistema — funcional end-to-end no browser.

**User Stories:**
- **F7B-1:** Como vendedor, posso ver a lista de pedidos com filtro por status, para que eu acompanhe meus orçamentos e pedidos.
  - AC: `/comercial/pedidos` com Table + Pagination + Filter. Tabs ou filtro: EM_ORCAMENTO = "Orçamentos", demais = pedidos ativos. Colunas: número, cliente, total, status (Tag), data, dropdown ações.
- **F7B-2:** Como vendedor, posso criar um pedido com itens e insumos, para que eu monte a proposta para o cliente.
  - AC: `/comercial/pedidos/novo`. Selecionar cliente, adicionar itens da tabela de preço, definir quantidades, adicionar supplies por item, dados de entrega, observações. Salva como EM_ORCAMENTO.
- **F7B-3:** Como usuário, posso navegar o dossiê completo do pedido com stepper, tabs e ações contextuais, para que eu acompanhe e avance o fluxo.
  - AC: `/comercial/pedidos/[id]`. Step Indicator horizontal (EM_ORCAMENTO → ENTREGUE). ProcessContextBar (Breadcrumbs + departamento + atividade + SLA). Badge de pagamento. Tab Menu: Itens (com checklist supplies toggle), Financeiro (AR parcelas), Produção (PO + SO após FATURADO), NF-e, Timeline (Activity Feed). Botões contextuais por status+role (Seção 3.5).
- **F7B-4:** Como usuário, posso imprimir documentos do pedido via dropdown de ações, para que eu tenha registros físicos.
  - AC: Dropdown "Ações": Proposta de Venda, Etiqueta Produção, Etiqueta Separação (oculta se sem itens REVENDA), Ficha OP (após FATURADO). Cada um abre PDF em nova aba.

**Definition of Done:**
- [ ] E2E no browser: criar pedido → avançar todos os status → tabs atualizam → PDFs abrem
- [ ] Checklist de insumos toggle funciona (optimistic update)
- [ ] Botões contextuais mudam conforme status + role
- [ ] **Sistema utilizável = MVP atingido**

**Dependências:** Fase 7A (navegação), Fase 4B (API pedidos), Fase 4C (API financeiro/produção), Fase 5 (PDFs).

#### Conteúdo técnico:
3. **Comercial: Pedidos** ← **tela principal do sistema** — lista com filtro por status (EM_ORCAMENTO = orçamentos em aberto), criação (registra cliente → adiciona itens com insumos/acabamentos), dossiê completo (stepper + ProcessContextBar + tabs + checklist insumos + botões contextuais). Dropdown "Ações" com opção "Imprimir Proposta de Venda" (gera PDF conforme seção 4)

---

#### Fase 7C — Compras + Financeiro + Produção (3 semanas)

**Sprint Goal:** Módulos de Compras, Financeiro e Produção operacionais no frontend.

**User Stories:**
- **F7C-1:** Como analista de compras, posso cadastrar produtos via wizard 4 etapas no browser, para que o catálogo seja gerenciável visualmente.
  - AC: `/compras/produtos` tabela filtrável. `/compras/produtos/novo` wizard com Step Indicator. Detalhe com Tab Menu (Dados, Especificação, Fiscal, Preços, Fórmula inline, Imagens, Estoque). Produto DRAFT → ACTIVE quando 4 etapas completas.
- **F7C-2:** Como analista de compras, posso gerenciar fornecedores e cotações no browser, para que o fluxo de compras seja digital.
  - AC: Fornecedores CRUD + histórico. Cotações: criar → receber propostas → selecionar → efetivar compra.
- **F7C-3:** Como analista de compras, posso gerenciar tabelas de preço e requisições de estoque com scanner, para que estoque seja controlado.
  - AC: Tabelas de preço editáveis. Requisições: criar (VENDA/INTERNO), imprimir PDF com barcode, processar via scanner (`onScan.js`: scan EAN → UN/CX → baixa → scan requisição → finalizar). Fallback Ctrl+V.
- **F7C-4:** Como analista financeiro, posso gerenciar AR/AP/NF-e/caixa no browser, para que o controle financeiro tenha interface.
  - AC: AR lista + registrar pagamento. AP lista + pagamento. NF-e detalhe + PDF + XML. Caixa abrir/fechar. Análise com resumo.
- **F7C-5:** Como coordenador de produção, posso ver a fila kanban e gerenciar ordens no browser, para que a produção seja acompanhável.
  - AC: `/producao/ordens` kanban por status. Dossiê OP: itens, fórmula/ingredientes, consumo, output, perdas, custos. Start/complete.

**Definition of Done:**
- [ ] Produto criado via wizard 4 etapas no browser, ativado
- [ ] Scanner funciona (onScan.js) ou fallback Ctrl+V
- [ ] AR/AP/NF-e/caixa CRUD completo
- [ ] Kanban de produção operacional

**Dependências:** Fase 6 (shell), Fase 4B (produtos/cotações API), Fase 4C (financeiro/produção API).

#### Conteúdo técnico:
4. **Compras: Produtos** — catálogo + wizard 4 etapas
5. **Compras: Fornecedores** — CRUD + histórico de compras
6. **Compras: Cotações** — fluxo cotação → seleção → compra
7. **Compras: Tabelas de Preço** — edição de preços por produto
8. **Compras: Requisições de Estoque** — criar requisição, imprimir PDF, processar via scanner
9. **Financeiro** — contas a receber, contas a pagar, NF-e, caixa, análise
10. **Produção** — fila kanban, dossiê da ordem, fórmulas

---

#### Fase 7D — Painéis + Relatórios + Integração + Config (2 semanas)

**Sprint Goal:** Dashboards configuráveis, relatórios cross-departamento, monitoramento de sync e administração do sistema.

**User Stories:**
- **F7D-1:** Como gestor, posso criar dashboards com cards drag-and-drop e filtros globais, para que eu tenha visibilidade dos KPIs.
  - AC: `/paineis` lista. Criar/editar com drag-and-drop grid. Card editor (tipo, data source, filtros, eixos). Auto-refresh. Filtros globais.
- **F7D-2:** Como gestor, posso gerar relatórios (DRE, vendas, fluxo de caixa), para que eu tenha análises financeiras.
  - AC: `/relatorios/dre`, `/relatorios/vendas`, `/relatorios/fluxo-caixa` renderizam dados corretos.
- **F7D-3:** Como admin, posso monitorar sync com Pro Finanças e disparar manualmente, para que a migração seja controlável.
  - AC: `/integracao` mostra status sync, logs, botões de trigger por entidade e sync completo.
- **F7D-4:** Como admin, posso configurar usuários, departamentos, processos e dados da empresa, para que o sistema seja administrável.
  - AC: `/configuracoes/usuarios`, `/configuracoes/departamentos`, `/configuracoes/processos`, `/configuracoes/empresa` — todos CRUD funcionais.

**Definition of Done:**
- [ ] Dashboard com cards renderizando dados reais + drag-and-drop
- [ ] Relatórios renderizam dados corretos
- [ ] Sync PF monitorável e disparável via UI
- [ ] Config admin funcional

**Dependências:** Fase 6 (shell), Fase 4C (dashboards/reports API), Fase 5 (sync API).

### Fase 8 — Polish, Design System QA e Produção (2 semanas)

**Sprint Goal:** Sistema production-ready — QA visual contra Figma, segurança auditada, performance validada e deploy configurado.

**User Stories:**
- **F8-1:** Como usuário, todas as telas têm error/loading/empty states, para que eu nunca veja uma tela quebrada.
  - AC: Skeleton loaders em todas as listagens. Error boundaries com mensagens amigáveis. Empty states com orientação ("Nenhum pedido ainda. Crie o primeiro.").
- **F8-2:** Como designer, todas as telas passam na validação visual contra o Figma, para que o DS seja respeitado.
  - AC: Cada tela comparada com Figma via `get_screenshot(fileKey, nodeId)`. Light + dark mode. 36 componentes Align UI consistentes (tokens, estados, tamanhos).
- **F8-3:** Como auditor, todas as mutações geram registro em AuditLog, para que o sistema seja rastreável.
  - AC: CREATE, UPDATE, DELETE, STATUS_CHANGE → AuditLog com changes JSON `{ field: { from, to } }`.
- **F8-4:** Como CTO, o sistema passa no security checklist Bravy, para que esteja seguro em produção.
  - AC: Checklist `11-seguranca.md` verde: Helmet, CORS restritivo, sem PII em logs, sem `any`, sem `console.log`, uploads validados.
- **F8-5:** Como DevOps, o sistema tem Docker produção + CI/CD + health checks, para que o deploy seja automatizado.
  - AC: Multi-stage Dockerfiles (NestJS + Next.js standalone). Nginx (SSL, gzip, CORS). GitHub Actions (lint → test → build → deploy). Seed data completo. Health checks para load balancer.

**Definition of Done:**
- [ ] Todas as telas com skeleton/error/empty states
- [ ] Responsivo em tablet (sidebar collapse, tables scroll)
- [ ] Figma QA passa (light + dark mode)
- [ ] Security checklist verde
- [ ] Performance: `select` em listagens, sem N+1, query plans revisados
- [ ] Docker + CI/CD + health checks configurados
- [ ] E2E final: pedido EM_ORCAMENTO → ENTREGUE no browser em produção

**Dependências:** Todas as fases anteriores.

#### Conteúdo técnico:
- Error/loading/empty states em todas as telas (skeleton loaders)
- Responsividade (tablet — Align UI tem variantes tablet)
- Validação visual do Design System contra Figma
- Checklist de componentes Align UI
- Auditoria: todas as mutações logam em AuditLog
- Review de segurança (checklist `11-seguranca.md` Bravy)
- Performance: `select` em vez de `include` para listagens, verificar query plans
- Docker produção: multi-stage Dockerfiles (NestJS + Next.js standalone) + nginx (SSL, gzip, CORS)
- CI/CD: GitHub Actions (`lint → test → build → deploy`)
- Seed data completo com empresa demo, usuários, pedidos exemplo
- Health checks configurados para load balancer

---

### Grafo de Dependências entre Sprints

```
F1 → F2 → F3 → F4A → F4B → F4C → F5         (pipeline backend)
      │
      └──→ F6                                   (frontend pode começar após auth API)
            │
            └──→ F7A → F7B [MVP] → F7C → F7D   (pipeline frontend)
                                          │
                                          └──→ F8  (polish → deploy)
```

**Oportunidade de paralelização:**
- Se 2 desenvolvedores: 1 no backend (F3 → F4A → F4B → F4C → F5), outro no frontend (F6 → F7A) a partir da Fase 2.
- Convergência no Sprint 7B (MVP): frontend precisa das APIs de pedidos (F4B) e financeiro (F4C) prontas.

---

## 7. Funcionalidade Futura (não incluída neste plano)

- **Rastreamento ponta a ponta Marketing → Lead → Pedido:** integração com Meta Ads e Google Ads para identificar origem de leads e conversão em pedidos. Será uma feature adicional após a migração completa.

---

## 8. Verificação (como testar cada fase)

1. **Fase 1 (Infra):** `docker-compose up` → PostgreSQL + Redis + Elasticsearch up → `npm run start:dev` → `GET /health` retorna 200 → `GET /search/health` retorna status do cluster ES → Swagger acessível em `/docs` → Prisma Studio mostra tabelas
2. **Fase 2 (Auth):** `npm test` — testes unitários passam → E2E: register → login → token válido → refresh → me → logout → rota protegida retorna 401 sem token → rate limit em login bloqueia após N tentativas
3. **Fase 3 (BPM):** Testes integração passam → via Postman: criar dados BPM via seed → verificar departamentos/processos/atividades existem
4. **Fase 4 (Negócio):** Fluxo E2E via Postman: criar cliente → criar produto → criar pedido (ORCAMENTO) → avançar status passo a passo → verificar AR/PO/Invoice criados automaticamente → verificar estoque ajustado
5. **Fase 5 (Sync):** `POST /sync/all` retorna 202 → polling `/sync/jobs/:id` mostra progresso → dados do PF aparecem no banco → `/sync/logs` mostra histórico completo
6. **Fase 6 (Frontend base):** Login funcional → refresh silencioso → sidebar renderiza departamentos → ProcessContextBar mostra contexto → rotas protegidas redirecionam
7. **Fase 7 (Features):**
   - Início: saudação correta por hora + atividades do dia do usuário logado
   - Comercial: cadastrar cliente → criar orçamento → converter em pedido → dossiê com stepper, tabs, checklist, botões contextuais
   - Compras: cadastrar produto → criar cotação → selecionar → efetivar compra
   - Financeiro: verificar AR criado automaticamente → registrar pagamento → abrir/fechar caixa
   - Produção: kanban mostra ordens → dossiê com consumo → finalizar
   - Painéis: criar dashboard → adicionar cards → configurar data source → visualizar dados → drag-and-drop layout
8. **Teste final E2E completo:** EM_ORCAMENTO (vendedor monta) → FATURAR (50% pago + comprovante) → FATURADO (financeiro concilia) → PRODUZIR → EM_PRODUCAO → marcar insumos como READY → PRODUZIDO (todos insumos ✓) → ENTREGUE (50% restante). Verificar: handoffs entre departamentos, atividades criadas automaticamente, AR com 2 parcelas, ProductionOrders, OrderItemSupply como checklist. Tela Início mostra atividades do dia. Painéis exibem dados corretos.

---

## Arquivos Críticos de Referência

- `.claude/standards/99-referencia-completa.md` — Padrão completo Bravy (stack, nomenclatura, templates)
- `.claude/standards/04-backend.md` — Padrão detalhado NestJS (Controller/Service/Repository)
- `.claude/standards/06-banco-de-dados.md` — Convenções Prisma
- `.claude/standards/07-autenticacao.md` — Fluxo JWT completo
- `Pro Finanças.md` — Regra de ouro da migração
- `app-sales-force-api-v1.postman_collection.json` — Todos os 39 endpoints da API Pro Finanças
- `FIGMA.md` — **Referência completa do Design System:** todos os node IDs, variantes, tokens, telas por módulo setorial, regras de layout (sidebar 272px, header 88px, 1440x900)
- `pages.md` — Catálogo resumido das 48 páginas do Design System Figma
- Figma Design System — File key: `AjvK4iQOOs2wPcp53ZfIVr` (Align UI PRO v2.0)
- Align UI Docs — `https://www.alignui.com/docs/v1.2/introduction`

## Decisões Arquiteturais Chave

- **Definição BPM separada de Runtime:** Process/Activity/Task são templates; ProcessInstance/ActivityInstance/TaskInstance são execução por pedido. Permite mudar definições sem afetar processos em andamento.
- **Eventos para mudança de status:** `EventEmitter2` desacopla o OrdersService dos efeitos colaterais. Adicionar novo efeito = novo listener, sem modificar o módulo de pedidos.
- **proFinancasId em toda tabela:** Chave de mapeamento para sync. Permite upsert, rastreabilidade e migração gradual.
- **Valores monetários em centavos (Int):** Elimina erros de ponto flutuante. Formatação acontece no frontend.
- **Sync via filas (BullMQ):** Operações pesadas fora do request-response. Retorna 202 Accepted, worker processa em background.
- **Idempotency-Key em operações financeiras:** Guard middleware previne duplicatas em AR/AP/NF-e.
- **RequestId em todo request:** UUID propagado nos logs e retornado no header `X-Request-Id` para rastreamento ponta a ponta.
- **Rate limiting em 3 níveis:** Global (throttler), por endpoint (login/register mais restritivo), por usuário.
- **Redis obrigatório:** Cache para dados frequentes (permissões, configs), filas BullMQ, session store para refresh tokens.
- **Elasticsearch para busca, PostgreSQL para dados:** ES é read-only replica otimizada para full-text search. PostgreSQL continua source of truth. Sync via EventEmitter2 (near real-time). Fallback gracioso: se ES cair, busca usa `ILIKE` no PostgreSQL (mais lento, mas funcional). Justificativa: `ILIKE` no PostgreSQL não escala com volume crescente de dados e não oferece relevância, fuzzy matching, ou busca multi-entidade eficiente.
- **Align UI em vez de shadcn/ui:** Mesma base técnica (Radix UI + Tailwind CSS), mesma abordagem copy/paste, mas com Design System Figma PRO sincronizado. Garante fidelidade visual 1:1 entre design e código. Componentes Free cobrem a maioria dos casos; PRO implementados via código de referência do Figma MCP.
- **Dark mode desde o início:** Align UI suporta nativamente com CSS variables light/dark. Implementado via `next-themes` — evita retrabalho futuro.
- **Figma como fonte de verdade visual:** Cada tela é validada contra screenshot do Figma via `get_screenshot`. Template Finance & Banking usado como base para dashboards e layouts financeiros.
