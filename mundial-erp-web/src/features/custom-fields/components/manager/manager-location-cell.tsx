'use client';

import { useMemo, useState } from 'react';
import { Command } from 'cmdk';
import {
  Building2,
  Folder,
  Globe,
  List as ListIcon,
  Search,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSidebarTree } from '@/features/navigation/hooks/use-sidebar-tree';
import { cn } from '@/lib/cn';
import {
  useAddCustomFieldLocation,
  useRemoveCustomFieldLocation,
} from '../../hooks/use-custom-field-definitions';
import type {
  CustomFieldLocationType,
  ManagerCustomFieldItem,
} from '../../types/custom-field.types';

interface ManagerLocationCellProps {
  def: ManagerCustomFieldItem;
}

type FlatLocation = {
  value: string;
  type: CustomFieldLocationType;
  id: string;
  label: string;
};

const ICON_BY_TYPE = {
  space: Globe,
  folder: Folder,
  list: ListIcon,
} as const;

export function ManagerLocationCell({ def }: ManagerLocationCellProps) {
  const [open, setOpen] = useState(false);
  const treeQuery = useSidebarTree();
  const addLocation = useAddCustomFieldLocation();
  const removeLocation = useRemoveCustomFieldLocation();

  const flatOptions = useMemo<{
    spaces: FlatLocation[];
    folders: FlatLocation[];
    lists: FlatLocation[];
  }>(() => {
    const spaces: FlatLocation[] = [];
    const folders: FlatLocation[] = [];
    const lists: FlatLocation[] = [];
    for (const sp of treeQuery.data ?? []) {
      spaces.push({
        value: `space:${sp.id}`,
        type: 'space',
        id: sp.id,
        label: sp.name,
      });
      for (const proc of sp.directProcesses ?? []) {
        lists.push({
          value: `list:${proc.id}`,
          type: 'list',
          id: proc.id,
          label: `${sp.name} / ${proc.name}`,
        });
      }
      for (const area of sp.areas ?? []) {
        folders.push({
          value: `folder:${area.id}`,
          type: 'folder',
          id: area.id,
          label: `${sp.name} / ${area.name}`,
        });
        for (const proc of area.processes ?? []) {
          lists.push({
            value: `list:${proc.id}`,
            type: 'list',
            id: proc.id,
            label: `${sp.name} / ${area.name} / ${proc.name}`,
          });
        }
      }
    }
    return { spaces, folders, lists };
  }, [treeQuery.data]);

  const labelMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const arr of [
      flatOptions.spaces,
      flatOptions.folders,
      flatOptions.lists,
    ]) {
      for (const it of arr) map.set(`${it.type}:${it.id}`, it.label);
    }
    return map;
  }, [flatOptions]);

  const current = def.locations[0] ?? null;

  const replaceLocation = async (type: CustomFieldLocationType, id: string) => {
    try {
      if (current) {
        await removeLocation.mutateAsync({
          customFieldId: def.id,
          locationType: current.type,
          locationId: current.id,
        });
      }
      await addLocation.mutateAsync({
        customFieldId: def.id,
        targetId: id,
        locationType: type,
        action: 'ADD',
      });
      toast.success(
        current ? 'Localização alterada.' : 'Campo vinculado ao local.',
      );
      setOpen(false);
    } catch {
      toast.error('Erro ao alterar localização.');
    }
  };

  const handleRemoveCurrent = async () => {
    if (!current) return;
    try {
      await removeLocation.mutateAsync({
        customFieldId: def.id,
        locationType: current.type,
        locationId: current.id,
      });
      toast.success('Campo movido para o workspace.');
    } catch {
      toast.error('Erro ao remover localização.');
    }
  };

  const triggerContent = current ? (
    <span className='inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-paragraph-xs font-normal text-foreground'>
      {(() => {
        const Icon = ICON_BY_TYPE[current.type];
        return <Icon className='h-3 w-3' />;
      })()}
      <span className='max-w-[100px] truncate'>
        {labelMap.get(`${current.type}:${current.id}`)?.split(' / ').pop() ??
          current.id}
      </span>
    </span>
  ) : (
    <span className='inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-paragraph-xs font-normal text-foreground'>
      <Building2 className='h-3 w-3' />
      <span className='max-w-[100px] truncate'>Workspace</span>
    </span>
  );

  return (
    <div className='relative inline-block'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex cursor-pointer items-center gap-1 rounded-md px-1 py-0.5 transition-colors hover:bg-accent'
      >
        {triggerContent}
      </button>
      {open ? (
        <>
          <button
            type='button'
            aria-hidden='true'
            tabIndex={-1}
            className='fixed inset-0 z-40 cursor-default'
            onClick={() => setOpen(false)}
          />
          <div className='shadow-md absolute left-0 top-full z-50 mt-1 w-[320px] rounded-md border bg-popover'>
            <div className='border-b px-3 py-2'>
              <p className='text-paragraph-xs font-medium'>Locations atuais</p>
            </div>
            <div className='px-2 py-1.5'>
              {current ? (
                <div className='group/loc hover:bg-muted/50 flex items-center gap-2 rounded-md px-2 py-1.5'>
                  {(() => {
                    const Icon = ICON_BY_TYPE[current.type];
                    return <Icon className='h-3 w-3 text-muted-foreground' />;
                  })()}
                  <span className='flex-1 truncate text-paragraph-sm'>
                    {labelMap.get(`${current.type}:${current.id}`) ??
                      current.id}
                  </span>
                  <button
                    type='button'
                    aria-label='Remover localização'
                    onClick={handleRemoveCurrent}
                    className='text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover/loc:opacity-100'
                  >
                    <X className='h-3.5 w-3.5' />
                  </button>
                </div>
              ) : (
                <div className='flex items-center gap-2 rounded-md px-2 py-1.5'>
                  <Building2 className='h-3 w-3 text-muted-foreground' />
                  <span className='flex-1 truncate text-paragraph-sm'>
                    Workspace
                  </span>
                </div>
              )}
            </div>
            <div className='border-t'>
              <Command className='flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground'>
                <div className='flex h-9 items-center gap-2 border-b px-3'>
                  <Search className='size-4 shrink-0 opacity-50' />
                  <Command.Input
                    placeholder='Adicionar location...'
                    className='flex h-10 w-full bg-transparent py-3 text-paragraph-sm outline-none placeholder:text-muted-foreground'
                  />
                </div>
                <Command.List className='max-h-[200px] overflow-auto'>
                  <Command.Empty className='px-3 py-2 text-paragraph-xs text-muted-foreground'>
                    Nada encontrado.
                  </Command.Empty>
                  <LocGroup
                    heading='Spaces'
                    Icon={Globe}
                    items={flatOptions.spaces.filter(
                      (s) =>
                        !(current?.type === 'space' && current.id === s.id),
                    )}
                    onSelect={replaceLocation}
                  />
                  <LocGroup
                    heading='Folders'
                    Icon={Folder}
                    items={flatOptions.folders.filter(
                      (f) =>
                        !(current?.type === 'folder' && current.id === f.id),
                    )}
                    onSelect={replaceLocation}
                  />
                  <LocGroup
                    heading='Lists'
                    Icon={ListIcon}
                    items={flatOptions.lists.filter(
                      (l) => !(current?.type === 'list' && current.id === l.id),
                    )}
                    onSelect={replaceLocation}
                  />
                </Command.List>
              </Command>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function LocGroup({
  heading,
  Icon,
  items,
  onSelect,
}: {
  heading: string;
  Icon: typeof Globe;
  items: FlatLocation[];
  onSelect: (type: CustomFieldLocationType, id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <Command.Group
      heading={heading}
      className={cn(
        'overflow-hidden p-1 text-foreground',
        '[&_[cmdk-group-heading]]:text-muted-foreground',
        '[&_[cmdk-group-heading]]:px-2',
        '[&_[cmdk-group-heading]]:py-1.5',
        '[&_[cmdk-group-heading]]:text-paragraph-xs',
        '[&_[cmdk-group-heading]]:font-medium',
      )}
    >
      {items.map((it) => (
        <Command.Item
          key={it.value}
          value={it.label}
          onSelect={() => onSelect(it.type, it.id)}
          className='relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-paragraph-sm outline-none data-[selected=true]:bg-accent'
        >
          <Icon className='h-3.5 w-3.5 shrink-0 text-muted-foreground' />
          <span className='truncate text-paragraph-xs'>{it.label}</span>
        </Command.Item>
      ))}
    </Command.Group>
  );
}
