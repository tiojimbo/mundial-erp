import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DashboardsRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // Dashboard CRUD
  // ---------------------------------------------------------------------------

  async create(data: Prisma.DashboardCreateInput) {
    return this.prisma.dashboard.create({
      data,
      include: this.fullInclude(),
    });
  }

  async findById(id: string) {
    return this.prisma.dashboard.findFirst({
      where: { id, deletedAt: null },
      include: this.fullInclude(),
    });
  }

  async findMany(params: { skip?: number; take?: number; ownerId: string }) {
    const { skip = 0, take = 20, ownerId } = params;

    const where: Prisma.DashboardWhereInput = {
      deletedAt: null,
      OR: [{ ownerId }, { isPublic: true }],
    };

    const [items, total] = await Promise.all([
      this.prisma.dashboard.findMany({
        where,
        skip,
        take,
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          name: true,
          description: true,
          isPublic: true,
          sortOrder: true,
          createdAt: true,
          owner: { select: { id: true, name: true } },
          _count: { select: { cards: true, filters: true } },
        },
      }),
      this.prisma.dashboard.count({ where }),
    ]);

    return { items, total };
  }

  async update(id: string, data: Prisma.DashboardUpdateInput) {
    return this.prisma.dashboard.update({
      where: { id },
      data,
      include: this.fullInclude(),
    });
  }

  async softDelete(id: string) {
    return this.prisma.dashboard.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ---------------------------------------------------------------------------
  // Cards
  // ---------------------------------------------------------------------------

  async createCard(data: Prisma.DashboardCardCreateInput) {
    return this.prisma.dashboardCard.create({ data });
  }

  async findCardById(id: string) {
    return this.prisma.dashboardCard.findUnique({
      where: { id },
      include: { dashboard: { select: { id: true, ownerId: true, deletedAt: true } } },
    });
  }

  async updateCard(id: string, data: Prisma.DashboardCardUpdateInput) {
    return this.prisma.dashboardCard.update({ where: { id }, data });
  }

  async deleteCard(id: string) {
    return this.prisma.dashboardCard.delete({ where: { id } });
  }

  async updateLayoutBatch(cards: { cardId: string; layoutX: number; layoutY: number; layoutW: number; layoutH: number }[]) {
    return this.prisma.$transaction(
      cards.map((c) =>
        this.prisma.dashboardCard.update({
          where: { id: c.cardId },
          data: {
            layoutX: c.layoutX,
            layoutY: c.layoutY,
            layoutW: c.layoutW,
            layoutH: c.layoutH,
          },
        }),
      ),
    );
  }

  // ---------------------------------------------------------------------------
  // Filters
  // ---------------------------------------------------------------------------

  async createFilter(data: Prisma.DashboardFilterCreateInput) {
    return this.prisma.dashboardFilter.create({ data });
  }

  async findFilterById(id: string) {
    return this.prisma.dashboardFilter.findUnique({
      where: { id },
      include: { dashboard: { select: { id: true, ownerId: true, deletedAt: true } } },
    });
  }

  async deleteFilter(id: string) {
    return this.prisma.dashboardFilter.delete({ where: { id } });
  }

  async findFiltersByDashboardId(dashboardId: string) {
    return this.prisma.dashboardFilter.findMany({
      where: { dashboardId },
    });
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private fullInclude() {
    return {
      owner: { select: { id: true, name: true } },
      cards: { orderBy: { sortOrder: 'asc' as const } },
      filters: true,
    };
  }
}
