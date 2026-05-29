import { StatusType } from '@prisma/client';
import { autoMapStatuses, StatusLite } from './auto-map-status';

const s = (
  id: string,
  type: StatusType,
  position: number,
  name = id,
): StatusLite => ({ id, name, type, position });

describe('autoMapStatuses', () => {
  it('mapeia por type+posicao ignorando o nome', () => {
    const sources = [s('src-todo', StatusType.NOT_STARTED, 0, 'Para fazer')];
    const targets = [
      s('tgt-triagem', StatusType.NOT_STARTED, 0, 'Triagem'),
      s('tgt-done', StatusType.DONE, 1, 'Pronto'),
    ];

    const result = autoMapStatuses(sources, targets);

    expect(result).toEqual([
      {
        sourceStatusId: 'src-todo',
        sourceName: 'Para fazer',
        sourceType: StatusType.NOT_STARTED,
        autoTargetStatusId: 'tgt-triagem',
        autoTargetName: 'Triagem',
      },
    ]);
  });

  it('pega o status de menor posicao quando ha mais de um do mesmo type', () => {
    const sources = [s('src', StatusType.ACTIVE, 0)];
    const targets = [
      s('tgt-b', StatusType.ACTIVE, 5),
      s('tgt-a', StatusType.ACTIVE, 2),
    ];

    const [entry] = autoMapStatuses(sources, targets);

    expect(entry.autoTargetStatusId).toBe('tgt-a');
  });

  it('retorna null quando o destino nao tem nenhum status do mesmo type', () => {
    const sources = [s('src-closed', StatusType.CLOSED, 3, 'Finalizado')];
    const targets = [
      s('tgt-todo', StatusType.NOT_STARTED, 0),
      s('tgt-active', StatusType.ACTIVE, 1),
      s('tgt-done', StatusType.DONE, 2),
    ];

    const [entry] = autoMapStatuses(sources, targets);

    expect(entry.autoTargetStatusId).toBeNull();
    expect(entry.autoTargetName).toBeNull();
  });

  it('preserva a ordem dos sources', () => {
    const sources = [
      s('a', StatusType.NOT_STARTED, 0),
      s('b', StatusType.DONE, 1),
    ];
    const targets = [
      s('t-ns', StatusType.NOT_STARTED, 0),
      s('t-done', StatusType.DONE, 1),
    ];

    const result = autoMapStatuses(sources, targets);

    expect(result.map((r) => r.sourceStatusId)).toEqual(['a', 'b']);
  });
});
