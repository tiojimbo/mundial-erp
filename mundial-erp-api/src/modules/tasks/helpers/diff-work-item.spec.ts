/**
 * Unit tests — diffWorkItem helper (PLANO-TASKS §8.11, ADR-002/003).
 *
 * Cobertura 100% alvo: cada campo semantico + idempotencia + transicoes null<->valor
 * + datas comparadas por ms + colapso de description/markdownContent.
 *
 * Estrategia: puro (sem Nest, sem Prisma real). Entradas controladas, asserts
 * determinısticos na ordem de declaracao do helper (estavel — ver comentario
 * na fonte).
 */
import type { Prisma, TaskPriority } from '@prisma/client';
import { diffWorkItem, type WorkItemDiffRow } from './diff-work-item';

const ACTOR_ID = 'actor-user-1';
const WS_ID = 'ws-1';

const baseBefore = (): WorkItemDiffRow => ({
  id: 'task-1',
  title: 'Antigo',
  description: 'desc antiga',
  markdownContent: null,
  statusId: 'status-todo',
  priority: 'NORMAL' as TaskPriority,
  dueDate: new Date('2026-05-01T00:00:00.000Z'),
  startDate: null,
  points: 3,
  archived: false,
  customTypeId: null,
});

type Patch = Prisma.WorkItemUncheckedUpdateInput;

