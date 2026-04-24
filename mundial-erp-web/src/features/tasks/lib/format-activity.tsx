import type { ReactNode } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Archive,
  ArchiveRestore,
  Award,
  Calendar,
  Check,
  CheckSquare,
  CircleDot,
  Edit,
  Eye,
  EyeOff,
  FileText,
  Flag,
  Link2,
  Merge,
  MessageSquare,
  Paperclip,
  Plus,
  Sparkles,
  Tag,
  Timer,
  UserMinus,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';

import type { TaskActivity } from '../types/task.types';

/**
 * Sprint 5 (TSK-160) — Formatter PT-BR para activity feed.
 *
 * Funcao pura, sem side-effects. Consome `lookups` (users/statuses/tags)
 * injetados pelo componente pai (`activity-item.tsx` ou container via hook).
 *
 * - Nao usa export default (regra #13).
 * - Nao usa any; payload e tipado como `Record<string, unknown>` e narrowing
 *   via helpers locais.
 * - `format-activity.tsx` pode retornar JSX → sufixo .tsx mandatorio.
 */

export type ActivityLookups = {
  users: Record<string, { name: string }>;
  statuses: Record<string, { label: string }>;
  tags: Record<string, { name: string }>;
};

type ActivityFormatted = {
  text: ReactNode;
  icon?: LucideIcon;
};

type ActivityPayload = Record<string, unknown> | null;

const PRIORITY_LABELS: Record<string, string> = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  NORMAL: 'Normal',
  LOW: 'Baixa',
  NONE: 'Nenhuma',
};

const ACTIVITY_ICONS: Record<string, LucideIcon> = {
  CREATED: Sparkles,
  RENAMED: Edit,
  DESCRIPTION_CHANGED: FileText,
  STATUS_CHANGED: CircleDot,
  PRIORITY_CHANGED: Flag,
  DUE_DATE_CHANGED: Calendar,
  START_DATE_CHANGED: Calendar,
  POINTS_CHANGED: Award,
  ARCHIVED: Archive,
  UNARCHIVED: ArchiveRestore,
  CUSTOM_TYPE_CHANGED: Timer,
  ASSIGNEE_ADDED: UserPlus,
  ASSIGNEE_REMOVED: UserMinus,
  WATCHER_ADDED: Eye,
  WATCHER_REMOVED: EyeOff,
  TAG_ADDED: Tag,
  TAG_REMOVED: Tag,
  DEPENDENCY_ADDED: Link2,
  DEPENDENCY_REMOVED: Link2,
  DEPENDENCY_UNBLOCKED: Link2,
  LINK_ADDED: Link2,
  LINK_REMOVED: Link2,
  CHECKLIST_CREATED: CheckSquare,
  CHECKLIST_ITEM_RESOLVED: Check,
  ATTACHMENT_ADDED: Paperclip,
  SUBTASK_ADDED: Plus,
  SUBTASK_COMPLETED: Check,
  COMMENT_ADDED: MessageSquare,
  MERGED_INTO: Merge,
};

function Strong({ children }: { children: ReactNode }) {
  return <strong className='font-medium text-foreground'>{children}</strong>;
}

type StatusPill = { id?: string; name: string; color?: string | null };

function readStatusPill(
  payload: ActivityPayload,
  key: string,
): StatusPill | null {
  if (!payload) return null;
  const raw = (payload as Record<string, unknown>)[key];
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === 'string' ? obj.name : null;
  if (!name) return null;
  return {
    id: typeof obj.id === 'string' ? obj.id : undefined,
    name,
    color: typeof obj.color === 'string' ? obj.color : null,
  };
}

function StatusChip({ status }: { status: StatusPill }) {
  const color = status.color ?? 'currentColor';
  return (
    <span className='inline-flex items-center gap-1 whitespace-nowrap font-medium text-foreground'>
      <span
        aria-hidden='true'
        className='inline-block h-2 w-2 rounded-full'
        style={{ backgroundColor: color }}
      />
      {status.name.toUpperCase()}
    </span>
  );
}

function asPayload(payload: unknown): ActivityPayload {
  if (payload && typeof payload === 'object') {
    return payload as Record<string, unknown>;
  }
  return null;
}

function readString(payload: ActivityPayload, key: string): string | null {
  if (!payload) return null;
  const v = payload[key];
  return typeof v === 'string' ? v : null;
}

function readNumber(payload: ActivityPayload, key: string): number | null {
  if (!payload) return null;
  const v = payload[key];
  return typeof v === 'number' ? v : null;
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return format(d, "d 'de' MMM 'as' HH:mm", { locale: ptBR });
  } catch {
    return d.toLocaleDateString('pt-BR');
  }
}

function resolveActorName(
  activity: TaskActivity,
  lookups: ActivityLookups,
): string {
  if (activity.actor?.name) return activity.actor.name;
  if (!activity.actorId) return activity.actorName ?? 'Sistema';
  return (
    lookups.users[activity.actorId]?.name ??
    activity.actorName ??
    'Alguem'
  );
}

function resolveUserName(
  lookups: ActivityLookups,
  userId: string | null,
): string {
  if (!userId) return 'alguem';
  return lookups.users[userId]?.name ?? userId;
}

function resolveTagName(
  lookups: ActivityLookups,
  tagId: string | null,
): string {
  if (!tagId) return 'tag';
  return lookups.tags[tagId]?.name ?? tagId;
}

function resolveStatusLabel(
  lookups: ActivityLookups,
  statusId: string | null,
): string {
  if (!statusId) return 'sem status';
  return lookups.statuses[statusId]?.label ?? statusId;
}

