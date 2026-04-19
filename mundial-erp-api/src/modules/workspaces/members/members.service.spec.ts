import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceMemberRole } from '@prisma/client';
import { MembersService } from './members.service';
import { MembersRepository } from './members.repository';
import { WorkspacesRepository } from '../workspaces.repository';
import { WorkspacesService } from '../workspaces.service';

const memberFixture = (
  role: WorkspaceMemberRole = WorkspaceMemberRole.MEMBER,
) => ({
  id: 'm-1',
  workspaceId: 'ws-1',
  userId: 'user-2',
  role,
  joinedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-2', name: 'Other', email: 'other@x.com' },
});

describe('MembersService', () => {
  let service: MembersService;
  let membersRepository: jest.Mocked<MembersRepository>;
  let workspacesRepository: jest.Mocked<WorkspacesRepository>;
  let workspacesService: jest.Mocked<WorkspacesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MembersService,
        {
          provide: MembersRepository,
          useValue: {
            findById: jest.fn(),
            findMany: jest.fn(),
            create: jest.fn(),
            updateRole: jest.fn(),
            remove: jest.fn(),
            countByRole: jest.fn(),
            userExists: jest.fn(),
          },
        },
        {
          provide: WorkspacesRepository,
          useValue: {
            findById: jest.fn(),
          },
        },
        {
          provide: WorkspacesService,
          useValue: {
            assertMembership: jest.fn(),
            assertOwnerOrAdmin: jest.fn(),
            assertOwner: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(MembersService);
    membersRepository = module.get(MembersRepository);
    workspacesRepository = module.get(WorkspacesRepository);
    workspacesService = module.get(WorkspacesService);
  });

  describe('add', () => {
    it('should add a MEMBER when actor is owner/admin', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.userExists.mockResolvedValue(true);
      membersRepository.findById.mockResolvedValue(null);
      membersRepository.create.mockResolvedValue(memberFixture() as never);

      const result = await service.add('ws-1', 'actor', {
        userId: 'user-2',
        role: WorkspaceMemberRole.MEMBER,
      });

      expect(result.userId).toBe('user-2');
      expect(membersRepository.create).toHaveBeenCalledWith({
        workspaceId: 'ws-1',
        userId: 'user-2',
        role: WorkspaceMemberRole.MEMBER,
      });
    });

    it('should reject adding role OWNER directly', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();

      await expect(
        service.add('ws-1', 'actor', {
          userId: 'user-2',
          role: WorkspaceMemberRole.OWNER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when target user does not exist', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.userExists.mockResolvedValue(false);

      await expect(
        service.add('ws-1', 'actor', {
          userId: 'ghost',
          role: WorkspaceMemberRole.MEMBER,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException when user is already a member', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.userExists.mockResolvedValue(true);
      membersRepository.findById.mockResolvedValue(memberFixture() as never);

      await expect(
        service.add('ws-1', 'actor', {
          userId: 'user-2',
          role: WorkspaceMemberRole.MEMBER,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateRole', () => {
    it('should update role of MEMBER to ADMIN', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(memberFixture() as never);
      membersRepository.updateRole.mockResolvedValue(
        memberFixture(WorkspaceMemberRole.ADMIN) as never,
      );

      const result = await service.updateRole('ws-1', 'user-2', 'actor', {
        role: WorkspaceMemberRole.ADMIN,
      });

      expect(result.role).toBe(WorkspaceMemberRole.ADMIN);
    });

    it('should require OWNER permission to promote to OWNER', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(memberFixture() as never);
      workspacesService.assertOwner.mockRejectedValue(
        new ForbiddenException('Acao restrita ao owner do workspace'),
      );

      await expect(
        service.updateRole('ws-1', 'user-2', 'actor', {
          role: WorkspaceMemberRole.OWNER,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should refuse demotion when it leaves zero OWNERs', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      workspacesService.assertOwner.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(
        memberFixture(WorkspaceMemberRole.OWNER) as never,
      );
      membersRepository.countByRole.mockResolvedValue(1);

      await expect(
        service.updateRole('ws-1', 'user-2', 'actor', {
          role: WorkspaceMemberRole.MEMBER,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow demotion of OWNER when another OWNER exists', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      workspacesService.assertOwner.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(
        memberFixture(WorkspaceMemberRole.OWNER) as never,
      );
      membersRepository.countByRole.mockResolvedValue(2);
      membersRepository.updateRole.mockResolvedValue(
        memberFixture(WorkspaceMemberRole.MEMBER) as never,
      );

      const result = await service.updateRole('ws-1', 'user-2', 'actor', {
        role: WorkspaceMemberRole.MEMBER,
      });

      expect(result.role).toBe(WorkspaceMemberRole.MEMBER);
    });

    it('should throw NotFoundException when target member does not exist', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateRole('ws-1', 'ghost', 'actor', {
          role: WorkspaceMemberRole.MEMBER,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a MEMBER', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(memberFixture() as never);

      await service.remove('ws-1', 'user-2', 'actor');

      expect(membersRepository.remove).toHaveBeenCalledWith('ws-1', 'user-2');
    });

    it('should refuse to remove the workspace OWNER (root owner)', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(
        memberFixture(WorkspaceMemberRole.OWNER) as never,
      );
      workspacesRepository.findById.mockResolvedValue({
        id: 'ws-1',
        ownerId: 'user-2', // mesmo user que esta sendo removido = root owner
      } as never);

      await expect(service.remove('ws-1', 'user-2', 'actor')).rejects.toThrow(
        ForbiddenException,
      );
      expect(membersRepository.remove).not.toHaveBeenCalled();
    });

    it('should allow removing an OWNER who is not the workspace root owner', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(
        memberFixture(WorkspaceMemberRole.OWNER) as never,
      );
      workspacesRepository.findById.mockResolvedValue({
        id: 'ws-1',
        ownerId: 'someone-else',
      } as never);

      await service.remove('ws-1', 'user-2', 'actor');

      expect(membersRepository.remove).toHaveBeenCalledWith('ws-1', 'user-2');
    });

    it('should throw NotFoundException when target is not member', async () => {
      workspacesService.assertOwnerOrAdmin.mockResolvedValue();
      membersRepository.findById.mockResolvedValue(null);

      await expect(service.remove('ws-1', 'ghost', 'actor')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
