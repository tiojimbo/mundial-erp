/**
 * Storybook stories — CollapsibleSection (blocos da sidebar do TaskView).
 *
 * Variantes: open / closed, com counter / sem counter, empty state.
 */

import type { Meta, StoryObj } from '@storybook/react';

interface CollapsibleSectionProps {
  title: string;
  open?: boolean;
  counter?: number;
  children: React.ReactNode;
}

const CollapsibleSection = (props: CollapsibleSectionProps): JSX.Element => (
  <section data-open={props.open}>
    <header>
      <span>{props.title}</span>
      {typeof props.counter === 'number' && <span>({props.counter})</span>}
    </header>
    {props.open ? <div>{props.children}</div> : null}
  </section>
);

const meta: Meta<typeof CollapsibleSection> = {
  title: 'Tasks/TaskView/CollapsibleSection',
  component: CollapsibleSection,
};

export default meta;

type Story = StoryObj<typeof CollapsibleSection>;

export const ClosedWithCounter: Story = {
  args: {
    title: 'Checklists',
    open: false,
    counter: 3,
    children: 'conteudo oculto',
  },
};

export const OpenWithCounter: Story = {
  args: {
    title: 'Checklists',
    open: true,
    counter: 3,
    children: 'item 1 / item 2 / item 3',
  },
};

export const OpenNoCounter: Story = {
  args: {
    title: 'Descricao',
    open: true,
    children: 'Lorem ipsum dolor sit amet.',
  },
};

export const EmptyClosed: Story = {
  args: {
    title: 'Anexos',
    open: false,
    counter: 0,
    children: null,
  },
};
