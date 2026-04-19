import { Injectable } from '@nestjs/common';
import { Prisma, ProductClassification, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    productType: true,
    departmentCategory: true,
    brand: true,
    unitMeasure: true,
    boxUnitMeasure: true,
    defaultPriceTable: true,
    formula: {
      include: {
        ingredients: { include: { ingredient: true, unitMeasure: true } },
      },
    },
    images: {
      where: { deletedAt: null },
      orderBy: { sortOrder: 'asc' as const },
    },
  };

  async create(workspaceId: string, data: Prisma.ProductCreateInput) {
    return this.prisma.product.create({
      data: {
        ...data,
        workspace: { connect: { id: workspaceId } },
      },
      include: this.defaultInclude,
    });
  }

  async exists(workspaceId: string, id: string): Promise<boolean> {
    const count = await this.prisma.product.count({
      where: { id, workspaceId, deletedAt: null },
    });
    return count > 0;
  }

  async findById(workspaceId: string, id: string) {
    return this.prisma.product.findFirst({
      where: { id, workspaceId, deletedAt: null },
      include: this.defaultInclude,
    });
  }

  async findByCode(workspaceId: string, code: string) {
    return this.prisma.product.findFirst({
      where: { code, workspaceId, deletedAt: null },
      include: this.defaultInclude,
    });
  }

  async findByBarcode(workspaceId: string, barcode: string) {
    return this.prisma.product.findFirst({
      where: { barcode, workspaceId, deletedAt: null },
      include: this.defaultInclude,
    });
  }

  async findMany(
    workspaceId: string,
    params: {
      skip?: number;
      take?: number;
      search?: string;
      status?: ProductStatus;
      classification?: ProductClassification;
      productTypeId?: string;
      brandId?: string;
      departmentCategoryId?: string;
    },
  ) {
    const {
      skip = 0,
      take = 20,
      search,
      status,
      classification,
      productTypeId,
      brandId,
      departmentCategoryId,
    } = params;

    const where: Prisma.ProductWhereInput = {
      workspaceId,
      deletedAt: null,
      ...(status && { status }),
      ...(classification && { classification }),
      ...(productTypeId && { productTypeId }),
      ...(brandId && { brandId }),
      ...(departmentCategoryId && { departmentCategoryId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { code: { contains: search, mode: 'insensitive' as const } },
          { barcode: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          productType: true,
          departmentCategory: true,
          brand: true,
          unitMeasure: true,
          images: {
            where: { deletedAt: null },
            orderBy: { sortOrder: 'asc' as const },
            take: 1,
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items, total };
  }

  async update(
    _workspaceId: string,
    id: string,
    data: Prisma.ProductUpdateInput,
  ) {
    return this.prisma.product.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });
  }

  async softDelete(_workspaceId: string, id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async incrementTypeSequentialAndCreate(
    workspaceId: string,
    productTypeId: string,
    data: Prisma.ProductCreateInput,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const productType = await tx.productType.update({
        where: { id: productTypeId },
        data: { lastSequential: { increment: 1 } },
      });

      const seq = productType.lastSequential;
      const code = `${productType.prefix}-${String(seq).padStart(4, '0')}`;

      // EAN-13: 2[DDDD][SSSSSSS][C] = 1+4+7+1 = 13 dígitos
      const raw = `2${productType.eanDeptCode}${String(seq).padStart(7, '0')}`;
      let s1 = 0;
      let s2 = 0;
      for (let i = 0; i < 12; i++) {
        if (i % 2 === 0) s1 += parseInt(raw[i]);
        else s2 += parseInt(raw[i]);
      }
      const checkDigit = (10 - ((s1 + s2 * 3) % 10)) % 10;
      const barcode = `${raw}${checkDigit}`;

      const product = await tx.product.create({
        data: {
          ...data,
          code,
          barcode,
          productType: { connect: { id: productTypeId } },
          workspace: { connect: { id: workspaceId } },
        },
        include: {
          productType: true,
          departmentCategory: true,
          brand: true,
          unitMeasure: true,
          boxUnitMeasure: true,
          defaultPriceTable: true,
          formula: {
            include: {
              ingredients: { include: { ingredient: true, unitMeasure: true } },
            },
          },
          images: { where: { deletedAt: null }, orderBy: { sortOrder: 'asc' } },
        },
      });

      return product;
    });
  }
}
