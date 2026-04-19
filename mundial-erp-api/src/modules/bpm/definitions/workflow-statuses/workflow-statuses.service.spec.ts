import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { StatusCategory } from '@prisma/client';
import { WorkflowStatusesService } from './workflow-statuses.service';
import { WorkflowStatusesRepository } from './workflow-statuses.repository';

const mockStatus = {
  id: 'ws-1',
  name: 'A Fazer',
  category: 'NOT_STARTED' as StatusCategory,
  color: '#3B82F6',
  icon: null,
  sortOrder: 0,
  departmentId: 'dept-1',
  areaId: null,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockStatusActive = {
  ...mockStatus,
  id: 'ws-2',
  name: 'Em Progresso',
  category: 'ACTIVE' as StatusCategory,
  color: '#F59E0B',
  sortOrder: 1,
};

const mockStatusDone = {
  ...mockStatus,
  id: 'ws-3',
  name: 'Concluido',
  category: 'DONE' as StatusCategory,
  color: '#22C55E',
  sortOrder: 2,
};

const mockStatusClosed = {
  ...mockStatus,
  id: 'ws-4',
  name: 'Fechado',
  category: 'CLOSED' as StatusCategory,
  color: '#6B7280',
  sortOrder: 3,
};

const allStatuses = [
  mockStatus,
  mockStatusActive,
  mockStatusDone,
  mockStatusClosed,
];

const mockAreaStatusOwn = {
  ...mockStatus,
  id: 'ws-area-1',
  areaId: 'area-1',
};

describe('WorkflowStatusesService', () => {
  let service: WorkflowStatusesService;
  let repository: jest.Mocked<WorkflowStatusesRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowStatusesService,
        {
          provide: WorkflowStatusesRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findByDepartment: jest.fn(),
            findByArea: jest.fn(),
            findAreaById: jest.fn(),
            copyDepartmentStatusesToArea: jest.fn(),
            countByCategoryAndDepartment: jest.fn(),
            countWorkItemsByStatusId: jest.fn(),
            migrateWorkItems: jest.fn(),
            getMaxSortOrder: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            updateManySortOrder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(WorkflowStatusesService);
    repository = module.get(WorkflowStatusesRepository);
  });

  describe('create', () => {
    it('should create a status with next sort order', async () => {
      repository.getMaxSortOrder.mockResolvedValue(2);
      repository.create.mockResolvedValue({ ...mockStatus, sortOrder: 3 });
      repository.findById.mockResolvedValue({ ...mockStatus, sortOrder: 3 });

      const result = await service.create({
        name: 'A Fazer',
        category: 'NOT_STARTED' as StatusCategory,
        color: '#3B82F6',
        departmentId: 'dept-1',
      });

      expect(result.name).toBe('A Fazer');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: 3 }),
      );
    });
  });

  describe('findByDepartment', () => {
    it('should return department statuses grouped by category', async () => {
      repository.findByDepartment.mockResolvedValue(allStatuses);

      const result = await service.findByDepartment('dept-1');

      expect(result.NOT_STARTED).toHaveLength(1);
      expect(result.ACTIVE).toHaveLength(1);
      expect(result.DONE).toHaveLength(1);
      expect(result.CLOSED).toHaveLength(1);
      expect(result.NOT_STARTED[0].name).toBe('A Fazer');
    });

    it('should return department statuses when areaId is provided but area inherits', async () => {
      repository.findAreaById.mockResolvedValue({
        id: 'area-1',
        useSpaceStatuses: true,
      });
      repository.findByDepartment.mockResolvedValue(allStatuses);

      const result = await service.findByDepartment('dept-1', 'area-1');

      expect(repository.findByDepartment).toHaveBeenCalledWith('dept-1');
      expect(repository.findByArea).not.toHaveBeenCalled();
      expect(result.NOT_STARTED).toHaveLength(1);
    });

    it('should return area-specific statuses when area does not inherit', async () => {
      repository.findAreaById.mockResolvedValue({
        id: 'area-1',
        useSpaceStatuses: false,
      });
      repository.findByArea.mockResolvedValue([mockAreaStatusOwn]);

      const result = await service.findByDepartment('dept-1', 'area-1');

      expect(repository.findByArea).toHaveBeenCalledWith('area-1');
      expect(repository.findByDepartment).not.toHaveBeenCalled();
      expect(result.NOT_STARTED).toHaveLength(1);
    });

    it('should return department statuses when areaId is not provided', async () => {
      repository.findByDepartment.mockResolvedValue(allStatuses);

      await service.findByDepartment('dept-1');

      expect(repository.findByDepartment).toHaveBeenCalledWith('dept-1');
      expect(repository.findAreaById).not.toHaveBeenCalled();
    });

    it('should return empty groups when no statuses exist', async () => {
      repository.findByDepartment.mockResolvedValue([]);

      const result = await service.findByDepartment('dept-1');

      expect(result.NOT_STARTED).toHaveLength(0);
      expect(result.ACTIVE).toHaveLength(0);
      expect(result.DONE).toHaveLength(0);
      expect(result.CLOSED).toHaveLength(0);
    });
  });

  describe('copyStatusesToArea', () => {
    it('should delegate to repository', async () => {
      repository.copyDepartmentStatusesToArea.mockResolvedValue(undefined);

      await service.copyStatusesToArea('dept-1', 'area-1');

      expect(repository.copyDepartmentStatusesToArea).toHaveBeenCalledWith(
        'dept-1',
        'area-1',
      );
    });
  });

  describe('update', () => {
    it('should update status fields', async () => {
      repository.findById.mockResolvedValue(mockStatus);
      repository.update.mockResolvedValue({
        ...mockStatus,
        name: 'Pendente',
        color: '#EF4444',
      });

      const result = await service.update('ws-1', {
        name: 'Pendente',
        color: '#EF4444',
      });

      expect(result.name).toBe('Pendente');
      expect(result.color).toBe('#EF4444');
    });

    it('should throw NotFoundException if status not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete status without work items', async () => {
      repository.findById.mockResolvedValue(mockStatus);
      repository.countByCategoryAndDepartment.mockResolvedValue(2);
      repository.countWorkItemsByStatusId.mockResolvedValue(0);

      await service.remove('ws-1');

      expect(repository.softDelete).toHaveBeenCalledWith('ws-1');
    });

    it('should throw NotFoundException if status not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if last status of category', async () => {
      repository.findById.mockResolvedValue(mockStatus);
      repository.countByCategoryAndDepartment.mockResolvedValue(1);

      await expect(service.remove('ws-1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if has work items but no migration target', async () => {
      repository.findById.mockResolvedValue(mockStatus);
      repository.countByCategoryAndDepartment.mockResolvedValue(2);
      repository.countWorkItemsByStatusId.mockResolvedValue(5);

      await expect(service.remove('ws-1')).rejects.toThrow(BadRequestException);
    });

    it('should migrate work items and delete when target provided', async () => {
      const targetStatus = {
        ...mockStatusActive,
        departmentId: 'dept-1',
      };

      repository.findById
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(targetStatus);
      repository.countByCategoryAndDepartment.mockResolvedValue(2);
      repository.countWorkItemsByStatusId.mockResolvedValue(5);

      await service.remove('ws-1', 'ws-2');

      expect(repository.migrateWorkItems).toHaveBeenCalledWith('ws-1', 'ws-2');
      expect(repository.softDelete).toHaveBeenCalledWith('ws-1');
    });

    it('should throw NotFoundException if migration target not found', async () => {
      repository.findById
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(null);
      repository.countByCategoryAndDepartment.mockResolvedValue(2);
      repository.countWorkItemsByStatusId.mockResolvedValue(5);

      await expect(service.remove('ws-1', 'ws-bad')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if migration target is from different department', async () => {
      const targetStatus = {
        ...mockStatusActive,
        departmentId: 'dept-other',
      };

      repository.findById
        .mockResolvedValueOnce(mockStatus)
        .mockResolvedValueOnce(targetStatus);
      repository.countByCategoryAndDepartment.mockResolvedValue(2);
      repository.countWorkItemsByStatusId.mockResolvedValue(5);

      await expect(service.remove('ws-1', 'ws-2')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reorder', () => {
    it('should delegate reorder to repository', async () => {
      repository.updateManySortOrder.mockResolvedValue(undefined);

      await service.reorder({
        items: [
          { id: 'ws-1', sortOrder: 2 },
          { id: 'ws-2', sortOrder: 0 },
          { id: 'ws-3', sortOrder: 1 },
        ],
      });

      expect(repository.updateManySortOrder).toHaveBeenCalledWith([
        { id: 'ws-1', sortOrder: 2 },
        { id: 'ws-2', sortOrder: 0 },
        { id: 'ws-3', sortOrder: 1 },
      ]);
    });
  });
});
