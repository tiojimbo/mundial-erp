# Plano — Custom Fields por TaskType (adaptação do PLANO.md à estrutura atual)

## Contexto

O PLANO.md original modelou cada entidade de domínio (Pedido, Produto, Cliente, etc) como tabela própria e desenhou cada listagem com colunas específicas. Na estrutura atual cada entidade vira um CustomTaskType e as colunas viram custom fields criados pela UI do app, vinculados ao tasktype via `customTaskTypeId`.

Este documento lista, por tasktype, os custom fields que devem ser criados.

Tipos disponíveis (10 atuais): `TEXT`, `NUMBER`, `CURRENCY`, `DATE`, `DROPDOWN`, `CPF`, `CNPJ`, `URL`, `EMAIL`, `PHONE`.

Convenção do `key`: snake_case, prefixado pelo escopo quando o nome pode colidir entre tasktypes (`client_name`, `supplier_name`, `product_name`).

---

## 1. `builtin-order` — Pedido

Status: tasktype já semeado, 17 fields já criados (PLANO-TASK-TYPES Seed A).

### Já existentes (não recriar)
| key | label | type |
|---|---|---|
| order_number | Número do pedido | TEXT |
| client_cnpj | CNPJ do cliente | CNPJ |
| client_cpf | CPF do cliente | CPF |
| client_name | Nome/Razão social | TEXT |
| client_email | E-mail | EMAIL |
| client_phone | Telefone | PHONE |
| delivery_address | Endereço de entrega | TEXT |
| delivery_deadline | Prazo de entrega | DATE |
| proposal_validity_days | Validade da proposta (dias) | NUMBER |
| subtotal | Subtotal | CURRENCY |
| freight | Frete | CURRENCY |
| discount | Desconto | CURRENCY |
| total | Total | CURRENCY |
| paid_amount | Valor pago (entrada) | CURRENCY |
| payment_method | Forma de pagamento | DROPDOWN |
| should_produce | Contém itens de fabricação própria | DROPDOWN |
| is_resale | Contém itens de revenda | DROPDOWN |

### Faltam (criar pela UI)
| key | label | type |
|---|---|---|
| title | Título do pedido | TEXT |
| company | Filial emissora | DROPDOWN |
| carrier | Transportadora | DROPDOWN |
| price_table | Tabela de preço | DROPDOWN |
| order_type | Tipo de pedido | DROPDOWN |
| order_flow | Fluxo do pedido | DROPDOWN |
| order_model | Modelo do pedido | DROPDOWN |
| assigned_user | Responsável | TEXT |
| issue_date | Data de emissão | DATE |
| delivery_neighborhood | Bairro de entrega | TEXT |
| delivery_city | Cidade de entrega | TEXT |
| delivery_state | UF de entrega | TEXT |
| delivery_cep | CEP de entrega | TEXT |
| delivery_reference_point | Ponto de referência | TEXT |
| contact_name | Contato do pedido | TEXT |
| has_tax_substitution | Possui substituição tributária | DROPDOWN |
| tax_substitution | Substituição tributária / IPI | CURRENCY |
| notes | Observações | TEXT |

---

## 2. `builtin-stock-request` — Requisição de Estoque

Status: tasktype já semeado, 7 fields já criados (PLANO-TASK-TYPES Seed B).

### Já existentes (não recriar)
| key | label | type |
|---|---|---|
| requisition_code | Código da requisição | TEXT |
| type | Tipo (Venda/Interno) | DROPDOWN |
| linked_order_number | Nº do pedido vinculado | TEXT |
| client_name | Cliente vinculado | TEXT |
| requester_area | Área solicitante | TEXT |
| requested_date | Data de solicitação | DATE |
| processed_date | Data de processamento | DATE |

### Faltam (criar pela UI)
| key | label | type |
|---|---|---|
| requested_by | Solicitante | TEXT |
| approved_by | Aprovador | TEXT |
| notes | Observações | TEXT |

---

