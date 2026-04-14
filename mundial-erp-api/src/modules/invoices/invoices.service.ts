import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InvoiceDirection, Prisma } from '@prisma/client';
import { InvoicesRepository } from './invoices.repository';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceResponseDto } from './dto/invoice-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private readonly invoicesRepository: InvoicesRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // ---------------------------------------------------------------------------
  // CREATE
  // ---------------------------------------------------------------------------

  async create(dto: CreateInvoiceDto): Promise<InvoiceResponseDto> {
    // Validar chave de acesso (44 dígitos)
    if (dto.accessKey && !/^\d{44}$/.test(dto.accessKey)) {
      throw new BadRequestException(
        'Chave de acesso deve ter exatamente 44 dígitos numéricos',
      );
    }

    const createData: Prisma.InvoiceCreateInput = {
      invoiceNumber: dto.invoiceNumber,
      direction: dto.direction,
      totalCents: dto.totalCents,
      xmlContent: dto.xmlContent,
      pdfUrl: dto.pdfUrl,
      accessKey: dto.accessKey,
      issuedAt: new Date(),
      ...(dto.orderId && { order: { connect: { id: dto.orderId } } }),
      ...(dto.clientId && { client: { connect: { id: dto.clientId } } }),
      ...(dto.companyId && { company: { connect: { id: dto.companyId } } }),
    };

    const entity = await this.invoicesRepository.create(createData);

    this.eventEmitter.emit('invoice.created', {
      invoiceId: entity.id,
      invoiceNumber: entity.invoiceNumber,
      direction: entity.direction,
    });

    this.logger.log(
      `Nota fiscal criada (ID: ${entity.id}, Número: ${entity.invoiceNumber ?? 'N/A'})`,
    );

    return InvoiceResponseDto.fromEntity(entity);
  }

  // ---------------------------------------------------------------------------
  // LIST
  // ---------------------------------------------------------------------------

  async findAll(
    pagination: PaginationDto,
    filters: {
      direction?: string;
      clientId?: string;
      companyId?: string;
      orderId?: string;
    },
  ) {
    const direction = filters.direction as InvoiceDirection | undefined;
    const { items, total } = await this.invoicesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...(direction && { direction }),
      ...(filters.clientId && { clientId: filters.clientId }),
      ...(filters.companyId && { companyId: filters.companyId }),
      ...(filters.orderId && { orderId: filters.orderId }),
    });

    return {
      items: items.map(InvoiceResponseDto.fromEntity),
      total,
    };
  }

  // ---------------------------------------------------------------------------
  // FIND BY ID
  // ---------------------------------------------------------------------------

  async findById(id: string): Promise<InvoiceResponseDto> {
    const entity = await this.invoicesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Nota fiscal não encontrada');
    }
    return InvoiceResponseDto.fromEntity(entity);
  }

  // ---------------------------------------------------------------------------
  // UPDATE
  // ---------------------------------------------------------------------------

  async update(id: string, dto: UpdateInvoiceDto): Promise<InvoiceResponseDto> {
    const entity = await this.invoicesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Nota fiscal não encontrada');
    }

    // Validar chave de acesso se fornecida
    if (dto.accessKey && !/^\d{44}$/.test(dto.accessKey)) {
      throw new BadRequestException(
        'Chave de acesso deve ter exatamente 44 dígitos numéricos',
      );
    }

    const updateData: Prisma.InvoiceUpdateInput = {};

    if (dto.invoiceNumber !== undefined) updateData.invoiceNumber = dto.invoiceNumber;
    if (dto.direction !== undefined) updateData.direction = dto.direction;
    if (dto.totalCents !== undefined) updateData.totalCents = dto.totalCents;
    if (dto.xmlContent !== undefined) updateData.xmlContent = dto.xmlContent;
    if (dto.pdfUrl !== undefined) updateData.pdfUrl = dto.pdfUrl;
    if (dto.accessKey !== undefined) updateData.accessKey = dto.accessKey;

    if (dto.orderId !== undefined) {
      updateData.order = dto.orderId
        ? { connect: { id: dto.orderId } }
        : { disconnect: true };
    }
    if (dto.clientId !== undefined) {
      updateData.client = dto.clientId
        ? { connect: { id: dto.clientId } }
        : { disconnect: true };
    }
    if (dto.companyId !== undefined) {
      updateData.company = dto.companyId
        ? { connect: { id: dto.companyId } }
        : { disconnect: true };
    }

    const updated = await this.invoicesRepository.update(id, updateData);

    this.eventEmitter.emit('invoice.updated', {
      invoiceId: id,
      invoiceNumber: updated.invoiceNumber,
    });

    return InvoiceResponseDto.fromEntity(updated);
  }

  // ---------------------------------------------------------------------------
  // CANCEL
  // ---------------------------------------------------------------------------

  async cancel(id: string): Promise<InvoiceResponseDto> {
    const entity = await this.invoicesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Nota fiscal não encontrada');
    }

    if (entity.cancelledAt) {
      throw new ConflictException('Nota fiscal já cancelada');
    }

    const updated = await this.invoicesRepository.update(id, {
      cancelledAt: new Date(),
    });

    this.eventEmitter.emit('invoice.cancelled', {
      invoiceId: id,
      invoiceNumber: updated.invoiceNumber,
    });

    this.logger.log(
      `Nota fiscal cancelada (ID: ${id}, Número: ${updated.invoiceNumber ?? 'N/A'})`,
    );

    return InvoiceResponseDto.fromEntity(updated);
  }

  // ---------------------------------------------------------------------------
  // SOFT DELETE
  // ---------------------------------------------------------------------------

  async remove(id: string): Promise<void> {
    const entity = await this.invoicesRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Nota fiscal não encontrada');
    }

    await this.invoicesRepository.softDelete(id);

    this.eventEmitter.emit('invoice.deleted', { invoiceId: id });
  }
}
