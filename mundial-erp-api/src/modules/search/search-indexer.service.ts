import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SearchRepository } from './search.repository';
import { SearchDataRepository } from './search-data.repository';
import {
  ES_INDEX_CLIENTS,
  ES_INDEX_PRODUCTS,
  ES_INDEX_ORDERS,
  ES_INDEX_INVOICES,
  ES_INDEX_SUPPLIERS,
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_BREAKER_RESET_MS,
} from './search.constants';

export interface SearchIndexEvent {
  entity: 'client' | 'product' | 'order' | 'invoice' | 'supplier';
  action: 'created' | 'updated' | 'deleted';
  entityId: string;
}

type CircuitState = 'closed' | 'open' | 'half-open';

@Injectable()
export class SearchIndexerService {
  private readonly logger = new Logger(SearchIndexerService.name);

  private circuitState: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly dataRepository: SearchDataRepository,
  ) {}

  /**
   * Listens to `search.index` events emitted by domain modules (bridge pattern).
   */
  @OnEvent('search.index')
  async handleSearchIndex(event: SearchIndexEvent): Promise<void> {
    this.logger.debug(
      `Received search.index: ${event.entity}.${event.action} [${event.entityId}]`,
    );

    if (this.isCircuitOpen()) {
      this.logger.debug(
        `Circuit breaker OPEN — skipping indexing for ${event.entity} ${event.entityId}`,
      );
      return;
    }

    try {
      if (event.action === 'deleted') {
        await this.handleDelete(event);
      } else {
        await this.handleUpsert(event);
      }
      this.onSuccess();
    } catch (error) {
      this.onFailure(error as Error);
      this.logger.error(
        `Failed to index ${event.entity} ${event.entityId}: ${(error as Error).message ?? error}`,
      );
    }
  }

  /**
   * Direct domain event listeners for modules without a bridge listener.
   */
  @OnEvent('client.created')
  async onClientCreated(event: { clientId: string }) {
    await this.handleSearchIndex({
      entity: 'client',
      action: 'created',
      entityId: event.clientId,
    });
  }

  @OnEvent('client.updated')
  async onClientUpdated(event: { clientId: string }) {
    await this.handleSearchIndex({
      entity: 'client',
      action: 'updated',
      entityId: event.clientId,
    });
  }

  @OnEvent('client.deleted')
  async onClientDeleted(event: { clientId: string }) {
    await this.handleSearchIndex({
      entity: 'client',
      action: 'deleted',
      entityId: event.clientId,
    });
  }

  @OnEvent('product.created')
  async onProductCreated(event: { productId: string }) {
    await this.handleSearchIndex({
      entity: 'product',
      action: 'created',
      entityId: event.productId,
    });
  }

  @OnEvent('product.updated')
  async onProductUpdated(event: { productId: string }) {
    await this.handleSearchIndex({
      entity: 'product',
      action: 'updated',
      entityId: event.productId,
    });
  }

  @OnEvent('product.deleted')
  async onProductDeleted(event: { productId: string }) {
    await this.handleSearchIndex({
      entity: 'product',
      action: 'deleted',
      entityId: event.productId,
    });
  }

  @OnEvent('supplier.created')
  async onSupplierCreated(event: { supplierId: string }) {
    await this.handleSearchIndex({
      entity: 'supplier',
      action: 'created',
      entityId: event.supplierId,
    });
  }

  @OnEvent('supplier.updated')
  async onSupplierUpdated(event: { supplierId: string }) {
    await this.handleSearchIndex({
      entity: 'supplier',
      action: 'updated',
      entityId: event.supplierId,
    });
  }

  @OnEvent('supplier.deleted')
  async onSupplierDeleted(event: { supplierId: string }) {
    await this.handleSearchIndex({
      entity: 'supplier',
      action: 'deleted',
      entityId: event.supplierId,
    });
  }

  @OnEvent('invoice.created')
  async onInvoiceCreated(event: { invoiceId: string }) {
    await this.handleSearchIndex({
      entity: 'invoice',
      action: 'created',
      entityId: event.invoiceId,
    });
  }

  @OnEvent('invoice.updated')
  async onInvoiceUpdated(event: { invoiceId: string }) {
    await this.handleSearchIndex({
      entity: 'invoice',
      action: 'updated',
      entityId: event.invoiceId,
    });
  }

  @OnEvent('invoice.deleted')
  async onInvoiceDeleted(event: { invoiceId: string }) {
    await this.handleSearchIndex({
      entity: 'invoice',
      action: 'deleted',
      entityId: event.invoiceId,
    });
  }

  // -- Private handlers --

  private async handleDelete(event: SearchIndexEvent): Promise<void> {
    const index = this.getIndex(event.entity);
    if (!index) {
      this.logger.warn(`Unknown entity type: ${event.entity}`);
      return;
    }
    await this.searchRepository.deleteDocument(index, event.entityId);
    this.logger.debug(`Deleted ${event.entity} ${event.entityId} from ES`);
  }

  private async handleUpsert(event: SearchIndexEvent): Promise<void> {
    const doc = await this.fetchDocument(event.entity, event.entityId);
    if (!doc) {
      this.logger.debug(
        `Entity ${event.entity} ${event.entityId} not found in DB, skipping`,
      );
      return;
    }

    const index = this.getIndex(event.entity);
    if (!index) {
      this.logger.warn(`Unknown entity type: ${event.entity}`);
      return;
    }
    await this.searchRepository.indexDocument(index, event.entityId, doc);
    this.logger.debug(`Indexed ${event.entity} ${event.entityId}`);
  }

  private getIndex(entity: string): string | null {
    const map: Record<string, string> = {
      client: ES_INDEX_CLIENTS,
      product: ES_INDEX_PRODUCTS,
      order: ES_INDEX_ORDERS,
      invoice: ES_INDEX_INVOICES,
      supplier: ES_INDEX_SUPPLIERS,
    };
    return map[entity] ?? null;
  }

  /**
   * Fetch entity from PostgreSQL via repository and map to ES document shape.
   */
  private async fetchDocument(
    entity: string,
    id: string,
  ): Promise<Record<string, unknown> | null> {
    switch (entity) {
      case 'client':
        return this.fetchClient(id);
      case 'product':
        return this.fetchProduct(id);
      case 'order':
        return this.fetchOrder(id);
      case 'invoice':
        return this.fetchInvoice(id);
      case 'supplier':
        return this.fetchSupplier(id);
      default:
        this.logger.warn(`Unknown entity type for fetch: ${entity}`);
        return null;
    }
  }

  // SCOPE: indexer SEMPRE inclui `workspaceId` no doc ES — search.repository
  // filtra via term query. Sem isso, busca multi-tenant vazaria entre
  // workspaces. Para Invoice (transitivo), workspaceId vem de
  // order.workspaceId OU company.workspaceId (vide schema).

  private async fetchClient(
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.dataRepository.findClientByIdForIndexer(id);
    if (!row) return null;
    return {
      workspaceId: row.workspaceId,
      name: row.name,
      tradeName: row.tradeName,
      cpfCnpj: row.cpfCnpj,
      email: row.email,
      phone: row.phone,
      city: row.city,
      state: row.state,
      deletedAt: row.deletedAt,
      updatedAt: row.updatedAt,
    };
  }

  private async fetchProduct(
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.dataRepository.findProductByIdForIndexer(id);
    if (!row) return null;
    return {
      workspaceId: row.workspaceId,
      name: row.name,
      code: row.code,
      barcode: row.barcode,
      status: row.status,
      deletedAt: row.deletedAt,
      updatedAt: row.updatedAt,
    };
  }

  private async fetchOrder(
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.dataRepository.findOrderByIdForIndexer(id);
    if (!row) return null;
    return {
      workspaceId: row.workspaceId,
      orderNumber: row.orderNumber,
      title: row.title,
      clientName: row.client?.name ?? null,
      status: row.status,
      deletedAt: row.deletedAt,
      updatedAt: row.updatedAt,
    };
  }

  private async fetchInvoice(
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.dataRepository.findInvoiceByIdForIndexer(id);
    if (!row) return null;
    // Invoice transitivo: deriva workspaceId de order ou company.
    const workspaceId =
      row.order?.workspaceId ?? row.company?.workspaceId ?? null;
    return {
      workspaceId,
      invoiceNumber: row.invoiceNumber,
      accessKey: row.accessKey,
      clientName: row.client?.name ?? null,
      direction: row.direction,
      deletedAt: row.deletedAt,
      updatedAt: row.updatedAt,
    };
  }

  private async fetchSupplier(
    id: string,
  ): Promise<Record<string, unknown> | null> {
    const row = await this.dataRepository.findSupplierByIdForIndexer(id);
    if (!row) return null;
    return {
      workspaceId: row.workspaceId,
      name: row.name,
      tradeName: row.tradeName,
      cpfCnpj: row.cpfCnpj,
      email: row.email,
      state: row.state,
      deletedAt: row.deletedAt,
      updatedAt: row.updatedAt,
    };
  }

  // -- Circuit breaker logic --

  private isCircuitOpen(): boolean {
    if (this.circuitState === 'closed') return false;
    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= CIRCUIT_BREAKER_RESET_MS) {
        this.circuitState = 'half-open';
        this.logger.log(
          'Indexer circuit breaker → HALF-OPEN (attempting ES again)',
        );
        return false;
      }
      return true;
    }
    // half-open: allow one attempt
    return false;
  }

  private onSuccess(): void {
    if (this.circuitState !== 'closed') {
      this.logger.log('Indexer circuit breaker → CLOSED (ES recovered)');
    }
    this.circuitState = 'closed';
    this.failureCount = 0;
  }

  private onFailure(_error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitState = 'open';
      this.logger.error(
        `Indexer circuit breaker → OPEN after ${this.failureCount} failures (ES unreachable). Indexing suspended for ${CIRCUIT_BREAKER_RESET_MS / 1000}s`,
      );
    }
  }
}