## 3. Cliente — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| person_type | Tipo de pessoa (F/J) | DROPDOWN |
| client_cpf | CPF | CPF |
| client_cnpj | CNPJ | CNPJ |
| client_name | Nome / Razão social | TEXT |
| trade_name | Nome fantasia | TEXT |
| ie | Inscrição estadual | TEXT |
| rg | RG | TEXT |
| client_email | E-mail | EMAIL |
| client_phone | Telefone | PHONE |
| address | Endereço | TEXT |
| address_number | Número | TEXT |
| neighborhood | Bairro | TEXT |
| complement | Complemento | TEXT |
| city | Cidade | TEXT |
| state | UF | TEXT |
| zip_code | CEP | TEXT |
| classification | Classificação | DROPDOWN |
| delivery_route | Rota de entrega | DROPDOWN |
| default_price_table | Tabela de preço padrão | DROPDOWN |
| default_payment_method | Forma de pagamento padrão | DROPDOWN |

---

## 4. Produto — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| product_code | Código (TT-0001) | TEXT |
| barcode | EAN-13 interno | TEXT |
| product_name | Descrição | TEXT |
| product_type | Tipo (Telha/Parafuso/etc) | DROPDOWN |
| department | Departamento | DROPDOWN |
| brand | Marca | DROPDOWN |
| unit_measure | Unidade base | DROPDOWN |
| box_unit_measure | Unidade conjunto/caixa | DROPDOWN |
| units_per_box | Unidades por caixa | NUMBER |
| classification | Classificação operacional | DROPDOWN |
| weight | Peso (kg) | NUMBER |
| width | Largura | NUMBER |
| height | Altura | NUMBER |
| length | Comprimento | NUMBER |
| weight_m3 | Peso m³ | NUMBER |
| production_capacity | Capacidade produtiva | NUMBER |
| stock_location | Localização no estoque | TEXT |
| min_stock | Estoque mínimo | NUMBER |
| current_stock | Estoque atual | NUMBER |
| pieces_per_unit | Peças por unidade | NUMBER |
| size | Tamanho | NUMBER |
| load_capacity | Capacidade de carga (S/Carga) | NUMBER |
| beta | Beta | NUMBER |
| fck_mpa | FCK Mpa | NUMBER |
| ncm_code | NCM | TEXT |
| nfe_origin | Origem NFe | DROPDOWN |
| cfop_default | CFOP padrão | TEXT |
| ipi_rate | Alíquota IPI (%) | NUMBER |
| tax_basket | Cesta tributária | DROPDOWN |
| cost_price | Preço de custo | CURRENCY |
| sale_price | Preço de venda | CURRENCY |
| min_sale_price | Preço de venda mínimo | CURRENCY |
| status | Status (DRAFT/ACTIVE/INACTIVE) | DROPDOWN |

---

## 5. Fornecedor — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| person_type | Tipo de pessoa (F/J) | DROPDOWN |
| supplier_cpf | CPF | CPF |
| supplier_cnpj | CNPJ | CNPJ |
| supplier_name | Nome / Razão social | TEXT |
| trade_name | Nome fantasia | TEXT |
| ie | Inscrição estadual | TEXT |
| supplier_email | E-mail | EMAIL |
| supplier_phone | Telefone | PHONE |
| address | Endereço | TEXT |
| city | Cidade | TEXT |
| state | UF | TEXT |
| zip_code | CEP | TEXT |
| is_active | Ativo | DROPDOWN |

---

## 6. Cotação — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| supplier_name | Fornecedor | TEXT |
| status | Status (DRAFT/SENT/RECEIVED/SELECTED/REJECTED) | DROPDOWN |
| requested_at | Data solicitada | DATE |
| received_at | Data recebida | DATE |
| total | Total | CURRENCY |
| notes | Observações | TEXT |

---

## 7. Pedido de Compra — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| supplier_name | Fornecedor | TEXT |
| linked_quotation | Cotação vinculada | TEXT |
| status | Status (PENDING/CONFIRMED/RECEIVED/CANCELLED) | DROPDOWN |
| total | Total | CURRENCY |
| expected_delivery_date | Data prevista de entrega | DATE |
| notes | Observações | TEXT |

---

## 8. Tabela de Preço — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| price_table_name | Nome | TEXT |
| is_default | Tabela padrão | DROPDOWN |

---

