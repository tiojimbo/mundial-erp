import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { InviteStatus, WorkspaceMemberRole } from '@prisma/client';
import { InvitesRepository } from './invites.repository';
import { WorkspacesService } from '../workspaces.service';
import { AuthService } from '../../auth/auth.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import {
  AcceptInviteResponseDto,
  InviteCreatedResponseDto,
  InviteResponseDto,
} from './dto/invite-response.dto';
import { PaginationDto } from '../../../common/dtos/pagination.dto';

const INVITE_TOKEN_BYTES = 32;
const INVITE_TTL_DAYS = 7;

@Injectable()
export class InvitesService {
  private readonly logger = new Logger(InvitesService.name);

  constructor(
    private readonly invitesRepository: InvitesRepository,
    private readonly workspacesService: WorkspacesService,
    private readonly authService: AuthService,
  ) {}

  async list(
    workspaceId: string,
    actorId: string,
    pagination: PaginationDto,
    status?: InviteStatus,
  ) {
    await this.workspacesService.assertOwnerOrAdmin(workspaceId, actorId);

    const { items, total } = await this.invitesRepository.findMany({
      workspaceId,
      skip: pagination.skip,
      take: pagination.limit,
      status,
    });

    return {
      items: items.map(InviteResponseDto.fromEntity),
      total,
    };
  }

  async create(
    workspaceId: string,
    actorId: string,
    dto: CreateInviteDto,
  ): Promise<InviteCreatedResponseDto> {
    await this.workspacesService.assertOwnerOrAdmin(workspaceId, actorId);

    if (dto.role === WorkspaceMemberRole.OWNER) {
      throw new BadRequestException('Convites nao podem atribuir role OWNER');
    }

    const email = dto.email.toLowerCase().trim();

    // Se ja existe usuario com esse email e ja e membro, recusar
    const existingUser = await this.invitesRepository.findUserByEmail(email);
    if (existingUser) {
      const alreadyMember = await this.invitesRepository.memberExists(
        workspaceId,
        existingUser.id,
      );
      if (alreadyMember) {
        throw new ConflictException(
          'Usuario com este email ja e membro do workspace',
        );
      }
    }

    // Convite PENDING ja existente para esse email/workspace?
    const existingPending = await this.invitesRepository.findPendingByEmail(
      workspaceId,
      email,
    );
    if (existingPending) {
      throw new ConflictException(
        'Ja existe convite pendente para este email neste workspace',
      );
    }

    const token = randomBytes(INVITE_TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(
      Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    const invite = await this.invitesRepository.create({
      workspaceId,
      email,
      role: dto.role,
      token,
      expiresAt,
      invitedById: actorId,
    });

    this.logger.log(
      `invite.created workspace=${workspaceId} email=${this.maskEmail(email)} role=${dto.role} actor=${actorId}`,
    );

    return InviteCreatedResponseDto.fromEntityWithToken(invite);
  }

  // Idempotente: re-aceite por user já membro retorna tokens novos com
  // created:false, sem ConflictException. Sempre emite tokens via
  // selectWorkspace para que o cliente não fique travado pelo WorkspaceGuard.
  async accept(
    token: string,
    userId: string,
  ): Promise<AcceptInviteResponseDto> {
    const invite = await this.invitesRepository.findByToken(token);
    if (!invite) {
      throw new NotFoundException('Convite invalido ou expirado');
    }

    // ACCEPTED é tratado adiante como caminho idempotente.
    if (
      invite.status === InviteStatus.REVOKED ||
      invite.status === InviteStatus.EXPIRED
    ) {
      throw new BadRequestException(
        `Convite no estado ${invite.status} — solicite um novo convite`,
      );
    }

    if (invite.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Convite expirado');
    }

    // Sanity: o usuario que aceita precisa bater com o email convidado.
    // Validacao feita ANTES da idempotencia para impedir que outro user
    // logado com mesmo browser receba tokens de workspace alheio.
    const user = await this.invitesRepository.findUserByEmail(invite.email);
    if (!user || user.id !== userId) {
      throw new ForbiddenException(
        'Convite registrado para outro email — faca login com o email convidado',
      );
    }

    const existingMember = await this.invitesRepository.findMember(
      invite.workspaceId,
      userId,
    );

    let memberId: string;
    let memberRole: WorkspaceMemberRole;
    let created: boolean;

    if (existingMember) {
      await this.invitesRepository.markAcceptedIfPending(invite.id);
      memberId = existingMember.id;
      memberRole = existingMember.role;
      created = false;
      this.logger.log(
        `invite.accepted.idempotent workspace=${invite.workspaceId} user=${userId}`,
      );
    } else {
      // ACCEPTED + user não-membro = admin removeu entre o aceite e agora.
      if (invite.status === InviteStatus.ACCEPTED) {
        this.logger.warn(
          `invite.accepted.recreating-membership invite=${invite.id} user=${userId}`,
        );
      }
      const member = await this.invitesRepository.acceptInTransaction({
        inviteId: invite.id,
        workspaceId: invite.workspaceId,
        userId,
        role: invite.role,
      });
      memberId = member.id;
      memberRole = member.role;
      created = true;
      this.logger.log(
        `invite.accepted workspace=${invite.workspaceId} user=${userId} role=${invite.role}`,
      );
    }

    const tokens = await this.authService.selectWorkspace(
      userId,
      invite.workspaceId,
    );

    return {
      workspaceId: invite.workspaceId,
      memberId,
      role: memberRole,
      created,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      workspace: tokens.workspace,
    };
  }

  async revoke(
    workspaceId: string,
    inviteId: string,
    actorId: string,
  ): Promise<void> {
    await this.workspacesService.assertOwnerOrAdmin(workspaceId, actorId);

    const invite = await this.invitesRepository.findById(inviteId);
    if (!invite || invite.workspaceId !== workspaceId) {
      throw new NotFoundException('Convite nao encontrado');
    }
    if (invite.status !== InviteStatus.PENDING) {
      throw new BadRequestException(
        `Apenas convites PENDING podem ser revogados (atual: ${invite.status})`,
      );
    }

    await this.invitesRepository.revoke(inviteId);
    this.logger.log(
      `invite.revoked workspace=${workspaceId} invite=${inviteId} actor=${actorId}`,
    );
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
