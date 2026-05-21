export type CnpjProviderName = 'brasil-api' | 'receita-ws';

export interface NormalizedCnpjData {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  situacaoCadastral: string | null;
  dataAbertura: string | null;
  cnaePrincipal: { codigo: string; descricao: string } | null;
  cnaesSecundarios: { codigo: string; descricao: string }[];
  naturezaJuridica: string | null;
  porte: string | null;
  capitalSocial: number | null;
  endereco: {
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cep: string | null;
    municipio: string | null;
    codigoMunicipio: string | null;
    uf: string | null;
  };
  contato: {
    telefone: string | null;
    email: string | null;
  };
  fonte: CnpjProviderName;
  consultadoEm: string;
}

export interface CnpjProvider {
  readonly name: CnpjProviderName;
  isConfigured(): boolean;
  // Retorna null em 404 (CNPJ inexistente na fonte); lanca erro em
  // indisponibilidade (timeout/5xx/circuito aberto) para o service
  // distinguir "tenta proxima fonte" de "404 ao usuario".
  fetch(cnpj: string): Promise<NormalizedCnpjData | null>;
}
