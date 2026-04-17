'use client';

import Link from 'next/link';
import type { MyTask } from '../types/my-tasks.types';

type TaskItemProps = {
  task: MyTask;
};

export function TaskItem({ task }: TaskItemProps) {
  return (
    <Link
      href={`/comercial/pedidos/${task.id}`}
      className='group relative flex items-center gap-3 border-l-[3px] border-l-transparent px-4 py-2.5 transition-all hover:border-l-primary-alpha-10 hover:bg-accent/40 focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
    >
      <div
        className='size-2.5 shrink-0 rounded-full ring-2 ring-background'
        style={{ backgroundColor: task.status.color }}
      />

      <div className='min-w-0 flex-1'>
        <span className='block truncate text-sm font-medium leading-snug'>
          {task.name}
        </span>
        <div className='mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground/70'>
          <span className='truncate'>{task.list.name}</span>
        </div>
      </div>

      <div className='flex shrink-0 items-center gap-2'>
        <div className='flex -space-x-1.5'>
          {task.assignees.map((assignee) => (
            <span
              key={assignee.id}
              className='relative flex size-5 shrink-0 overflow-hidden rounded-full border-2 border-background'
            >
              <span className='flex size-full items-center justify-center rounded-full bg-muted text-[9px] font-semibold'>
                {assignee.name.slice(0, 2).toUpperCase()}
              </span>
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
