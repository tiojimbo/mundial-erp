export type CnpjAutofillFieldSpec = {
  key: string;
  label: string;
  type: 'TEXT' | 'EMAIL' | 'PHONE' | 'DATE' | 'CURRENCY';
  autofillSource: string;
  sortOrder: number;
};

export const CNPJ_AUTOFILL_FIELDS: readonly CnpjAutofillFieldSpec[] = [
  { key: 'cnpj_af_razao_social', label: 'Razão Social', type: 'TEXT', autofillSource: 'razaoSocial', sortOrder: 1 },
  { key: 'cnpj_af_nome_fantasia', label: 'Nome Fantasia', type: 'TEXT', autofillSource: 'nomeFantasia', sortOrder: 2 },
  { key: 'cnpj_af_email', label: 'E-mail', type: 'EMAIL', autofillSource: 'contato.email', sortOrder: 3 },
  { key: 'cnpj_af_telefone', label: 'Telefone', type: 'PHONE', autofillSource: 'contato.telefone', sortOrder: 4 },
  { key: 'cnpj_af_cep', label: 'CEP', type: 'TEXT', autofillSource: 'endereco.cep', sortOrder: 5 },
  { key: 'cnpj_af_logradouro', label: 'Logradouro', type: 'TEXT', autofillSource: 'endereco.logradouro', sortOrder: 6 },
  { key: 'cnpj_af_numero', label: 'Número', type: 'TEXT', autofillSource: 'endereco.numero', sortOrder: 7 },
  { key: 'cnpj_af_complemento', label: 'Complemento', type: 'TEXT', autofillSource: 'endereco.complemento', sortOrder: 8 },
  { key: 'cnpj_af_bairro', label: 'Bairro', type: 'TEXT', autofillSource: 'endereco.bairro', sortOrder: 9 },
  { key: 'cnpj_af_municipio', label: 'Cidade', type: 'TEXT', autofillSource: 'endereco.municipio', sortOrder: 10 },
  { key: 'cnpj_af_uf', label: 'UF', type: 'TEXT', autofillSource: 'endereco.uf', sortOrder: 11 },
  { key: 'cnpj_af_data_abertura', label: 'Data de Abertura', type: 'DATE', autofillSource: 'dataAbertura', sortOrder: 12 },
  { key: 'cnpj_af_situacao', label: 'Situação Cadastral', type: 'TEXT', autofillSource: 'situacaoCadastral', sortOrder: 13 },
  { key: 'cnpj_af_natureza', label: 'Natureza Jurídica', type: 'TEXT', autofillSource: 'naturezaJuridica', sortOrder: 14 },
  { key: 'cnpj_af_cnae_codigo', label: 'CNAE Código', type: 'TEXT', autofillSource: 'cnaePrincipal.codigo', sortOrder: 15 },
  { key: 'cnpj_af_cnae_descricao', label: 'CNAE Descrição', type: 'TEXT', autofillSource: 'cnaePrincipal.descricao', sortOrder: 16 },
  { key: 'cnpj_af_porte', label: 'Porte', type: 'TEXT', autofillSource: 'porte', sortOrder: 17 },
  { key: 'cnpj_af_capital_social', label: 'Capital Social', type: 'CURRENCY', autofillSource: 'capitalSocial', sortOrder: 18 },
] as const;
