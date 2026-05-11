'use client';

import { Fragment } from 'react';
import Link from 'next/link';
import { Star, type LucideIcon } from 'lucide-react';
import * as Tooltip from '@/components/ui/tooltip';

type BreadcrumbNodeProps = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  current?: boolean;
  onClick?: () => void;
  ariaHasPopup?: boolean;
};

function BreadcrumbNode({
  label,
  href,
  icon: Icon,
  current,
  onClick,
  ariaHasPopup,
}: BreadcrumbNodeProps) {
  const className = [
    'group inline-flex h-7 max-w-55 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] transition-colors duration-150',
    'hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    current
      ? 'font-semibold text-foreground'
      : 'font-normal text-muted-foreground hover:text-foreground',
  ].join(' ');

  const content = (
    <>
      {Icon ? <Icon className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden /> : null}
      <span className="truncate">{label}</span>
    </>
  );

  return (
    <li className="flex items-center">
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          {href && !current ? (
            <Link href={href} className={className} title={label}>
              {content}
            </Link>
          ) : (
            <button
              type="button"
              title={label}
              aria-current={current ? 'page' : undefined}
              aria-haspopup={ariaHasPopup ? 'dialog' : undefined}
              onClick={onClick}
              className={className}
            >
              {content}
            </button>
          )}
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom">{label}</Tooltip.Content>
      </Tooltip.Root>
    </li>
  );
}

function BreadcrumbSeparator() {
  return (
    <li aria-hidden="true" className="select-none px-0.5 text-[13px] text-muted-foreground/40">
      /
    </li>
  );
}

type BreadcrumbFavoriteProps = {
  active?: boolean;
  onClick?: () => void;
};

function BreadcrumbFavorite({ active, onClick }: BreadcrumbFavoriteProps) {
  return (
    <li className="ml-1 flex items-center">
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type="button"
            onClick={onClick}
            aria-haspopup="dialog"
            aria-label={active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            className="inline-flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className="size-3.5"
              strokeWidth={2}
              fill={active ? 'currentColor' : 'none'}
              aria-hidden
            />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content side="bottom">
          {active ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        </Tooltip.Content>
      </Tooltip.Root>
    </li>
  );
}

export type BreadcrumbItem = {
  label: string;
  href?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  ariaHasPopup?: boolean;
};

type BreadcrumbTrailProps = {
  items: BreadcrumbItem[];
  favorite?: {
    active?: boolean;
    onClick?: () => void;
  };
};

export function BreadcrumbTrail({ items, favorite }: BreadcrumbTrailProps) {
  return (
    <header className="flex shrink-0 items-center px-10 py-2.5">
      <nav aria-label="Breadcrumb" className="flex items-center">
        <ol className="flex items-center gap-0.5">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <Fragment key={`${item.label}-${index}`}>
                <BreadcrumbNode
                  label={item.label}
                  href={item.href}
                  icon={item.icon}
                  current={isLast}
                  onClick={item.onClick}
                  ariaHasPopup={item.ariaHasPopup}
                />
                {!isLast ? <BreadcrumbSeparator /> : null}
              </Fragment>
            );
          })}
          {favorite ? (
            <BreadcrumbFavorite active={favorite.active} onClick={favorite.onClick} />
          ) : null}
        </ol>
      </nav>
    </header>
  );
}
