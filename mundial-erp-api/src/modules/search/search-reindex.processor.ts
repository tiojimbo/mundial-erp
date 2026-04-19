import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SearchRepository } from './search.repository';
import { SearchDataRepository } from './search-data.repository';
import {
  ES_INDEX_CLIENTS,
  ES_INDEX_PRODUCTS,
  ES_INDEX_ORDERS,
  ES_INDEX_INVOICES,
  ES_INDEX_SUPPLIERS,
} from './search.constants';
import { QUEUE_SEARCH_REINDEX } from '../queue/queue.constants';

const BATCH_SIZE = 500;

interface ReindexJobData {
  entities?: string[];
}

@Processor(QUEUE_SEARCH_REINDEX)
export class SearchReindexProcessor extends WorkerHost {
  private readonly logger = new Logger(SearchReindexProcessor.name);

  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly dataRepository: SearchDataRepository,
  ) {
    super();
  }

  async process(
    job: Job<ReindexJobData>,
  ): Promise<{ indexed: number; errors: number }> {
    this.logger.log(`Reindex job ${job.id} started`);
    const entities = job.data?.entities ?? [
      'clients',
      'products',
      'orders',
      'invoices',
      'suppliers',
    ];

    let totalIndexed = 0;
    let totalErrors = 0;

    for (const entity of entities) {
      try {
        const result = await this.reindexEntity(entity, job);
        totalIndexed += result.indexed;
        totalErrors += result.errors;
      } catch (error) {
        this.logger.error(
          `Failed to reindex ${entity}: ${(error as Error).message}`,
        );
        totalErrors++;
      }
    }

    this.logger.log(
      `Reindex job ${job.id} complete: ${totalIndexed} indexed, ${totalErrors} errors`,
    );
    return { indexed: totalIndexed, errors: totalErrors };
  }

  private async reindexEntity(
    entity: string,
    job: Job,
  ): Promise<{ indexed: number; errors: number }> {
    this.logger.log(`Reindexing: ${entity}`);

    switch (entity) {
      case 'clients':
        return this.reindexClients(job);
      case 'products':
        return this.reindexProducts(job);
      case 'orders':
        return this.reindexOrders(job);
      case 'invoices':
        return this.reindexInvoices(job);
      case 'suppliers':
        return this.reindexSuppliers(job);
      default:
        this.logger.warn(`Unknown entity type: ${entity}`);
        return { indexed: 0, errors: 0 };
    }
  }

  private async reindexClients(
    job: Job,
  ): Promise<{ indexed: number; errors: number }> {
    await this.searchRepository.deleteByQuery(ES_INDEX_CLIENTS);
    const total = await this.dataRepository.countClients();
    let processed = 0;
    let indexed = 0;
    let errors = 0;

    while (processed < total) {
      const rows = await this.dataRepository.findClientsBatch(
        processed,
        BATCH_SIZE,
      );
      if (rows.length === 0) break;

      const ops = rows.map((row) => ({
        index: ES_INDEX_CLIENTS,
        id: row.id,
        body: {
          // SCOPE: workspaceId obrigatorio no doc ES — search filtra via term.
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
        },
      }));

      const result = await this.searchRepository.bulkIndex(ops);
      indexed += result.indexed;
      errors += result.errors;
      processed += rows.length;
      await job.updateProgress(Math.round((processed / total) * 100));
    }

    this.logger.log(`Clients: ${indexed} indexed, ${errors} errors`);
    return { indexed, errors };
  }

  private async reindexProducts(
    job: Job,
  ): Promise<{ indexed: number; errors: number }> {
    await this.searchRepository.deleteByQuery(ES_INDEX_PRODUCTS);
    const total = await this.dataRepository.countProducts();
    let processed = 0;
    let indexed = 0;
    let errors = 0;

    while (processed < total) {
      const rows = await this.dataRepository.findProductsBatch(
        processed,
        BATCH_SIZE,
      );
      if (rows.length === 0) break;

      const ops = rows.map((row) => ({
        index: ES_INDEX_PRODUCTS,
        id: row.id,
        body: {
          workspaceId: row.workspaceId,
          name: row.name,
          code: row.code,
          barcode: row.barcode,
          status: row.status,
          deletedAt: row.deletedAt,
          updatedAt: row.updatedAt,
        },
      }));

      const result = await this.searchRepository.bulkIndex(ops);
      indexed += result.indexed;
      errors += result.errors;
      processed += rows.length;
      await job.updateProgress(Math.round((processed / total) * 100));
    }

    this.logger.log(`Products: ${indexed} indexed, ${errors} errors`);
    return { indexed, errors };
  }

  private async reindexOrders(
    job: Job,
  ): Promise<{ indexed: number; errors: number }> {
    await this.searchRepository.deleteByQuery(ES_INDEX_ORDERS);
    const total = await this.dataRepository.countOrders();
    let processed = 0;
    let indexed = 0;
    let errors = 0;

    while (processed < total) {
      const rows = await this.dataRepository.findOrdersBatch(
        processed,
        BATCH_SIZE,
      );
      if (rows.length === 0) break;

      const ops = rows.map((row) => ({
        index: ES_INDEX_ORDERS,
        id: row.id,
        body: {
          workspaceId: row.workspaceId,
          orderNumber: row.orderNumber,
          title: row.title,
          clientName: row.client?.name ?? null,
          status: row.status,
          deletedAt: row.deletedAt,
          updatedAt: row.updatedAt,
        },
      }));

      const result = await this.searchRepository.bulkIndex(ops);
      indexed += result.indexed;
      errors += result.errors;
      processed += rows.length;
      await job.updateProgress(Math.round((processed / total) * 100));
    }

    this.logger.log(`Orders: ${indexed} indexed, ${errors} errors`);
    return { indexed, errors };
  }

  private async reindexInvoices(
    job: Job,
  ): Promise<{ indexed: number; errors: number }> {
    await this.searchRepository.deleteByQuery(ES_INDEX_INVOICES);
    const total = await this.dataRepository.countInvoices();
    let processed = 0;
    let indexed = 0;
    let errors = 0;

    while (processed < total) {
      const rows = await this.dataRepository.findInvoicesBatch(
        processed,
        BATCH_SIZE,
      );
      if (rows.length === 0) break;

      const ops = rows.map((row) => ({
        index: ES_INDEX_INVOICES,
        id: row.id,
        body: {
          // Invoice transitivo: workspaceId vem de order ou company.
          workspaceId:
            row.order?.workspaceId ?? row.company?.workspaceId ?? null,
          invoiceNumber: row.invoiceNumber,
          accessKey: row.accessKey,
          clientName: row.client?.name ?? null,
          direction: row.direction,
          deletedAt: row.deletedAt,
          updatedAt: row.updatedAt,
        },
      }));

      const result = await this.searchRepository.bulkIndex(ops);
      indexed += result.indexed;
      errors += result.errors;
      processed += rows.length;
      await job.updateProgress(Math.round((processed / total) * 100));
    }

    this.logger.log(`Invoices: ${indexed} indexed, ${errors} errors`);
    return { indexed, errors };
  }

  private async reindexSuppliers(
    job: Job,
  ): Promise<{ indexed: number; errors: number }> {
    await this.searchRepository.deleteByQuery(ES_INDEX_SUPPLIERS);
    const total = await this.dataRepository.countSuppliers();
    let processed = 0;
    let indexed = 0;
    let errors = 0;

    while (processed < total) {
      const rows = await this.dataRepository.findSuppliersBatch(
        processed,
        BATCH_SIZE,
      );
      if (rows.length === 0) break;

      const ops = rows.map((row) => ({
        index: ES_INDEX_SUPPLIERS,
        id: row.id,
        body: {
          workspaceId: row.workspaceId,
          name: row.name,
          tradeName: row.tradeName,
          cpfCnpj: row.cpfCnpj,
          email: row.email,
          state: row.state,
          deletedAt: row.deletedAt,
          updatedAt: row.updatedAt,
        },
      }));

      const result = await this.searchRepository.bulkIndex(ops);
      indexed += result.indexed;
      errors += result.errors;
      processed += rows.length;
      await job.updateProgress(Math.round((processed / total) * 100));
    }

    this.logger.log(`Suppliers: ${indexed} indexed, ${errors} errors`);
    return { indexed, errors };
  }
}