function pillFromLookup(
  lookups: ActivityLookups,
  statusId: string | null | undefined,
): StatusPill | null {
  if (!statusId) return null;
  const hit = lookups.statuses[statusId];
  if (!hit) return null;
  return { id: statusId, name: hit.label };
}

export function formatActivity(
  activity: TaskActivity,
  lookups: ActivityLookups,
): ActivityFormatted {
  const actor = resolveActorName(activity, lookups);
  const payload = asPayload(activity.payload);
  const icon = ACTIVITY_ICONS[activity.type] ?? Sparkles;

  switch (activity.type) {
    case 'CREATED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> criou esta tarefa
          </>
        ),
      };

    case 'RENAMED': {
      const to = readString(payload, 'to') ?? '';
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> alterou o titulo para &ldquo;{to}&rdquo;
          </>
        ),
      };
    }

    case 'DESCRIPTION_CHANGED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> editou a descricao
          </>
        ),
      };

    case 'STATUS_CHANGED': {
      const fromPill =
        readStatusPill(payload, 'fromStatus') ??
        pillFromLookup(lookups, readString(payload, 'from'));
      const toPill =
        readStatusPill(payload, 'toStatus') ??
        pillFromLookup(lookups, readString(payload, 'to'));
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> alterou o status
            {fromPill ? (
              <>
                {' '}de <StatusChip status={fromPill} />
              </>
            ) : null}
            {toPill ? (
              <>
                {' '}para <StatusChip status={toPill} />
              </>
            ) : (
              <>
                {' '}para{' '}
                <Strong>{resolveStatusLabel(lookups, readString(payload, 'to'))}</Strong>
              </>
            )}
          </>
        ),
      };
    }

    case 'PRIORITY_CHANGED': {
      const to = readString(payload, 'to') ?? '';
      const label = PRIORITY_LABELS[to] ?? to;
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> alterou a prioridade para {label}
          </>
        ),
      };
    }

    case 'DUE_DATE_CHANGED': {
      const to = readString(payload, 'to');
      if (!to) {
        return {
          icon,
          text: (
            <>
              <Strong>{actor}</Strong> removeu a data de entrega
            </>
          ),
        };
      }
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> alterou a data de entrega para{' '}
            {formatDate(to)}
          </>
        ),
      };
    }

    case 'START_DATE_CHANGED': {
      const to = readString(payload, 'to');
      if (!to) {
        return {
          icon,
          text: (
            <>
              <Strong>{actor}</Strong> removeu a data de inicio
            </>
          ),
        };
      }
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> alterou a data de inicio para{' '}
            {formatDate(to)}
          </>
        ),
      };
    }

    case 'POINTS_CHANGED': {
      const to = readNumber(payload, 'to');
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> alterou os pontos para{' '}
            {to === null ? '—' : to}
          </>
        ),
      };
    }

    case 'ARCHIVED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> arquivou esta tarefa
          </>
        ),
      };

    case 'UNARCHIVED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> reativou esta tarefa
          </>
        ),
      };

    case 'CUSTOM_TYPE_CHANGED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> mudou o tipo
          </>
        ),
      };

    case 'ASSIGNEE_ADDED': {
      const userId = readString(payload, 'userId');
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> atribuiu a:{' '}
            {resolveUserName(lookups, userId)}
          </>
        ),
      };
    }

    case 'ASSIGNEE_REMOVED': {
      const userId = readString(payload, 'userId');
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> removeu o responsavel:{' '}
            {resolveUserName(lookups, userId)}
          </>
        ),
      };
    }

    case 'WATCHER_ADDED': {
      const userId = readString(payload, 'userId');
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> adicionou{' '}
            {resolveUserName(lookups, userId)} como observador
          </>
        ),
      };
    }

    case 'WATCHER_REMOVED': {
      const userId = readString(payload, 'userId');
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> removeu{' '}
            {resolveUserName(lookups, userId)} dos observadores
          </>
        ),
      };
    }

    case 'TAG_ADDED': {
      const tagId = readString(payload, 'tagId');
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> adicionou a tag:{' '}
            {resolveTagName(lookups, tagId)}
          </>
        ),
      };
    }

    case 'TAG_REMOVED': {
      const tagId = readString(payload, 'tagId');
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> removeu a tag:{' '}
            {resolveTagName(lookups, tagId)}
          </>
        ),
      };
    }

    case 'DEPENDENCY_ADDED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> adicionou dependencia
          </>
        ),
      };

    case 'DEPENDENCY_REMOVED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> removeu dependencia
          </>
        ),
      };

    case 'DEPENDENCY_UNBLOCKED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> desbloqueou dependencia
          </>
        ),
      };

    case 'LINK_ADDED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> vinculou outra tarefa
          </>
        ),
      };

    case 'LINK_REMOVED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> desvinculou outra tarefa
          </>
        ),
      };

    case 'CHECKLIST_CREATED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> criou um checklist
          </>
        ),
      };

    case 'CHECKLIST_ITEM_RESOLVED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> concluiu um item do checklist
          </>
        ),
      };

    case 'ATTACHMENT_ADDED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> anexou um arquivo
          </>
        ),
      };

    case 'SUBTASK_ADDED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> adicionou uma subtarefa
          </>
        ),
      };

    case 'SUBTASK_COMPLETED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> concluiu uma subtarefa
          </>
        ),
      };

    case 'COMMENT_ADDED':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> comentou
          </>
        ),
      };

    case 'MERGED_INTO':
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> mergeou esta tarefa em outra
          </>
        ),
      };

    default:
      return {
        icon,
        text: (
          <>
            <Strong>{actor}</Strong> alterou {activity.type}
          </>
        ),
      };
  }
}
