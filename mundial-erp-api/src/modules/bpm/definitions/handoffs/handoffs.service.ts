import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { HandoffsRepository } from './handoffs.repository';
import { CreateHandoffDto } from './dto/create-handoff.dto';
import { UpdateHandoffDto } from './dto/update-handoff.dto';
import { HandoffResponseDto } from './dto/handoff-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class HandoffsService {
  constructor(
    private readonly handoffsRepository: HandoffsRepository,
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateHandoffDto): Promise<HandoffResponseDto> {
    // W4: Validate no duplicate handoff for same from/to process pair
    const existing = await this.prisma.handoff.findFirst({
      where: {
        fromProcessId: dto.fromProcessId,
        toProcessId: dto.toProcessId,
        deletedAt: null,
      },
    });
    if (existing) {
      throw new ConflictException(
        'Já existe um handoff entre esses dois processos.',
      );
    }

    const entity = await this.handoffsRepository.create({
      fromProcess: { connect: { id: dto.fromProcessId } },
      toProcess: { connect: { id: dto.toProcessId } },
      triggerOnStatus: dto.triggerOnStatus,
      validationRules: dto.validationRules
        ? (dto.validationRules as Prisma.InputJsonValue)
        : undefined,
      autoAdvance: dto.autoAdvance ?? false,
    });

    return HandoffResponseDto.fromEntity(entity);
  }

  async findAll(pagination: PaginationDto) {
    const { items, total } = await this.handoffsRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
    });
    return {
      items: items.map(HandoffResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<HandoffResponseDto> {
    const entity = await this.handoffsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Handoff não encontrado');
    }
    return HandoffResponseDto.fromEntity(entity);
  }

  async update(id: string, dto: UpdateHandoffDto): Promise<HandoffResponseDto> {
    const entity = await this.handoffsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Handoff não encontrado');
    }

    const updateData: Prisma.HandoffUpdateInput = {};
    if (dto.fromProcessId !== undefined) {
      updateData.fromProcess = { connect: { id: dto.fromProcessId } };
    }
    if (dto.toProcessId !== undefined) {
      updateData.toProcess = { connect: { id: dto.toProcessId } };
    }
    if (dto.triggerOnStatus !== undefined) updateData.triggerOnStatus = dto.triggerOnStatus;
    if (dto.validationRules !== undefined) {
      updateData.validationRules = dto.validationRules as Prisma.InputJsonValue;
    }
    if (dto.autoAdvance !== undefined) updateData.autoAdvance = dto.autoAdvance;

    const updated = await this.handoffsRepository.update(id, updateData);
    return HandoffResponseDto.fromEntity(updated);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.handoffsRepository.findById(id);
    if (!entity) {
      throw new NotFoundException('Handoff não encontrado');
    }
    await this.handoffsRepository.softDelete(id);
  }
}
