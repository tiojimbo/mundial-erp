import { Test, TestingModule } from '@nestjs/testing';
import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceMemberRole } from '@prisma/client';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from './workspaces.repository';
import { MembersRepository } from './members/members.repository';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { PaginationDto } from '../../common/dtos/pagination.dto';

const baseWorkspace = {
  id: 'ws-1',
  name: 'Mundial Telhas',
  slug: 'mundial-telhas',
  logoUrl: null,
  color: null,
  plan: 'FREE' as const,
  ownerId: 'user-1',
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  deletedAt: null,
};

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  let workspacesRepository: jest.Mocked<WorkspacesRepository>;
  let membersRepository: jest.Mocked<MembersRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        {
          provide: WorkspacesRepository,
          useValue: {
            createWithOwner: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            slugExists: jest.fn(),
            findManyByMember: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            countSeats: jest.fn(),
          },
        },
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
      ],
    }).compile();

    service = module.get(WorkspacesService);
    workspacesRepository = module.get(WorkspacesRepository);
    membersRepository = module.get(MembersRepository);
  });

  describe('create', () => {
    const dto: CreateWorkspaceDto = {
      name: 'Mundial Telhas',
      slug: 'mundial-telhas',
    };

    it('should create workspace with creator as OWNER (atomic)', async () => {
      workspacesRepository.slugExists.mockResolvedValue(false);
      workspacesRepository.createWithOwner.mockResolvedValue(baseWorkspace);

      const result = await service.create('user-1', dto);

      expect(result.id).toBe('ws-1');
      expect(workspacesRepository.createWithOwner).toHaveBeenCalledWith({
        name: 'Mundial Telhas',
        slug: 'mundial-telhas',
        logoUrl: undefined,
        color: undefined,
        ownerId: 'user-1',
      });
    });

    it('should throw ConflictException when slug already exists', async () => {
      workspacesRepository.slugExists.mockResolvedValue(true);

      await expect(service.create('user-1', dto)).rejects.toThrow(
        ConflictException,
      );
      expect(workspacesRepository.createWithOwner).not.toHaveBeenCalled();
    });
  });

  describe('findById', () => {
    it('should return workspace when user is member', async () => {
      workspacesRepository.findById.mockResolvedValue(baseWorkspace);
      membersRepository.findById.mockResolvedValue({
        id: 'm-1',
        workspaceId: 'ws-1',
        userId: 'user-1',
        role: WorkspaceMemberRole.OWNER,
        joinedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: 'user-1', name: 'U', email: 'u@x.com' },
      } as never);

      const result = await service.findById('ws-1', 'user-1');

      expect(result.id).toBe('ws-1');
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      workspacesRepository.findById.mockResolvedValue(null);

      await expect(service.findById('ws-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not a member', async () => {
      workspacesRepository.findById.mockResolvedValue(baseWorkspace);
      membersRepository.findById.mockResolvedValue(null);

      await expect(service.findById('ws-1', 'outsider')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('update', () => {
    it('should update name when actor is OWNER', async () => {
      workspacesRepository.findById.mockResolvedValue(baseWorkspace);
      membersRepository.findById.mockResolvedValue({
        role: WorkspaceMemberRole.OWNER,
      } as never);
      workspacesRepository.update.mockResolvedValue({
        ...baseWorkspace,
        name: 'New Name',
      });

      const result = await service.update('ws-1', 'user-1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
    });

    it('should throw ForbiddenException for MEMBER trying to update', async () => {
      workspacesRepository.findById.mockResolvedValue(baseWorkspace);
      membersRepository.findById.mockResolvedValue({
        role: WorkspaceMemberRole.MEMBER,
      } as never);

      await expect(
        service.update('ws-1', 'user-1', { name: 'X' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw ConflictException when changing slug to a taken value', async () => {
      workspacesRepository.findById.mockResolvedValue(baseWorkspace);
      membersRepository.findById.mockResolvedValue({
        role: WorkspaceMemberRole.OWNER,
      } as never);
      workspacesRepository.slugExists.mockResolvedValue(true);

      await expect(
        service.update('ws-1', 'user-1', { slug: 'taken-slug' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('remove (soft delete)', () => {
    it('should soft-delete when actor is owner of the workspace', async () => {
      workspacesRepository.findById.mockResolvedValue(baseWorkspace);

      await service.remove('ws-1', 'user-1');

      expect(workspacesRepository.softDelete).toHaveBeenCalledWith('ws-1');
    });

    it('should throw NotFoundException when workspace does not exist', async () => {
      workspacesRepository.findById.mockResolvedValue(null);

      await expect(service.remove('ws-x', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when actor is not the workspace owner', async () => {
      workspacesRepository.findById.mockResolvedValue(baseWorkspace);

      await expect(service.remove('ws-1', 'someone-else')).rejects.toThrow(
        ForbiddenException,
      );
      expect(workspacesRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('findAllForUser', () => {
    it('should map repository items to dtos', async () => {
      workspacesRepository.findManyByMember.mockResolvedValue({
        items: [baseWorkspace],
        total: 1,
      });
      const pagination = new PaginationDto();

      const result = await service.findAllForUser('user-1', pagination);

      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('ws-1');
    });
  });
});
