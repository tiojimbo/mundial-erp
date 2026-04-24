/**
 * Storybook stories — CommentComposer (BlockNote + mention popover).
 *
 * Variantes: empty, com draft salvo, com mention popover aberto.
 */

import type { Meta, StoryObj } from '@storybook/react';

interface CommentComposerProps {
  draft?: string;
  mentionPopoverOpen?: boolean;
  placeholder?: string;
}

const CommentComposer = (props: CommentComposerProps): JSX.Element => (
  <div data-popover={props.mentionPopoverOpen}>
    <textarea
      defaultValue={props.draft ?? ''}
      placeholder={props.placeholder ?? 'Escreva um comentario...'}
    />
  </div>
);

const meta: Meta<typeof CommentComposer> = {
  title: 'Tasks/TaskView/CommentComposer',
  component: CommentComposer,
};

export default meta;

type Story = StoryObj<typeof CommentComposer>;

export const Empty: Story = {
  args: {},
};

export const WithDraft: Story = {
  args: { draft: 'Rascunho em progresso... @ana preciso de review' },
};

export const MentionPopoverOpen: Story = {
  args: {
    draft: 'Ola @',
    mentionPopoverOpen: true,
  },
};
