/**
 * Unit tests — TaskCommentsService (rodavel hoje, mocka Prisma).
 *
 * Cobertura:
 *   - extractMentions: regex /@([\w\.-]+)/g captura usernames.
 *   - resolveMentions: filtra apenas userIds validos no workspace
 *     (cross-workspace mentions sao descartados — anti-spoofing).
 *   - canEdit: author OU workspaceRole in (ADMIN, MANAGER) permite; demais
 *     roles para non-author sao bloqueados.
 *
 * Contract-first stub. Substituir por import do real quando Beatriz
 * entregar o servico.
 */

import { ForbiddenException } from '@nestjs/common';

interface PrismaClientMock {
  user: {
    findMany: jest.Mock;
  };
  taskComment: {
    create: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
}

type WorkspaceRole = 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';

export const MENTION_REGEX = /@([\w.-]+)/g;

class TaskCommentsServiceStub {
  constructor(private readonly prisma: PrismaClientMock) {}

  extractMentions(body: string): string[] {
    const out: string[] = [];
    let match: RegExpExecArray | null;
    // Reset regex (global regex retains lastIndex between calls).
    const regex = new RegExp(MENTION_REGEX.source, 'g');
    while ((match = regex.exec(body)) !== null) {
      out.push(match[1]);
    }
    return Array.from(new Set(out));
  }

  async resolveMentions(
    workspaceId: string,
    mentionedUsernames: string[],
  ): Promise<string[]> {
    if (mentionedUsernames.length === 0) return [];
    const users = (await this.prisma.user.findMany({
      where: {
        workspaceMembers: { some: { workspaceId } },
        OR: mentionedUsernames.map((u) => ({
          email: { startsWith: `${u}@` },
        })),
      },
      select: { id: true },
    })) as Array<{ id: string }>;
    return users.map((u) => u.id);
  }

  canEdit(
    comment: { authorId: string },
    userId: string,
    role: WorkspaceRole,
  ): void {
    if (comment.authorId === userId) return;
    if (role === 'ADMIN' || role === 'MANAGER') return;
    throw new ForbiddenException(
      'Somente autor do comentario ou Manager+ pode editar',
    );
  }
}

describe('TaskCommentsService (unit, stub)', () => {
  let prisma: PrismaClientMock;
  let service: TaskCommentsServiceStub;

  beforeEach(() => {
    prisma = {
      user: { findMany: jest.fn() },
      taskComment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new TaskCommentsServiceStub(prisma);
  });

  describe('extractMentions', () => {
    it('extrai @user simples', () => {
      expect(service.extractMentions('Ola @joao, tudo bem?')).toEqual(['joao']);
    });

    it('extrai multiplas mencoes', () => {
      expect(
        service.extractMentions('@joao e @maria.silva revisem pls'),
      ).toEqual(['joao', 'maria.silva']);
    });

    it('deduplica mencoes repetidas', () => {
      expect(service.extractMentions('@joao @joao @joao')).toEqual(['joao']);
    });

    it('ignora @ sem handle (@ sozinho)', () => {
      expect(service.extractMentions('email@ vazio @')).toEqual([]);
    });

    it('aceita hifens, pontos e underscores', () => {
      expect(
        service.extractMentions('@ana-paula @jose.lima @user_01'),
      ).toEqual(['ana-paula', 'jose.lima', 'user_01']);
    });

    it('body vazio retorna []', () => {
      expect(service.extractMentions('')).toEqual([]);
    });
  });

  describe('resolveMentions (anti-spoofing)', () => {
    it('resolve apenas users que pertencem ao workspace', async () => {
      prisma.user.findMany.mockResolvedValue([{ id: 'u-1' }, { id: 'u-2' }]);
      const ids = await service.resolveMentions('ws-1', ['joao', 'maria']);
      expect(ids).toEqual(['u-1', 'u-2']);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            workspaceMembers: { some: { workspaceId: 'ws-1' } },
          }),
        }),
      );
    });

    it('user de outro workspace nao resolve (retorna vazio)', async () => {
      prisma.user.findMany.mockResolvedValue([]);
      const ids = await service.resolveMentions('ws-1', ['fake-user']);
      expect(ids).toEqual([]);
    });

    it('lista vazia nao chama DB', async () => {
      const ids = await service.resolveMentions('ws-1', []);
      expect(ids).toEqual([]);
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('canEdit', () => {
    it('permite autor editar', () => {
      expect(() =>
        service.canEdit({ authorId: 'u-1' }, 'u-1', 'OPERATOR'),
      ).not.toThrow();
    });

    it('permite MANAGER editar de outrem', () => {
      expect(() =>
        service.canEdit({ authorId: 'u-1' }, 'u-2', 'MANAGER'),
      ).not.toThrow();
    });

    it('permite ADMIN editar de outrem', () => {
      expect(() =>
        service.canEdit({ authorId: 'u-1' }, 'u-2', 'ADMIN'),
      ).not.toThrow();
    });

    it('bloqueia OPERATOR nao-autor', () => {
      expect(() =>
        service.canEdit({ authorId: 'u-1' }, 'u-2', 'OPERATOR'),
      ).toThrow(ForbiddenException);
    });

    it('bloqueia VIEWER nao-autor', () => {
      expect(() =>
        service.canEdit({ authorId: 'u-1' }, 'u-2', 'VIEWER'),
      ).toThrow(ForbiddenException);
    });
  });
});
