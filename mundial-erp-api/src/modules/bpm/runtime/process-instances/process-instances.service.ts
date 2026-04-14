import { Injectable, NotFoundException } from '@nestjs/common';
import { ProcessStatus } from '@prisma/client';
import { ProcessInstancesRepository } from './process-instances.repository';
import { CreateProcessInstanceDto } from './dto/create-process-instance.dto';
import { ProcessInstanceResponseDto } from './dto/process-instance-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';

@Injectable()
export class ProcessInstancesService {
  constructor(
    private readonly processInstancesRepository: ProcessInstancesRepository,
  ) {}

  async create(
    dto: CreateProcessInstanceDto,
  ): Promise<ProcessInstanceResponseDto> {
    const instance = await this.processInstancesRepository.create({
      process: { connect: { id: dto.processId } },
      order: { connect: { id: dto.orderId } },
    });

    return ProcessInstanceResponseDto.fromEntity(instance);
  }

  async findAll(
    pagination: PaginationDto,
    filters: {
      orderId?: string;
      processId?: string;
      status?: ProcessStatus;
    },
  ) {
    const { items, total } = await this.processInstancesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });

    return {
      items: items.map(ProcessInstanceResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<ProcessInstanceResponseDto> {
    const instance = await this.processInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de processo não encontrada');
    }
    return ProcessInstanceResponseDto.fromEntity(instance);
  }

  async start(id: string): Promise<ProcessInstanceResponseDto> {
    const instance = await this.processInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de processo não encontrada');
    }

    const updated = await this.processInstancesRepository.update(id, {
      status: ProcessStatus.ACTIVE,
      startedAt: new Date(),
    });

    return ProcessInstanceResponseDto.fromEntity(updated);
  }

  async complete(id: string): Promise<ProcessInstanceResponseDto> {
    const instance = await this.processInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de processo não encontrada');
    }

    const updated = await this.processInstancesRepository.update(id, {
      status: ProcessStatus.COMPLETED,
      completedAt: new Date(),
    });

    return ProcessInstanceResponseDto.fromEntity(updated);
  }
}
