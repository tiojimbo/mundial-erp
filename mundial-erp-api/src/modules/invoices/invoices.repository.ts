import { Injectable } from '@nestjs/common';
import { InvoiceDirection, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class InvoicesRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Invoice NÃO possui workspaceId direto. Escopo via order/company/client.
   * Pelo menos UMA dessas relações deve estar presente para garantir o escopo.
   */
  private workspaceFilter(workspaceId: string): Prisma.InvoiceWhereInput {
    return {
      OR: [
        { order: { workspaceId } },
        { company: { workspaceId } },
        { client: { workspaceId } },
      ],
    };
  }

  async create(_workspaceId: string, data: Prisma.InvoiceCreateInput) {
    return this.prisma.invoice.create({
      data,
      include: this.fullInclude(),
    });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.invoice.findFirst({
      where: {
        id,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
      include: this.fullInclude(),
    });
  }

  async findMany(
    workspaceId: string,
    params: {
      skip?: number;
      take?: number;
      direction?: InvoiceDirection;
      clientId?: string;
      companyId?: string;
      orderId?: string;
    },
  ) {
    const {
      skip = 0,
      take = 20,
      direction,
      clientId,
      companyId,
      orderId,
    } = params;

    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...this.workspaceFilter(workspaceId),
      ...(direction && { direction }),
      ...(clientId && { clientId }),
      ...(companyId && { companyId }),
      ...(orderId && { orderId }),
    };

    const [items, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          direction: true,
          totalCents: true,
          accessKey: true,
          issuedAt: true,
          createdAt: true,
          client: { select: { id: true, name: true } },
          order: { select: { id: true, orderNumber: true } },
          company: { select: { id: true, tradeName: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { items, total };
  }

  async findByAccessKey(workspaceId: string, accessKey: string) {
    return this.prisma.invoice.findFirst({
      where: {
        accessKey,
        deletedAt: null,
        ...this.workspaceFilter(workspaceId),
      },
      include: this.fullInclude(),
    });
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.InvoiceUpdateInput,
  ) {
    return this.prisma.invoice.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.invoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private fullInclude() {
    return {
      client: true,
      order: true,
      company: true,
      accountsReceivable: true,
    };
  }
}
