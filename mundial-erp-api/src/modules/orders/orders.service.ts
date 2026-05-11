import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderItemSupplyStatus, OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { OrdersRepository } from './orders.repository';
import {
  OrderStatusMachine,
  TransitionContext,
} from '../bpm/engine/order-status-machine';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { CreateOrderItemSupplyDto } from './dto/create-order-item-supply.dto';
import { ToggleSupplyDto } from './dto/toggle-supply.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrderItemSupplyResponseDto } from './dto/order-item-supply-response.dto';
import { OrderTimelineEntryDto } from './dto/order-timeline-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly statusMachine: OrderStatusMachine,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------------

  async create(
    workspaceId: string,
    dto: CreateOrderDto,
    userId: string,
  ): Promise<OrderResponseDto> {
    // Validar FK obrigatorio (escopado por workspace)
    const client = await this.prisma.client.findFirst({
      where: { id: dto.clientId, workspaceId, deletedAt: null },
    });
    if (!client) {
      throw new BadRequestException(`Cliente "${dto.clientId}" nao encontrado`);
    }

    // Validar FKs opcionais
    if (dto.companyId) {
      const company = await this.prisma.company.findFirst({
        where: { id: dto.companyId, workspaceId, deletedAt: null },
      });
      if (!company)
        throw new BadRequestException(
          `Empresa "${dto.companyId}" nao encontrada`,
        );
    }
    if (dto.paymentMethodId) {
      const pm = await this.prisma.paymentMethod.findFirst({
        where: { id: dto.paymentMethodId, deletedAt: null },
      });
      if (!pm)
        throw new BadRequestException(
          `Forma de pagamento "${dto.paymentMethodId}" nao encontrada`,
        );
    }

    const orderNumber = await this.ordersRepository.generateOrderNumber();

    const itemsData = (dto.items ?? []).map((item, index) => {
      const totalCents =
        Math.round(item.quantity * item.unitPriceCents) -
        (item.discountCents ?? 0);
      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        discountCents: item.discountCents ?? 0,
        totalCents: Math.max(totalCents, 0),
        sortOrder: item.sortOrder ?? index,
        pieces: item.pieces,
        size: item.size,
        supplies: item.supplies?.filter((s) => s.name.trim()) ?? [],
      };
    });

    const subtotalCents = itemsData.reduce((sum, i) => sum + i.totalCents, 0);
    const freightCents = dto.freightCents ?? 0;
    const discountCents = dto.discountCents ?? 0;
    const taxSubstitutionCents = dto.taxSubstitutionCents ?? 0;
    const totalCents =
      subtotalCents + freightCents - discountCents + taxSubstitutionCents;

    const createData: Prisma.OrderCreateInput = {
      orderNumber,
      title: dto.title,
      status: OrderStatus.EM_ORCAMENTO,
      client: { connect: { id: dto.clientId } },
      createdBy: { connect: { id: userId } },
      issueDate: new Date(),
      subtotalCents,
      freightCents,
      discountCents,
      taxSubstitutionCents,
      totalCents: Math.max(totalCents, 0),
      proposalValidityDays: dto.proposalValidityDays ?? 7,
      deliveryAddress: dto.deliveryAddress,
      deliveryNeighborhood: dto.deliveryNeighborhood,
      deliveryCity: dto.deliveryCity,
      deliveryState: dto.deliveryState,
      deliveryCep: dto.deliveryCep,
      deliveryReferencePoint: dto.deliveryReferencePoint,
      contactName: dto.contactName,
      shouldProduce: dto.shouldProduce ?? false,
      isResale: dto.isResale ?? false,
      hasTaxSubstitution: dto.hasTaxSubstitution ?? false,
      notes: dto.notes,
      ...(dto.companyId && { company: { connect: { id: dto.companyId } } }),
      ...(dto.paymentMethodId && {
        paymentMethod: { connect: { id: dto.paymentMethodId } },
      }),
      ...(dto.carrierId && { carrier: { connect: { id: dto.carrierId } } }),
      ...(dto.priceTableId && {
        priceTable: { connect: { id: dto.priceTableId } },
      }),
      ...(dto.assignedUserId && {
        assignedTo: { connect: { id: dto.assignedUserId } },
      }),
      ...(dto.deliveryDeadline && {
        deliveryDeadline: new Date(dto.deliveryDeadline),
      }),
      ...(dto.orderTypeId && {
        orderType: { connect: { id: dto.orderTypeId } },
      }),
      ...(dto.orderFlowId && {
        orderFlow: { connect: { id: dto.orderFlowId } },
      }),
      ...(dto.orderModelId && {
        orderModel: { connect: { id: dto.orderModelId } },
      }),
      ...(itemsData.length > 0 && {
        items: {
          create: itemsData.map((item) => ({
            product: { connect: { id: item.productId } },
            quantity: item.quantity,
            unitPriceCents: item.unitPriceCents,
            discountCents: item.discountCents,
            totalCents: item.totalCents,
            sortOrder: item.sortOrder,
            pieces: item.pieces,
            size: item.size,
            ...(item.supplies.length > 0 && {
              supplies: {
                create: item.supplies.map((s) => ({
                  name: s.name,
                  quantity: s.quantity ?? 1,
                  status: OrderItemSupplyStatus.PENDING,
                  ...(s.productId && {
                    product: { connect: { id: s.productId } },
                  }),
                })),
              },
            }),
          })),
        },
      }),
      statusHistory: {
        create: {
          fromStatus: OrderStatus.EM_ORCAMENTO,
          toStatus: OrderStatus.EM_ORCAMENTO,
          changedByUserId: userId,
          reason: 'Pedido criado',
        },
      },
    };

    const entity = await this.ordersRepository.create(workspaceId, createData);

    this.eventEmitter.emit('order.created', {
      orderId: entity.id,
      orderNumber: entity.orderNumber,
    });

    this.logger.log(`Pedido ${orderNumber} criado (ID: ${entity.id})`);

    return OrderResponseDto.fromEntity(
      entity,
      this.statusMachine.getAvailableTransitions(entity.status),
    );
  }

  async findAll(
    workspaceId: string,
    pagination: PaginationDto,
    filters: {
      search?: string;
      status?: OrderStatus;
      clientId?: string;
      createdByUserId?: string;
    },
  ) {
    const { items, total } = await this.ordersRepository.findMany(workspaceId, {
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });

    return {
      items: items.map((entity) =>
        OrderResponseDto.fromEntity(
          entity,
          this.statusMachine.getAvailableTransitions(entity.status),
        ),
      ),
      total,
    };
  }

  async findById(workspaceId: string, id: string): Promise<OrderResponseDto> {
    const entity = await this.ordersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Pedido nao encontrado');
    }
    return OrderResponseDto.fromEntity(
      entity,
      this.statusMachine.getAvailableTransitions(entity.status),
    );
  }

  async update(
    workspaceId: string,
    id: string,
    dto: UpdateOrderDto,
  ): Promise<OrderResponseDto> {
    const entity = await this.ordersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    if (entity.status !== OrderStatus.EM_ORCAMENTO) {
      throw new BadRequestException(
        `Pedido so pode ser editado no status EM_ORCAMENTO. Status atual: ${entity.status}`,
      );
    }

    const updateData: Prisma.OrderUpdateInput = {};

    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.deliveryDeadline !== undefined)
      updateData.deliveryDeadline = new Date(dto.deliveryDeadline);
    if (dto.proposalValidityDays !== undefined)
      updateData.proposalValidityDays = dto.proposalValidityDays;
    if (dto.deliveryAddress !== undefined)
      updateData.deliveryAddress = dto.deliveryAddress;
    if (dto.deliveryNeighborhood !== undefined)
      updateData.deliveryNeighborhood = dto.deliveryNeighborhood;
    if (dto.deliveryCity !== undefined)
      updateData.deliveryCity = dto.deliveryCity;
    if (dto.deliveryState !== undefined)
      updateData.deliveryState = dto.deliveryState;
    if (dto.deliveryCep !== undefined) updateData.deliveryCep = dto.deliveryCep;
    if (dto.deliveryReferencePoint !== undefined)
      updateData.deliveryReferencePoint = dto.deliveryReferencePoint;
    if (dto.contactName !== undefined) updateData.contactName = dto.contactName;
    if (dto.freightCents !== undefined)
      updateData.freightCents = dto.freightCents;
    if (dto.discountCents !== undefined)
      updateData.discountCents = dto.discountCents;
    if (dto.taxSubstitutionCents !== undefined)
      updateData.taxSubstitutionCents = dto.taxSubstitutionCents;
    if (dto.shouldProduce !== undefined)
      updateData.shouldProduce = dto.shouldProduce;
    if (dto.isResale !== undefined) updateData.isResale = dto.isResale;
    if (dto.hasTaxSubstitution !== undefined)
      updateData.hasTaxSubstitution = dto.hasTaxSubstitution;
    if (dto.notes !== undefined) updateData.notes = dto.notes;

    if (dto.companyId !== undefined) {
      updateData.company = dto.companyId
        ? { connect: { id: dto.companyId } }
        : { disconnect: true };
    }
    if (dto.paymentMethodId !== undefined) {
      updateData.paymentMethod = dto.paymentMethodId
        ? { connect: { id: dto.paymentMethodId } }
        : { disconnect: true };
    }
    if (dto.carrierId !== undefined) {
      updateData.carrier = dto.carrierId
        ? { connect: { id: dto.carrierId } }
        : { disconnect: true };
    }
    if (dto.priceTableId !== undefined) {
      updateData.priceTable = dto.priceTableId
        ? { connect: { id: dto.priceTableId } }
        : { disconnect: true };
    }
    if (dto.assignedUserId !== undefined) {
      updateData.assignedTo = dto.assignedUserId
        ? { connect: { id: dto.assignedUserId } }
        : { disconnect: true };
    }
    if (dto.orderTypeId !== undefined) {
      updateData.orderType = dto.orderTypeId
        ? { connect: { id: dto.orderTypeId } }
        : { disconnect: true };
    }
    if (dto.orderFlowId !== undefined) {
      updateData.orderFlow = dto.orderFlowId
        ? { connect: { id: dto.orderFlowId } }
        : { disconnect: true };
    }
    if (dto.orderModelId !== undefined) {
      updateData.orderModel = dto.orderModelId
        ? { connect: { id: dto.orderModelId } }
        : { disconnect: true };
    }

    if (dto.items !== undefined) {
      const newItems = dto.items.map((item, index) => {
        const itemTotal =
          Math.round(item.quantity * item.unitPriceCents) -
          (item.discountCents ?? 0);
        return {
          orderId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents,
          discountCents: item.discountCents ?? 0,
          totalCents: Math.max(itemTotal, 0),
          sortOrder: item.sortOrder ?? index,
          pieces: item.pieces ?? null,
          size: item.size ?? null,
        };
      });

      const subtotalCents = newItems.reduce((sum, i) => sum + i.totalCents, 0);
      const freightCents = dto.freightCents ?? entity.freightCents;
      const disc = dto.discountCents ?? entity.discountCents;
      const tax = dto.taxSubstitutionCents ?? entity.taxSubstitutionCents;
      const totalCentsCalc = subtotalCents + freightCents - disc + tax;

      await this.prisma.$transaction([
        this.prisma.orderItem.updateMany({
          where: { orderId: id, deletedAt: null },
          data: { deletedAt: new Date() },
        }),
        this.prisma.orderItem.createMany({ data: newItems }),
        this.prisma.order.update({
          where: { id },
          data: {
            ...updateData,
            subtotalCents,
            totalCents: Math.max(totalCentsCalc, 0),
          },
        }),
      ]);
    } else {
      await this.ordersRepository.update(workspaceId, id, updateData);
    }

    const result = await this.ordersRepository.findById(workspaceId, id);

    this.eventEmitter.emit('order.updated', { orderId: id });

    return OrderResponseDto.fromEntity(
      result!,
      this.statusMachine.getAvailableTransitions(result!.status),
    );
  }

  async remove(workspaceId: string, id: string): Promise<void> {
    const entity = await this.ordersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    if (entity.status !== OrderStatus.EM_ORCAMENTO) {
      throw new BadRequestException(
        'Somente pedidos em EM_ORCAMENTO podem ser removidos',
      );
    }

    await this.ordersRepository.softDelete(workspaceId, id);
    this.eventEmitter.emit('order.deleted', { orderId: id });
  }

  // ---------------------------------------------------------------------------
  // STATUS MACHINE
  // ---------------------------------------------------------------------------

  async changeStatus(
    workspaceId: string,
    id: string,
    dto: ChangeStatusDto,
    userId: string,
  ): Promise<OrderResponseDto> {
    const entity = await this.ordersRepository.findOrderWithRelatedEntities(
      workspaceId,
      id,
    );
    if (!entity) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    const orderForTransition = {
      status: entity.status,
      clientId: entity.clientId,
      totalCents: entity.totalCents,
      paidAmountCents: entity.paidAmountCents,
      paymentProofUrl: entity.paymentProofUrl,
      items: entity.items.map((item) => ({
        unitPriceCents: item.unitPriceCents,
      })),
    };

    const context: TransitionContext = {
      reason: dto.reason,
      bankReconciled: dto.bankReconciled,
      deliveryChecked: dto.deliveryChecked,
      productionOrders: entity.productionOrders?.map((po) => ({
        status: po.status,
      })),
      separationOrders: entity.separationOrders?.map((so) => ({
        status: so.status,
      })),
      orderItemSupplies: entity.items
        .flatMap((item) => item.supplies ?? [])
        .map((s) => ({ status: s.status })),
    };

    this.statusMachine.validateTransition(
      orderForTransition,
      dto.status,
      context,
    );

    const fromStatus = entity.status;

    const updated = await this.ordersRepository.updateStatus(
      workspaceId,
      id,
      dto.status,
    );

    await this.ordersRepository.createStatusHistory({
      order: { connect: { id } },
      fromStatus,
      toStatus: dto.status,
      changedByUserId: userId,
      reason: dto.reason,
      metadata: {
        bankReconciled: dto.bankReconciled,
        deliveryChecked: dto.deliveryChecked,
      },
    });

    this.eventEmitter.emit('order.status.changed', {
      orderId: id,
      fromStatus,
      toStatus: dto.status,
      userId,
    });

    this.logger.log(
      `Pedido ${entity.orderNumber}: ${fromStatus} → ${dto.status} (por ${userId})`,
    );

    return OrderResponseDto.fromEntity(
      updated,
      this.statusMachine.getAvailableTransitions(updated.status),
    );
  }

  // ---------------------------------------------------------------------------
  // TIMELINE
  // ---------------------------------------------------------------------------

  async getTimeline(
    workspaceId: string,
    id: string,
  ): Promise<OrderTimelineEntryDto[]> {
    const entity = await this.ordersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    const history = await this.ordersRepository.findStatusHistory(
      workspaceId,
      id,
    );
    return history.map(OrderTimelineEntryDto.fromEntity);
  }

  // ---------------------------------------------------------------------------
  // PAYMENT
  // ---------------------------------------------------------------------------

  async registerPayment(
    workspaceId: string,
    id: string,
    dto: RegisterPaymentDto,
  ): Promise<OrderResponseDto> {
    const entity = await this.ordersRepository.findById(workspaceId, id);
    if (!entity) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    const updated = await this.ordersRepository.updatePayment(
      workspaceId,
      id,
      dto.paidAmountCents,
      dto.paymentProofUrl,
    );

    this.eventEmitter.emit('order.updated', { orderId: id });

    return OrderResponseDto.fromEntity(
      updated,
      this.statusMachine.getAvailableTransitions(updated.status),
    );
  }

  // ---------------------------------------------------------------------------
  // SUPPLIES (checklist insumos)
  // ---------------------------------------------------------------------------

  async addSupply(
    workspaceId: string,
    orderId: string,
    itemId: string,
    dto: CreateOrderItemSupplyDto,
  ): Promise<OrderItemSupplyResponseDto> {
    const orderExists = await this.ordersRepository.exists(
      workspaceId,
      orderId,
    );
    if (!orderExists) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    const item = await this.ordersRepository.findItemById(workspaceId, itemId);
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Item do pedido nao encontrado');
    }

    const supply = await this.ordersRepository.createSupply({
      orderItem: { connect: { id: itemId } },
      name: dto.name,
      quantity: dto.quantity ?? 1,
      status: OrderItemSupplyStatus.PENDING,
      ...(dto.productId && { product: { connect: { id: dto.productId } } }),
    });

    return OrderItemSupplyResponseDto.fromEntity(supply);
  }

  async toggleSupply(
    workspaceId: string,
    orderId: string,
    itemId: string,
    supplyId: string,
    dto: ToggleSupplyDto,
    userId: string,
  ): Promise<OrderItemSupplyResponseDto> {
    const orderExists = await this.ordersRepository.exists(
      workspaceId,
      orderId,
    );
    if (!orderExists) {
      throw new NotFoundException('Pedido nao encontrado');
    }

    const item = await this.ordersRepository.findItemById(workspaceId, itemId);
    if (!item || item.orderId !== orderId) {
      throw new NotFoundException('Item do pedido nao encontrado');
    }

    const supply = await this.ordersRepository.findSupplyById(
      workspaceId,
      supplyId,
    );
    if (!supply || supply.orderItemId !== itemId) {
      throw new NotFoundException('Supply nao encontrado');
    }

    const updateData: Prisma.OrderItemSupplyUpdateInput = {
      status: dto.status,
    };

    if (dto.status === OrderItemSupplyStatus.READY) {
      updateData.readyAt = new Date();
      updateData.checkedBy = { connect: { id: userId } };
    } else {
      updateData.readyAt = null;
      updateData.checkedBy = { disconnect: true };
    }

    const updated = await this.ordersRepository.updateSupply(
      supplyId,
      updateData,
    );
    return OrderItemSupplyResponseDto.fromEntity(updated);
  }
}
