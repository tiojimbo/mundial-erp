import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StatusTemplatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(workspaceId: string) {
    return this.prisma.statusTemplate.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  findById(workspaceId: string, id: string) {
    return this.prisma.statusTemplate.findFirst({
      where: { id, workspaceId },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  create(
    workspaceId: string,
    data: {
      name: string;
      items: Array<{
        name: string;
        type: string;
        color: string;
        position: number;
      }>;
    },
  ) {
    return this.prisma.statusTemplate.create({
      data: {
        name: data.name,
        workspace: { connect: { id: workspaceId } },
        items: {
          create: data.items.map((item) => ({
            name: item.name,
            type: item.type as Prisma.StatusTemplateItemCreateInput['type'],
            color: item.color,
            position: item.position,
          })),
        },
      },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }

  remove(workspaceId: string, id: string) {
    return this.prisma.statusTemplate.delete({
      where: { id, workspaceId },
      include: { items: { orderBy: { position: 'asc' } } },
    });
  }
}
