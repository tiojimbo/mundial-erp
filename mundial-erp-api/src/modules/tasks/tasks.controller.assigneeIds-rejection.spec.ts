/**
 * Unit test — TasksController PUT rejeita assigneeIds (HPP-059 gap 2).
 *
 * Hoje o ValidationPipe global (`whitelist: true, forbidNonWhitelisted: true`)
 * derruba qualquer campo nao-declarado. Esse spec instancia o pipe com a
 * mesma config e valida que `assigneeIds`, `addAssigneeIds`, `assignees` e
 * `assigneeId` no body do PUT /tasks/:id geram erro 400.
 */

import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { UpdateTaskDto } from './dtos/update-task.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
});

const meta = {
  type: 'body' as const,
  metatype: UpdateTaskDto,
  data: '',
};

async function expectRejected(payload: Record<string, unknown>) {
  await expect(pipe.transform(payload, meta)).rejects.toBeInstanceOf(
    BadRequestException,
  );
}

describe('PUT /tasks/:id rejeita assigneeIds (HPP-059)', () => {
  it('rejeita { assigneeIds: [...] } com 400', async () => {
    await expectRejected({ assigneeIds: ['u-1'] });
  });

  it('rejeita { assignees: [...] } com 400', async () => {
    await expectRejected({ assignees: [{ userId: 'u-1' }] });
  });

  it('rejeita { addAssigneeIds: [...] } com 400', async () => {
    await expectRejected({ addAssigneeIds: ['u-1'] });
  });

  it('rejeita { assigneeId: "u-1" } com 400', async () => {
    await expectRejected({ assigneeId: 'u-1' });
  });

  it('aceita { title: "..." } sem rejeicao (controle positivo)', async () => {
    const result = await pipe.transform(
      { title: 'titulo novo' },
      meta,
    );
    expect(result).toBeInstanceOf(UpdateTaskDto);
    expect((result as UpdateTaskDto).title).toBe('titulo novo');
  });
});
