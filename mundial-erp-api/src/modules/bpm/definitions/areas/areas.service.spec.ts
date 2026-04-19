import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AreasService } from './areas.service';
import { AreasRepository } from './areas.repository';
import { WorkflowStatusesService } from '../workflow-statuses/workflow-statuses.service';

const mockArea = {
  id: 'area-1',
  name: 'Vendas',
  slug: 'vendas',
  description: 'Area de vendas',
  departmentId: 'dept-1',
  isPrivate: false,
  icon: null,
  color: '#3B82F6',
  useSpaceStatuses: true,
  sortOrder: 0,
  isDefault: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
  department: { id: 'dept-1', name: 'Comercial', slug: 'comercial' },
};

const mockAreaWithDetails = {
  ...mockArea,
  department: { id: 'dept-1', name: 'Comercial', slug: 'comercial' },
  processes: [
    {
      id: 'proc-1',
      name: 'Cotacoes',
      slug: 'cotacoes',
      processType: 'LIST',
      featureRoute: null,
      description: 'Processo de cotacoes',
      isPrivate: false,
    },
    {
      id: 'proc-2',
      name: 'Pedidos',
      slug: 'pedidos',
      processType: 'BPM',
      featureRoute: '/comercial/pedidos',
      description: null,
      isPrivate: false,
    },
  ],
};

const mockProcessSummaries = [
  {
    id: 'proc-1',
    name: 'Cotacoes',
    slug: 'cotacoes',
    processType: 'LIST',
    featureRoute: null,
    description: null,
    isPrivate: false,
    areaId: 'area-1',
    areaName: 'Vendas',
    totalItems: 10,
    groups: [],
  },
];

