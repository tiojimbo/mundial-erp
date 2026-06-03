import { fireEvent, render, screen } from '@testing-library/react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { describe, expect, it, vi } from 'vitest';

import type { TaskComment } from '../../../../types/task.types';
import { CommentItem } from '../comment-item';

vi.mock('../comment-reactions', () => ({
  CommentReactions: ({ commentId }: { commentId: string }) => (
    <div data-testid='comment-reactions' data-comment-id={commentId} />
  ),
}));

vi.mock('@/lib/api', () => ({
  getAvatarUrl: (key?: string | null) =>
    key ? `http://api.test/${key.replace(/^\//, '')}` : null,
}));

const TASK_ID = '11111111-1111-1111-1111-111111111111';
const COMMENT_ID = '22222222-2222-2222-2222-222222222222';
const AUTHOR_ID = '33333333-3333-3333-3333-333333333333';

function makeComment(overrides: Partial<TaskComment> = {}): TaskComment {
  return {
    id: COMMENT_ID,
    authorId: AUTHOR_ID,
    author: { id: AUTHOR_ID, name: 'Samuel Miranda', email: 's@x.com' },
    content: '<p>Ola <strong>mundo</strong></p>',
    contentBlocks: null,
    editedAt: null,
    createdAt: '2026-06-02T17:10:00.000Z',
    reactions: [],
    ...overrides,
  } as TaskComment;
}

describe('CommentItem', () => {
  it('renderiza card com nome do autor vindo de author.name', () => {
    render(<CommentItem comment={makeComment()} taskId={TASK_ID} />);
    expect(screen.getByText('Samuel Miranda')).toBeInTheDocument();
  });

  it('renderiza avatar quadrado arredondado 20px com iniciais quando sem foto', () => {
    const { container } = render(
      <CommentItem comment={makeComment()} taskId={TASK_ID} />,
    );
    const avatar = container.querySelector('span[aria-hidden="true"]');
    expect(avatar?.textContent).toBe('SM');
    expect(avatar?.className).toContain('rounded-[5px]');
    expect(avatar?.className).toContain('size-5');
    expect(container.querySelector('img')).toBeNull();
  });

  it('renderiza img quadrada 20px com src da foto quando author.avatar existe', () => {
    const { container } = render(
      <CommentItem
        comment={makeComment({
          author: {
            id: AUTHOR_ID,
            name: 'Samuel Miranda',
            email: 's@x.com',
            avatar: 'avatars/users/abc.jpg',
          },
        })}
        taskId={TASK_ID}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(
      'http://api.test/avatars/users/abc.jpg',
    );
    expect(img?.getAttribute('alt')).toBe('Samuel Miranda');
    expect(img?.className).toContain('rounded-[5px]');
    expect(img?.className).toContain('size-5');
    expect(img?.className).toContain('object-cover');
    expect(container.querySelector('span[aria-hidden="true"]')).toBeNull();
  });

  it('cai pras iniciais quando a imagem do avatar falha ao carregar', () => {
    const { container } = render(
      <CommentItem
        comment={makeComment({
          author: {
            id: AUTHOR_ID,
            name: 'Samuel Miranda',
            email: 's@x.com',
            avatar: 'avatars/users/abc.jpg',
          },
        })}
        taskId={TASK_ID}
      />,
    );
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    fireEvent.error(img as HTMLImageElement);
    expect(container.querySelector('img')).toBeNull();
    const avatar = container.querySelector('span[aria-hidden="true"]');
    expect(avatar?.textContent).toBe('SM');
  });

  it('renderiza timestamp no formato longo', () => {
    render(<CommentItem comment={makeComment()} taskId={TASK_ID} />);
    const expected = format(
      new Date('2026-06-02T17:10:00.000Z'),
      "d 'de' MMM yyyy 'às' HH:mm",
      { locale: ptBR },
    );
    const time = screen.getByText(expected);
    expect(time).toBeInTheDocument();
    expect(time.tagName).toBe('TIME');
  });

  it('sanitiza o corpo HTML e preserva o texto', () => {
    const { container } = render(
      <CommentItem
        comment={makeComment({
          content: '<p>Antes</p><script>alert(1)</script><p>Depois</p>',
        })}
        taskId={TASK_ID}
      />,
    );
    const body = container.querySelector('.prose');
    expect(body).not.toBeNull();
    expect(body?.querySelector('script')).toBeNull();
    expect(body?.textContent).toContain('Antes');
    expect(body?.textContent).toContain('Depois');
  });

  it('aplica quebra de palavra no corpo pra URL/texto longo nao estourar', () => {
    const { container } = render(
      <CommentItem
        comment={makeComment({
          content:
            '<p>https://exemplo.com/um-link-absurdamente-longo-que-nao-quebra-sozinho-no-bloco</p>',
        })}
        taskId={TASK_ID}
      />,
    );
    const body = container.querySelector('.prose');
    expect(body?.className).toContain('break-words');
    expect(body?.className).toContain('[overflow-wrap:anywhere]');
    expect(body?.className).toContain('min-w-0');
  });

  it('nao renderiza corpo quando content vazio', () => {
    const { container } = render(
      <CommentItem
        comment={makeComment({ content: '<p></p>' })}
        taskId={TASK_ID}
      />,
    );
    expect(container.querySelector('.prose')).toBeNull();
  });

  it('faz fallback de nome e iniciais quando nao ha author', () => {
    render(
      <CommentItem
        comment={makeComment({ author: null, authorName: null })}
        taskId={TASK_ID}
      />,
    );
    expect(screen.getByText('Usuário')).toBeInTheDocument();
  });

  it('usa authorName legado quando author ausente', () => {
    render(
      <CommentItem
        comment={makeComment({ author: null, authorName: 'Maria Souza' })}
        taskId={TASK_ID}
      />,
    );
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
  });

  it('monta as reacoes do comentario', () => {
    render(<CommentItem comment={makeComment()} taskId={TASK_ID} />);
    const reactions = screen.getByTestId('comment-reactions');
    expect(reactions).toHaveAttribute('data-comment-id', COMMENT_ID);
  });
});
