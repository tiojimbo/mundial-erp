'use client';

import { useState } from 'react';
import { RiArrowDownSLine } from '@remixicon/react';
import type { MyTask } from '../types/my-tasks.types';
import { TaskItem } from './task-item';

type TaskGroupProps = {
  id: string;
  title: string;
  icon: React.ElementType;
  tasks: MyTask[];
  defaultExpanded?: boolean;
};

export function TaskGroup({
  id,
  title,
  icon: Icon,
  tasks,
  defaultExpanded = true,
}: TaskGroupProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (tasks.length === 0) return null;

  return (
    <div
      id={id}
      className='border-border/60 bg-card/50 flex flex-col overflow-hidden rounded-xl border'
    >
      <button
        className='text-sm hover:bg-accent/30 flex w-full items-center gap-2.5 px-4 py-3 font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring'
        onClick={() => setExpanded((v) => !v)}
      >
        <RiArrowDownSLine
          className={`size-4 text-muted-foreground transition-transform ${
            !expanded ? '-rotate-90' : ''
          }`}
        />
        <span className='flex items-center gap-2'>
          <Icon className='size-4' />
          {title}
        </span>
        <span className='ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground'>
          {tasks.length}
        </span>
      </button>

      {expanded && (
        <div className='divide-border/40 border-border/40 divide-y border-t'>
          {tasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  );
}
