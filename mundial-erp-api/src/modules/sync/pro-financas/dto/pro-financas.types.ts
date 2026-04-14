// ============================================================================
// Pro Finanças API response types (based on Postman collection endpoints)
// ============================================================================

export interface PfAuthResponse {
  token: string;
}

export interface PfClient {
  id: number;
  tipo: 'J' | 'F';
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string;
  ie?: string;
  rg?: string;
  email?: string;
  telefone?: string;
  end_formatado?: string;
  endereco?: string;
  numero?: string;
  bairro?: string;
  complemento?: string;
  cidade?: string;
  uf?: string;
  cod_postal?: string;
  cliente_classificacao_id?: number;
  cliente_rota_entrega_id?: number;
  created_at?: string;
  updated_at?: string;
}

export interface PfOrder {
  id: number;
  codigo: number;
  titulo?: string;
  cliente_id: number;
  empresa_id?: number;
  pedido_forma_pagamento_id?: number;
  transportadora_id?: number;
  usuario_id?: number;
  dt_emissao_tt?: number;
  dt_entrega_tt?: number;
  valor_venda?: number;
  valor_frete?: number;
  valor_desconto?: number;
  valor_st?: number;
  valor_total?: number;
  valor_pago?: number;
  finalizado?: boolean;
  pago?: boolean;
  entregue?: boolean;
  liberado?: boolean;
  pedido_fluxo_id?: number;
  pedido_tipo_id?: number;
  pedido_modelo_id?: number;
  observacao?: string;
  itens?: PfOrderItem[];
  created_at?: string;
  updated_at?: string;
}

export interface PfOrderItem {
  id: number;
  pedido_id: number;
  produto_id?: number;
  xprod?: string;
  qcom?: string;
  vuncom?: number;
  vundesc?: number;
  vtotal?: number;
  ordem?: number;
}

export interface PfCompany {
  id: number;
  razao_social: string;
  nome_fantasia?: string;
  cnpj?: string;
  ie?: string;
  telefone?: string;
  email?: string;
  logo_url?: string;
  endereco?: string;
  cidade?: string;
  uf?: string;
  cod_postal?: string;
}

export interface PfCarrier {
  id: number;
  nome: string;
}

export interface PfPaymentMethod {
  id: number;
  nome: string;
  ativo?: boolean;
}

export interface PfClientClassification {
  id: number;
  nome: string;
}

export interface PfDeliveryRoute {
  id: number;
  nome: string;
}

export interface PfOrderType {
  id: number;
  nome: string;
}

export interface PfOrderFlow {
  id: number;
  nome: string;
}

export interface PfOrderModel {
  id: number;
  nome: string;
}

export interface PfState {
  id: number;
  nome: string;
  sigla: string;
}

export interface PfCity {
  id: number;
  nome: string;
  estado_id: number;
  codigo_ibge?: string;
}
