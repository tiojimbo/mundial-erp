import { Injectable, Logger } from '@nestjs/common';
import { validateCnpj } from '../validators/cnpj.validator';
import { CnpjLookupCache } from './cnpj-lookup.cache';
import {
  AllProvidersDownError,
  CnpjNotFoundError,
  InvalidCnpjError,
} from './cnpj-lookup.errors';
import { BrasilApiProvider } from './providers/brasil-api.provider';
import { ReceitaWsProvider } from './providers/receita-ws.provider';
import type { CnpjProvider, NormalizedCnpjData } from './cnpj-lookup.types';

@Injectable()
export class CnpjLookupService {
  private readonly logger = new Logger(CnpjLookupService.name);
  private readonly chain: CnpjProvider[];

  constructor(
    private readonly cache: CnpjLookupCache,
    brasilApi: BrasilApiProvider,
    receitaWs: ReceitaWsProvider,
  ) {
    this.chain = [brasilApi, receitaWs];
  }

  async lookup(rawCnpj: string): Promise<NormalizedCnpjData> {
    const check = validateCnpj(rawCnpj);
    if (!check.valid || !check.normalized) {
      throw new InvalidCnpjError(check.reason ?? 'CNPJ inválido');
    }
    const cnpj = check.normalized;

    const cached = await this.cache.get(cnpj);
    if (cached) return cached;

    let anyResponded = false;

    for (const provider of this.chain) {
      if (!provider.isConfigured()) continue;
      try {
        const data = await provider.fetch(cnpj);
        anyResponded = true;
        if (data) {
          await this.cache.set(cnpj, data);
          return data;
        }
      } catch (err) {
        this.logger.warn(
          `Provider ${provider.name} indisponível: ${(err as Error).message}`,
        );
      }
    }

    // Algum provider respondeu (mas todos com "nao encontrado") => 404.
    // Nenhum respondeu (todos lancaram/circuito aberto) => 502.
    if (anyResponded) throw new CnpjNotFoundError();
    throw new AllProvidersDownError();
  }
}
