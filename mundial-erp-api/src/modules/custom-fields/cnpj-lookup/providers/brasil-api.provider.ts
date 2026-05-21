import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  CnpjProvider,
  CnpjProviderName,
  NormalizedCnpjData,
} from '../cnpj-lookup.types';
import { emptyToNull, onlyDigits } from '../cnpj-lookup.helpers';

const CIRCUIT_RESET_MS = 60_000;
const MAX_FAILURES = 5;

interface BrasilApiCnae {
  codigo: number;
  descricao: string;
}

interface BrasilApiResponse {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  descricao_situacao_cadastral: string | null;
  data_inicio_atividade: string | null;
  cnae_fiscal: number | null;
  cnae_fiscal_descricao: string | null;
  cnaes_secundarios: BrasilApiCnae[];
  natureza_juridica: string | null;
  codigo_natureza_juridica: number | null;
  porte: string | null;
  capital_social: number | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  codigo_municipio: number | null;
  uf: string | null;
  ddd_telefone_1: string | null;
  email: string | null;
}

@Injectable()
export class BrasilApiProvider implements CnpjProvider {
  readonly name: CnpjProviderName = 'brasil-api';
  private readonly logger = new Logger(BrasilApiProvider.name);
  private readonly client: AxiosInstance;
  private failures = 0;
  private lastFailure = 0;
  private circuitOpen = false;

  constructor(private readonly config: ConfigService) {
    const timeout = this.config.get<number>('BRASIL_API_TIMEOUT_MS', 4000);
    this.client = axios.create({
      baseURL: 'https://brasilapi.com.br/api/cnpj/v1',
      timeout,
    });
  }

  isConfigured(): boolean {
    return true;
  }

  async fetch(cnpj: string): Promise<NormalizedCnpjData | null> {
    this.assertCircuit();
    try {
      const { data } = await this.client.get<BrasilApiResponse>(`/${cnpj}`);
      this.onSuccess();
      return this.normalize(data);
    } catch (err) {
      const axErr = err as AxiosError;
      if (axErr.response?.status === 404) {
        this.onSuccess();
        return null;
      }
      this.onFailure();
      this.logger.warn(
        `BrasilAPI falhou para ${cnpj}: ${axErr.message} (status ${axErr.response?.status ?? 'n/a'})`,
      );
      throw err;
    }
  }

  private normalize(d: BrasilApiResponse): NormalizedCnpjData {
    return {
      cnpj: onlyDigits(d.cnpj),
      razaoSocial: d.razao_social,
      nomeFantasia: emptyToNull(d.nome_fantasia),
      situacaoCadastral: emptyToNull(d.descricao_situacao_cadastral),
      dataAbertura: d.data_inicio_atividade || null,
      cnaePrincipal:
        d.cnae_fiscal != null
          ? {
              codigo: String(d.cnae_fiscal),
              descricao: d.cnae_fiscal_descricao ?? '',
            }
          : null,
      cnaesSecundarios: (d.cnaes_secundarios ?? []).map((c) => ({
        codigo: String(c.codigo),
        descricao: c.descricao,
      })),
      naturezaJuridica: d.codigo_natureza_juridica
        ? `${d.codigo_natureza_juridica} - ${d.natureza_juridica ?? ''}`.trim()
        : emptyToNull(d.natureza_juridica),
      porte: emptyToNull(d.porte),
      capitalSocial:
        typeof d.capital_social === 'number' ? d.capital_social : null,
      endereco: {
        logradouro: emptyToNull(d.logradouro),
        numero: emptyToNull(d.numero),
        complemento: emptyToNull(d.complemento),
        bairro: emptyToNull(d.bairro),
        cep: d.cep ? onlyDigits(d.cep) : null,
        municipio: emptyToNull(d.municipio),
        codigoMunicipio:
          d.codigo_municipio != null ? String(d.codigo_municipio) : null,
        uf: emptyToNull(d.uf),
      },
      contato: {
        telefone: d.ddd_telefone_1 ? onlyDigits(d.ddd_telefone_1) : null,
        email: emptyToNull(d.email),
      },
      fonte: this.name,
      consultadoEm: new Date().toISOString(),
    };
  }

  private assertCircuit(): void {
    if (!this.circuitOpen) return;
    if (Date.now() - this.lastFailure > CIRCUIT_RESET_MS) {
      this.circuitOpen = false;
      this.failures = 0;
      return;
    }
    throw new Error('BrasilAPI circuit OPEN');
  }

  private onSuccess(): void {
    this.failures = 0;
    this.circuitOpen = false;
  }

  private onFailure(): void {
    this.failures += 1;
    this.lastFailure = Date.now();
    if (this.failures >= MAX_FAILURES) this.circuitOpen = true;
  }
}
