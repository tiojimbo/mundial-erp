import { AutomationsService } from './automations.service';

type AnyFn = jest.Mock;

interface MockRepository {
  listStatusesByScope: AnyFn;
}

interface MockCache {
  invalidateWorkspace: AnyFn;
}

interface MockCron {
  computeNext: AnyFn;
}

const WS = 'ws-1';
const SPACE = 'space-1';
const FOLDER = 'folder-1';
const LIST = 'list-1';

function buildHarness() {
  const repository: MockRepository = {
    listStatusesByScope: jest.fn(),
  };
  const cache: MockCache = { invalidateWorkspace: jest.fn() };
  const cron: MockCron = { computeNext: jest.fn(() => null) };

  const service = new AutomationsService(
    repository as never,
    cache as never,
    cron as never,
  );

  return { service, repository };
}

describe('AutomationsService.listStatusesByScope', () => {
  it('agrupa statuses por SPACE, FOLDER e LIST', async () => {
    const h = buildHarness();

    h.repository.listStatusesByScope.mockResolvedValue([
      {
        id: 's-space',
        name: 'Backlog',
        type: 'NOT_STARTED',
        color: '#000',
        position: 0,
        spaceId: SPACE,
        folderId: null,
        listId: null,
        space: { id: SPACE, name: 'Comercial' },
        folder: null,
        list: null,
      },
      {
        id: 's-folder',
        name: 'Em revisao',
        type: 'ACTIVE',
        color: '#000',
        position: 1,
        spaceId: SPACE,
        folderId: FOLDER,
        listId: null,
        space: null,
        folder: { id: FOLDER, name: 'Vendas', spaceId: SPACE },
        list: null,
      },
      {
        id: 's-list',
        name: 'Concluido',
        type: 'DONE',
        color: '#000',
        position: 2,
        spaceId: SPACE,
        folderId: FOLDER,
        listId: LIST,
        space: null,
        folder: null,
        list: { id: LIST, name: 'Pedidos', folderId: FOLDER },
      },
    ]);

    const result = await h.service.listStatusesByScope(WS);

    expect(result.spaces).toHaveLength(1);
    expect(result.spaces[0]).toMatchObject({ id: SPACE, name: 'Comercial' });
    expect(result.spaces[0].statuses).toHaveLength(1);

    expect(result.folders).toHaveLength(1);
    expect(result.folders[0]).toMatchObject({
      id: FOLDER,
      name: 'Vendas',
      spaceId: SPACE,
    });

    expect(result.lists).toHaveLength(1);
    expect(result.lists[0]).toMatchObject({
      id: LIST,
      name: 'Pedidos',
      folderId: FOLDER,
    });
    expect(result.lists[0].statuses).toHaveLength(1);
  });

  it('retorna arrays vazios quando workspace nao tem statuses', async () => {
    const h = buildHarness();
    h.repository.listStatusesByScope.mockResolvedValue([]);

    const result = await h.service.listStatusesByScope(WS);

    expect(result.spaces).toEqual([]);
    expect(result.folders).toEqual([]);
    expect(result.lists).toEqual([]);
  });
});
