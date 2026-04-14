'use client';

import * as Table from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';

type TableSkeletonProps = {
  rows?: number;
  columns?: number;
  headers?: string[];
};

export function TableSkeleton({
  rows = 5,
  columns = 5,
  headers,
}: TableSkeletonProps) {
  const colCount = headers?.length ?? columns;

  return (
    <Table.Root>
      {headers && (
        <Table.Header>
          <Table.Row>
            {headers.map((header) => (
              <Table.Head key={header}>{header}</Table.Head>
            ))}
          </Table.Row>
        </Table.Header>
      )}
      <Table.Body>
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <Table.Row key={rowIdx}>
            {Array.from({ length: colCount }).map((__, colIdx) => (
              <Table.Cell key={colIdx}>
                <Skeleton
                  variant='table-row'
                  className={colIdx === 0 ? 'w-32' : 'w-20'}
                />
              </Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}
