'use client';

import { useMemo, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  CircleDot,
  Flag,
  Hourglass,
  Tag,
  User,
} from 'lucide-react';

import { useProcess } from '@/features/settings/hooks/use-processes';
import { useWorkflowStatuses } from '@/features/settings/hooks/use-workflow-statuses';

import type { TaskDetail, TaskStatus } from '../../types/task.types';
import { useUpdateTaskStatus } from '../../hooks/use-update-task-status';

import { PropertyRow } from './property-row';
import { StatusBadge } from './status-badge';
import { AssigneeMultiPicker } from './assignee-multi-picker';
import { DateRangePicker } from './date-range-picker';
import { PriorityPicker } from './priority-picker';
import { TimeEstimateInput } from './time-estimate-input';
import { TagPicker } from './tag-picker';

/**
 * Sprint 5 (TSK-150) — Grade 2-col de propriedades da tarefa.
 * tasks.md §4.3.
 */

export type TaskPropertyGridProps = {
  task: TaskDetail;
};

export function TaskPropertyGrid({ task }: TaskPropertyGridProps) {
  const [showMore, setShowMore] = useState(false);

  const { data: process } = useProcess(task.processId);
  const { data: workflowStatuses } = useWorkflowStatuses(
    process?.departmentId ?? '',
    process?.areaId,
  );
  const updateStatus = useUpdateTaskStatus(task.id);

  const availableStatuses = useMemo<TaskStatus[]>(() => {
    if (!workflowStatuses) return [];
    return workflowStatuses.map((s) => ({
      id: s.id,
      name: s.name,
      category: s.category,
      color: s.color,
      icon: s.icon ?? null,
    }));
  }, [workflowStatuses]);

  const handleStatusChange = (next: TaskStatus) => {
    if (next.id === task.status.id) return;
    updateStatus.mutate({ statusId: next.id, status: next });
  };

  const handleToggleComplete = () => {
    const firstDone = availableStatuses.find((s) => s.category === 'DONE');
    if (!firstDone || firstDone.id === task.status.id) return;
    updateStatus.mutate({ statusId: firstDone.id, status: firstDone });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-x-8 gap-y-2 md:grid-cols-2 max-md:grid-cols-1">
        <PropertyRow icon={<CircleDot className="h-3.5 w-3.5" />} label="Status">
          <StatusBadge
            status={task.status}
            taskId={task.id}
            availableStatuses={availableStatuses}
            onStatusChange={handleStatusChange}
            onToggleComplete={handleToggleComplete}
          />
        </PropertyRow>
        <PropertyRow icon={<User className="h-3.5 w-3.5" />} label="Responsaveis">
          <AssigneeMultiPicker
            taskId={task.id}
            assignees={task.assignees}
            placeholder="Adicionar"
          />
        </PropertyRow>
        <PropertyRow icon={<Calendar className="h-3.5 w-3.5" />} label="Datas">
          <DateRangePicker
            taskId={task.id}
            startDate={task.startDate}
            dueDate={task.dueDate}
            placeholder="Adicionar"
          />
        </PropertyRow>
        <PropertyRow icon={<Flag className="h-3.5 w-3.5" />} label="Prioridade">
          <PriorityPicker
            taskId={task.id}
            value={task.priority}
            placeholder="Vazio"
          />
        </PropertyRow>
        <PropertyRow icon={<Hourglass className="h-3.5 w-3.5" />} label="Tempo est.">
          <TimeEstimateInput
            taskId={task.id}
            value={task.estimatedMinutes}
            placeholder="Adicionar"
          />
        </PropertyRow>
        <PropertyRow icon={<Tag className="h-3.5 w-3.5" />} label="Tags">
          <TagPicker taskId={task.id} tags={task.tags} placeholder="Adicionar" />
        </PropertyRow>
        {showMore && (
          <>
            <PropertyRow
              icon={<CircleDot className="h-3.5 w-3.5" />}
              label="Points"
            >
              <span className="text-[13px] text-muted-foreground">
                {task.points ?? '—'}
              </span>
            </PropertyRow>
          </>
        )}
      </div>
      <button
        type="button"
        onClick={() => setShowMore((v) => !v)}
        aria-expanded={showMore}
        className="flex items-center gap-1 text-[13px] text-muted-foreground/60 transition-colors hover:text-muted-foreground"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform duration-150 ${showMore ? 'rotate-180' : ''}`}
        />
        {showMore ? 'Menos' : 'Mais'}
      </button>
    </div>
  );
}
