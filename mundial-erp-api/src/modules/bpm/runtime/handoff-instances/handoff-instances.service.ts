import { Injectable, NotFoundException } from '@nestjs/common';
import { HandoffStatus, ProcessStatus } from '@prisma/client';
import { HandoffInstancesRepository } from './handoff-instances.repository';
import { HandoffInstanceResponseDto } from './dto/handoff-instance-response.dto';
import { PendingHandoffResponseDto } from './dto/pending-handoff-response.dto';
import { PaginationDto } from '../../../../common/dtos/pagination.dto';
import { ProcessInstancesRepository } from '../process-instances/process-instances.repository';

@Injectable()
export class HandoffInstancesService {
  constructor(
    private readonly handoffInstancesRepository: HandoffInstancesRepository,
    private readonly processInstancesRepository: ProcessInstancesRepository,
  ) {}

  async findPending() {
    const { items, total } =
      await this.handoffInstancesRepository.findPending();

    return {
      handoffs: items.map(PendingHandoffResponseDto.fromEntity),
      total,
    };
  }

  async findAll(
    pagination: PaginationDto,
    filters: { orderId?: string; status?: HandoffStatus },
  ) {
    const { items, total } = await this.handoffInstancesRepository.findMany({
      skip: pagination.skip,
      take: pagination.limit,
      ...filters,
    });

    return {
      items: items.map(HandoffInstanceResponseDto.fromEntity),
      total,
    };
  }

  async findById(id: string): Promise<HandoffInstanceResponseDto> {
    const instance = await this.handoffInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de handoff não encontrada');
    }
    return HandoffInstanceResponseDto.fromEntity(instance);
  }

  async accept(id: string): Promise<HandoffInstanceResponseDto> {
    const instance = await this.handoffInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de handoff não encontrada');
    }

    // Create the target ProcessInstance if not already linked
    let toProcessInstanceId = instance.toProcessInstanceId;

    if (!toProcessInstanceId) {
      const newProcessInstance = await this.processInstancesRepository.create({
        process: { connect: { id: instance.handoff.toProcessId } },
        order: { connect: { id: instance.orderId } },
        status: ProcessStatus.DRAFT,
      });
      toProcessInstanceId = newProcessInstance.id;
    }

    const updated = await this.handoffInstancesRepository.update(id, {
      status: HandoffStatus.ACCEPTED,
      toProcessInstance: { connect: { id: toProcessInstanceId } },
    });

    return HandoffInstanceResponseDto.fromEntity(updated);
  }

  async reject(
    id: string,
    reason: string,
  ): Promise<HandoffInstanceResponseDto> {
    const instance = await this.handoffInstancesRepository.findById(id);
    if (!instance) {
      throw new NotFoundException('Instância de handoff não encontrada');
    }

    const updated = await this.handoffInstancesRepository.update(id, {
      status: HandoffStatus.REJECTED,
      rejectionReason: reason,
    });

    return HandoffInstanceResponseDto.fromEntity(updated);
  }
}
