'use client';

import { useEffect, useMemo, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { DayPicker } from 'react-day-picker';
import {
  addDays,
  addWeeks,
  format,
  nextSunday,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import 'react-day-picker/dist/style.css';

import { cn } from '@/lib/cn';
import type { BaseFieldProps } from './field-base';
import { inputClass } from './field-base';
import { FieldShell } from './field-shell';
import { useDebouncedOnChange } from './use-debounced-onchange';

function toDateInput(value: BaseFieldProps['value']): string {
  if (value === null || value === undefined || value === '') return '';
  const asString = typeof value === 'string' ? value : String(value);
  if (asString.includes('T')) return asString.split('T')[0] ?? '';
  return asString;
}

function parseLocalDate(value: string): Date | undefined {
  if (!value) return undefined;
  try {
    const d = parseISO(value);
    return Number.isNaN(d.getTime()) ? undefined : d;
  } catch {
    return undefined;
  }
}

function fmtBadge(d: Date): string {
  return format(d, "dd 'de' MMM", { locale: ptBR });
}

function fmtShortDay(d: Date): string {
  return `${format(d, 'EEEEEE', { locale: ptBR }).toLowerCase()}.`;
}

export function DateField({
  definition,
  value,
  onChange,
  readOnly,
  error,
  inline,
}: BaseFieldProps<string | null>) {
  const [localValue, setLocalValue] = useState<string>(toDateInput(value));
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedOnChange<string | null>(onChange);

  useEffect(() => {
    setLocalValue(toDateInput(value));
  }, [value]);

  const isReadOnly = readOnly || definition.config?.readOnly === true;
  const selectedDate = parseLocalDate(localValue);

  const shortcuts = useMemo(() => {
    const today = new Date();
    const tomorrow = addDays(today, 1);
    const nextWeek = nextSunday(today);
    const twoWeeks = addWeeks(nextWeek, 1);
    const fourWeeks = addWeeks(nextWeek, 3);
    return [
      { label: 'Hoje', hint: fmtShortDay(today), date: today },
      { label: 'Amanhã', hint: fmtShortDay(tomorrow), date: tomorrow },
      { label: 'Semana que vem', hint: fmtBadge(nextWeek), date: nextWeek },
      { label: '2 semanas', hint: fmtBadge(twoWeeks), date: twoWeeks },
      { label: '4 semanas', hint: fmtBadge(fourWeeks), date: fourWeeks },
    ];
  }, []);

  const commit = (d: Date | undefined) => {
    if (!d) {
      setLocalValue('');
      debounced(null);
      setOpen(false);
      return;
    }
    const iso = format(d, 'yyyy-MM-dd');
    setLocalValue(iso);
    debounced(iso);
    setOpen(false);
  };

  if (!inline) {
    return (
      <FieldShell definition={definition} error={error} hint={definition.config?.hint} showLabel>
        {(controlProps) => (
          <input
            {...controlProps}
            type="date"
            className={inputClass}
            value={localValue}
            readOnly={isReadOnly}
            onChange={(event) => {
              const next = event.target.value;
              setLocalValue(next);
              debounced(next.length === 0 ? null : next);
            }}
          />
        )}
      </FieldShell>
    );
  }

  return (
    <FieldShell definition={definition} error={error} showLabel={false}>
      {(controlProps) => (
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.Trigger asChild>
            <button
              {...controlProps}
              type="button"
              disabled={isReadOnly}
              className="flex w-full cursor-pointer items-center gap-1.5 py-0.5 text-[13px] focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={selectedDate ? 'text-foreground' : 'text-muted-foreground/60'}>
                {selectedDate ? fmtBadge(selectedDate) : 'Adicionar'}
              </span>
            </button>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              align="start"
              sideOffset={4}
              className="isolate z-[200] w-[480px] gap-0 overflow-hidden rounded-md border border-border bg-popover p-0 text-popover-foreground shadow-lg outline-none"
            >
              <div className="border-border bg-background flex flex-col rounded-md border shadow-sm">
              <div className="border-border flex flex-wrap items-center gap-1.5 border-b p-2">
                <div className="flex items-center gap-1">
                  <CalendarIcon className="text-muted-foreground h-3.5 w-3.5" aria-hidden="true" />
                  {selectedDate ? (
                    <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
                      {fmtBadge(selectedDate)}
                      <button
                        type="button"
                        onClick={() => commit(undefined)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                        aria-label="Limpar data"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Sem data</span>
                  )}
                </div>
              </div>

              <div className="flex">
                <div className="border-border bg-muted/30 flex w-40 flex-col gap-0.5 rounded-bl-md border-r p-2">
                  {shortcuts.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => commit(s.date)}
                      className="flex w-full items-start justify-between gap-2 rounded-sm px-1.5 py-1 text-left text-xs text-muted-foreground transition-all hover:bg-accent/50"
                    >
                      <span>{s.label}</span>
                      <span className="text-muted-foreground shrink-0 text-[10px]">{s.hint}</span>
                    </button>
                  ))}
                  <div className="border-border my-1 border-t" />
                  <button
                    type="button"
                    onClick={() => commit(undefined)}
                    className="text-destructive hover:bg-destructive/10 flex items-center gap-1 rounded-sm px-1.5 py-1 text-[10px]"
                  >
                    <X className="h-3 w-3" />
                    Limpar data
                  </button>
                </div>

                <div className="bg-background flex-1 rounded-br-md p-3">
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={commit}
                    locale={ptBR}
                    weekStartsOn={0}
                    showOutsideDays
                    fixedWeeks
                    components={{
                      IconLeft: () => <ChevronLeft className="h-4 w-4" />,
                      IconRight: () => <ChevronRight className="h-4 w-4" />,
                    }}
                    classNames={{
                      root: 'rdp-root',
                      months: 'flex flex-col sm:flex-row',
                      month: 'flex flex-col gap-3 w-full',
                      caption: 'flex justify-center pt-1 relative items-center w-full',
                      caption_label: 'text-sm font-medium',
                      nav: 'flex items-center gap-1',
                      nav_button: cn(
                        'inline-flex items-center justify-center rounded-md',
                        'transition-all disabled:pointer-events-none disabled:opacity-50',
                        'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                        'cursor-pointer border border-border bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
                        'absolute h-7 w-7 p-0',
                      ),
                      nav_button_previous: 'left-0 top-0',
                      nav_button_next: 'right-0 top-0',
                      table: 'w-full border-collapse',
                      head_row: 'flex w-full',
                      head_cell:
                        'text-muted-foreground rounded-md flex-1 font-normal text-xs py-1',
                      row: 'flex w-full mt-1',
                      cell: cn(
                        'relative flex-1 p-0 text-center focus-within:relative focus-within:z-20',
                      ),
                      day: cn(
                        'inline-flex items-center justify-center rounded-md text-sm transition-all w-full',
                        'disabled:pointer-events-none disabled:opacity-50',
                        'outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]',
                        'cursor-pointer hover:bg-accent hover:text-accent-foreground',
                        'h-8 p-0 font-normal',
                      ),
                      day_today: 'bg-foreground text-background hover:bg-foreground hover:text-background',
                      day_selected:
                        'bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background',
                      day_outside:
                        'day-outside text-muted-foreground/50 aria-selected:text-muted-foreground/50',
                      day_disabled: 'text-muted-foreground opacity-50',
                      day_hidden: 'invisible',
                    }}
                  />
                </div>
              </div>
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
      )}
    </FieldShell>
  );
}