## 9. Conta a Receber — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| client_name | Cliente | TEXT |
| description | Descrição | TEXT |
| amount | Valor | CURRENCY |
| paid_amount | Pago | CURRENCY |
| due_date | Vencimento | DATE |
| paid_date | Data de pagamento | DATE |
| status | Status (PENDING/PAID/OVERDUE) | DROPDOWN |
| linked_order_number | Pedido vinculado | TEXT |
| linked_invoice_number | NF-e vinculada | TEXT |

---

## 10. Conta a Pagar — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| supplier_name | Fornecedor | TEXT |
| description | Descrição | TEXT |
| category | Categoria | DROPDOWN |
| amount | Valor | CURRENCY |
| paid_amount | Pago | CURRENCY |
| due_date | Vencimento | DATE |
| paid_date | Data de pagamento | DATE |
| status | Status (PENDING/PAID/OVERDUE) | DROPDOWN |

---

## 11. Nota Fiscal (NF-e) — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| invoice_number | Número da NF-e | TEXT |
| direction | Direção (Entrada/Saída) | DROPDOWN |
| counterparty_name | Cliente / Fornecedor | TEXT |
| total | Total | CURRENCY |
| issued_at | Data de emissão | DATE |
| cancelled_at | Data de cancelamento | DATE |
| access_key | Chave de acesso (44 dígitos) | TEXT |
| pdf_url | URL do PDF | URL |
| linked_order_number | Pedido vinculado | TEXT |

---

## 12. Ordem de Produção — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| production_order_code | Código da OP | TEXT |
| linked_order_number | Pedido vinculado | TEXT |
| status | Status | DROPDOWN |
| type | Tipo (Sim/Não) | DROPDOWN |
| machine | Máquina | DROPDOWN |
| batch | Lote | TEXT |
| scheduled_date | Data prevista | DATE |
| completed_date | Data de conclusão | DATE |
| assigned_operator | Operador atribuído | TEXT |
| total_cost | Custo total | CURRENCY |
| unit_cost | Custo unitário | CURRENCY |
| loss_cost | Custo de perda | CURRENCY |
| unit_cost_with_loss | Custo unitário com perda | CURRENCY |
| notes | Observações | TEXT |

---

## 13. Ordem de Separação — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| separation_order_code | Código da OS | TEXT |
| linked_order_number | Pedido vinculado | TEXT |
| status | Status (PENDING/IN_PROGRESS/SEPARATED/CHECKED) | DROPDOWN |
| assigned_operator | Operador atribuído | TEXT |
| scheduled_date | Data prevista | DATE |
| completed_date | Data de conclusão | DATE |

---

## 14. Caixa — criar tasktype + fields

### Custom fields a criar
| key | label | type |
|---|---|---|
| company_name | Filial | DROPDOWN |
| opened_by | Aberto por | TEXT |
| opened_at | Data de abertura | DATE |
| closed_by | Fechado por | TEXT |
| closed_at | Data de fechamento | DATE |
| opening_balance | Saldo de abertura | CURRENCY |
| closing_balance | Saldo de fechamento | CURRENCY |

---

## Totais

| TaskType | Status | Fields totais | Já criados | A criar |
|---|---|---|---|---|
| builtin-order (Pedido) | semeado | 35 | 17 | 18 |
| builtin-stock-request (Requisição) | semeado | 10 | 7 | 3 |
| Cliente | a criar | 20 | 0 | 20 |
| Produto | a criar | 33 | 0 | 33 |
| Fornecedor | a criar | 13 | 0 | 13 |
| Cotação | a criar | 6 | 0 | 6 |
| Pedido de Compra | a criar | 6 | 0 | 6 |
| Tabela de Preço | a criar | 2 | 0 | 2 |
| Conta a Receber | a criar | 9 | 0 | 9 |
| Conta a Pagar | a criar | 8 | 0 | 8 |
| Nota Fiscal | a criar | 9 | 0 | 9 |
| Ordem de Produção | a criar | 14 | 0 | 14 |
| Ordem de Separação | a criar | 6 | 0 | 6 |
| Caixa | a criar | 7 | 0 | 7 |
| **Total** | — | **178** | **24** | **154** |
