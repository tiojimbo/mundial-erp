import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * Repository that abstracts PostgreSQL access for the Search module.
 * Used by:
 * - SearchService (fallback queries when ES is down)
 * - SearchIndexerService (fetching entity data to index)
 * - SearchReindexProcessor (batch fetching for reindexation)
 */
@Injectable()
export class SearchDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== Fetch single entity (for indexing) ====================

  async findClientById(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }

  async findProductById(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findOrderById(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { client: { select: { name: true } } },
    });
  }

  async findInvoiceById(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: { client: { select: { name: true } } },
    });
  }

  async findSupplierById(id: string) {
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  // ==================== Fallback search (ILIKE on PostgreSQL) ====================

  async searchClients(query: string, skip: number, take: number) {
    const where = {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { tradeName: { contains: query, mode: 'insensitive' as const } },
        { cpfCnpj: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
        { phone: { contains: query, mode: 'insensitive' as const } },
        { city: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.client.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' } }),
      this.prisma.client.count({ where }),
    ]);
    return { items, total };
  }

  async searchProducts(query: string, skip: number, take: number) {
    const where = {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { code: { contains: query, mode: 'insensitive' as const } },
        { barcode: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' } }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  async searchOrders(query: string, skip: number, take: number) {
    const where = {
      deletedAt: null,
      OR: [
        { orderNumber: { contains: query, mode: 'insensitive' as const } },
        { title: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take,
        include: { client: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { items, total };
  }

  async searchInvoices(query: string, skip: number, take: number) {
    const where = {
      deletedAt: null,
      OR: [
        { invoiceNumber: { contains: query, mode: 'insensitive' as const } },
        { accessKey: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        include: { client: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { items, total };
  }

  async searchSuppliers(query: string, skip: number, take: number) {
    const where = {
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { tradeName: { contains: query, mode: 'insensitive' as const } },
        { cpfCnpj: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip, take, orderBy: { updatedAt: 'desc' } }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total };
  }

  // ==================== Batch fetch (for reindexation) ====================

  async countClients() {
    return this.prisma.client.count();
  }

  async findClientsBatch(skip: number, take: number) {
    return this.prisma.client.findMany({ skip, take, orderBy: { createdAt: 'asc' } });
  }

  async countProducts() {
    return this.prisma.product.count();
  }

  async findProductsBatch(skip: number, take: number) {
    return this.prisma.product.findMany({ skip, take, orderBy: { createdAt: 'asc' } });
  }

  async countOrders() {
    return this.prisma.order.count();
  }

  async findOrdersBatch(skip: number, take: number) {
    return this.prisma.order.findMany({
      skip,
      take,
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countInvoices() {
    return this.prisma.invoice.count();
  }

  async findInvoicesBatch(skip: number, take: number) {
    return this.prisma.invoice.findMany({
      skip,
      take,
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countSuppliers() {
    return this.prisma.supplier.count();
  }

  async findSuppliersBatch(skip: number, take: number) {
    return this.prisma.supplier.findMany({ skip, take, orderBy: { createdAt: 'asc' } });
  }
}
