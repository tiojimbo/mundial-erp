'use client';

import { useState } from 'react';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import * as Input from '@/components/ui/input';
import * as Select from '@/components/ui/select';
import { RiAddLine, RiSaveLine } from '@remixicon/react';
import {
  CARD_TYPE_LABELS,
  DATA_SOURCE_ENTITIES,
  type CardType,
  type CreateCardPayload,
} from '../types/dashboard.types';

type CardEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (payload: CreateCardPayload) => void;
  isLoading?: boolean;
  defaultValues?: Partial<CreateCardPayload>;
};

export function CardEditor({
  open,
  onOpenChange,
  onSave,
  isLoading,
  defaultValues,
}: CardEditorProps) {
  const [title, setTitle] = useState(defaultValues?.title ?? '');
  const [type, setType] = useState<CardType>(defaultValues?.type ?? 'KPI_NUMBER');
  const [entity, setEntity] = useState(defaultValues?.dataSource?.entity ?? '');
  const [xField, setXField] = useState(defaultValues?.axisConfig?.xField ?? '');
  const [yField, setYField] = useState(defaultValues?.axisConfig?.yField ?? '');

  const needsAxis = type !== 'KPI_NUMBER' && type !== 'TABLE';

  function handleSubmit() {
    if (!title || !entity) return;

    const payload: CreateCardPayload = {
      type,
      title,
      dataSource: { entity },
      layoutX: defaultValues?.layoutX ?? 0,
      layoutY: defaultValues?.layoutY ?? 0,
      layoutW: type === 'KPI_NUMBER' ? 3 : 6,
      layoutH: type === 'KPI_NUMBER' ? 2 : 4,
    };

    if (needsAxis && xField && yField) {
      payload.axisConfig = { xField, yField };
    }

    onSave(payload);
    onOpenChange(false);
  }

  return (
    <Modal.Root open={open} onOpenChange={onOpenChange}>
      <Modal.Content>
        <Modal.Header
          title={defaultValues ? 'Editar Card' : 'Novo Card'}
          description='Configure o tipo, fonte de dados e eixos do card.'
        />
        <Modal.Body className='space-y-4'>
          {/* Title */}
          <div className='space-y-1.5'>
            <label className='text-label-sm text-text-strong-950'>Título</label>
            <Input.Root>
              <Input.Wrapper>
                <Input.Input
                  placeholder='Ex: Vendas do Mês'
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Input.Wrapper>
            </Input.Root>
          </div>

          {/* Card Type */}
          <div className='space-y-1.5'>
            <label className='text-label-sm text-text-strong-950'>
              Tipo de Gráfico
            </label>
            <Select.Root value={type} onValueChange={(v) => setType(v as CardType)}>
              <Select.Trigger>
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                {(Object.entries(CARD_TYPE_LABELS) as [CardType, string][]).map(
                  ([value, label]) => (
                    <Select.Item key={value} value={value}>
                      {label}
                    </Select.Item>
                  ),
                )}
              </Select.Content>
            </Select.Root>
          </div>

          {/* Data Source */}
          <div className='space-y-1.5'>
            <label className='text-label-sm text-text-strong-950'>
              Fonte de Dados
            </label>
            <Select.Root value={entity} onValueChange={setEntity}>
              <Select.Trigger>
                <Select.Value placeholder='Selecione a entidade' />
              </Select.Trigger>
              <Select.Content>
                {DATA_SOURCE_ENTITIES.map((ds) => (
                  <Select.Item key={ds.value} value={ds.value}>
                    {ds.label}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Root>
          </div>

          {/* Axis Config (only for chart types) */}
          {needsAxis && (
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <label className='text-label-sm text-text-strong-950'>
                  Campo X
                </label>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input
                      placeholder='Ex: date'
                      value={xField}
                      onChange={(e) => setXField(e.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
              <div className='space-y-1.5'>
                <label className='text-label-sm text-text-strong-950'>
                  Campo Y
                </label>
                <Input.Root>
                  <Input.Wrapper>
                    <Input.Input
                      placeholder='Ex: totalCents'
                      value={yField}
                      onChange={(e) => setYField(e.target.value)}
                    />
                  </Input.Wrapper>
                </Input.Root>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button.Root
            variant='neutral'
            mode='stroke'
            size='small'
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button.Root>
          <Button.Root
            variant='primary'
            mode='filled'
            size='small'
            onClick={handleSubmit}
            disabled={isLoading || !title || !entity}
          >
            <Button.Icon as={defaultValues ? RiSaveLine : RiAddLine} />
            {defaultValues ? 'Salvar' : 'Adicionar'}
          </Button.Root>
        </Modal.Footer>
      </Modal.Content>
    </Modal.Root>
  );
}
