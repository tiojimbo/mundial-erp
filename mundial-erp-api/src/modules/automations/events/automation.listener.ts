import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AutomationTrigger } from '@prisma/client';
import { AutomationsRepository } from '../automations.repository';
import { AutomationEngineService } from '../engine/automation-engine.service';
import { AUTOMATION_EVENTS } from './task-events.constants';
import type { TaskEventContext } from './task-events.types';

@Injectable()
export class AutomationListener {
  private readonly logger = new Logger(AutomationListener.name);

  constructor(
    private readonly repository: AutomationsRepository,
    private readonly engine: AutomationEngineService,
  ) {}

  @OnEvent(AUTOMATION_EVENTS.TASK_CREATED, { async: true })
  handleTaskCreated(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_CREATED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_UPDATED, { async: true })
  handleTaskUpdated(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_UPDATED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_STATUS_CHANGED, { async: true })
  handleTaskStatusChanged(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_STATUS_CHANGED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_PRIORITY_CHANGED, { async: true })
  handleTaskPriorityChanged(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_PRIORITY_CHANGED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_NAME_CHANGED, { async: true })
  handleTaskNameChanged(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_NAME_CHANGED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_TYPE_CHANGED, { async: true })
  handleTaskTypeChanged(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_TYPE_CHANGED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_DUE_DATE_CHANGED, { async: true })
  handleTaskDueDateChanged(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_DUE_DATE_CHANGED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_START_DATE_CHANGED, { async: true })
  handleTaskStartDateChanged(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_START_DATE_CHANGED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_ASSIGNED, { async: true })
  handleTaskAssigned(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_ASSIGNED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TASK_MOVED_TO_LIST, { async: true })
  handleTaskMovedToList(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TASK_MOVED_TO_LIST, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.ASSIGNEE_REMOVED, { async: true })
  handleAssigneeRemoved(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.ASSIGNEE_REMOVED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TAG_ADDED, { async: true })
  handleTagAdded(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TAG_ADDED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.TAG_REMOVED, { async: true })
  handleTagRemoved(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.TAG_REMOVED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.COMMENT_CREATED, { async: true })
  handleCommentCreated(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.COMMENT_CREATED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.SUBTASK_CREATED, { async: true })
  handleSubtaskCreated(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.SUBTASK_CREATED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.ALL_SUBTASKS_RESOLVED, { async: true })
  handleAllSubtasksResolved(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.ALL_SUBTASKS_RESOLVED, payload);
  }

  @OnEvent(AUTOMATION_EVENTS.CUSTOMFIELD_CHANGED, { async: true })
  handleCustomFieldChanged(payload: TaskEventContext) {
    return this.handle(AutomationTrigger.CUSTOMFIELD_CHANGED, payload);
  }

  private async handle(trigger: AutomationTrigger, payload: TaskEventContext) {
    const automations = await this.repository.findActiveByTrigger(
      payload.workspaceId,
      trigger,
    );
    if (automations.length === 0) return;

    const enriched = await this.ensureScopeFields(payload);

    const matching = automations.filter((a) => this.isInScope(a, enriched));
    if (matching.length === 0) return;

    this.logger.debug(
      `[automation] ${trigger} ws=${enriched.workspaceId} task=${enriched.taskId} matched=${matching.length}`,
    );
    await Promise.all(
      matching.map((a) => this.engine.scheduleExecution(a, trigger, enriched)),
    );
  }

  private async ensureScopeFields(
    payload: TaskEventContext,
  ): Promise<TaskEventContext> {
    if (payload.spaceId !== undefined && payload.folderId !== undefined) {
      return payload;
    }
    const list = await this.repository.resolveListScope(payload.listId);
    return {
      ...payload,
      spaceId: list?.spaceId ?? null,
      folderId: list?.folderId ?? null,
    };
  }

  private isInScope(
    automation: { scopeType: string; scopeId: string | null },
    payload: TaskEventContext,
  ): boolean {
    switch (automation.scopeType) {
      case 'WORKSPACE':
        return true;
      case 'SPACE':
        return automation.scopeId === payload.spaceId;
      case 'FOLDER':
        return automation.scopeId === payload.folderId;
      case 'LIST':
        return automation.scopeId === payload.listId;
      default:
        return false;
    }
  }
}
