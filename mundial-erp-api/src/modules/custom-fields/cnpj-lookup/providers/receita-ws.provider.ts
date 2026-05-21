import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  CnpjProvider,
  CnpjProviderName,
  NormalizedCnpjData,
} from '../cnpj-lookup.types';
import { brDateToIso, emptyToNull, onlyDigits } from '../cnpj-lookup.helpers';

const CIRCUIT_RESET_MS = 60_000;
const MAX_FAILURES = 3;

interface ReceitaWsAtividade {
  code: string;
  text: string;
}

interface ReceitaWsResponse {
  status: 'OK' | 'ERROR';
  message?: string;
  cnpj: string;
  nome: string;
  fantasia: string | null;
  situacao: string | null;
  abertura: string | null;
  atividade_principal: ReceitaWsAtividade[];
  atividades_secundarias: ReceitaWsAtividade[];
  natureza_juridica: string | null;
  porte: string | null;
  capital_social: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cep: string | null;
  municipio: string | null;
  uf: string | null;
  telefone: string | null;
  email: string | null;
}

@Injectable()
export class ReceitaWsProvider implements CnpjProvider {
  readonly name: CnpjProviderName = 'receita-ws';
  private readonly logger = new Logger(ReceitaWsProvider.name);
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private failures = 0;
  private lastFailure = 0;
  private circuitOpen = false;

  constructor(private readonly config: ConfigService) {
    const timeout = this.config.get<number>('RECEITA_WS_TIMEOUT_MS', 6000);
    this.apiKey = this.config.get<string>('RECEITA_WS_API_KEY', '');
    this.client = axios.create({
      baseURL: 'https://receitaws.com.br/v1/cnpj',
      timeout,
      headers: this.apiKey
        ? { Authorization: `Bearer ${this.apiKey}` }
        : undefined,
    });
  }

  isConfigured(): boolean {
    return true;
  }

  async fetch(cnpj: string): Promise<NormalizedCnpjData | null> {
    this.assertCircuit();
    try {
      const { data } = await this.client.get<ReceitaWsResponse>(`/${cnpj}`);
      if (data.status === 'ERROR') {
        this.onSuccess();
        // ReceitaWS responde 200 com status ERROR para CNPJ inexistente.
        return null;
      }
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
        `ReceitaWS falhou para ${cnpj}: ${axErr.message} (status ${axErr.response?.status ?? 'n/a'})`,
      );
      throw err;
    }
  }

  private normalize(d: ReceitaWsResponse): NormalizedCnpjData {
    const principal = d.atividade_principal?.[0] ?? null;
    return {
      cnpj: onlyDigits(d.cnpj),
      razaoSocial: d.nome,
      nomeFantasia: emptyToNull(d.fantasia),
      situacaoCadastral: emptyToNull(d.situacao),
      dataAbertura: brDateToIso(d.abertura),
      cnaePrincipal: principal
        ? { codigo: onlyDigits(principal.code), descricao: principal.text }
        : null,
      cnaesSecundarios: (d.atividades_secundarias ?? [])
        .filter((a) => a.code && a.code !== '00.00-0-00')
        .map((a) => ({ codigo: onlyDigits(a.code), descricao: a.text })),
      naturezaJuridica: emptyToNull(d.natureza_juridica),
      porte: emptyToNull(d.porte),
      capitalSocial: d.capital_social ? Number(d.capital_social) : null,
      endereco: {
        logradouro: emptyToNull(d.logradouro),
        numero: emptyToNull(d.numero),
        complemento: emptyToNull(d.complemento),
        bairro: emptyToNull(d.bairro),
        cep: d.cep ? onlyDigits(d.cep) : null,
        municipio: emptyToNull(d.municipio),
        codigoMunicipio: null,
        uf: emptyToNull(d.uf),
      },
      contato: {
        telefone: d.telefone ? onlyDigits(d.telefone) : null,
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
    throw new Error('ReceitaWS circuit OPEN');
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
