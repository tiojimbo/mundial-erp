import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiPropertyOptional()
  title: string | null;

  @ApiProperty({ enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty()
  clientId: string;

  @ApiPropertyOptional()
  clientName: string | null;

  @ApiPropertyOptional()
  companyId: string | null;

  @ApiPropertyOptional()
  paymentMethodId: string | null;

  @ApiPropertyOptional()
  carrierId: string | null;

  @ApiPropertyOptional()
  priceTableId: string | null;

  @ApiProperty()
  createdByUserId: string;

  @ApiPropertyOptional()
  createdByName: string | null;

  @ApiPropertyOptional()
  assignedUserId: string | null;

  @ApiPropertyOptional()
  assignedToName: string | null;

  @ApiPropertyOptional()
  issueDate: Date | null;

  @ApiPropertyOptional()
  deliveryDeadline: Date | null;

  @ApiProperty()
  proposalValidityDays: number;

  @ApiPropertyOptional()
  deliveryAddress: string | null;

  @ApiPropertyOptional()
  deliveryNeighborhood: string | null;

  @ApiPropertyOptional()
  deliveryCity: string | null;

  @ApiPropertyOptional()
  deliveryState: string | null;

  @ApiPropertyOptional()
  deliveryCep: string | null;

  @ApiPropertyOptional()
  deliveryReferencePoint: string | null;

  @ApiPropertyOptional()
  contactName: string | null;

  @ApiProperty()
  subtotalCents: number;

  @ApiProperty()
  freightCents: number;

  @ApiProperty()
  discountCents: number;

  @ApiProperty()
  taxSubstitutionCents: number;

  @ApiProperty()
  totalCents: number;

  @ApiProperty()
  paidAmountCents: number;

  @ApiPropertyOptional()
  paymentProofUrl: string | null;

  @ApiProperty()
  shouldProduce: boolean;

  @ApiProperty()
  isResale: boolean;

  @ApiProperty()
  hasTaxSubstitution: boolean;

  @ApiPropertyOptional()
  notes: string | null;

  @ApiPropertyOptional()
  orderTypeId: string | null;

  @ApiPropertyOptional()
  orderFlowId: string | null;

  @ApiPropertyOptional()
  orderModelId: string | null;

  @ApiPropertyOptional()
  proFinancasId: number | null;

  @ApiPropertyOptional({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiPropertyOptional({ description: 'Status disponiveis para transicao' })
  availableTransitions: OrderStatus[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    entity: Record<string, unknown>,
    availableTransitions: OrderStatus[] = [],
  ): OrderResponseDto {
    const dto = new OrderResponseDto();
    dto.id = entity.id as string;
    dto.orderNumber = entity.orderNumber as string;
    dto.title = (entity.title as string | null) ?? null;
    dto.status = entity.status as OrderStatus;
    dto.clientId = entity.clientId as string;
    dto.clientName =
      ((entity.client as Record<string, unknown>)?.name as string) ?? null;
    dto.companyId = (entity.companyId as string | null) ?? null;
    dto.paymentMethodId = (entity.paymentMethodId as string | null) ?? null;
    dto.carrierId = (entity.carrierId as string | null) ?? null;
    dto.priceTableId = (entity.priceTableId as string | null) ?? null;
    dto.createdByUserId = entity.createdByUserId as string;
    dto.createdByName =
      ((entity.createdBy as Record<string, unknown>)?.name as string) ?? null;
    dto.assignedUserId = (entity.assignedUserId as string | null) ?? null;
    dto.assignedToName =
      ((entity.assignedTo as Record<string, unknown>)?.name as string) ?? null;
    dto.issueDate = (entity.issueDate as Date | null) ?? null;
    dto.deliveryDeadline = (entity.deliveryDeadline as Date | null) ?? null;
    dto.proposalValidityDays = entity.proposalValidityDays as number;
    dto.deliveryAddress = (entity.deliveryAddress as string | null) ?? null;
    dto.deliveryNeighborhood =
      (entity.deliveryNeighborhood as string | null) ?? null;
    dto.deliveryCity = (entity.deliveryCity as string | null) ?? null;
    dto.deliveryState = (entity.deliveryState as string | null) ?? null;
    dto.deliveryCep = (entity.deliveryCep as string | null) ?? null;
    dto.deliveryReferencePoint =
      (entity.deliveryReferencePoint as string | null) ?? null;
    dto.contactName = (entity.contactName as string | null) ?? null;
    dto.subtotalCents = entity.subtotalCents as number;
    dto.freightCents = entity.freightCents as number;
    dto.discountCents = entity.discountCents as number;
    dto.taxSubstitutionCents = entity.taxSubstitutionCents as number;
    dto.totalCents = entity.totalCents as number;
    dto.paidAmountCents = entity.paidAmountCents as number;
    dto.paymentProofUrl = (entity.paymentProofUrl as string | null) ?? null;
    dto.shouldProduce = entity.shouldProduce as boolean;
    dto.isResale = entity.isResale as boolean;
    dto.hasTaxSubstitution = entity.hasTaxSubstitution as boolean;
    dto.notes = (entity.notes as string | null) ?? null;
    dto.orderTypeId = (entity.orderTypeId as string | null) ?? null;
    dto.orderFlowId = (entity.orderFlowId as string | null) ?? null;
    dto.orderModelId = (entity.orderModelId as string | null) ?? null;
    dto.proFinancasId = (entity.proFinancasId as number | null) ?? null;
    dto.items = ((entity.items as Record<string, unknown>[]) ?? []).map(
      OrderItemResponseDto.fromEntity,
    );
    dto.availableTransitions = availableTransitions;
    dto.createdAt = entity.createdAt as Date;
    dto.updatedAt = entity.updatedAt as Date;
    return dto;
  }
}