describe('diffWorkItem (unit)', () => {
  describe('title', () => {
    it('emits RENAMED when title changes', () => {
      const events = diffWorkItem(
        baseBefore(),
        { title: 'Novo' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        eventType: 'RENAMED',
        payload: {
          from: 'Antigo',
          to: 'Novo',
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        },
      });
    });

    it('is idempotent when title is identical', () => {
      const events = diffWorkItem(
        baseBefore(),
        { title: 'Antigo' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });

    it('does not emit when title is omitted (undefined)', () => {
      const events = diffWorkItem(baseBefore(), {} as Patch, ACTOR_ID, WS_ID);
      expect(events.find((e) => e.eventType === 'RENAMED')).toBeUndefined();
    });
  });

  describe('description / markdownContent (single DESCRIPTION_CHANGED)', () => {
    it('emits ONE DESCRIPTION_CHANGED when description changes', () => {
      const events = diffWorkItem(
        baseBefore(),
        { description: 'nova desc' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      const descEvents = events.filter(
        (e) => e.eventType === 'DESCRIPTION_CHANGED',
      );
      expect(descEvents).toHaveLength(1);
      expect(descEvents[0].payload).toEqual({
        actorId: ACTOR_ID,
        workspaceId: WS_ID,
      });
      // nunca incluir body (LGPD)
      expect(descEvents[0].payload).not.toHaveProperty('from');
      expect(descEvents[0].payload).not.toHaveProperty('to');
    });

    it('emits ONE DESCRIPTION_CHANGED when markdownContent changes', () => {
      const events = diffWorkItem(
        baseBefore(),
        { markdownContent: '# novo' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      const descEvents = events.filter(
        (e) => e.eventType === 'DESCRIPTION_CHANGED',
      );
      expect(descEvents).toHaveLength(1);
    });

    it('emits a SINGLE DESCRIPTION_CHANGED when BOTH description and markdownContent change', () => {
      const events = diffWorkItem(
        baseBefore(),
        { description: 'nova', markdownContent: '# novo' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      const descEvents = events.filter(
        (e) => e.eventType === 'DESCRIPTION_CHANGED',
      );
      expect(descEvents).toHaveLength(1);
    });

    it('is idempotent when description is identical', () => {
      const events = diffWorkItem(
        baseBefore(),
        { description: 'desc antiga' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('statusId', () => {
    it('emits STATUS_CHANGED when statusId changes', () => {
      const events = diffWorkItem(
        baseBefore(),
        { statusId: 'status-doing' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'STATUS_CHANGED',
        payload: {
          from: 'status-todo',
          to: 'status-doing',
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        },
      });
    });

    it('is idempotent when statusId equal', () => {
      const events = diffWorkItem(
        baseBefore(),
        { statusId: 'status-todo' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('priority', () => {
    it('emits PRIORITY_CHANGED on change', () => {
      const events = diffWorkItem(
        baseBefore(),
        { priority: 'HIGH' as TaskPriority } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'PRIORITY_CHANGED',
        payload: {
          from: 'NORMAL',
          to: 'HIGH',
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        },
      });
    });

    it('is idempotent', () => {
      const events = diffWorkItem(
        baseBefore(),
        { priority: 'NORMAL' as TaskPriority } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('dueDate', () => {
    it('emits DUE_DATE_CHANGED when dueDate changes', () => {
      const events = diffWorkItem(
        baseBefore(),
        { dueDate: new Date('2026-06-01T00:00:00.000Z') } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'DUE_DATE_CHANGED',
        payload: {
          from: '2026-05-01T00:00:00.000Z',
          to: '2026-06-01T00:00:00.000Z',
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        },
      });
    });

    it('treats Date instances with same ms as equal (no event)', () => {
      const iso = '2026-05-01T00:00:00.000Z';
      const before: WorkItemDiffRow = { ...baseBefore(), dueDate: new Date(iso) };
      const events = diffWorkItem(
        before,
        { dueDate: new Date(iso) } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });

    it('null -> Date emits event with from=null', () => {
      const before: WorkItemDiffRow = { ...baseBefore(), dueDate: null };
      const events = diffWorkItem(
        before,
        { dueDate: new Date('2026-06-01T00:00:00.000Z') } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'DUE_DATE_CHANGED',
        payload: {
          from: null,
          to: '2026-06-01T00:00:00.000Z',
        },
      });
    });

    it('Date -> null emits event with to=null', () => {
      const events = diffWorkItem(
        baseBefore(),
        { dueDate: null } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'DUE_DATE_CHANGED',
        payload: {
          from: '2026-05-01T00:00:00.000Z',
          to: null,
        },
      });
    });

    it('null == null — no event', () => {
      const before: WorkItemDiffRow = { ...baseBefore(), dueDate: null };
      const events = diffWorkItem(
        before,
        { dueDate: null } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('startDate', () => {
    it('emits START_DATE_CHANGED', () => {
      const events = diffWorkItem(
        baseBefore(),
        { startDate: new Date('2026-04-01T00:00:00.000Z') } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'START_DATE_CHANGED',
        payload: {
          from: null,
          to: '2026-04-01T00:00:00.000Z',
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        },
      });
    });

    it('is idempotent for null==null', () => {
      const events = diffWorkItem(
        baseBefore(),
        { startDate: null } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('points', () => {
    it('emits POINTS_CHANGED when value differs', () => {
      const events = diffWorkItem(
        baseBefore(),
        { points: 8 } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'POINTS_CHANGED',
        payload: { from: 3, to: 8, actorId: ACTOR_ID, workspaceId: WS_ID },
      });
    });

    it('is idempotent', () => {
      const events = diffWorkItem(
        baseBefore(),
        { points: 3 } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });

    it('number -> null emits event', () => {
      const events = diffWorkItem(
        baseBefore(),
        { points: null } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'POINTS_CHANGED',
        payload: { from: 3, to: null },
      });
    });
  });

  describe('archived', () => {
    it('false -> true emits ARCHIVED', () => {
      const events = diffWorkItem(
        baseBefore(),
        { archived: true } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'ARCHIVED',
        payload: { actorId: ACTOR_ID, workspaceId: WS_ID },
      });
    });

    it('true -> false emits UNARCHIVED', () => {
      const before: WorkItemDiffRow = { ...baseBefore(), archived: true };
      const events = diffWorkItem(
        before,
        { archived: false } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'UNARCHIVED',
        payload: { actorId: ACTOR_ID, workspaceId: WS_ID },
      });
    });

    it('is idempotent when archived equal', () => {
      const events = diffWorkItem(
        baseBefore(),
        { archived: false } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('customTypeId', () => {
    it('null -> value emits CUSTOM_TYPE_CHANGED', () => {
      const events = diffWorkItem(
        baseBefore(),
        { customTypeId: 'cst-bug' } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'CUSTOM_TYPE_CHANGED',
        payload: {
          from: null,
          to: 'cst-bug',
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        },
      });
    });

    it('value -> null emits event', () => {
      const before: WorkItemDiffRow = {
        ...baseBefore(),
        customTypeId: 'cst-bug',
      };
      const events = diffWorkItem(
        before,
        { customTypeId: null } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events[0]).toMatchObject({
        eventType: 'CUSTOM_TYPE_CHANGED',
        payload: { from: 'cst-bug', to: null },
      });
    });

    it('is idempotent', () => {
      const events = diffWorkItem(
        baseBefore(),
        { customTypeId: null } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(0);
    });
  });

  describe('patch shape edges', () => {
    it('empty patch -> 0 events', () => {
      const events = diffWorkItem(baseBefore(), {} as Patch, ACTOR_ID, WS_ID);
      expect(events).toHaveLength(0);
    });

    it('accepts Prisma { set: value } operator shape', () => {
      const events = diffWorkItem(
        baseBefore(),
        { title: { set: 'Novo' } } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('RENAMED');
    });

    it('combined patch: title + priority + dueDate emits 3 events in stable order', () => {
      const events = diffWorkItem(
        baseBefore(),
        {
          title: 'Novo titulo',
          priority: 'HIGH' as TaskPriority,
          dueDate: new Date('2026-07-01T00:00:00.000Z'),
        } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events.map((e) => e.eventType)).toEqual([
        'RENAMED',
        'PRIORITY_CHANGED',
        'DUE_DATE_CHANGED',
      ]);
      for (const e of events) {
        expect(e.payload).toMatchObject({
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        });
      }
    });

    it('every emitted event carries actorId and workspaceId', () => {
      const events = diffWorkItem(
        baseBefore(),
        {
          title: 'X',
          description: 'Y',
          statusId: 'status-doing',
          priority: 'HIGH' as TaskPriority,
          dueDate: null,
          startDate: new Date('2026-04-01T00:00:00.000Z'),
          points: 10,
          archived: true,
          customTypeId: 'cst-bug',
        } as Patch,
        ACTOR_ID,
        WS_ID,
      );
      expect(events.length).toBeGreaterThan(0);
      for (const e of events) {
        expect(e.payload).toMatchObject({
          actorId: ACTOR_ID,
          workspaceId: WS_ID,
        });
      }
    });
  });
});
