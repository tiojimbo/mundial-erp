import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SeparationOrderStatus, Prisma } from '@prisma/client';
import { SeparationOrdersRepository } from './separation-orders.repository';
import { CreateSeparationOrderDto } from './dto/create-separation-order.dto';
import { UpdateSeparationOrderDto } from './dto/update-separation-order.dto';
import { SeparationOrderResponseDto } from './dto/separation-order-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class SeparationOrdersService {
  private readonly logger = new Logger(SeparationOrdersService.name);

  constructor(private readonly repository: SeparationOrdersRepository) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async create(
    dto: CreateSeparationOrderDto,
  ): Promise<SeparationOrderResponseDto> {
    const order = await this.repository.findOrderById(dto.orderId);
    if (!order) {
      throw new NotFoundException('Pedido não encontrado');
    }

    const code = `OS-${order.orderNumber}`;

    const itemsData = (dto.items ?? []).map((item) => ({
      orderItem: { connect: { id: item.orderItemId } },
      product: { connect: { id: item.productId } },
      quantity: item.quantity,
      pieces: item.pieces ?? null,
      stockLocation: item.stockLocation ?? null,
    }));

    const createData: Prisma.SeparationOrderCreateInput = {
      code,
      order: { connect: { id: dto.orderId } },
      status: SeparationOrderStatus.PENDING,
      ...(dto.assignedUserId && { assignedUserId: dto.assignedUserId }),
      ...(dto.scheduledDate && { scheduledDate: dto.scheduledDate }),
      ...(itemsData.length > 0 && { items: { create: itemsData } }),
    };

    const entity = await this.repository.create(createData);
    this.logger.log(`Ordem de separação ${code} criada (ID: ${entity.id})`);

    return SeparationOrderResponseDto.fromEntity(entity);
  }

  // ---------------------------------------------------------------------------
  // READ
  // ---------------------------------------------------------------------------

  async findAll(
    pagination: PaginationDto,
    filters: {
      orderId?: string;
      status?: SeparationOrderStatus;
      search?: string;
    },
  ) {
    const { items, total } = await this.repository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });

    return {
      items: items.map(SeparationOrderResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<SeparationOrderResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de separação não encontrada');
    }
    return SeparationOrderResponseDto.fromEntity(entity);
  }

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  async update(
    id: string,
    dto: UpdateSeparationOrderDto,
  ): Promise<SeparationOrderResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de separação não encontrada');
    }

    const data: Prisma.SeparationOrderUpdateInput = {};
    if (dto.assignedUserId !== undefined)
      data.assignedUserId = dto.assignedUserId;
    if (dto.scheduledDate !== undefined) data.scheduledDate = dto.scheduledDate;

    const updated = await this.repository.update(id, data);
    return SeparationOrderResponseDto.fromEntity(updated);
  }

  // ---------------------------------------------------------------------------
  // SOFT DELETE
  // ---------------------------------------------------------------------------

  async remove(id: string): Promise<void> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de separação não encontrada');
    }
    await this.repository.softDelete(id);
    this.logger.log(`Ordem de separação ${entity.code} removida`);
  }

  // ---------------------------------------------------------------------------
  // START (PENDING → IN_PROGRESS)
  // ---------------------------------------------------------------------------

  async start(id: string): Promise<SeparationOrderResponseDto> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException('Ordem de separação não encontrada');
    }

    if (entity.status !== SeparationOrderStatus.PENDING) {
      throw new BadRequestException(
        `Apenas ordens com status PENDING podem ser iniciadas. Status atual: ${entity.status}`,
      );
    }

    const updated = await this.repository.update(id, {
      status: SeparationOrderStatus.IN_PROGRESS,
    });

    this.logger.log(`Ordem de separação ${entity.code} iniciada (IN_PROGRESS)`);
    return SeparationOrderResponseDto.fromEntity(updated);
  }

  // ---------------------------------------------------------------------------
  // SEPARATE ITEM (Fix #5: apenas IN_PROGRESS permite separação)
  // ---------------------------------------------------------------------------

  async separateItem(
    separationOrderId: string,
    itemId: string,
  ): Promise<SeparationOrderResponseDto> {
    const entity = await this.repository.findById(separationOrderId);
    if (!entity) {
      throw new NotFoundException('Ordem de separação não encontrada');
    }

    if (entity.status !== SeparationOrderStatus.IN_PROGRESS) {
      throw new BadRequestException(
        `Itens só podem ser separados quando a ordem está IN_PROGRESS. Status atual: ${entity.status}`,
      );
    }

    const item = await this.repository.findItemById(itemId);
    if (!item || item.separationOrderId !== separationOrderId) {
      throw new NotFoundException('Item da ordem de separação não encontrado');
    }

    if (item.isSeparated) {
      throw new BadRequestException('Este item já foi separado');
    }

    await this.repository.updateItem(itemId, { isSeparated: true });

    // Auto-transição: todos separados → SEPARATED
    const updatedEntity = await this.repository.findById(separationOrderId);
    const allSeparated = updatedEntity!.items.every((i) => i.isSeparated);

    if (allSeparated) {
      const result = await this.repository.update(separationOrderId, {
        status: SeparationOrderStatus.SEPARATED,
      });
      this.logger.log(
        `Ordem de separação ${entity.code} totalmente separada (SEPARATED)`,
      );
      return SeparationOrderResponseDto.fromEntity(result);
    }

    return SeparationOrderResponseDto.fromEntity(updatedEntity!);
  }

  // ---------------------------------------------------------------------------
  // CHECK ITEM (Fix #4: valida isSeparated antes de permitir conferência)
  // ---------------------------------------------------------------------------

  async checkItem(
    separationOrderId: string,
    itemId: string,
  ): Promise<SeparationOrderResponseDto> {
    const entity = await this.repository.findById(separationOrderId);
    if (!entity) {
      throw new NotFoundException('Ordem de separação não encontrada');
    }

    if (entity.status === SeparationOrderStatus.CHECKED) {
      throw new BadRequestException(
        'Ordem de separação já foi conferida (CHECKED)',
      );
    }

    if (entity.status !== SeparationOrderStatus.SEPARATED) {
      throw new BadRequestException(
        `Conferência só é permitida quando a ordem está SEPARATED. Status atual: ${entity.status}`,
      );
    }

    const item = await this.repository.findItemById(itemId);
    if (!item || item.separationOrderId !== separationOrderId) {
      throw new NotFoundException('Item da ordem de separação não encontrado');
    }

    if (!item.isSeparated) {
      throw new BadRequestException(
        'Item precisa ser separado antes de ser conferido',
      );
    }

    if (item.isChecked) {
      throw new BadRequestException('Este item já foi conferido');
    }

    await this.repository.updateItem(itemId, { isChecked: true });

    // Auto-transição: todos conferidos → CHECKED
    const updatedEntity = await this.repository.findById(separationOrderId);
    const allChecked = updatedEntity!.items.every((i) => i.isChecked);

    if (allChecked) {
      const result = await this.repository.update(separationOrderId, {
        status: SeparationOrderStatus.CHECKED,
        completedDate: new Date(),
      });
      this.logger.log(
        `Ordem de separação ${entity.code} totalmente conferida (CHECKED)`,
      );
      return SeparationOrderResponseDto.fromEntity(result);
    }

    return SeparationOrderResponseDto.fromEntity(updatedEntity!);
  }
}
