import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DepartmentsService } from './departments.service';
import { DepartmentsRepository } from './departments.repository';
import { PrismaService } from '../../../../database/prisma.service';

const mockDepartment = {
  id: 'dept-1',
  name: 'Comercial',
  slug: 'comercial',
  description: 'Departamento comercial',
  icon: '🏢',
  color: '#3B82F6',
  isPrivate: false,
  isDefault: false,
  isProtected: false,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockDeptWithDetails = {
  ...mockDepartment,
  areas: [
    {
      id: 'area-1',
      name: 'Vendas',
      slug: 'vendas',
      description: 'Area de vendas',
      isPrivate: false,
      _count: { processes: 3 },
    },
  ],
  processes: [
    {
      id: 'proc-1',
      name: 'Backlog Geral',
      slug: 'backlog-geral',
      processType: 'LIST',
      featureRoute: null,
      description: 'Backlog do departamento',
      isPrivate: false,
    },
  ],
};

const mockProcessSummaries = [
  {
    id: 'proc-1',
    name: 'Backlog Geral',
    slug: 'backlog-geral',
    processType: 'LIST',
    featureRoute: null,
    description: null,
    isPrivate: false,
    areaId: null,
    areaName: null,
    totalItems: 5,
    groups: [
      {
        statusId: 'st-1',
        statusName: 'A Fazer',
        statusColor: '#3B82F6',
        statusCategory: 'NOT_STARTED',
        count: 3,
        items: [],
      },
      {
        statusId: 'st-2',
        statusName: 'Concluido',
        statusColor: '#22C55E',
        statusCategory: 'DONE',
        count: 2,
        items: [],
      },
    ],
  },
  {
    id: 'proc-2',
    name: 'Pedidos',
    slug: 'pedidos',
    processType: 'BPM',
    featureRoute: '/comercial/pedidos',
    description: null,
    isPrivate: false,
    areaId: 'area-1',
    areaName: 'Vendas',
    totalOrders: 20,
    ordersByStatus: { EM_ORCAMENTO: 12, FATURAR: 8 },
    pendingActivities: 5,
    pendingHandoffs: 2,
  },
];

describe('DepartmentsService', () => {
  let service: DepartmentsService;
  let repository: jest.Mocked<DepartmentsRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepartmentsService,
        {
          provide: DepartmentsRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findBySlug: jest.fn(),
            slugExists: jest.fn().mockResolvedValue(false),
            findMany: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            getSidebarTree: jest.fn(),
            findBySlugWithDetails: jest.fn(),
            getProcessSummaries: jest.fn(),
          },
        },
        {
          // O create agora roda dentro de `prisma.$transaction` para seedar
          // statuses default em atomicidade com o department.
          provide: PrismaService,
          useValue: {
            $transaction: jest.fn(
              async (cb: (tx: unknown) => unknown) =>
                cb({
                  department: { create: jest.fn().mockResolvedValue(mockDepartment) },
                  workflowStatus: { create: jest.fn().mockResolvedValue({}) },
                }),
            ),
          },
        },
      ],
    }).compile();

    service = module.get(DepartmentsService);
    repository = module.get(DepartmentsRepository);
  });

  describe('create', () => {
    it('should create a department with generated slug', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue(mockDepartment);

      const result = await service.create({
        name: 'Comercial',
        description: 'Departamento comercial',
      });

      expect(result.id).toBe('dept-1');
      expect(result.name).toBe('Comercial');
      expect(result.slug).toBe('comercial');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'comercial' }),
      );
    });

    it('should append suffix when slug already exists', async () => {
      repository.findBySlug
        .mockResolvedValueOnce(mockDepartment) // "comercial" taken
        .mockResolvedValueOnce(null); // "comercial-1" free
      repository.create.mockResolvedValue({
        ...mockDepartment,
        slug: 'comercial-1',
      });

      const result = await service.create({ name: 'Comercial' });

      expect(result.slug).toBe('comercial-1');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'comercial-1' }),
      );
    });

    it('should normalize accented characters in slug', async () => {
      repository.findBySlug.mockResolvedValue(null);
      repository.create.mockResolvedValue({
        ...mockDepartment,
        name: 'Producao',
        slug: 'producao',
      });

      await service.create({ name: 'Produção' });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({ slug: 'producao' }),
      );
    });
  });

  describe('findById', () => {
    it('should return department by id', async () => {
      repository.findById.mockResolvedValue(mockDepartment);

      const result = await service.findById('dept-1');

      expect(result.id).toBe('dept-1');
      expect(result.name).toBe('Comercial');
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.findById('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update department fields', async () => {
      repository.findById.mockResolvedValue(mockDepartment);
      repository.update.mockResolvedValue({
        ...mockDepartment,
        description: 'Nova descricao',
      });

      const result = await service.update('dept-1', {
        description: 'Nova descricao',
      });

      expect(result.description).toBe('Nova descricao');
    });

    it('should regenerate slug when name changes', async () => {
      repository.findById.mockResolvedValue(mockDepartment);
      repository.findBySlug.mockResolvedValue(null);
      repository.update.mockResolvedValue({
        ...mockDepartment,
        name: 'Financeiro',
        slug: 'financeiro',
      });

      await service.update('dept-1', { name: 'Financeiro' });

      expect(repository.update).toHaveBeenCalledWith(
        'dept-1',
        expect.objectContaining({ slug: 'financeiro' }),
      );
    });

    it('should append suffix when new slug conflicts with another department', async () => {
      repository.findById.mockResolvedValue(mockDepartment);
      repository.findBySlug
        .mockResolvedValueOnce({ ...mockDepartment, id: 'dept-2' }) // "financeiro" taken
        .mockResolvedValueOnce(null); // "financeiro-1" free
      repository.update.mockResolvedValue({
        ...mockDepartment,
        name: 'Financeiro',
        slug: 'financeiro-1',
      });

      const result = await service.update('dept-1', { name: 'Financeiro' });

      expect(result.slug).toBe('financeiro-1');
    });

    it('should throw NotFoundException if department not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.update('bad-id', { name: 'Test' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should soft delete department', async () => {
      repository.findById.mockResolvedValue(mockDepartment);

      await service.remove('dept-1');

      expect(repository.softDelete).toHaveBeenCalledWith('dept-1');
    });

    it('should throw NotFoundException if not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.remove('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if department is protected', async () => {
      repository.findById.mockResolvedValue({
        ...mockDepartment,
        isProtected: true,
      });

      await expect(service.remove('dept-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSidebarTree', () => {
    it('should map processes as directProcesses', async () => {
      repository.getSidebarTree.mockResolvedValue([
        {
          ...mockDepartment,
          areas: [],
          processes: [
            {
              id: 'proc-1',
              name: 'Backlog',
              slug: 'backlog',
              processType: 'LIST',
              description: null,
              featureRoute: null,
              isPrivate: false,
              isProtected: false,
              sortOrder: 0,
            },
          ],
        },
      ]);

      const result = await service.getSidebarTree();

      expect(result).toHaveLength(1);
      expect(result[0].directProcesses).toHaveLength(1);
      expect(result[0].directProcesses[0].name).toBe('Backlog');
    });

    it('should include areas with nested processes', async () => {
      repository.getSidebarTree.mockResolvedValue([
        {
          ...mockDepartment,
          areas: [
            {
              id: 'area-1',
              name: 'Vendas',
              slug: 'vendas',
              description: null,
              isPrivate: false,
              sortOrder: 0,
              isDefault: false,
              processes: [
                {
                  id: 'proc-2',
                  name: 'Cotacoes',
                  slug: 'cotacoes',
                  processType: 'LIST',
                  description: null,
                  featureRoute: null,
                  isPrivate: false,
                  isProtected: false,
                  sortOrder: 0,
                },
              ],
            },
          ],
          processes: [],
        },
      ]);

      const result = await service.getSidebarTree();

      expect(result[0].areas).toHaveLength(1);
      expect(result[0].areas[0].processes).toHaveLength(1);
      expect(result[0].directProcesses).toHaveLength(0);
    });
  });

  describe('findBySlug', () => {
    it('should return department with areas and directProcesses', async () => {
      repository.findBySlugWithDetails.mockResolvedValue(mockDeptWithDetails);

      const result = await service.findBySlug('comercial');

      expect(result.id).toBe('dept-1');
      expect(result.areas).toHaveLength(1);
      expect(result.areas[0].processCount).toBe(3);
      expect(result.directProcesses).toHaveLength(1);
      expect(result.directProcesses[0].processType).toBe('LIST');
    });

    it('should throw NotFoundException if slug not found', async () => {
      repository.findBySlugWithDetails.mockResolvedValue(null);

      await expect(service.findBySlug('inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getProcessSummaries', () => {
    it('should return summaries for all processes in department', async () => {
      repository.findById.mockResolvedValue(mockDepartment);
      repository.getProcessSummaries.mockResolvedValue(mockProcessSummaries);

      const result = await service.getProcessSummaries('dept-1');

      expect(result).toHaveLength(2);
      expect(result[0].processType).toBe('LIST');
      expect(result[1].processType).toBe('BPM');
    });

    it('should pass showClosed flag to repository', async () => {
      repository.findById.mockResolvedValue(mockDepartment);
      repository.getProcessSummaries.mockResolvedValue([]);

      await service.getProcessSummaries('dept-1', true);

      expect(repository.getProcessSummaries).toHaveBeenCalledWith(
        'dept-1',
        true,
      );
    });

    it('should throw NotFoundException if department not found', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(service.getProcessSummaries('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
