import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TaskActivity, TaskComment } from '../../../../types/task.types';
import { ActivityItem } from '../activity-item';

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

describe('ActivityItem - corpo do comentario', () => {
  it('renderiza o corpo formatado abaixo da linha do evento (happy path)', () => {
    const activity = makeCommentActivity();
    const comment = makeComment('<p>Ola <strong>mundo</strong></p>');
    const commentsById = new Map([[COMMENT_ID, comment]]);

    const { container } = render(
      <ActivityItem
        activity={activity}
        taskId={TASK_ID}
        commentsById={commentsById}
      />,
    );

    const body = container.querySelector('.prose');
    expect(body).not.toBeNull();
    const strong = body?.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('mundo');
  });

  it('nao renderiza bloco de corpo para atividade que nao e comentario', () => {
    const activity: TaskActivity = {
      id: 'act-2',
      taskId: TASK_ID,
      type: 'STATUS_CHANGED',
      actorId: 'user-1',
      actorName: 'Claude Code',
      payload: { from: 'a', to: 'b' },
      createdAt: '2026-06-02T12:00:00.000Z',
    };

    const { container } = render(
      <ActivityItem activity={activity} taskId={TASK_ID} commentsById={new Map()} />,
    );

    expect(container.querySelector('.prose')).toBeNull();
  });

  it('sanitiza HTML malicioso, removendo script e onerror', () => {
    const activity = makeCommentActivity();
    const comment = makeComment(
      '<p>Antes</p><img src="x" onerror="alert(1)"><script>alert(2)</script><p>Depois</p>',
    );
    const commentsById = new Map([[COMMENT_ID, comment]]);

    const { container } = render(
      <ActivityItem
        activity={activity}
        taskId={TASK_ID}
        commentsById={commentsById}
      />,
    );

    const body = container.querySelector('.prose');
    expect(body).not.toBeNull();
    expect(body?.querySelector('script')).toBeNull();
    expect(body?.innerHTML).not.toContain('onerror');
    expect(body?.textContent).toContain('Antes');
    expect(body?.textContent).toContain('Depois');
  });

  it('renderiza apenas a linha do evento quando o comentario nao esta carregado', () => {
    const activity = makeCommentActivity();

    const { container } = render(
      <ActivityItem activity={activity} taskId={TASK_ID} commentsById={new Map()} />,
    );

    expect(container.querySelector('.prose')).toBeNull();
    expect(screen.queryByTestId('comment-reactions')).toBeNull();
  });

  it('mantem CommentReactions junto do corpo quando ha comentario', () => {
    const activity = makeCommentActivity();
    const comment = makeComment('<p>Texto com reacao</p>');
    const commentsById = new Map([[COMMENT_ID, comment]]);

    const { container } = render(
      <ActivityItem
        activity={activity}
        taskId={TASK_ID}
        commentsById={commentsById}
      />,
    );

    expect(container.querySelector('.prose')).not.toBeNull();
    expect(screen.getByTestId('comment-reactions')).toBeInTheDocument();
  });

  it('forca rel e target em links e nao renderiza bloco vazio', () => {
    const activity = makeCommentActivity();
    const linkComment = makeComment('<p><a href="https://x.com">link</a></p>');
    const { container, rerender } = render(
      <ActivityItem
        activity={activity}
        taskId={TASK_ID}
        commentsById={new Map([[COMMENT_ID, linkComment]])}
      />,
    );

    const anchor = container.querySelector('a');
    expect(anchor?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(anchor?.getAttribute('target')).toBe('_blank');

    const emptyComment = makeComment('<p></p>');
    rerender(
      <ActivityItem
        activity={activity}
        taskId={TASK_ID}
        commentsById={new Map([[COMMENT_ID, emptyComment]])}
      />,
    );

    expect(container.querySelector('.prose')).toBeNull();
  });
});
