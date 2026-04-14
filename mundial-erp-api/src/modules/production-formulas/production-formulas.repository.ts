import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ProductionFormulasRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultInclude = {
    ingredients: {
      where: { deletedAt: null },
      include: { ingredient: true, unitMeasure: true },
    },
    product: true,
  };

  async create(data: Prisma.ProductionFormulaCreateInput) {
    return this.prisma.productionFormula.create({
      data,
      include: this.defaultInclude,
    });
  }

  async findById(id: string) {
    return this.prisma.productionFormula.findFirst({
      where: { id, deletedAt: null },
      include: this.defaultInclude,
    });
  }

  async findByProductId(productId: string) {
    return this.prisma.productionFormula.findFirst({
      where: {
        product: { id: productId },
        deletedAt: null,
      },
      include: this.defaultInclude,
    });
  }

  async findMany(params: { skip?: number; take?: number; search?: string }) {
    const { skip = 0, take = 20, search } = params;
    const where: Prisma.ProductionFormulaWhereInput = {
      deletedAt: null,
      ...(search && {
        name: { contains: search, mode: 'insensitive' as const },
      }),
    };
    const [items, total] = await Promise.all([
      this.prisma.productionFormula.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        include: this.defaultInclude,
      }),
      this.prisma.productionFormula.count({ where }),
    ]);
    return { items, total };
  }

  async update(id: string, data: Prisma.ProductionFormulaUpdateInput) {
    return this.prisma.productionFormula.update({
      where: { id },
      data,
      include: this.defaultInclude,
    });
  }

  async softDelete(id: string) {
    return this.prisma.productionFormula.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // --- Ingredients ---
  async addIngredient(data: Prisma.ProductionFormulaIngredientCreateInput) {
    return this.prisma.productionFormulaIngredient.create({
      data,
      include: { ingredient: true, unitMeasure: true },
    });
  }

  async findIngredientById(id: string) {
    return this.prisma.productionFormulaIngredient.findFirst({
      where: { id, deletedAt: null },
      include: { ingredient: true, unitMeasure: true },
    });
  }

  async updateIngredient(id: string, data: Prisma.ProductionFormulaIngredientUpdateInput) {
    return this.prisma.productionFormulaIngredient.update({
      where: { id },
      data,
      include: { ingredient: true, unitMeasure: true },
    });
  }

  async removeIngredient(id: string) {
    return this.prisma.productionFormulaIngredient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
