'use client';

import { useState, useCallback, useRef } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiDragMoveLine,
} from '@remixicon/react';
import * as Button from '@/components/ui/button';
import { CardRenderer } from './card-renderer';
import { CardEditor } from './card-editor';
import { FilterBar } from './filter-bar';
import {
  useDashboard,
  useAddCard,
  useRemoveCard,
  useUpdateLayout,
  useRemoveFilter,
  useCardData,
} from '../hooks/use-dashboards';
import type {
  Dashboard,
  DashboardCard,
  CreateCardPayload,
  BatchLayoutPayload,
} from '../types/dashboard.types';
import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

type DashboardGridProps = {
  dashboard: Dashboard;
  isEditing: boolean;
};

export function DashboardGrid({ dashboard, isEditing }: DashboardGridProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const addCard = useAddCard(dashboard.id);
  const removeCard = useRemoveCard(dashboard.id);
  const updateLayout = useUpdateLayout(dashboard.id);
  const removeFilter = useRemoveFilter(dashboard.id);

  const layout = dashboard.cards.map((card) => ({
    i: card.id,
    x: card.layoutX,
    y: card.layoutY,
    w: card.layoutW,
    h: card.layoutH,
    minW: 2,
    minH: 2,
    static: !isEditing,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: Array<{ i: string; x: number; y: number; w: number; h: number }>) => {
      if (!isEditing) return;
      const payload: BatchLayoutPayload = {
        cards: newLayout.map((item) => ({
          id: item.i,
          layoutX: item.x,
          layoutY: item.y,
          layoutW: item.w,
          layoutH: item.h,
        })),
      };
      updateLayout.mutate(payload);
    },
    [isEditing, updateLayout],
  );

  const handleAddCard = useCallback(
    (payload: CreateCardPayload) => {
      addCard.mutate(payload);
    },
    [addCard],
  );

  return (
    <div className='space-y-4'>
      {/* Filters */}
      <FilterBar
        filters={dashboard.filters}
        autoRefreshSeconds={dashboard.autoRefreshSeconds}
        onRemoveFilter={(filterId) => removeFilter.mutate(filterId)}
        onAddFilter={() => {}}
      />

      {/* Grid */}
      {dashboard.cards.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-stroke-soft-200 py-20'>
          <p className='text-paragraph-sm text-text-soft-400'>
            Nenhum card adicionado ainda.
          </p>
          {isEditing && (
            <Button.Root
              variant='primary'
              mode='filled'
              size='small'
              onClick={() => setEditorOpen(true)}
            >
              <Button.Icon as={RiAddLine} />
              Adicionar Card
            </Button.Root>
          )}
        </div>
      ) : (
        <ResponsiveGridLayout
          className='dashboard-grid'
          layouts={{ lg: layout }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          isDraggable={isEditing}
          isResizable={isEditing}
          onLayoutChange={handleLayoutChange}
          draggableHandle='.drag-handle'
        >
          {dashboard.cards.map((card) => (
            <div
              key={card.id}
              className='overflow-hidden rounded-lg border border-stroke-soft-200 bg-bg-white-0'
            >
              <GridCard
                card={card}
                dashboardId={dashboard.id}
                isEditing={isEditing}
                onRemove={() => removeCard.mutate(card.id)}
              />
            </div>
          ))}
        </ResponsiveGridLayout>
      )}

      {/* Add Card Button (editing mode) */}
      {isEditing && dashboard.cards.length > 0 && (
        <div className='flex justify-center'>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => setEditorOpen(true)}
          >
            <Button.Icon as={RiAddLine} />
            Adicionar Card
          </Button.Root>
        </div>
      )}

      {/* Card Editor Modal */}
      <CardEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleAddCard}
        isLoading={addCard.isPending}
      />
    </div>
  );
}

function GridCard({
  card,
  dashboardId,
  isEditing,
  onRemove,
}: {
  card: DashboardCard;
  dashboardId: string;
  isEditing: boolean;
  onRemove: () => void;
}) {
  const { data, isLoading } = useCardData(dashboardId, card.id);

  return (
    <div className='flex h-full flex-col'>
      {/* Card Header */}
      <div className='flex items-center justify-between border-b border-stroke-soft-200 px-3 py-2'>
        <div className='flex items-center gap-2'>
          {isEditing && (
            <RiDragMoveLine className='drag-handle size-4 cursor-grab text-text-soft-400' />
          )}
          <h4 className='text-label-xs text-text-strong-950'>{card.title}</h4>
        </div>
        {isEditing && (
          <button
            type='button'
            onClick={onRemove}
            className='rounded p-1 text-text-soft-400 hover:bg-bg-weak-50 hover:text-state-error-base'
          >
            <RiDeleteBinLine className='size-3.5' />
          </button>
        )}
      </div>

      {/* Card Body */}
      <div className='flex-1 p-3'>
        <CardRenderer
          type={card.type}
          title={card.title}
          data={data}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
