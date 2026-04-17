'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiArrowDownSLine, RiMoreLine } from '@remixicon/react';
import { cn } from '@/lib/cn';
import * as Dropdown from '@/components/ui/dropdown';
import type { ProcessSummary } from '@/features/navigation/types/process-summary.types';
import { ProcessCardListBody } from './process-card-list-body';
import { ProcessCardBpmBody } from './process-card-bpm-body';

type ProcessCardProps = {
  process: ProcessSummary;
  parentName: string;
  deptSlug: string;
};

export function ProcessCard({ process, parentName, deptSlug }: ProcessCardProps) {
  const [collapsed, setCollapsed] = useState(false);

  const totalCount =
    process.processType === 'LIST' ? process.totalItems : process.totalOrders;

  const processHref =
    process.featureRoute || `/d/${deptSlug}/p/${process.slug}`;

  return (
    <div className="mx-4 min-w-fit shrink-0 overflow-auto rounded-xl border border-stroke-soft-200 bg-bg-white-0 md:mx-6 lg:mx-10">
      {/* Card Header */}
      <div className="group/header flex items-center gap-3 px-5 py-4">
        {/* Collapse button */}
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-md bg-primary-base/10 text-primary-base transition-colors hover:bg-primary-base/20"
        >
          <RiArrowDownSLine
            className={cn(
              'size-4 transition-transform duration-200',
              collapsed && '-rotate-90',
            )}
          />
        </button>

        {/* Title */}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-subheading-2xs text-text-sub-600">
            {parentName}
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={processHref}
              className="truncate text-label-md text-text-strong-950 hover:underline"
            >
              {process.name}
            </Link>
            <span className="text-label-xs tabular-nums text-text-soft-400">
              {totalCount}
            </span>
          </div>
        </div>

        {/* Actions menu */}
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button
              type="button"
              className="flex size-6 shrink-0 items-center justify-center rounded text-text-soft-400 opacity-0 transition-all hover:bg-bg-weak-50 group-hover/header:opacity-100"
            >
              <RiMoreLine className="size-4" />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content align="end" className="w-40">
            <Dropdown.Item asChild>
              <Link href={processHref}>Abrir processo</Link>
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>

      {/* Card Body */}
      {!collapsed && (
        <div>
          {process.processType === 'LIST' ? (
            <ProcessCardListBody process={process} />
          ) : (
            <ProcessCardBpmBody process={process} deptSlug={deptSlug} />
          )}
        </div>
      )}
    </div>
  );
}
