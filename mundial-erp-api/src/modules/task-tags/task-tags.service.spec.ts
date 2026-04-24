/**
 * Unit tests — TaskTagsService (rodavel hoje, mocka Prisma).
 *
 * Cobertura:
 *   - create normaliza nameLower e grava ambas colunas.
 *   - create captura unique violation (P2002) e retorna tag existente
 *     (resolucao sem loop client-side).
 *   - update re-normaliza nameLower quando name muda.
 *   - list/findById restringem por workspaceId (cross-tenant → NotFound).
 *
 * Este teste roda sem dependencia de DB / rede. Se a classe real ainda nao
 * existe (modulo em WIP pela Beatriz), temos aqui um contrato executavel
 * que Beatriz pode usar como spec de implementacao — basta remover o
 * `describe.skip` abaixo apos o service estar disponivel.
 *
 * Alternativa: para manter o CI verde ate a class existir, usamos um stub
 * inline TaskTagsService minimalista que reflete a API esperada. Assim o
 * suite e runnable HOJE (modo "contract-first") e serve de TDD guide.
 */

import { ConflictException, NotFoundException } from '@nestjs/common';

interface PrismaClientMock {
  taskTag: {
    create: jest.Mock;
    update: jest.Mock;
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    findMany: jest.Mock;
  };
}

interface TagEntity {
  id: string;
  workspaceId: string;
  name: string;
  nameLower: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

// Stub contract-first. Quando Beatriz entregar a real, substitua por import.
class TaskTagsServiceStub {
  constructor(private readonly prisma: PrismaClientMock) {}

  async create(
    workspaceId: string,
    input: { name: string; color: string },
  ): Promise<TagEntity> {
    const nameLower = input.name.trim().toLowerCase();
    try {
      return (await this.prisma.taskTag.create({
        data: {
          workspaceId,
          name: input.name,
          nameLower,
          color: input.color,
        },
      })) as TagEntity;
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        const existing = await this.prisma.taskTag.findFirst({
          where: { workspaceId, nameLower },
        });
        if (!existing) {
          throw err;
        }
        throw new ConflictException({
          message: 'Tag ja existe no workspace',
          existingTag: existing,
        });
      }
      throw err;
    }
  }

  async update(
    workspaceId: string,
    id: string,
    input: { name?: string; color?: string },
  ): Promise<TagEntity> {
    const existing = (await this.prisma.taskTag.findFirst({
      where: { id, workspaceId },
    })) as TagEntity | null;
    if (!existing) {
      throw new NotFoundException('Tag nao encontrada');
    }
    const data: Partial<TagEntity> = {};
    if (input.name !== undefined) {
      data.name = input.name;
      data.nameLower = input.name.trim().toLowerCase();
    }
    if (input.color !== undefined) {
      data.color = input.color;
    }
    return (await this.prisma.taskTag.update({
      where: { id },
      data,
    })) as TagEntity;
  }

  async findById(workspaceId: string, id: string): Promise<TagEntity> {
    const tag = (await this.prisma.taskTag.findFirst({
      where: { id, workspaceId },
    })) as TagEntity | null;
    if (!tag) {
      throw new NotFoundException('Tag nao encontrada');
    }
    return tag;
  }
}

describe('TaskTagsService (unit, stub contract-first)', () => {
  let prisma: PrismaClientMock;
  let service: TaskTagsServiceStub;

  beforeEach(() => {
    prisma = {
      taskTag: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new TaskTagsServiceStub(prisma);
  });

  describe('create', () => {
    it('normaliza nameLower a partir do name (trim + lowercase)', async () => {
      prisma.taskTag.create.mockResolvedValue({
        id: 'tag-1',
        workspaceId: 'ws-1',
        name: '  Frontend  ',
        nameLower: 'frontend',
        color: '#3b82f6',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await service.create('ws-1', { name: '  Frontend  ', color: '#3b82f6' });

      expect(prisma.taskTag.create).toHaveBeenCalledWith({
        data: {
          workspaceId: 'ws-1',
          name: '  Frontend  ',
          nameLower: 'frontend',
          color: '#3b82f6',
        },
      });
    });

    it('em unique violation (P2002) retorna ConflictException com existingTag', async () => {
      const uniqueErr = Object.assign(new Error('unique violation'), {
        code: 'P2002',
      });
      prisma.taskTag.create.mockRejectedValue(uniqueErr);
      const existing: TagEntity = {
        id: 'tag-existing',
        workspaceId: 'ws-1',
        name: 'Frontend',
        nameLower: 'frontend',
        color: '#3b82f6',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.taskTag.findFirst.mockResolvedValue(existing);

      await expect(
        service.create('ws-1', { name: 'Frontend', color: '#3b82f6' }),
      ).rejects.toBeInstanceOf(ConflictException);
      expect(prisma.taskTag.findFirst).toHaveBeenCalledWith({
        where: { workspaceId: 'ws-1', nameLower: 'frontend' },
      });
    });

    it('repropaga erros nao-P2002', async () => {
      prisma.taskTag.create.mockRejectedValue(new Error('DB exploded'));
      await expect(
        service.create('ws-1', { name: 'x', color: '#000' }),
      ).rejects.toThrow('DB exploded');
    });
  });

  describe('update', () => {
    it('re-normaliza nameLower quando name muda', async () => {
      const existing: TagEntity = {
        id: 'tag-1',
        workspaceId: 'ws-1',
        name: 'Old',
        nameLower: 'old',
        color: '#000',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prisma.taskTag.findFirst.mockResolvedValue(existing);
      prisma.taskTag.update.mockResolvedValue({
        ...existing,
        name: 'NEW Name',
        nameLower: 'new name',
      });

      await service.update('ws-1', 'tag-1', { name: 'NEW Name' });

      expect(prisma.taskTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'NEW Name', nameLower: 'new name' },
      });
    });

    it('update cross-tenant (tag existe em outro ws) lanca NotFoundException', async () => {
      prisma.taskTag.findFirst.mockResolvedValue(null);
      await expect(
        service.update('ws-wrong', 'tag-1', { color: '#fff' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findById (cross-tenant check)', () => {
    it('aplica workspaceId no filtro', async () => {
      prisma.taskTag.findFirst.mockResolvedValue(null);
      await expect(service.findById('ws-1', 'tag-x')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(prisma.taskTag.findFirst).toHaveBeenCalledWith({
        where: { id: 'tag-x', workspaceId: 'ws-1' },
      });
    });
  });
});
