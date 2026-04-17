'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  RiAlertLine,
  RiTimeLine,
  RiChat1Line,
  RiAtLine,
  RiNotification3Line,
  RiMailLine,
  RiMailOpenLine,
  RiCheckLine,
} from '@remixicon/react'

import type {
  Notification,
  NotificationType,
} from '../types/notification.types'
import { formatNotificationTime } from '../lib/date'

const ICON_MAP: Record<NotificationType, React.ComponentType<{ className?: string }>> = {
  'task.overdue': RiAlertLine,
  'task.due_soon': RiTimeLine,
  'message': RiChat1Line,
  'mention': RiAtLine,
  'system': RiNotification3Line,
}

type NotificationItemProps = {
  notification: Notification
  onRead: (id: string) => void
  onUnread: (id: string) => void
  onClear: (id: string) => void
  onNavigate: (url: string) => void
}

export function NotificationItem({
  notification,
  onRead,
  onUnread,
  onClear,
  onNavigate,
}: NotificationItemProps) {
  const router = useRouter()
  const isUnread = notification.status === 'unread'
  const Icon = ICON_MAP[notification.type] ?? RiNotification3Line
  const timeLabel = formatNotificationTime(notification.createdAt)

  const handleClick = useCallback(() => {
    if (isUnread) {
      onRead(notification.id)
    }
    if (notification.entityUrl) {
      router.push(notification.entityUrl)
    }
  }, [notification, isUnread, onRead, router])

  const handleToggleRead = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      if (isUnread) {
        onRead(notification.id)
      } else {
        onUnread(notification.id)
      }
    },
    [notification.id, isUnread, onRead, onUnread],
  )

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      onClear(notification.id)
    },
    [notification.id, onClear],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    },
    [handleClick],
  )

  return (
    <div
      className={`group/notification relative cursor-pointer transition-colors bg-background hover:bg-muted/50 ${
        isUnread ? 'before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-primary' : ''
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      <div className="flex items-center gap-3 px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted transition-opacity hover:opacity-75">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <span
              className={`truncate text-sm text-foreground ${
                isUnread ? 'font-medium' : 'font-normal'
              }`}
            >
              {notification.title}
            </span>
          </div>
        </div>
        <span className="shrink-0 text-sm text-muted-foreground/40">&mdash;</span>
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-normal text-muted-foreground">
            {notification.description}
          </span>
        </div>
        <div className="relative ml-auto flex h-7 shrink-0 items-center justify-end pl-3">
          {/* Layer 1: time label — invisible on hover (keeps width) */}
          <div className="group-hover/notification:invisible">
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {timeLabel}
            </span>
          </div>
          {/* Layer 2: action buttons — shown on hover */}
          <div className="absolute inset-y-0 right-0 hidden items-center group-hover/notification:flex">
            <div className="flex shrink-0 flex-row items-center gap-1.5">
              <button
                aria-label={isUnread ? 'Marcar como lida' : 'Marcar como não lida'}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background transition-all hover:bg-muted"
                onClick={handleToggleRead}
              >
                {isUnread ? (
                  <RiMailOpenLine className="h-3.5 w-3.5" />
                ) : (
                  <RiMailLine className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                className="inline-flex h-7 items-center gap-2 rounded-md bg-foreground px-2.5 text-xs font-medium text-background transition-all hover:bg-foreground/90"
                onClick={handleClear}
              >
                <RiCheckLine className="h-3.5 w-3.5" />
                Clear
                <kbd className="ml-1 flex h-4 min-w-4 items-center justify-center rounded bg-background/20 px-1 text-[10px] font-medium">
                  E
                </kbd>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
