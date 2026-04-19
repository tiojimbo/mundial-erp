import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
import { MembersRepository } from './members.repository';
import { WorkspacesRepository } from '../workspaces.repository';
import { WorkspacesService } from '../workspaces.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly workspacesRepository: WorkspacesRepository,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async list(
    workspaceId: string,
    actorId: string,
    pagination: PaginationDto,
    role?: WorkspaceMemberRole,
  ) {
    await this.workspacesService.assertMembership(workspaceId, actorId);

    const { items, total } = await this.membersRepository.findMany({
      workspaceId,
      skip: pagination.skip,
      take: pagination.limit,
      role,
    });

    return {
      items: items.map(MemberResponseDto.fromEntity),
      total,
    };
  }

  async add(
    workspaceId: string,
    actorId: string,
    dto: AddMemberDto,
  ): Promise<MemberResponseDto> {
    await this.workspacesService.assertOwnerOrAdmin(workspaceId, actorId);

    if (dto.role === WorkspaceMemberRole.OWNER) {
      throw new BadRequestException(
        'Para transferir ownership use o endpoint dedicado',
      );
    }

    const userExists = await this.membersRepository.userExists(dto.userId);
    if (!userExists) {
      throw new NotFoundException('Usuario nao encontrado');
    }

    const existing = await this.membersRepository.findById(
      workspaceId,
      dto.userId,
    );
    if (existing) {
      throw new ConflictException('Usuario ja e membro deste workspace');
    }

    try {
      const member = await this.membersRepository.create({
        workspaceId,
        userId: dto.userId,
        role: dto.role,
      });
      this.logger.log(
        `member.added workspace=${workspaceId} user=${dto.userId} role=${dto.role}`,
      );
      return MemberResponseDto.fromEntity(member);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Usuario ja e membro deste workspace');
      }
      throw error;
    }
  }

  async updateRole(
    workspaceId: string,
    targetUserId: string,
    actorId: string,
    dto: UpdateMemberRoleDto,
  ): Promise<MemberResponseDto> {
    await this.workspacesService.assertOwnerOrAdmin(workspaceId, actorId);

    const target = await this.membersRepository.findById(
      workspaceId,
      targetUserId,
    );
    if (!target) {
      throw new NotFoundException('Membro nao encontrado neste workspace');
    }

    // Apenas o OWNER pode promover/rebaixar para/de OWNER
    if (
      dto.role === WorkspaceMemberRole.OWNER ||
      target.role === WorkspaceMemberRole.OWNER
    ) {
      await this.workspacesService.assertOwner(workspaceId, actorId);
    }

    // Se for tirar OWNER, garantir que ainda restara pelo menos um OWNER
    if (
      target.role === WorkspaceMemberRole.OWNER &&
      dto.role !== WorkspaceMemberRole.OWNER
    ) {
      const ownerCount = await this.membersRepository.countByRole(
        workspaceId,
        WorkspaceMemberRole.OWNER,
      );
      if (ownerCount <= 1) {
        throw new BadRequestException('Workspace deve ter ao menos um OWNER');
      }
    }

    const updated = await this.membersRepository.updateRole(
      workspaceId,
      targetUserId,
      dto.role,
    );
    this.logger.log(
      `member.role_updated workspace=${workspaceId} user=${targetUserId} role=${dto.role} actor=${actorId}`,
    );
    return MemberResponseDto.fromEntity(updated);
  }

  async remove(
    workspaceId: string,
    targetUserId: string,
    actorId: string,
  ): Promise<void> {
    await this.workspacesService.assertOwnerOrAdmin(workspaceId, actorId);

    const target = await this.membersRepository.findById(
      workspaceId,
      targetUserId,
    );
    if (!target) {
      throw new NotFoundException('Membro nao encontrado neste workspace');
    }

    if (target.role === WorkspaceMemberRole.OWNER) {
      const workspace = await this.workspacesRepository.findById(workspaceId);
      if (workspace?.ownerId === targetUserId) {
        throw new ForbiddenException(
          'O OWNER do workspace nao pode ser removido. Transfira a propriedade primeiro.',
        );
      }
    }

    await this.membersRepository.remove(workspaceId, targetUserId);
    this.logger.log(
      `member.removed workspace=${workspaceId} user=${targetUserId} actor=${actorId}`,
    );
  }
}
