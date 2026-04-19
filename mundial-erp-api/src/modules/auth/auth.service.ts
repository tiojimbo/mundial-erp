import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Workspace, WorkspaceMemberRole } from '@prisma/client';
import { UsersRepository } from '../users/users.repository';
import { PrismaService } from '../../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { WorkspaceResponseDto } from '../../common/dtos/workspace-response.dto';
import type { JwtPayload } from './decorators';
import type { StringValue } from 'ms';

const BCRYPT_ROUNDS = 12;

type ResolvedWorkspace = {
  workspace: Workspace;
  role: WorkspaceMemberRole;
};

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const user = await this.usersRepository.create({
      email: dto.email,
      name: dto.name,
      passwordHash,
    });

    // Usuario recem criado nao tem workspace ainda — fluxo de onboarding
    return this.buildAuthResponse(user.id);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.isActive) {
      throw new ForbiddenException('Usuário desativado');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.buildAuthResponse(user.id);
  }

  async refresh(
    userId: string,
    refreshToken: string,
  ): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Acesso negado');
    }

    const refreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshToken,
    );
    if (!refreshTokenValid) {
      throw new ForbiddenException('Acesso negado');
    }

    return this.buildAuthResponse(userId);
  }

  async logout(userId: string): Promise<void> {
    await this.usersRepository.updateRefreshToken(userId, null);
  }

  async me(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }
    return UserResponseDto.fromEntity(user);
  }

  // Prioridade: lastAccessed válido → único → joinedAt mais antigo → null.
  async resolveInitialWorkspace(
    userId: string,
  ): Promise<ResolvedWorkspace | null> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: { id: true, lastAccessedWorkspaceId: true },
    });
    if (!user) return null;

    if (user.lastAccessedWorkspaceId) {
      const lastMember = await this.prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: user.lastAccessedWorkspaceId,
            userId,
          },
        },
        include: { workspace: true },
      });
      if (lastMember && lastMember.workspace.deletedAt === null) {
        return { workspace: lastMember.workspace, role: lastMember.role };
      }
    }

    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, workspace: { deletedAt: null } },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (memberships.length === 0) return null;

    const chosen = memberships[0];
    return { workspace: chosen.workspace, role: chosen.role };
  }

  async selectWorkspace(
    userId: string,
    workspaceId: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    workspace: WorkspaceResponseDto;
  }> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    const member = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId } },
      include: { workspace: true },
    });
    if (!member || member.workspace.deletedAt !== null) {
      throw new ForbiddenException('Usuario nao e membro deste workspace');
    }

    // Tokens primeiro (CPU, fora de tx). lastAccessed + refreshHash juntos
    // em $transaction — race fix: se um falhar, nenhum é persistido.
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId,
      workspaceRole: member.role,
    });

    const refreshTokenHash = await this.hashToken(tokens.refreshToken);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          lastAccessedWorkspaceId: workspaceId,
          refreshToken: refreshTokenHash,
        },
      }),
    ]);

    this.logger.log(
      `workspace.selected user=${user.id} email=${this.maskEmail(user.email)} workspace=${workspaceId} role=${member.role}`,
    );

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      workspace: WorkspaceResponseDto.fromEntity(member.workspace),
    };
  }

  // Feature flag OFF → response legado sem workspace (ADR-001).
  private async buildAuthResponse(userId: string): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Usuario nao encontrado');
    }

    const multiWorkspaceEnabled =
      this.config.get<boolean>('featureFlags.multiWorkspaceEnabled') ?? false;

    if (!multiWorkspaceEnabled) {
      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      });
      await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

      this.logger.log(
        `auth.login user=${user.id} email=${this.maskEmail(user.email)} workspace=disabled`,
      );

      return {
        tokens,
        user: UserResponseDto.fromEntity(user),
        workspace: null,
        availableWorkspaces: [],
      };
    }

    // 1 query: memberships carregadas uma vez, resolve initial em memória.
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId, workspace: { deletedAt: null } },
      include: { workspace: true },
      orderBy: { joinedAt: 'asc' },
    });

    const resolved: ResolvedWorkspace | null =
      memberships.length === 0
        ? null
        : (() => {
            if (user.lastAccessedWorkspaceId) {
              const last = memberships.find(
                (m) => m.workspaceId === user.lastAccessedWorkspaceId,
              );
              if (last) return { workspace: last.workspace, role: last.role };
            }
            const first = memberships[0];
            return { workspace: first.workspace, role: first.role };
          })();

    if (resolved) {
      if (user.lastAccessedWorkspaceId !== resolved.workspace.id) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { lastAccessedWorkspaceId: resolved.workspace.id },
        });
      }
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
      workspaceId: resolved?.workspace.id,
      workspaceRole: resolved?.role,
    });

    await this.updateRefreshTokenHash(user.id, tokens.refreshToken);

    this.logger.log(
      `auth.login user=${user.id} email=${this.maskEmail(user.email)} workspace=${resolved?.workspace.id ?? 'none'}`,
    );

    return {
      tokens,
      user: UserResponseDto.fromEntity(user),
      workspace: resolved
        ? WorkspaceResponseDto.fromEntity(resolved.workspace)
        : null,
      availableWorkspaces: memberships.map((m) =>
        WorkspaceResponseDto.fromEntity(m.workspace),
      ),
    };
  }

  private async generateTokens(
    payload: JwtPayload,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const tokenPayload: JwtPayload = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      ...(payload.workspaceId ? { workspaceId: payload.workspaceId } : {}),
      ...(payload.workspaceRole
        ? { workspaceRole: payload.workspaceRole }
        : {}),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: this.config.get<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_ACCESS_EXPIRES_IN',
          '15m',
        ) as StringValue,
      }),
      this.jwtService.signAsync(tokenPayload, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>(
          'JWT_REFRESH_EXPIRES_IN',
          '7d',
        ) as StringValue,
      }),
    ]);
    return { accessToken, refreshToken };
  }

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await this.hashToken(refreshToken);
    await this.usersRepository.updateRefreshToken(userId, hash);
  }

  private hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, BCRYPT_ROUNDS);
  }

  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return '***';
    const visible = local.slice(0, 2);
    return `${visible}***@${domain}`;
  }
}
