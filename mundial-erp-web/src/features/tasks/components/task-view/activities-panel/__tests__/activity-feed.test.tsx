import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { TaskActivity, TaskComment } from '../../../../types/task.types';
import { ActivityFeed } from '../activity-feed';

const useActivitiesMock = vi.fn();
const useCommentsMock = vi.fn();

vi.mock('../../../../hooks/use-activities', () => ({
  useActivities: (...args: unknown[]) => useActivitiesMock(...args),
}));

vi.mock('../../../../hooks/use-comments', () => ({
  useComments: (...args: unknown[]) => useCommentsMock(...args),
}));

vi.mock('../comment-reactions', () => ({
  CommentReactions: ({ commentId }: { commentId: string }) => (
    <div data-testid='comment-reactions' data-comment-id={commentId} />
  ),
}));

const TASK_ID = '11111111-1111-1111-1111-111111111111';
const COMMENT_ID = '22222222-2222-2222-2222-222222222222';

function makeCommentActivity(): TaskActivity {
  return {
    id: 'act-1',
    taskId: TASK_ID,
    type: 'COMMENT_ADDED',
    actorId: 'user-1',
    actorName: 'Claude Code',
    payload: { commentId: COMMENT_ID },
    createdAt: '2026-06-02T12:00:00.000Z',
  };
}

function makeComment(content: string): TaskComment {
  return {
    id: COMMENT_ID,
    taskId: TASK_ID,
    authorId: '33333333-3333-3333-3333-333333333333',
    authorName: 'Claude Code',
    content,
    contentBlocks: null,
    editedAt: null,
    createdAt: '2026-06-02T12:00:00.000Z',
    reactions: [],
  };
}

describe('ActivityFeed - parsing do envelope de comentarios', () => {
  beforeEach(() => {
    useActivitiesMock.mockReset();
    useCommentsMock.mockReset();
    useActivitiesMock.mockReturnValue({
      data: { items: [makeCommentActivity()] },
      isLoading: false,
      isError: false,
    });
  });

  it('casa o comentario e renderiza o content quando data vem como envelope { data: [...] }', () => {
    useCommentsMock.mockReturnValue({
      data: { data: [makeComment('<p>Ola <strong>mundo</strong></p>')] },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<ActivityFeed taskId={TASK_ID} />);

    const body = container.querySelector('.prose');
    expect(body).not.toBeNull();
    expect(body?.querySelector('strong')?.textContent).toBe('mundo');
  });

  it('casa o comentario quando data vem como array direto (fallback)', () => {
    useCommentsMock.mockReturnValue({
      data: [makeComment('<p>texto direto</p>')],
      isLoading: false,
      isError: false,
    });

    const { container } = render(<ActivityFeed taskId={TASK_ID} />);

    expect(container.querySelector('.prose')?.textContent).toContain(
      'texto direto',
    );
  });

  it('casa o comentario quando data vem como envelope legado { items: [...] }', () => {
    useCommentsMock.mockReturnValue({
      data: { items: [makeComment('<p>legado items</p>')] },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<ActivityFeed taskId={TASK_ID} />);

    expect(container.querySelector('.prose')?.textContent).toContain(
      'legado items',
    );
  });

  it('mostra so a linha do evento quando o envelope nao traz o comentario', () => {
    useCommentsMock.mockReturnValue({
      data: { data: [] },
      isLoading: false,
      isError: false,
    });

    const { container } = render(<ActivityFeed taskId={TASK_ID} />);

    expect(container.querySelector('.prose')).toBeNull();
    expect(screen.queryByTestId('comment-reactions')).toBeNull();
  });
});

function descChange(id: string, actorId: string, createdAt: string): TaskActivity {
  return {
    id,
    taskId: TASK_ID,
    type: 'DESCRIPTION_CHANGED',
    actorId,
    actorName: 'Claude Code',
    payload: {},
    createdAt,
  };
}

function statusChange(id: string, createdAt: string): TaskActivity {
  return {
    id,
    taskId: TASK_ID,
    type: 'STATUS_CHANGED',
    actorId: 'user-1',
    actorName: 'Claude Code',
    payload: {},
    createdAt,
  };
}

describe('ActivityFeed - coalescing de DESCRIPTION_CHANGED', () => {
  beforeEach(() => {
    useActivitiesMock.mockReset();
    useCommentsMock.mockReset();
    useActivitiesMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    });
    useCommentsMock.mockReturnValue({ data: { data: [] } });
  });

  it('coalesce DESCRIPTION_CHANGED adjacentes do mesmo ator em janela curta', () => {
    const activities = [
      descChange('d1', 'user-1', '2026-06-02T12:00:00.000Z'),
      descChange('d2', 'user-1', '2026-06-02T12:00:10.000Z'),
      descChange('d3', 'user-1', '2026-06-02T12:00:20.000Z'),
    ];

    render(<ActivityFeed taskId={TASK_ID} activities={activities} />);

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(1);
  });

  it('nao coalesce atores diferentes nem janela longa', () => {
    const activities = [
      descChange('d1', 'user-1', '2026-06-02T12:00:00.000Z'),
      descChange('d2', 'user-2', '2026-06-02T12:00:05.000Z'),
      descChange('d3', 'user-1', '2026-06-02T12:05:00.000Z'),
    ];

    render(<ActivityFeed taskId={TASK_ID} activities={activities} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('nao coalesce STATUS_CHANGED', () => {
    const activities = [
      statusChange('s1', '2026-06-02T12:00:00.000Z'),
      statusChange('s2', '2026-06-02T12:00:05.000Z'),
    ];

    render(<ActivityFeed taskId={TASK_ID} activities={activities} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
