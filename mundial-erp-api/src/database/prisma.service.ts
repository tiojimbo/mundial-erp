import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { primaryAssigneeCacheExtension } from './extensions/primary-assignee-cache.extension';

/**
 * Type do client após `$extends`. Usamos `ReturnType` para derivar em vez
 * de digitar à mão — o Prisma gera o shape correto sem que precisemos
 * enumerar todos os delegates.
 */
type ExtendedPrismaClient = ReturnType<PrismaClient['$extends']>;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  /**
   * Client estendido (com a extension `primary-assignee-cache` — ADR-001).
   * Consumidores que precisam do delegate `workItemAssignee` com o hook
   * ativo devem usar `this.extended` ou o getter `db`.
   *
   * Os delegates padrão do `PrismaClient` continuam disponíveis diretamente
   * em `this` para compatibilidade com repositories existentes.
   */
  private readonly _extended: ExtendedPrismaClient;

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    });
    super({ adapter });
    this._extended = this.$extends(primaryAssigneeCacheExtension);
  }

  /**
   * Client estendido com todas as extensions registradas. Preferir este
   * getter ao invocar delegates sujeitos a hooks (`workItemAssignee`).
   */
  get db(): ExtendedPrismaClient {
    return this._extended;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
