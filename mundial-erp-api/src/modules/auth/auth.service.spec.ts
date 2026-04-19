import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersRepository } from '../users/users.repository';
import { PrismaService } from '../../database/prisma.service';

jest.mock('bcrypt');

const mockUser = {
  id: 'user-1',
  email: 'test@mundial.com',
  name: 'Test User',
  passwordHash: 'hashed-password',
  refreshToken: 'hashed-refresh-token',
  role: 'OPERATOR' as const,
  isActive: true,
  departmentId: null,
  lastAccessedWorkspaceId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

describe('AuthService', () => {
  let service: AuthService;
  let usersRepository: jest.Mocked<UsersRepository>;
  let jwtService: jest.Mocked<JwtService>;
  let prismaMock: {
    user: { findFirst: jest.Mock; update: jest.Mock };
    workspaceMember: { findMany: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prismaMock = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: mockUser.id,
          lastAccessedWorkspaceId: null,
        }),
        update: jest.fn().mockResolvedValue(mockUser),
      },
      workspaceMember: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            updateRefreshToken: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultVal?: string) => {
              const map: Record<string, string> = {
                JWT_ACCESS_SECRET: 'test-access-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_ACCESS_EXPIRES_IN: '15m',
                JWT_REFRESH_EXPIRES_IN: '7d',
              };
              return map[key] ?? defaultVal;
            }),
          },
        },
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get(AuthService);
    usersRepository = module.get(UsersRepository);
    jwtService = module.get(JwtService);
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);
      usersRepository.create.mockResolvedValue(mockUser);
      usersRepository.findById.mockResolvedValue(mockUser);
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register({
        email: 'test@mundial.com',
        name: 'Test User',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('test@mundial.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.user).not.toHaveProperty('refreshToken');
      expect(result.workspace).toBeNull();
      expect(result.availableWorkspaces).toEqual([]);
      expect(usersRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'test@mundial.com',
          passwordHash: 'hashed-password',
        }),
      );
    });

    it('should throw ConflictException if email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          email: 'test@mundial.com',
          name: 'Test',
          password: 'pass123',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials and return tokens', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      usersRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      jwtService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.login({
        email: 'test@mundial.com',
        password: 'password123',
      });

      expect(result.tokens.accessToken).toBe('access-token');
      expect(result.tokens.refreshToken).toBe('refresh-token');
      expect(result.user.id).toBe('user-1');
    });

    it('should throw UnauthorizedException for non-existent email', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'wrong@mundial.com', password: 'pass' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for wrong password', async () => {
      usersRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@mundial.com', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException for inactive user', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        isActive: false,
      });

      await expect(
        service.login({ email: 'test@mundial.com', password: 'pass' }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('refresh', () => {
    it('should return new token pair with rotation', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-refresh');
      jwtService.signAsync
        .mockResolvedValueOnce('new-access')
        .mockResolvedValueOnce('new-refresh');
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);

      const result = await service.refresh('user-1', 'valid-refresh-token');

      expect(result.tokens.accessToken).toBe('new-access');
      expect(result.tokens.refreshToken).toBe('new-refresh');
      expect(usersRepository.updateRefreshToken).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.refresh('bad-id', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if no stored refresh token', async () => {
      usersRepository.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(service.refresh('user-1', 'token')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw ForbiddenException if refresh token hash mismatch', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.refresh('user-1', 'bad-token')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('logout', () => {
    it('should set refresh token to null', async () => {
      usersRepository.updateRefreshToken.mockResolvedValue(mockUser);

      await service.logout('user-1');

      expect(usersRepository.updateRefreshToken).toHaveBeenCalledWith(
        'user-1',
        null,
      );
    });
  });

  describe('me', () => {
    it('should return user data without sensitive fields', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);

      const result = await service.me('user-1');

      expect(result.id).toBe('user-1');
      expect(result.email).toBe('test@mundial.com');
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.me('bad-id')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('resolveInitialWorkspace', () => {
    const wsA = {
      id: 'ws-a',
      name: 'A',
      slug: 'a',
      logoUrl: null,
      color: null,
      plan: 'FREE',
      ownerId: 'user-1',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      deletedAt: null,
    };
    const wsB = {
      id: 'ws-b',
      name: 'B',
      slug: 'b',
      logoUrl: null,
      color: null,
      plan: 'FREE',
      ownerId: 'user-1',
      createdAt: new Date('2026-02-01'),
      updatedAt: new Date('2026-02-01'),
      deletedAt: null,
    };

    it('should return null when user has no workspaces', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        lastAccessedWorkspaceId: null,
      });
      prismaMock.workspaceMember.findMany.mockResolvedValue([]);

      const result = await service.resolveInitialWorkspace('user-1');

      expect(result).toBeNull();
    });

    it('should return single workspace when user has only one', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        lastAccessedWorkspaceId: null,
      });
      prismaMock.workspaceMember.findMany.mockResolvedValue([
        { id: 'm-1', role: 'OWNER', workspace: wsA, joinedAt: new Date() },
      ]);

      const result = await service.resolveInitialWorkspace('user-1');

      expect(result?.workspace.id).toBe('ws-a');
      expect(result?.role).toBe('OWNER');
    });

    it('should return oldest joined when user has multiple workspaces', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        lastAccessedWorkspaceId: null,
      });
      prismaMock.workspaceMember.findMany.mockResolvedValue([
        {
          id: 'm-a',
          role: 'OWNER',
          workspace: wsA,
          joinedAt: new Date('2026-01-01'),
        },
        {
          id: 'm-b',
          role: 'MEMBER',
          workspace: wsB,
          joinedAt: new Date('2026-02-01'),
        },
      ]);

      const result = await service.resolveInitialWorkspace('user-1');

      // findMany ja vem ordenado por joinedAt asc — primeiro = mais antigo
      expect(result?.workspace.id).toBe('ws-a');
    });

    it('should prefer lastAccessedWorkspaceId when user is still member', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        lastAccessedWorkspaceId: 'ws-b',
      });
      prismaMock.workspaceMember.findUnique.mockResolvedValue({
        id: 'm-b',
        role: 'MEMBER',
        workspace: wsB,
      });

      const result = await service.resolveInitialWorkspace('user-1');

      expect(result?.workspace.id).toBe('ws-b');
      expect(prismaMock.workspaceMember.findUnique).toHaveBeenCalledWith({
        where: {
          workspaceId_userId: { workspaceId: 'ws-b', userId: 'user-1' },
        },
        include: { workspace: true },
      });
      // Nao deve ter caido no fallback findMany
      expect(prismaMock.workspaceMember.findMany).not.toHaveBeenCalled();
    });

    it('should fallback to oldest membership when lastAccessed is no longer valid', async () => {
      prismaMock.user.findFirst.mockResolvedValue({
        id: 'user-1',
        lastAccessedWorkspaceId: 'ws-deleted',
      });
      // lastAccessed nao existe mais
      prismaMock.workspaceMember.findUnique.mockResolvedValue(null);
      prismaMock.workspaceMember.findMany.mockResolvedValue([
        { id: 'm-a', role: 'OWNER', workspace: wsA, joinedAt: new Date() },
      ]);

      const result = await service.resolveInitialWorkspace('user-1');

      expect(result?.workspace.id).toBe('ws-a');
    });
  });

  describe('selectWorkspace', () => {
    it('should reject when user is not member', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      prismaMock.workspaceMember.findUnique.mockResolvedValue(null);

      await expect(service.selectWorkspace('user-1', 'ws-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should issue tokens with workspace context when member', async () => {
      usersRepository.findById.mockResolvedValue(mockUser);
      prismaMock.workspaceMember.findUnique.mockResolvedValue({
        id: 'm-1',
        role: 'ADMIN',
        workspace: {
          id: 'ws-1',
          name: 'WS',
          slug: 'ws',
          logoUrl: null,
          color: null,
          plan: 'FREE',
          ownerId: 'user-1',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');
      jwtService.signAsync
        .mockResolvedValueOnce('access')
        .mockResolvedValueOnce('refresh');

      const result = await service.selectWorkspace('user-1', 'ws-1');

      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
      expect(result.workspace.id).toBe('ws-1');
      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { lastAccessedWorkspaceId: 'ws-1' },
      });
    });
  });
});
