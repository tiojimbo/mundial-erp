'use client';

import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  RiRefreshLine,
  RiAlertLine,
  RiCalendarCheckLine,
  RiCalendarLine,
  RiCalendar2Line,
  RiIndeterminateCircleLine,
  RiCheckboxCircleLine,
} from '@remixicon/react';
import { useAuth } from '@/providers/auth-provider';
import { useMyTasks } from '@/features/home/hooks/use-my-tasks';
import { SummaryCards } from '@/features/home/components/summary-cards';
import { TaskGroup } from '@/features/home/components/task-group';
import { EmptyTasks } from '@/features/home/components/empty-tasks';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function InicioPage() {
  const { user } = useAuth();
  const { data, isLoading } = useMyTasks();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);

  const firstName = user?.name?.split(' ')[0] ?? 'Usuário';
  const greeting = getGreeting();
  const hasTasks = !isLoading && (data?.summary.totalActive ?? 0) > 0;

  const scrollToSection = useCallback(
    (sectionId: string) => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [],
  );

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
  }, [queryClient]);

  return (
    <div ref={containerRef} className='flex flex-col'>
      <div className='padding-x-main-page flex max-w-5xl flex-col gap-8 py-8'>
        {/* Saudação */}
        <div className='flex items-start justify-between'>
          <div>
            <h1 className='text-[30px] font-bold leading-tight tracking-tight'>
              {greeting}, {firstName}
            </h1>
            <p className='text-sm text-muted-foreground'>
              {hasTasks ? (
                <>
                  <span className='font-medium text-foreground'>
                    {data?.summary.totalActive ?? 0}
                  </span>{' '}
                  {data?.summary.totalActive === 1
                    ? 'tarefa ativa atribuída a você'
                    : 'tarefas ativas atribuídas a você'}
                </>
              ) : (
                'Nenhuma tarefa ativa aproveite'
              )}
            </p>
          </div>
          <button
            className='rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground'
            onClick={handleRefresh}
            aria-label='Atualizar tarefas'
          >
            <RiRefreshLine className='size-4' />
          </button>
        </div>

        {/* Conteúdo condicional (loading / tarefas) */}
        {isLoading ? (
          <SummaryCards
            summary={undefined}
            isLoading={true}
            onScrollTo={scrollToSection}
          />
        ) : hasTasks ? (
          <>
            <SummaryCards
              summary={data?.summary}
              isLoading={false}
              onScrollTo={scrollToSection}
            />

            <div className='flex flex-col gap-3'>
              <TaskGroup
                id='overdue'
                title='Atrasadas'
                icon={RiAlertLine}
                tasks={data?.overdue ?? []}
              />
              <TaskGroup
                id='dueToday'
                title='Para hoje'
                icon={RiCalendarCheckLine}
                tasks={data?.dueToday ?? []}
              />
              {data?.dueByDay?.map((group) => (
                <TaskGroup
                  key={group.id}
                  id={`dueByDay-${group.id}`}
                  title={group.label}
                  icon={RiCalendarLine}
                  tasks={group.tasks}
                />
              ))}
              <TaskGroup
                id='upcoming'
                title='Em breve'
                icon={RiCalendar2Line}
                tasks={data?.upcoming ?? []}
              />
              <TaskGroup
                id='noDueDate'
                title='Sem data definida'
                icon={RiIndeterminateCircleLine}
                tasks={data?.noDueDate ?? []}
              />
              <TaskGroup
                id='recentlyCompleted'
                title='Concluídas recentemente'
                icon={RiCheckboxCircleLine}
                tasks={data?.recentlyCompleted ?? []}
              />
            </div>
          </>
        ) : null}
      </div>

      {/* Empty state — full-width para centralizar no viewport */}
      {!isLoading && !hasTasks && <EmptyTasks />}
    </div>
  );
}
