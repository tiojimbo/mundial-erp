import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, ProductClassification, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  private async validateRelationIds(dto: { brandId?: string; departmentCategoryId?: string; unitMeasureId?: string; boxUnitMeasureId?: string }) {
    const checks: Promise<void>[] = [];
    if (dto.brandId) {
      checks.push(
        this.prisma.brand.findFirstOrThrow({ where: { id: dto.brandId, deletedAt: null } })
          .catch(() => { throw new BadRequestException(`Marca "${dto.brandId}" não encontrada`); })
          .then(() => undefined),
      );
    }
    if (dto.departmentCategoryId) {
      checks.push(
        this.prisma.productDepartment.findFirstOrThrow({ where: { id: dto.departmentCategoryId, deletedAt: null } })
          .catch(() => { throw new BadRequestException(`Departamento "${dto.departmentCategoryId}" não encontrado`); })
          .then(() => undefined),
      );
    }
    if (dto.unitMeasureId) {
      checks.push(
        this.prisma.unitMeasure.findFirstOrThrow({ where: { id: dto.unitMeasureId, deletedAt: null } })
          .catch(() => { throw new BadRequestException(`Unidade de medida "${dto.unitMeasureId}" não encontrada`); })
          .then(() => undefined),
      );
    }
    if (dto.boxUnitMeasureId) {
      checks.push(
        this.prisma.unitMeasure.findFirstOrThrow({ where: { id: dto.boxUnitMeasureId, deletedAt: null } })
          .catch(() => { throw new BadRequestException(`Unidade de medida (caixa) "${dto.boxUnitMeasureId}" não encontrada`); })
          .then(() => undefined),
      );
    }
    await Promise.all(checks);
  }

  async create(dto: CreateProductDto): Promise<ProductResponseDto> {
    const { productTypeId, ...rest } = dto;

    await this.validateRelationIds(rest);

    const createData = {
      name: rest.name,
      code: '', // placeholder — overridden inside transaction
      productType: { connect: { id: productTypeId } },
      ...(rest.departmentCategoryId && { departmentCategory: { connect: { id: rest.departmentCategoryId } } }),
      ...(rest.brandId && { brand: { connect: { id: rest.brandId } } }),
      ...(rest.unitMeasureId && { unitMeasure: { connect: { id: rest.unitMeasureId } } }),
      ...(rest.boxUnitMeasureId && { boxUnitMeasure: { connect: { id: rest.boxUnitMeasureId } } }),
      ...(rest.unitsPerBox !== undefined && { unitsPerBox: rest.unitsPerBox }),
      step1Complete: this.isStep1Complete(dto),
    } satisfies Prisma.ProductCreateInput;

    const product = await this.productsRepository.incrementTypeSequentialAndCreate(
      productTypeId,
      createData,
    );

    this.eventEmitter.emit('product.created', { productId: product.id });
    return ProductResponseDto.fromEntity(product);
  }

  async findAll(
    pagination: PaginationDto,
    filters: {
      search?: string;
      status?: ProductStatus;
      classification?: ProductClassification;
      productTypeId?: string;
      brandId?: string;
      departmentCategoryId?: string;
    },
  ) {
    const { items, total } = await this.productsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });
    return { items: items.map(ProductResponseDto.fromEntity), total };
  }

  async findById(id: string): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    return ProductResponseDto.fromEntity(product);
  }

  async findByBarcode(barcode: string): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findByBarcode(barcode);
    if (!product) {
      throw new NotFoundException('Produto não encontrado para o código de barras informado');
    }
    return ProductResponseDto.fromEntity(product);
  }

  async update(id: string, dto: UpdateProductDto): Promise<ProductResponseDto> {
    const existing = await this.productsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException('Produto não encontrado');
    }

    await this.validateRelationIds(dto);

    // Build update data — code and barcode are immutable
    const updateData: Prisma.ProductUpdateInput = {};

    // Step 1 fields (code/barcode are NEVER changed)
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.departmentCategoryId !== undefined) {
      updateData.departmentCategory = dto.departmentCategoryId
        ? { connect: { id: dto.departmentCategoryId } }
        : { disconnect: true };
    }
    if (dto.brandId !== undefined) {
      updateData.brand = dto.brandId
        ? { connect: { id: dto.brandId } }
        : { disconnect: true };
    }
    if (dto.unitMeasureId !== undefined) {
      updateData.unitMeasure = dto.unitMeasureId
        ? { connect: { id: dto.unitMeasureId } }
        : { disconnect: true };
    }
    if (dto.boxUnitMeasureId !== undefined) {
      updateData.boxUnitMeasure = dto.boxUnitMeasureId
        ? { connect: { id: dto.boxUnitMeasureId } }
        : { disconnect: true };
    }
    if (dto.unitsPerBox !== undefined) updateData.unitsPerBox = dto.unitsPerBox;

    // Step 2 fields
    if (dto.weight !== undefined) updateData.weight = dto.weight;
    if (dto.width !== undefined) updateData.width = dto.width;
    if (dto.height !== undefined) updateData.height = dto.height;
    if (dto.length !== undefined) updateData.length = dto.length;
    if (dto.weightM3 !== undefined) updateData.weightM3 = dto.weightM3;
    if (dto.productionCapacity !== undefined) updateData.productionCapacity = dto.productionCapacity;
    if (dto.stockLocation !== undefined) updateData.stockLocation = dto.stockLocation;
    if (dto.minStock !== undefined) updateData.minStock = dto.minStock;
    if (dto.piecesPerUnit !== undefined) updateData.piecesPerUnit = dto.piecesPerUnit;
    if (dto.size !== undefined) updateData.size = dto.size;
    if (dto.classification !== undefined) updateData.classification = dto.classification;
    if (dto.loadCapacity !== undefined) updateData.loadCapacity = dto.loadCapacity;
    if (dto.beta !== undefined) updateData.beta = dto.beta;
    if (dto.fckMpa !== undefined) updateData.fckMpa = dto.fckMpa;

    // Step 3 fields
    if (dto.ncmCode !== undefined) updateData.ncmCode = dto.ncmCode;
    if (dto.nfeOriginId !== undefined) updateData.nfeOriginId = dto.nfeOriginId;
    if (dto.cfopDefault !== undefined) updateData.cfopDefault = dto.cfopDefault;
    if (dto.ipiRate !== undefined) updateData.ipiRate = dto.ipiRate;
    if (dto.taxBasketId !== undefined) updateData.taxBasketId = dto.taxBasketId;

    // Step 4 fields
    if (dto.costPrice !== undefined) updateData.costPrice = dto.costPrice;
    if (dto.salePrice !== undefined) updateData.salePrice = dto.salePrice;
    if (dto.minSalePrice !== undefined) updateData.minSalePrice = dto.minSalePrice;
    if (dto.defaultPriceTableId !== undefined) {
      updateData.defaultPriceTable = dto.defaultPriceTableId
        ? { connect: { id: dto.defaultPriceTableId } }
        : { disconnect: true };
    }
    if (dto.formulaId !== undefined) {
      updateData.formula = dto.formulaId
        ? { connect: { id: dto.formulaId } }
        : { disconnect: true };
    }

    if (dto.proFinancasId !== undefined) updateData.proFinancasId = dto.proFinancasId;

    // Merge existing + updates to compute step completions
    const merged: Record<string, unknown> = { ...existing, ...this.flattenRelationUpdates(dto, existing as Record<string, unknown>) };

    updateData.step1Complete = this.computeStep1Complete(merged);
    updateData.step2Complete = this.computeStep2Complete(merged);
    updateData.step3Complete = this.computeStep3Complete(merged);

    // Business rule: Step 3 must be complete before Step 4 can advance
    const step3Done = updateData.step3Complete;
    updateData.step4Complete = step3Done && this.computeStep4Complete(merged);

    // Business rule: FABRICACAO_PROPRIA requires formulaId
    const classification = merged.classification;
    if (
      classification === ProductClassification.FABRICACAO_PROPRIA &&
      !merged.formulaId &&
      updateData.step4Complete
    ) {
      throw new BadRequestException(
        'Produtos FABRICACAO_PROPRIA exigem fórmula de produção (formulaId) para completar etapa 4',
      );
    }

    // Auto-compute status
    const allStepsComplete =
      updateData.step1Complete &&
      updateData.step2Complete &&
      updateData.step3Complete &&
      updateData.step4Complete;

    if (allStepsComplete && existing.status === ProductStatus.DRAFT) {
      updateData.status = ProductStatus.ACTIVE;
    }

    const updated = await this.productsRepository.update(id, updateData);
    this.eventEmitter.emit('product.updated', { productId: updated.id });
    return ProductResponseDto.fromEntity(updated);
  }

  async activate(id: string): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }

    if (!product.step1Complete || !product.step2Complete || !product.step3Complete || !product.step4Complete) {
      throw new BadRequestException(
        'Produto só pode ser ativado quando todas as 4 etapas estiverem completas',
      );
    }

    if (
      product.classification === ProductClassification.FABRICACAO_PROPRIA &&
      !product.formulaId
    ) {
      throw new BadRequestException(
        'Produtos FABRICACAO_PROPRIA exigem fórmula de produção para ativação',
      );
    }

    const updated = await this.productsRepository.update(id, {
      status: ProductStatus.ACTIVE,
    });
    this.eventEmitter.emit('product.updated', { productId: updated.id });
    return ProductResponseDto.fromEntity(updated);
  }

  async deactivate(id: string): Promise<ProductResponseDto> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    const updated = await this.productsRepository.update(id, {
      status: ProductStatus.INACTIVE,
    });
    this.eventEmitter.emit('product.updated', { productId: updated.id });
    return ProductResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const product = await this.productsRepository.findById(id);
    if (!product) {
      throw new NotFoundException('Produto não encontrado');
    }
    await this.productsRepository.softDelete(id);
    this.eventEmitter.emit('product.deleted', { productId: id });
  }

  // ─── Step Completion Helpers ──────────────────────────────────

  private isStep1Complete(dto: CreateProductDto): boolean {
    return !!(
      dto.name &&
      dto.productTypeId &&
      dto.departmentCategoryId &&
      dto.brandId &&
      dto.unitMeasureId
    );
  }

  private computeStep1Complete(product: Record<string, unknown>): boolean {
    return !!(
      product.name &&
      product.productTypeId &&
      product.departmentCategoryId &&
      product.brandId &&
      product.unitMeasureId
    );
  }

  private computeStep2Complete(product: Record<string, unknown>): boolean {
    const hasRequiredDimensions =
      product.weight != null &&
      product.width != null &&
      product.height != null &&
      product.length != null &&
      product.classification;

    if (!hasRequiredDimensions) return false;

    // minStock must be != 0 for FABRICACAO_PROPRIA and MATERIA_PRIMA
    const classification = product.classification as ProductClassification | null;
    if (
      classification === ProductClassification.FABRICACAO_PROPRIA ||
      classification === ProductClassification.MATERIA_PRIMA
    ) {
      return (product.minStock as number) !== 0;
    }

    return true;
  }

  private computeStep3Complete(product: Record<string, unknown>): boolean {
    return !!product.ncmCode;
  }

  private computeStep4Complete(product: Record<string, unknown>): boolean {
    return !!((product.salePrice as number) > 0);
  }

  private flattenRelationUpdates(dto: UpdateProductDto, existing: Record<string, unknown>): Record<string, unknown> {
    return {
      name: dto.name ?? existing.name,
      productTypeId: existing.productTypeId,
      departmentCategoryId: dto.departmentCategoryId ?? existing.departmentCategoryId,
      brandId: dto.brandId ?? existing.brandId,
      unitMeasureId: dto.unitMeasureId ?? existing.unitMeasureId,
      boxUnitMeasureId: dto.boxUnitMeasureId ?? existing.boxUnitMeasureId,
      unitsPerBox: dto.unitsPerBox ?? existing.unitsPerBox,
      weight: dto.weight ?? existing.weight,
      width: dto.width ?? existing.width,
      height: dto.height ?? existing.height,
      length: dto.length ?? existing.length,
      weightM3: dto.weightM3 ?? existing.weightM3,
      productionCapacity: dto.productionCapacity ?? existing.productionCapacity,
      stockLocation: dto.stockLocation ?? existing.stockLocation,
      minStock: dto.minStock ?? existing.minStock,
      piecesPerUnit: dto.piecesPerUnit ?? existing.piecesPerUnit,
      size: dto.size ?? existing.size,
      classification: dto.classification ?? existing.classification,
      loadCapacity: dto.loadCapacity ?? existing.loadCapacity,
      beta: dto.beta ?? existing.beta,
      fckMpa: dto.fckMpa ?? existing.fckMpa,
      ncmCode: dto.ncmCode ?? existing.ncmCode,
      nfeOriginId: dto.nfeOriginId ?? existing.nfeOriginId,
      cfopDefault: dto.cfopDefault ?? existing.cfopDefault,
      ipiRate: dto.ipiRate ?? existing.ipiRate,
      taxBasketId: dto.taxBasketId ?? existing.taxBasketId,
      costPrice: dto.costPrice ?? existing.costPrice,
      salePrice: dto.salePrice ?? existing.salePrice,
      minSalePrice: dto.minSalePrice ?? existing.minSalePrice,
      defaultPriceTableId: dto.defaultPriceTableId ?? existing.defaultPriceTableId,
      formulaId: dto.formulaId ?? existing.formulaId,
    };
  }
}