describe('AreasService', () => {
  let service: AreasService;
  let repository: jest.Mocked<AreasRepository>;
  let workflowStatusesService: jest.Mocked<WorkflowStatusesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreasService,
        {
          provide: AreasRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            findBySlugWithDetails: jest.fn(),
            getProcessSummaries: jest.fn(),
          },
        },
        {
          provide: WorkflowStatusesService,
          useValue: {
            copyStatusesToArea: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AreasService);
    repository = module.get(AreasRepository);
    workflowStatusesService = module.get(WorkflowStatusesService);
  });

  describe('create', () => {
    it('should create an area with generated slug', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockArea);

      const result = await service.create({
        name: 'Vendas',
        departmentId: 'dept-1',
      });

      expect(result.id).toBe('area-1');
      expect(result.slug).toBe('vendas');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'vendas',
          useSpaceStatuses: true,
          department: { connect: { id: 'dept-1' } },
        }),
      );
    });

    it('should append suffix when slug already exists', async () => {
      repository.findBySlug
        .mockResolvedValueOnce(mockArea) // "vendas" taken
        .mockResolvedValueOnce(null); // "vendas-1" free
      repository.create.mockResolvedValue({
        ...mockArea,
        slug: 'vendas-1',
      });

      const result = await service.create({
        name: 'Vendas',
        departmentId: 'dept-1',
      });

      expect(result.slug).toBe('vendas-1');
    });

    it('should NOT copy statuses when useSpaceStatuses is true (default)', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockArea);

      await service.create({
        name: 'Vendas',
        departmentId: 'dept-1',
        useSpaceStatuses: true,
      });

      expect(workflowStatusesService.copyStatusesToArea).not.toHaveBeenCalled();
    });

    it('should copy statuses when useSpaceStatuses is false', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockArea,
        useSpaceStatuses: false,
      });

      await service.create({
        name: 'Vendas',
        departmentId: 'dept-1',
        useSpaceStatuses: false,
      });

      expect(workflowStatusesService.copyStatusesToArea).toHaveBeenCalledWith(
        'dept-1',
        'area-1',
      );
    });
  });

  describe('findById', () => {
    it('should return area by id', async () => {
      repository.findById.mockResolvedValue(mockArea);

      const result = await service.findById('area-1');

      expect(result.id).toBe('area-1');
      expect(result.useSpaceStatuses).toBe(true);
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update area fields', async () => {
      repository.findById.mockResolvedValue(mockArea);
      repository.update.mockResolvedValue({
        ...mockArea,
        description: 'Nova descricao',
      });

      const result = await service.update('area-1', {
        description: 'Nova descricao',
      });

      expect(result.description).toBe('Nova descricao');
    });

    it('should throw NotFoundException if area not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should regenerate slug when name changes', async () => {
      repository.findById.mockResolvedValue(mockArea);
      repository.findBySlug.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockArea,
        name: 'Pos-Vendas',
        slug: 'pos-vendas',
      });

      await service.update('area-1', { name: 'Pos-Vendas' });

      expect(repository.update).toHaveBeenCalledWith(
        'area-1',
        expect.objectContaining({ slug: 'pos-vendas' }),
      );
    });

    it('should append suffix when new slug conflicts', async () => {
      repository.findById.mockResolvedValue(mockArea);
      repository.findBySlug
        .mockResolvedValueOnce({ ...mockArea, id: 'area-2' }) // "producao" taken
        .mockResolvedValueOnce(null); // "producao-1" free
      repository.update.mockResolvedValue({
        ...mockArea,
        name: 'Producao',
        slug: 'producao-1',
      });

      const result = await service.update('area-1', { name: 'Producao' });

      expect(result.slug).toBe('producao-1');
    });

    it('should copy statuses when useSpaceStatuses changes from true to false', async () => {
      repository.findById.mockResolvedValue({
        ...mockArea,
        useSpaceStatuses: true,
      });
      repository.update.mockResolvedValue({
        ...mockArea,
        useSpaceStatuses: false,
      });

      await service.update('area-1', { useSpaceStatuses: false });

      expect(workflowStatusesService.copyStatusesToArea).toHaveBeenCalledWith(
        'dept-1',
        'area-1',
      );
    });

    it('should NOT copy statuses when useSpaceStatuses stays false', async () => {
      repository.findById.mockResolvedValue({
        ...mockArea,
        useSpaceStatuses: false,
      });
      repository.update.mockResolvedValue({
        ...mockArea,
        useSpaceStatuses: false,
      });

      await service.update('area-1', { useSpaceStatuses: false });

      expect(workflowStatusesService.copyStatusesToArea).not.toHaveBeenCalled();
    });

    it('should NOT copy statuses when useSpaceStatuses changes from false to true', async () => {
      repository.findById.mockResolvedValue({
        ...mockArea,
        useSpaceStatuses: false,
      });
      repository.update.mockResolvedValue({
        ...mockArea,
        useSpaceStatuses: true,
      });

      await service.update('area-1', { useSpaceStatuses: true });

      expect(workflowStatusesService.copyStatusesToArea).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should soft delete area', async () => {
      repository.findById.mockResolvedValue(mockArea);

      await service.remove('area-1');

      expect(repository.softDelete).toHaveBeenCalledWith('area-1');
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if area is default', async () => {
      repository.findById.mockResolvedValue({
        ...mockArea,
        isDefault: true,
      });

      await expect(service.remove('area-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findBySlug', () => {
    it('should return area with department info and processes', async () => {
      repository.findBySlugWithDetails.mockResolvedValue(mockAreaWithDetails);

      const result = await service.findBySlug('vendas');

      expect(result.id).toBe('area-1');
      expect(result.departmentName).toBe('Comercial');
      expect(result.departmentSlug).toBe('comercial');
      expect(result.processes).toHaveLength(2);
      expect(result.processes[0].processType).toBe('LIST');
      expect(result.processes[1].processType).toBe('BPM');
    });

    it('should throw NotFoundException if slug not found', async () => {
      repository.findBySlugWithDetails.mockResolvedValue(null);

      await expect(service.findBySlug('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProcessSummaries', () => {
    it('should return process summaries for area', async () => {
      repository.getProcessSummaries.mockResolvedValue(mockProcessSummaries);

      const result = await service.getProcessSummaries('area-1');

      expect(result).toHaveLength(1);
      expect(result[0].processType).toBe('LIST');
      expect(repository.getProcessSummaries).toHaveBeenCalledWith(
        'area-1',
        false,
      );
    });

    it('should pass showClosed flag to repository', async () => {
      repository.getProcessSummaries.mockResolvedValue([]);

      await service.getProcessSummaries('area-1', true);

      expect(repository.getProcessSummaries).toHaveBeenCalledWith(
        'area-1',
        true,
      );
    });
  });
});
