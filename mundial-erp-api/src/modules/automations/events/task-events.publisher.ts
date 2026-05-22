import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUTOMATION_EVENTS } from './task-events.constants';
import type {
  AllSubtasksResolvedPayload,
  CronEventPayload,
  CustomFieldChangedPayload,
  SubtaskCreatedPayload,
  TaskAssignmentPayload,
  TaskCommentPayload,
  TaskCreatedPayload,
  TaskFieldChangedPayload,
  TaskMovedToListPayload,
  TaskTagPayload,
  TaskUpdatedPayload,
} from './task-events.types';

@Injectable()
export class TaskEventsPublisher {
  private readonly logger = new Logger(TaskEventsPublisher.name);

  constructor(private readonly emitter: EventEmitter2) {}

  emitTaskCreated(payload: TaskCreatedPayload): void {
    this.emit(AUTOMATION_EVENTS.TASK_CREATED, payload);
  }

  emitTaskUpdated(payload: TaskUpdatedPayload): void {
    this.emit(AUTOMATION_EVENTS.TASK_UPDATED, payload);
  }

  emitTaskStatusChanged(payload: TaskFieldChangedPayload<string>): void {
    this.emit(AUTOMATION_EVENTS.TASK_STATUS_CHANGED, payload);
  }

  emitTaskPriorityChanged(payload: TaskFieldChangedPayload<string>): void {
    this.emit(AUTOMATION_EVENTS.TASK_PRIORITY_CHANGED, payload);
  }

  emitTaskNameChanged(payload: TaskFieldChangedPayload<string>): void {
    this.emit(AUTOMATION_EVENTS.TASK_NAME_CHANGED, payload);
  }

  emitTaskTypeChanged(payload: TaskFieldChangedPayload<string>): void {
    this.emit(AUTOMATION_EVENTS.TASK_TYPE_CHANGED, payload);
  }

  emitTaskDueDateChanged(payload: TaskFieldChangedPayload<Date>): void {
    this.emit(AUTOMATION_EVENTS.TASK_DUE_DATE_CHANGED, payload);
  }

  emitTaskStartDateChanged(payload: TaskFieldChangedPayload<Date>): void {
    this.emit(AUTOMATION_EVENTS.TASK_START_DATE_CHANGED, payload);
  }

  emitTaskAssigned(payload: TaskAssignmentPayload): void {
    this.emit(AUTOMATION_EVENTS.TASK_ASSIGNED, payload);
  }

  emitTaskMovedToList(payload: TaskMovedToListPayload): void {
    this.emit(AUTOMATION_EVENTS.TASK_MOVED_TO_LIST, payload);
  }

  emitAssigneeRemoved(payload: TaskAssignmentPayload): void {
    this.emit(AUTOMATION_EVENTS.ASSIGNEE_REMOVED, payload);
  }

  emitTagAdded(payload: TaskTagPayload): void {
    this.emit(AUTOMATION_EVENTS.TAG_ADDED, payload);
  }

  emitTagRemoved(payload: TaskTagPayload): void {
    this.emit(AUTOMATION_EVENTS.TAG_REMOVED, payload);
  }

  emitCommentCreated(payload: TaskCommentPayload): void {
    this.emit(AUTOMATION_EVENTS.COMMENT_CREATED, payload);
  }

  emitSubtaskCreated(payload: SubtaskCreatedPayload): void {
    this.emit(AUTOMATION_EVENTS.SUBTASK_CREATED, payload);
  }

  emitAllSubtasksResolved(payload: AllSubtasksResolvedPayload): void {
    this.emit(AUTOMATION_EVENTS.ALL_SUBTASKS_RESOLVED, payload);
  }

  emitCustomFieldChanged(payload: CustomFieldChangedPayload): void {
    this.emit(AUTOMATION_EVENTS.CUSTOMFIELD_CHANGED, payload);
  }

  emitCron(payload: CronEventPayload): void {
    this.emit(AUTOMATION_EVENTS.CRON, payload);
  }

  private emit(event: string, payload: unknown): void {
    try {
      this.emitter.emit(event, payload);
    } catch (err) {
      this.logger.warn(`Falha ao emitir ${event}: ${(err as Error).message}`);
    }
  }
}
