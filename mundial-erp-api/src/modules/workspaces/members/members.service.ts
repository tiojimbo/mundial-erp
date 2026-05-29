import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, WorkspaceMemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { MembersRepository } from './members.repository';
import { WorkspacesRepository } from '../workspaces.repository';
import { WorkspacesService } from '../workspaces.service';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { MemberResponseDto } from './dto/member-response.dto';
import { BulkAddUsersDto } from './dto/bulk-add-users.dto';
import { BulkAddResponseDto } from './dto/bulk-add-response.dto';
import { WorkspaceUsersResponseDto } from '../dto/workspace-users-response.dto';
import { resolveWorkspacePermissionFlags } from '../dto/my-permission-response.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

const BCRYPT_ROUNDS = 12;

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

  async listUsers(
    workspaceId: string,
    userId: string,
    pagination: PaginationDto,
    showPending = false,
  ): Promise<WorkspaceUsersResponseDto> {
    await this.workspacesService.assertMembership(workspaceId, userId);

    const { items, total } = await this.membersRepository.findMany({
      workspaceId,
      skip: pagination.skip,
      take: pagination.limit,
      showPending,
    });

    return {
      users: items.map((member) => ({
        id: member.userId,
        name: member.user?.name ?? null,
        email: member.user?.email ?? null,
        avatar: member.user?.avatar ?? null,
        accepted: member.accepted,
        permission: member.role,
        ...resolveWorkspacePermissionFlags(member.role),
        joinedAt: member.joinedAt,
      })),
      total,
    };
  }

  async bulkAdd(
    workspaceId: string,
    actorId: string,
    dto: BulkAddUsersDto,
  ): Promise<BulkAddResponseDto> {
    await this.workspacesService.assertOwnerOrAdmin(workspaceId, actorId);

    const invited: BulkAddResponseDto['invited'] = [];
    const skipped: string[] = [];

    for (const entry of dto.users) {
      if (entry.permission === WorkspaceMemberRole.OWNER) {
        throw new BadRequestException(
          'OWNER nao pode ser atribuido ao adicionar usuarios',
        );
      }

      const email = entry.email.toLowerCase().trim();
      let user = await this.membersRepository.findUserByEmail(email);
      let isNewUser = false;

      if (!user) {
        const passwordHash = await bcrypt.hash(
          randomBytes(32).toString('hex'),
          BCRYPT_ROUNDS,
        );
        user = await this.membersRepository.createUser({
          email,
          name: email.split('@')[0],
          passwordHash,
        });
        isNewUser = true;
      }

      const existing = await this.membersRepository.findById(
        workspaceId,
        user.id,
      );
      if (existing) {
        skipped.push(email);
        continue;
      }

      const member = await this.membersRepository.create({
        workspaceId,
        userId: user.id,
        role: entry.permission,
        accepted: false,
      });

      invited.push({
        id: user.id,
        email: user.email,
        name: user.name,
        permission: member.role,
        accepted: member.accepted,
        isNewUser,
      });
    }

    this.logger.log(
      `users.bulk_added workspace=${workspaceId} invited=${invited.length} skipped=${skipped.length} actor=${actorId}`,
    );

    return { invited, skipped };
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
