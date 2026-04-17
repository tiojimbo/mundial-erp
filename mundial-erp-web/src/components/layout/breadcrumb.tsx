'use client';

import Link from 'next/link';
import { RiArrowRightSLine, RiHome5Line } from '@remixicon/react';
import * as BreadcrumbUI from '@/components/ui/breadcrumb';

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

type BreadcrumbProps = {
  items: BreadcrumbSegment[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <BreadcrumbUI.Root>
      {/* Home */}
      <BreadcrumbUI.Item asChild>
        <Link href="/inicio">
          <BreadcrumbUI.Icon as={RiHome5Line} className="size-4" />
        </Link>
      </BreadcrumbUI.Item>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
            <BreadcrumbUI.ArrowIcon as={RiArrowRightSLine} className="size-4" />
            <BreadcrumbUI.Item active={isLast} asChild={!isLast && !!item.href}>
              {!isLast && item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span>{item.label}</span>
              )}
            </BreadcrumbUI.Item>
          </span>
        );
      })}
    </BreadcrumbUI.Root>
  );
}
