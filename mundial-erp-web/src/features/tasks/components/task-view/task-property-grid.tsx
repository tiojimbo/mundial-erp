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
import { useStatusesByList } from '@/features/settings/hooks/use-statuses';

import type {
  TaskDetail,
  TaskPriority,
  TaskStatus,
  TaskTag,
} from '../../types/task.types';
import { useUpdateTaskStatus } from '../../hooks/use-update-task-status';
import { useUpdateTask } from '../../hooks/use-update-task';
import { useAssignTask } from '../../hooks/use-assign-task';
import { useAttachTag } from '../../hooks/use-attach-tag';
import { useDetachTag } from '../../hooks/use-detach-tag';
import { useCreateTag } from '../../hooks/use-create-tag';

import { PropertyRow } from './property-row';
import { StatusBadge } from './status-badge';
import { AssigneeMultiPicker } from './assignee-multi-picker';
import { DateRangePicker } from './date-range-picker';
import { PriorityPicker } from './priority-picker';
import { TimeEstimateInput } from './time-estimate-input';
import { TagPicker } from './tag-picker';

export type TaskPropertyGridProps = {
  task: TaskDetail;
};

export function TaskPropertyGrid({ task }: TaskPropertyGridProps) {
  const [showMore, setShowMore] = useState(false);

  const { data: process } = useProcess(task.processId);
  const { data: statuses } = useStatusesByList(task.processId);
  const updateStatus = useUpdateTaskStatus(task.id);
  const updateTask = useUpdateTask();
  const assignTask = useAssignTask(task.id);
  const attachTag = useAttachTag();
  const detachTag = useDetachTag();
  const createTag = useCreateTag();

  const availableStatuses = useMemo<TaskStatus[]>(() => {
    if (!statuses) return [];
    return statuses.map((s) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      color: s.color,
    }));
  }, [statuses]);

  const handleStatusChange = (next: TaskStatus) => {
    if (next.id === task.status.id) return;
    updateStatus.mutate({ statusId: next.id, status: next });
  };

  const handleToggleComplete = () => {
    const firstDone = availableStatuses.find((s) => s.type === 'DONE');
    if (!firstDone || firstDone.id === task.status.id) return;
    updateStatus.mutate({ statusId: firstDone.id, status: firstDone });
  };

  const handlePriorityChange = (priority: TaskPriority) => {
    if (priority === task.priority) return;
    updateTask.mutate({ taskId: task.id, payload: { priority } });
  };

  const handleDateChange = (range: {
    startDate: string | null;
    dueDate: string | null;
  }) => {
    updateTask.mutate({
      taskId: task.id,
      payload: {
        startDate: range.startDate,
        dueDate: range.dueDate,
      },
    });
  };

  const handleTimeEstimateChange = (estimatedMinutes: number | null) => {
    updateTask.mutate({
      taskId: task.id,
      payload: { estimatedMinutes },
    });
  };

  const handleAssigneesChange = (add: string[], rem: string[]) => {
    const current = task.assignees.map((a) => a.userId);
    const next = current.filter((id) => !rem.includes(id)).concat(add);
    assignTask.mutate(next);
  };

  const handleAddTag = (tagId: string) => {
    const tag: TaskTag | undefined = task.tags.find((t) => t.id === tagId);
    if (tag) {
      attachTag.mutate({ taskId: task.id, tag });
    }
  };

  const handleRemoveTag = (tagId: string) => {
    detachTag.mutate({ taskId: task.id, tagId });
  };

  const handleCreateTag = async (name: string) => {
    const created = await createTag.mutateAsync({ name, color: '#94a3b8' });
    attachTag.mutate({ taskId: task.id, tag: created });
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
            onChange={handleAssigneesChange}
          />
        </PropertyRow>
        <PropertyRow icon={<Calendar className="h-3.5 w-3.5" />} label="Datas">
          <DateRangePicker
            taskId={task.id}
            startDate={task.startDate}
            dueDate={task.dueDate}
            placeholder="Adicionar"
            onChange={handleDateChange}
          />
        </PropertyRow>
        <PropertyRow icon={<Flag className="h-3.5 w-3.5" />} label="Prioridade">
          <PriorityPicker
            taskId={task.id}
            value={task.priority}
            placeholder="Vazio"
            onChange={handlePriorityChange}
          />
        </PropertyRow>
        <PropertyRow icon={<Hourglass className="h-3.5 w-3.5" />} label="Tempo est.">
          <TimeEstimateInput
            taskId={task.id}
            value={task.estimatedMinutes}
            placeholder="Adicionar"
            onChange={handleTimeEstimateChange}
          />
        </PropertyRow>
        <PropertyRow icon={<Tag className="h-3.5 w-3.5" />} label="Tags">
          <TagPicker
            taskId={task.id}
            tags={task.tags}
            placeholder="Adicionar"
            onAdd={handleAddTag}
            onRemove={handleRemoveTag}
            onCreate={handleCreateTag}
          />
        </PropertyRow>
        {showMore && (
          <PropertyRow
            icon={<CircleDot className="h-3.5 w-3.5" />}
            label="Points"
          >
            <span className="text-[13px] text-muted-foreground">
              {task.points ?? '—'}
            </span>
          </PropertyRow>
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
