/**
 * Unit tests para a Prisma extension `primary-assignee-cache`.
 *
 * Estes testes exercitam a função exportada `__recalcPrimaryAssigneeCache`
 * diretamente, mockando o `Prisma.TransactionClient` — é a unidade lógica
 * isolável. Os hooks de query em si são testados em integration (E2E)
 * pela Tatiana, pois exigem Prisma engine vivo.
 *
 * Cobertura:
 *   - create com isPrimary=true  → cache = userId
 *   - create com isPrimary=false + nenhum outro → promoção automática
 *   - delete do primary + outros existentes → cache vira o mais antigo
 *   - delete do único assignee → cache = null
 *   - update isPrimary=true → cache vira esse user
 *   - createMany com 3 users → cache é o primeiro pela lógica
 */

import { __recalcPrimaryAssigneeCache } from './primary-assignee-cache.extension';

// Shape mínimo do TransactionClient usado pela função sob teste.
interface MockTx {
  workItemAssignee: {
    findFirst: jest.Mock;
  };
  workItem: {
    update: jest.Mock;
  };
}

function createMockTx(): MockTx {
  return {
    workItemAssignee: {
      findFirst: jest.fn(),
    },
    workItem: {
      update: jest.fn().mockResolvedValue(undefined),
    },
  };
}

describe('primary-assignee-cache extension', () => {
  describe('__recalcPrimaryAssigneeCache', () => {
    it('define cache=userId quando existe assignee com isPrimary=true', async () => {
      const tx = createMockTx();
      tx.workItemAssignee.findFirst.mockResolvedValue({ userId: 'user-primary' });

      await __recalcPrimaryAssigneeCache(tx as never, 'wi-1');

      expect(tx.workItemAssignee.findFirst).toHaveBeenCalledWith({
        where: { workItemId: 'wi-1' },
        orderBy: [{ isPrimary: 'desc' }, { assignedAt: 'asc' }],
        select: { userId: true },
      });
      expect(tx.workItem.update).toHaveBeenCalledWith({
        where: { id: 'wi-1' },
        data: { primaryAssigneeCache: 'user-primary' },
      });
    });

    it('promove automaticamente para userId quando o único assignee tem isPrimary=false', async () => {
      // Simula "não havia ninguém, agora acabou de entrar 1 pessoa com isPrimary=false":
      // a query retorna esse único row pelo orderBy (isPrimary desc, assignedAt asc).
      const tx = createMockTx();
      tx.workItemAssignee.findFirst.mockResolvedValue({ userId: 'user-only' });

      await __recalcPrimaryAssigneeCache(tx as never, 'wi-2');

      expect(tx.workItem.update).toHaveBeenCalledWith({
        where: { id: 'wi-2' },
        data: { primaryAssigneeCache: 'user-only' },
      });
    });

    it('promove o mais antigo quando o primary é removido e ainda há outros', async () => {
      // Após o delete do primary, a query retorna o mais antigo remanescente
      // (orderBy assignedAt asc é o desempate).
      const tx = createMockTx();
      tx.workItemAssignee.findFirst.mockResolvedValue({ userId: 'user-oldest' });

      await __recalcPrimaryAssigneeCache(tx as never, 'wi-3');

      expect(tx.workItem.update).toHaveBeenCalledWith({
        where: { id: 'wi-3' },
        data: { primaryAssigneeCache: 'user-oldest' },
      });
    });

    it('define cache=null quando o único assignee é deletado', async () => {
      const tx = createMockTx();
      tx.workItemAssignee.findFirst.mockResolvedValue(null);

      await __recalcPrimaryAssigneeCache(tx as never, 'wi-4');

      expect(tx.workItem.update).toHaveBeenCalledWith({
        where: { id: 'wi-4' },
        data: { primaryAssigneeCache: null },
      });
    });

    it('atualiza cache quando update seta isPrimary=true em outro user', async () => {
      // Depois do update, a query retorna o novo primary (que tem isPrimary=true).
      const tx = createMockTx();
      tx.workItemAssignee.findFirst.mockResolvedValue({
        userId: 'user-newly-primary',
      });

      await __recalcPrimaryAssigneeCache(tx as never, 'wi-5');

      expect(tx.workItem.update).toHaveBeenCalledWith({
        where: { id: 'wi-5' },
        data: { primaryAssigneeCache: 'user-newly-primary' },
      });
    });

    it('após createMany com 3 users, cache fica no primeiro pela regra (isPrimary desc, assignedAt asc)', async () => {
      // createMany cria 3 rows; a query ordenada devolve o "primeiro" pela
      // regra canônica.
      const tx = createMockTx();
      tx.workItemAssignee.findFirst.mockResolvedValue({ userId: 'user-first' });

      await __recalcPrimaryAssigneeCache(tx as never, 'wi-6');

      expect(tx.workItem.update).toHaveBeenCalledWith({
        where: { id: 'wi-6' },
        data: { primaryAssigneeCache: 'user-first' },
      });
    });

    it('propaga erro se workItem.update falhar (caller controla rollback da tx)', async () => {
      const tx = createMockTx();
      tx.workItemAssignee.findFirst.mockResolvedValue({ userId: 'u' });
      tx.workItem.update.mockRejectedValue(new Error('db fail'));

      await expect(
        __recalcPrimaryAssigneeCache(tx as never, 'wi-err'),
      ).rejects.toThrow('db fail');
    });
  });
});
