import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import {
  WorkspaceResponseDto,
  WorkspaceSeatsResponseDto,
} from './dto/workspace-response.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';
import { WorkspacesRepository } from './workspaces.repository';
import { MembersRepository } from './members/members.repository';

const SEATS_TOTAL_MEMBERS = 100;
const SEATS_TOTAL_GUESTS = 50;

@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name);

  constructor(
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly membersRepository: MembersRepository,
  ) {}

  async create(
    userId: string,
    dto: CreateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const slugTaken = await this.workspacesRepository.slugExists(dto.slug);
    if (slugTaken) {
      throw new ConflictException('Slug ja em uso por outro workspace');
    }

    try {
      const entity = await this.workspacesRepository.createWithOwner({
        name: dto.name,
        slug: dto.slug,
        logoUrl: dto.logoUrl,
        color: dto.color,
        ownerId: userId,
      });

      this.logger.log(`workspace.created id=${entity.id} owner=${userId}`);
      return WorkspaceResponseDto.fromEntity(entity);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Slug ja em uso por outro workspace');
      }
      throw error;
    }
  }

  async findAllForUser(
    userId: string,
    pagination: PaginationDto,
    search?: string,
  ) {
    const { items, total } = await this.workspacesRepository.findManyByMember({
      userId,
      skip: pagination.skip,
      take: pagination.limit,
      search,
    });
    return {
      items: items.map(WorkspaceResponseDto.fromEntity),
      total,
    };
  }

  async findById(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceResponseDto> {
    const entity = await this.workspacesRepository.findById(workspaceId);
    if (!entity) {
      throw new NotFoundException('Workspace nao encontrado');
    }

    await this.assertMembership(workspaceId, userId);
    return WorkspaceResponseDto.fromEntity(entity);
  }

  async update(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceResponseDto> {
    const entity = await this.workspacesRepository.findById(workspaceId);
    if (!entity) {
      throw new NotFoundException('Workspace nao encontrado');
    }

    await this.assertOwnerOrAdmin(workspaceId, userId);

    if (dto.slug && dto.slug !== entity.slug) {
      const slugTaken = await this.workspacesRepository.slugExists(dto.slug);
      if (slugTaken) {
        throw new ConflictException('Slug ja em uso por outro workspace');
      }
    }

    const updateData: Prisma.WorkspaceUpdateInput = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.slug !== undefined) updateData.slug = dto.slug;
    if (dto.logoUrl !== undefined) updateData.logoUrl = dto.logoUrl;
    if (dto.color !== undefined) updateData.color = dto.color;

    try {
      const updated = await this.workspacesRepository.update(
        workspaceId,
        updateData,
      );
      this.logger.log(`workspace.updated id=${workspaceId} actor=${userId}`);
      return WorkspaceResponseDto.fromEntity(updated);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Slug ja em uso por outro workspace');
      }
      throw error;
    }
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    const entity = await this.workspacesRepository.findById(workspaceId);
    if (!entity) {
      throw new NotFoundException('Workspace nao encontrado');
    }
    if (entity.ownerId !== userId) {
      throw new ForbiddenException('Apenas o owner pode remover o workspace');
    }
    await this.workspacesRepository.softDelete(workspaceId);
    this.logger.log(`workspace.deleted id=${workspaceId} actor=${userId}`);
  }

  async getSeats(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceSeatsResponseDto> {
    const entity = await this.workspacesRepository.findById(workspaceId);
    if (!entity) {
      throw new NotFoundException('Workspace nao encontrado');
    }
    await this.assertMembership(workspaceId, userId);

    const { membersUsed, guestsUsed } =
      await this.workspacesRepository.countSeats(workspaceId);

    return {
      membersUsed,
      membersTotal: SEATS_TOTAL_MEMBERS,
      guestsUsed,
      guestsTotal: SEATS_TOTAL_GUESTS,
    };
  }

  /**
   * Garante que o usuario e membro ativo do workspace. Lanca 403 se nao for.
   * Util quando o WorkspaceGuard global esta desligado para a rota
   * (ex: endpoints com @SkipWorkspaceGuard) mas precisamos de checagem
   * pontual de membership.
   */
  async assertMembership(workspaceId: string, userId: string): Promise<void> {
    const member = await this.membersRepository.findById(workspaceId, userId);
    if (!member) {
      throw new ForbiddenException('Usuario nao e membro deste workspace');
    }
  }

  async assertOwnerOrAdmin(workspaceId: string, userId: string): Promise<void> {
    const member = await this.membersRepository.findById(workspaceId, userId);
    if (!member) {
      throw new ForbiddenException('Usuario nao e membro deste workspace');
    }
    if (
      member.role !== WorkspaceMemberRole.OWNER &&
      member.role !== WorkspaceMemberRole.ADMIN
    ) {
      throw new ForbiddenException(
        'Acao restrita a owner ou admin do workspace',
      );
    }
  }

  async assertOwner(workspaceId: string, userId: string): Promise<void> {
    const ws = await this.workspacesRepository.findById(workspaceId);
    if (!ws) throw new NotFoundException('Workspace nao encontrado');
    if (ws.ownerId !== userId) {
      throw new ForbiddenException('Acao restrita ao owner do workspace');
    }
  }
}
