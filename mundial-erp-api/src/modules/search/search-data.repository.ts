import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

// SCOPE: métodos públicos exigem workspaceId. forIndexer e *Batch(undefined)
// são USO INTERNO — confiam no caller (event listener / admin reindex).
@Injectable()
export class SearchDataRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findClientByIdForIndexer(id: string) {
    return this.prisma.client.findUnique({ where: { id } });
  }

  async findProductByIdForIndexer(id: string) {
    return this.prisma.product.findUnique({ where: { id } });
  }

  async findOrderByIdForIndexer(id: string) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { client: { select: { name: true } } },
    });
  }

  async findInvoiceByIdForIndexer(id: string) {
    return this.prisma.invoice.findUnique({
      where: { id },
      include: {
        client: { select: { name: true } },
        order: { select: { workspaceId: true } },
        company: { select: { workspaceId: true } },
      },
    });
  }

  async findSupplierByIdForIndexer(id: string) {
    return this.prisma.supplier.findUnique({ where: { id } });
  }

  async findClientById(workspaceId: string, id: string) {
    return this.prisma.client.findFirst({ where: { id, workspaceId } });
  }

  async findProductById(workspaceId: string, id: string) {
    return this.prisma.product.findFirst({ where: { id, workspaceId } });
  }

  async findOrderById(workspaceId: string, id: string) {
    return this.prisma.order.findFirst({
      where: { id, workspaceId },
      include: { client: { select: { name: true } } },
    });
  }

  async findInvoiceById(workspaceId: string, id: string) {
    // Invoice e transitivo: workspaceId via order/company/client.
    return this.prisma.invoice.findFirst({
      where: {
        id,
        OR: [
          { order: { workspaceId } },
          { company: { workspaceId } },
          { client: { workspaceId } },
        ],
      },
      include: { client: { select: { name: true } } },
    });
  }

  async findSupplierById(workspaceId: string, id: string) {
    return this.prisma.supplier.findFirst({ where: { id, workspaceId } });
  }

  async searchClients(
    workspaceId: string,
    query: string,
    skip: number,
    take: number,
  ) {
    const where = {
      workspaceId,
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
      this.prisma.client.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.client.count({ where }),
    ]);
    return { items, total };
  }

  async searchProducts(
    workspaceId: string,
    query: string,
    skip: number,
    take: number,
  ) {
    const where = {
      workspaceId,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { code: { contains: query, mode: 'insensitive' as const } },
        { barcode: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);
    return { items, total };
  }

  async searchOrders(
    workspaceId: string,
    query: string,
    skip: number,
    take: number,
  ) {
    const where = {
      workspaceId,
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

  async searchInvoices(
    workspaceId: string,
    query: string,
    skip: number,
    take: number,
  ) {
    // Invoice transitivo via order/company/client.
    const where = {
      OR: [
        { order: { workspaceId } },
        { company: { workspaceId } },
        { client: { workspaceId } },
      ],
      deletedAt: null,
      AND: {
        OR: [
          { invoiceNumber: { contains: query, mode: 'insensitive' as const } },
          { accessKey: { contains: query, mode: 'insensitive' as const } },
        ],
      },
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

  async searchSuppliers(
    workspaceId: string,
    query: string,
    skip: number,
    take: number,
  ) {
    const where = {
      workspaceId,
      deletedAt: null,
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { tradeName: { contains: query, mode: 'insensitive' as const } },
        { cpfCnpj: { contains: query, mode: 'insensitive' as const } },
        { email: { contains: query, mode: 'insensitive' as const } },
      ],
    };
    const [items, total] = await Promise.all([
      this.prisma.supplier.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.supplier.count({ where }),
    ]);
    return { items, total };
  }

  // workspaceId undefined = reindex GLOBAL admin; demais chamadas passam id.
  private maybeWs(workspaceId?: string) {
    return workspaceId ? { workspaceId } : {};
  }

  async countClients(workspaceId?: string) {
    return this.prisma.client.count({ where: this.maybeWs(workspaceId) });
  }

  async findClientsBatch(skip: number, take: number, workspaceId?: string) {
    return this.prisma.client.findMany({
      where: this.maybeWs(workspaceId),
      skip,
      take,
      orderBy: { createdAt: 'asc' },
    });
  }

  async countProducts(workspaceId?: string) {
    return this.prisma.product.count({ where: this.maybeWs(workspaceId) });
  }

  async findProductsBatch(skip: number, take: number, workspaceId?: string) {
    return this.prisma.product.findMany({
      where: this.maybeWs(workspaceId),
      skip,
      take,
      orderBy: { createdAt: 'asc' },
    });
  }

  async countOrders(workspaceId?: string) {
    return this.prisma.order.count({ where: this.maybeWs(workspaceId) });
  }

  async findOrdersBatch(skip: number, take: number, workspaceId?: string) {
    return this.prisma.order.findMany({
      where: this.maybeWs(workspaceId),
      skip,
      take,
      include: { client: { select: { name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countInvoices(workspaceId?: string) {
    if (!workspaceId) return this.prisma.invoice.count();
    return this.prisma.invoice.count({
      where: {
        OR: [
          { order: { workspaceId } },
          { company: { workspaceId } },
          { client: { workspaceId } },
        ],
      },
    });
  }

  async findInvoicesBatch(skip: number, take: number, workspaceId?: string) {
    return this.prisma.invoice.findMany({
      where: workspaceId
        ? {
            OR: [
              { order: { workspaceId } },
              { company: { workspaceId } },
              { client: { workspaceId } },
            ],
          }
        : {},
      skip,
      take,
      include: {
        client: { select: { name: true } },
        order: { select: { workspaceId: true } },
        company: { select: { workspaceId: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async countSuppliers(workspaceId?: string) {
    return this.prisma.supplier.count({ where: this.maybeWs(workspaceId) });
  }

  async findSuppliersBatch(skip: number, take: number, workspaceId?: string) {
    return this.prisma.supplier.findMany({
      where: this.maybeWs(workspaceId),
      skip,
      take,
      orderBy: { createdAt: 'asc' },
    });
  }
}
