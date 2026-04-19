import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';

@Injectable()
export class SectorsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * NOTA: Sector NÃO possui workspaceId direto. O escopo é validado via department.
   * Service deve chamar `findById(workspaceId, id)` antes de update/delete para
   * garantir ownership.
   */
  async create(_workspaceId: string, data: Prisma.SectorCreateInput) {
    return this.prisma.sector.create({ data });
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.sector.findFirst({
      where: {
        id,
        deletedAt: null,
        department: { workspaceId },
      },
      include: {
        department: { select: { id: true, name: true, slug: true } },
      },
    });
  }

  async findBySlug(workspaceId: string, slug: string) {
    return this.prisma.sector.findFirst({
      where: {
        slug,
        deletedAt: null,
        department: { workspaceId },
      },
    });
  }

  async findMany(
    workspaceId: string,
    params: { skip?: number; take?: number },
  ) {
    const { skip = 0, take = 20 } = params;
    const where: Prisma.SectorWhereInput = {
      deletedAt: null,
      department: { workspaceId },
    };
    const [items, total] = await Promise.all([
      this.prisma.sector.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: {
          department: { select: { id: true, name: true } },
        },
      }),
      this.prisma.sector.count({ where }),
    ]);
    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.SectorUpdateInput,
  ) {
    // Ownership já foi validada via findById no service.
    return this.prisma.sector.update({ where: { id }, data });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.sector.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
