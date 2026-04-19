import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InviteStatus, WorkspaceMemberRole } from '@prisma/client';
import { InvitesService } from './invites.service';
import { InvitesRepository } from './invites.repository';
import { WorkspacesService } from '../workspaces.service';

const baseInvite = {
  id: 'inv-1',
  workspaceId: 'ws-1',
  email: 'invitee@x.com',
  role: WorkspaceMemberRole.MEMBER,
  token: 'token-abc',
  status: InviteStatus.PENDING,
  expiresAt: new Date(Date.now() + 1000 * 60 * 60),
  invitedById: 'actor',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('InvitesService', () => {
  let service: InvitesService;
  let invitesRepository: jest.Mocked<InvitesRepository>;
  let workspacesService: jest.Mocked<WorkspacesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        {
          provide: InvitesRepository,
          useValue: {
            create: jest.fn(),
            findMany: jest.fn(),
            findById: jest.fn(),
            findByToken: jest.fn(),
            findPendingByEmail: jest.fn(),
            revoke: jest.fn(),
            acceptInTransaction: jest.fn(),
            memberExists: jest.fn(),
            findUserByEmail: jest.fn(),
          },
        },
        {
          provide: WorkspacesService,
          useValue: {
            assertOwnerOrAdmin: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(InvitesService);
    invitesRepository = module.get(InvitesRepository);
    workspacesService = module.get(WorkspacesService);
  });

  describe('create (criar token)', () => {
    it('should create invite with secure random token and 7d expiresAt', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      invitesRepository.findUserByEmail.mockResolvedValue(null);
      invitesRepository.findPendingByEmail.mockResolvedValue(null);
      invitesRepository.create.mockImplementation(async (data) => ({
        ...baseInvite,
        ...data,
      }));

      const result = await service.create('ws-1', 'actor', {
        email: 'New@X.com  ',
        role: WorkspaceMemberRole.MEMBER,
      });

      expect(result.email).toBe('new@x.com'); // normalizado
      expect(result.token).toMatch(/^[0-9a-f]{64}$/); // 32 bytes hex
      // expiresAt ~ 7 dias a frente
      const diffMs = result.expiresAt.getTime() - Date.now();
      const days = diffMs / (1000 * 60 * 60 * 24);
      expect(days).toBeGreaterThan(6.9);
      expect(days).toBeLessThan(7.1);
    });

    it('should reject role OWNER on invite', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();

      await expect(
        service.create('ws-1', 'actor', {
          email: 'x@x.com',
          role: WorkspaceMemberRole.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ConflictException when invitee already member', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      invitesRepository.findUserByEmail.mockResolvedValue({
        id: 'user-existing',
        email: 'x@x.com',
      } as never);
      invitesRepository.memberExists.mockResolvedValue(true);

      await expect(
        service.create('ws-1', 'actor', {
          email: 'x@x.com',
          role: WorkspaceMemberRole.MEMBER,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw ConflictException when pending invite already exists', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      invitesRepository.findUserByEmail.mockResolvedValue(null);
      invitesRepository.findPendingByEmail.mockResolvedValue(
        baseInvite as never,
      );

      await expect(
        service.create('ws-1', 'actor', {
          email: 'invitee@x.com',
          role: WorkspaceMemberRole.MEMBER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('accept (aceitar)', () => {
    it('should reject invalid token', async () => {
      invitesRepository.findByToken.mockResolvedValue(null);

      await expect(service.accept('bad', 'user-2')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reject expired invite (status PENDING but expiresAt past)', async () => {
      invitesRepository.findByToken.mockResolvedValue({
        ...baseInvite,
        expiresAt: new Date(Date.now() - 1000),
      } as never);

      await expect(service.accept('token-abc', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invite not in PENDING state', async () => {
      invitesRepository.findByToken.mockResolvedValue({
        ...baseInvite,
        status: InviteStatus.ACCEPTED,
      } as never);

      await expect(service.accept('token-abc', 'user-2')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject when already member', async () => {
      invitesRepository.findByToken.mockResolvedValue(baseInvite as never);
      invitesRepository.memberExists.mockResolvedValue(true);

      await expect(service.accept('token-abc', 'user-2')).rejects.toThrow(
        ConflictException,
      );
    });

    it('should reject when authenticated user email != invite email', async () => {
      invitesRepository.findByToken.mockResolvedValue(baseInvite as never);
      invitesRepository.memberExists.mockResolvedValue(false);
      invitesRepository.findUserByEmail.mockResolvedValue({
        id: 'user-other',
        email: 'invitee@x.com',
      } as never);

      await expect(
        service.accept('token-abc', 'user-attacker'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should accept invite and create membership transactionally', async () => {
      invitesRepository.findByToken.mockResolvedValue(baseInvite as never);
      invitesRepository.memberExists.mockResolvedValue(false);
      invitesRepository.findUserByEmail.mockResolvedValue({
        id: 'user-2',
        email: 'invitee@x.com',
      } as never);
      invitesRepository.acceptInTransaction.mockResolvedValue({
        id: 'm-1',
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: WorkspaceMemberRole.MEMBER,
      } as never);

      const result = await service.accept('token-abc', 'user-2');

      expect(result.workspaceId).toBe('ws-1');
      expect(result.role).toBe(WorkspaceMemberRole.MEMBER);
      expect(invitesRepository.acceptInTransaction).toHaveBeenCalledWith({
        inviteId: 'inv-1',
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: WorkspaceMemberRole.MEMBER,
      });
    });
  });

  describe('revoke', () => {
    it('should revoke a PENDING invite', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      invitesRepository.findById.mockResolvedValue(baseInvite as never);

      await service.revoke('ws-1', 'inv-1', 'actor');

      expect(invitesRepository.revoke).toHaveBeenCalledWith('inv-1');
    });

    it('should refuse revoking invite from another workspace', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      invitesRepository.findById.mockResolvedValue({
        ...baseInvite,
        workspaceId: 'ws-other',
      } as never);

      await expect(service.revoke('ws-1', 'inv-1', 'actor')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should refuse revoking non-PENDING invite', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      invitesRepository.findById.mockResolvedValue({
        ...baseInvite,
        status: InviteStatus.ACCEPTED,
      } as never);

      await expect(service.revoke('ws-1', 'inv-1', 'actor')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
