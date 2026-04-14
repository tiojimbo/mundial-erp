import { Injectable, NotFoundException } from '@nestjs/common';
import { ProductImagesRepository } from './product-images.repository';
import { ProductsRepository } from './products.repository';
import { CreateProductImageDto } from './dto/create-product-image.dto';
import { ProductImageResponseDto } from './dto/product-image-response.dto';

@Injectable()
export class ProductImagesService {
  constructor(
    private readonly productImagesRepository: ProductImagesRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  private async ensureProductExists(productId: string): Promise<void> {
    const exists = await this.productsRepository.exists(productId);
    if (!exists) {
      throw new NotFoundException('Produto não encontrado');
    }
  }

  async create(productId: string, dto: CreateProductImageDto): Promise<ProductImageResponseDto> {
    await this.ensureProductExists(productId);

    const image = await this.productImagesRepository.create({
      product: { connect: { id: productId } },
      url: dto.url,
      sortOrder: dto.sortOrder ?? 0,
    });
    return ProductImageResponseDto.fromEntity(image);
  }

  async findByProductId(productId: string): Promise<ProductImageResponseDto[]> {
    await this.ensureProductExists(productId);

    const images = await this.productImagesRepository.findByProductId(productId);
    return images.map(ProductImageResponseDto.fromEntity);
  }

  async remove(productId: string, imageId: string): Promise<void> {
    const image = await this.productImagesRepository.findById(imageId);
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Imagem não encontrada para este produto');
    }
    await this.productImagesRepository.softDelete(imageId);
  }

  async reorder(productId: string, imageIds: string[]): Promise<ProductImageResponseDto[]> {
    await this.ensureProductExists(productId);

    await this.productImagesRepository.reorder(productId, imageIds);
    const images = await this.productImagesRepository.findByProductId(productId);
    return images.map(ProductImageResponseDto.fromEntity);
  }
}
