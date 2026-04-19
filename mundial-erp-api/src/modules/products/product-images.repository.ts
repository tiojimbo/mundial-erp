import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProductImagesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.ProductImageCreateInput) {
    return this.prisma.productImage.create({ data });
  }

  async findById(id: string) {
    return this.prisma.productImage.findFirst({
      where: { id, deletedAt: null },
    });
  }

  async findByProductId(productId: string) {
    return this.prisma.productImage.findMany({
      where: { productId, deletedAt: null },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(id: string, data: Prisma.ProductImageUpdateInput) {
    return this.prisma.productImage.update({ where: { id }, data });
  }

  async softDelete(id: string) {
    return this.prisma.productImage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async reorder(productId: string, imageIds: string[]) {
    const updates = imageIds.map((imageId, index) =>
      this.prisma.productImage.update({
        where: { id: imageId },
        data: { sortOrder: index },
      }),
    );
    return this.prisma.$transaction(updates);
  }
}
