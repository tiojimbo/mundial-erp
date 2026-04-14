'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  RiCloseLine,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiMoreLine,
  RiAddLine,
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiSearchLine,
  RiHashtag,
  RiLockLine,
  RiEditLine,
  RiDeleteBinLine,
  RiSettings3Line,
} from '@remixicon/react';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { homeItems, type NavItem } from '@/config/navigation';
import { useSidebarTree, SIDEBAR_TREE_KEY } from '@/features/navigation/hooks/use-sidebar-tree';
import type {
  SidebarDepartment,
  SidebarArea,
  SidebarProcess,
} from '@/features/navigation/types/navigation.types';
import {
  useSidebarStore,
  SIDEBAR_COLLAPSED_WIDTH,
} from '@/stores/sidebar.store';
import { useMediaQuery } from '@/hooks/use-media-query';
import * as Tooltip from '@/components/ui/tooltip';
import * as Dropdown from '@/components/ui/dropdown';
import * as Modal from '@/components/ui/modal';
import * as Button from '@/components/ui/button';
import { useChannels } from '@/features/chat/hooks/use-channels';
import { useChatStore } from '@/stores/chat.store';
import { CreateChannelDialog } from '@/features/chat/components/create-channel-dialog';
import { CreateDmDialog } from '@/features/chat/components/create-dm-dialog';
import { CreateDepartmentDialog } from '@/features/work-items/components/create-department-dialog';
import { StatusConfig } from '@/features/settings/components/status-config';
import {
  useUpdateDepartment,
  useDeleteDepartment,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
} from '@/features/settings/hooks/use-departments';
import {
  useCreateProcess,
} from '@/features/settings/hooks/use-processes';
import { useNotification } from '@/hooks/use-notification';
import type { Channel } from '@/features/chat/types/chat.types';

/* Cores fallback por abreviação de departamento */
const DEPT_COLORS: Record<string, string> = {
  CO: '#d97706',
  CM: '#0d9488',
  FI: '#ea580c',
  PR: '#22c55e',
  SI: '#7c3aed',
};

/* Cores dos badges de canal */
const CHANNEL_BADGE_COLORS: Record<string, string> = {
  HU: 'bg-[#d97706]',
  FI: 'bg-[#ea580c]',
  CO: 'bg-[#ca8a04]',
  PR: 'bg-[#0d9488]',
  CM: 'bg-[#0d9488]',
};

/* ════════════════════════════════════════════════════════
   Sidebar (root)
   ════════════════════════════════════════════════════════ */

export function Sidebar() {
  const pathname = usePathname();
  const {
    isExpanded,
    isMobileOpen,
    sidebarWidth,
    toggleSidebar,
    setSidebarWidth,
    closeMobileSidebar,
  } = useSidebarStore();
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  useEffect(() => {
    if (!isDesktop) closeMobileSidebar();
  }, [pathname, isDesktop, closeMobileSidebar]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidth = sidebarWidth;
      const onMouseMove = (ev: MouseEvent) => {
        setSidebarWidth(startWidth + (ev.clientX - startX));
      };
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [sidebarWidth, setSidebarWidth],
  );

  if (isDesktop) {
    return (
      <aside
        className='relative flex h-screen flex-col bg-[oklch(98.5%_0_0)] transition-[width] duration-200'
        style={{ width: isExpanded ? sidebarWidth : SIDEBAR_COLLAPSED_WIDTH }}
      >
        <SidebarContent
          isExpanded={isExpanded}
          pathname={pathname}
          toggleSidebar={toggleSidebar}
        />
        {isExpanded && (
          <div
            className='absolute -right-px top-0 z-10 h-full w-[2px] cursor-col-resize'
            onMouseDown={handleMouseDown}
            title='Redimensionar sidebar'
            aria-hidden='true'
          />
        )}
      </aside>
    );
  }

  return (
    <>
      {isMobileOpen && (
        <div
          className='fixed inset-0 z-40 bg-black/40 transition-opacity'
          onClick={closeMobileSidebar}
          aria-hidden='true'
        />
      )}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-[oklch(98.5%_0_0)] shadow-xl transition-transform duration-200',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className='absolute right-2 top-4 z-10'>
          <button
            type='button'
            onClick={closeMobileSidebar}
            className='rounded-lg p-1.5 text-text-sub-600 transition-colors hover:bg-[oklch(94%_0_0)]'
            aria-label='Fechar menu'
          >
            <RiCloseLine className='size-5' />
          </button>
        </div>
        <SidebarContent
          isExpanded
          pathname={pathname}
          toggleSidebar={toggleSidebar}
        />
      </aside>
    </>
  );
}

/* ── Helpers ── */

function getAbbr(name: string): string {
  return name.substring(0, 2).toUpperCase();
}

function isProcessActive(process: SidebarProcess, deptSlug: string, pathname: string) {
  const processPath = process.featureRoute || `/d/${deptSlug}/p/${process.slug}`;
  return pathname === processPath || pathname.startsWith(processPath + '/');
}

function isAreaActive(area: SidebarArea, deptSlug: string, pathname: string) {
  return area.processes.some((p) => isProcessActive(p, deptSlug, pathname));
}

function isDeptActive(dept: SidebarDepartment, pathname: string) {
  return dept.areas.some((a) => isAreaActive(a, dept.slug, pathname));
}

function isLeafActive(item: NavItem, pathname: string) {
  if (!item.href) return false;
  return pathname === item.href || (item.href !== '/inicio' && pathname.startsWith(item.href));
}

/* ════════════════════════════════════════════════════════
   SidebarContent
   ════════════════════════════════════════════════════════ */

function SidebarContent({
  isExpanded,
  pathname,
  toggleSidebar,
}: {
  isExpanded: boolean;
  pathname: string;
  toggleSidebar: () => void;
}) {
  const { expandedGroups, toggleGroup, setGroupExpanded, expandedAreas, setAreaExpanded } =
    useSidebarStore();
  const { data: deptTree } = useSidebarTree();
  const queryClient = useQueryClient();
  const { notification } = useNotification();

  /* ── CRUD state ── */
  const [showCreateDeptDialog, setShowCreateDeptDialog] = useState(false);
  const [addingAreaForDeptId, setAddingAreaForDeptId] = useState<string | null>(null);
  const [addingProcessForAreaId, setAddingProcessForAreaId] = useState<string | null>(null);
  const [renamingDeptId, setRenamingDeptId] = useState<string | null>(null);
  const [renamingAreaId, setRenamingAreaId] = useState<string | null>(null);
  const [statusConfigDeptId, setStatusConfigDeptId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'dept' | 'area'; id: string; name: string } | null>(null);

  /* ── Mutations ── */
  const deleteDepartment = useDeleteDepartment();
  const deleteArea = useDeleteArea();
  const createArea = useCreateArea();
  const createProcess = useCreateProcess();

  const invalidateSidebar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SIDEBAR_TREE_KEY });
  }, [queryClient]);

  /* ── Delete handler ── */
  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const mutation = deleteTarget.type === 'dept' ? deleteDepartment : deleteArea;
    mutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        notification({
          title: 'Sucesso',
          description: `${deleteTarget.type === 'dept' ? 'Departamento' : 'Area'} "${deleteTarget.name}" removido(a).`,
          status: 'success',
        });
        invalidateSidebar();
        setDeleteTarget(null);
      },
      onError: () => {
        notification({
          title: 'Erro',
          description: `Falha ao remover ${deleteTarget.type === 'dept' ? 'departamento' : 'area'}.`,
          status: 'error',
        });
      },
    });
  }

  /* ── Create area handler ── */
  function handleCreateArea(name: string, departmentId: string) {
    createArea.mutate(
      { name, departmentId },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Area criada com sucesso.', status: 'success' });
          invalidateSidebar();
          setAddingAreaForDeptId(null);
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao criar area.', status: 'error' });
        },
      },
    );
  }

  /* ── Create process handler ── */
  function handleCreateProcess(name: string, areaId: string) {
    createProcess.mutate(
      { name, areaId },
      {
        onSuccess: () => {
          notification({ title: 'Sucesso', description: 'Processo criado com sucesso.', status: 'success' });
          invalidateSidebar();
          setAddingProcessForAreaId(null);
        },
        onError: () => {
          notification({ title: 'Erro', description: 'Falha ao criar processo.', status: 'error' });
        },
      },
    );
  }

  /* Find the dept for status config */
  const statusConfigDept = (deptTree ?? []).find((d) => d.id === statusConfigDeptId);

  useEffect(() => {
    (deptTree ?? []).forEach((dept) => {
      if (isDeptActive(dept, pathname)) {
        setGroupExpanded(dept.slug, true);
        dept.areas.forEach((area) => {
          if (isAreaActive(area, dept.slug, pathname)) {
            setAreaExpanded(area.id, true);
          }
        });
      }
    });
  }, [pathname, deptTree, setGroupExpanded, setAreaExpanded]);

  return (
    <>
      {/* Header */}
      <div className='flex h-14 items-center justify-between px-4'>
        {isExpanded ? (
          <span className='text-[14px] font-semibold text-[oklch(14.5%_0_0)]'>
            Mundial ERP
          </span>
        ) : (
          <div className='flex w-full justify-center'>
            <span className='text-[14px] font-semibold text-[oklch(14.5%_0_0)]'>M</span>
          </div>
        )}
      </div>

      {/* Scrollable nav */}
      <ScrollArea.Root type='hover' className='flex-1 overflow-hidden'>
        <ScrollArea.Viewport className='size-full'>
          <nav aria-label='Menu principal'>
            {/* ── Home ── */}
            {isExpanded ? (
              <SectionLabel title='Home'>
                <button
                  type='button'
                  onClick={toggleSidebar}
                  className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)]'
                  aria-label='Recolher sidebar'
                >
                  <RiArrowLeftDoubleLine className='size-4' />
                </button>
              </SectionLabel>
            ) : (
              <div className='flex justify-center px-2 pb-1 pt-4 first:pt-1'>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <button
                      type='button'
                      onClick={toggleSidebar}
                      className='rounded p-1 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)]'
                      aria-label='Expandir sidebar'
                    >
                      <RiArrowRightDoubleLine className='size-4' />
                    </button>
                  </Tooltip.Trigger>
                  <Tooltip.Content side='right'>Expandir</Tooltip.Content>
                </Tooltip.Root>
              </div>
            )}
            <ul className='space-y-px px-2'>
              {homeItems.map((item) => (
                <li key={item.label}>
                  <NavLeaf
                    label={item.label}
                    href={item.href!}
                    icon={item.icon}
                    isActive={isLeafActive(item, pathname)}
                    isExpanded={isExpanded}
                  />
                </li>
              ))}
            </ul>

            {/* ── Channels (Chat) ── */}
            {isExpanded && <ChatChannelsSection pathname={pathname} />}

            {/* ── Departamentos ── */}
            {isExpanded && (
              <SectionLabel title='Departamentos'>
                <button
                  type='button'
                  className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)]'
                  aria-label='Buscar departamento'
                >
                  <RiSearchLine className='size-4' />
                </button>
                <button
                  type='button'
                  onClick={() => setShowCreateDeptDialog(true)}
                  className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)]'
                  aria-label='Adicionar departamento'
                >
                  <RiAddLine className='size-4' />
                </button>
              </SectionLabel>
            )}
            {!isExpanded && <div className='my-2' />}
            <ul className='space-y-px px-2'>
              {(deptTree ?? []).map((dept) => (
                <li key={dept.id}>
                  <DeptItem
                    dept={dept}
                    isExpanded={isExpanded}
                    isOpen={!!expandedGroups[dept.slug]}
                    isActive={isDeptActive(dept, pathname)}
                    pathname={pathname}
                    onToggle={() => toggleGroup(dept.slug)}
                    expandedAreas={expandedAreas}
                    renamingDeptId={renamingDeptId}
                    onStartRenameDept={(id) => setRenamingDeptId(id)}
                    onCancelRenameDept={() => setRenamingDeptId(null)}
                    onOpenStatusConfig={(id) => setStatusConfigDeptId(id)}
                    onDeleteDept={(id, name, isProtected) => {
                      if (isProtected) return;
                      setDeleteTarget({ type: 'dept', id, name });
                    }}
                    addingAreaForDeptId={addingAreaForDeptId}
                    onStartAddArea={(deptId) => {
                      setAddingAreaForDeptId(deptId);
                      setGroupExpanded(dept.slug, true);
                    }}
                    onCancelAddArea={() => setAddingAreaForDeptId(null)}
                    onCreateArea={handleCreateArea}
                    isCreatingArea={createArea.isPending}
                    renamingAreaId={renamingAreaId}
                    onStartRenameArea={(id) => setRenamingAreaId(id)}
                    onCancelRenameArea={() => setRenamingAreaId(null)}
                    onDeleteArea={(id, name, isDefault) => {
                      if (isDefault) return;
                      setDeleteTarget({ type: 'area', id, name });
                    }}
                    addingProcessForAreaId={addingProcessForAreaId}
                    onStartAddProcess={(areaId) => setAddingProcessForAreaId(areaId)}
                    onCancelAddProcess={() => setAddingProcessForAreaId(null)}
                    onCreateProcess={handleCreateProcess}
                    isCreatingProcess={createProcess.isPending}
                    onInvalidateSidebar={invalidateSidebar}
                  />
                </li>
              ))}
            </ul>
          </nav>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar
          orientation='vertical'
          className='flex w-1 touch-none select-none p-px transition-opacity duration-200 data-[state=hidden]:opacity-0 data-[state=visible]:opacity-100'
        >
          <ScrollArea.Thumb className='relative flex-1 rounded-full bg-[oklch(80%_0_0)]' />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* ── Dialogs ── */}
      <CreateDepartmentDialog
        open={showCreateDeptDialog}
        onOpenChange={setShowCreateDeptDialog}
      />

      {statusConfigDept && (
        <StatusConfig
          departmentId={statusConfigDept.id}
          departmentName={statusConfigDept.name}
          open
          onOpenChange={(open) => {
            if (!open) setStatusConfigDeptId(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Modal.Content>
            <Modal.Header
              title={deleteTarget.type === 'dept' ? 'Remover Departamento' : 'Remover Area'}
              description={`Tem certeza que deseja remover "${deleteTarget.name}"? Esta acao nao pode ser desfeita.`}
            />
            <Modal.Footer>
              <Button.Root variant='neutral' mode='stroke' size='small' onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button.Root>
              <Button.Root
                variant='error'
                mode='filled'
                size='small'
                onClick={handleConfirmDelete}
                disabled={deleteDepartment.isPending || deleteArea.isPending}
              >
                Remover
              </Button.Root>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════
   ChatChannelsSection — Channels + DMs integrados no sidebar
   ════════════════════════════════════════════════════════ */

function ChatChannelsSection({ pathname }: { pathname: string }) {
  const router = useRouter();
  const { data } = useChannels({ isFollower: true });
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);

  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [showCreateDm, setShowCreateDm] = useState(false);

  const channels = data?.pages.flatMap((page) => page.data) ?? [];
  const channelItems = channels.filter((c) => c.type === 'CHANNEL');
  const dmItems = channels.filter((c) => c.type === 'DIRECT_MESSAGE');

  const isOnChatPage = pathname.startsWith('/chat');

  const handleChannelClick = (channel: Channel) => {
    setActiveChannel(channel.id);
    if (!isOnChatPage) {
      router.push('/chat');
    }
  };

  return (
    <>
      {/* Channels */}
      <SectionLabel title='Canais'>
        <button
          type='button'
          onClick={() => setShowCreateChannel(true)}
          className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)]'
          aria-label='Adicionar canal ao chat'
        >
          <RiAddLine className='size-4' />
        </button>
      </SectionLabel>
      <ul className='space-y-px px-2'>
        {channelItems.map((channel) => (
          <li key={channel.id}>
            <ChannelNavItem
              channel={channel}
              isActive={isOnChatPage && activeChannelId === channel.id}
              onClick={() => handleChannelClick(channel)}
            />
          </li>
        ))}
        <li>
          <button
            onClick={() => setShowCreateChannel(true)}
            className='flex h-7 w-full items-center gap-2 rounded-[10px] px-2 text-[14px] text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)] hover:text-[oklch(14.5%_0_0)]'
          >
            <RiAddLine className='size-4' />
            <span>Adicionar Canal</span>
          </button>
        </li>
      </ul>

      {/* Direct Messages */}
      <SectionLabel title='Mensagens Diretas'>
        <button
          type='button'
          onClick={() => setShowCreateDm(true)}
          className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)]'
          aria-label='Nova mensagem direta no chat'
        >
          <RiAddLine className='size-4' />
        </button>
      </SectionLabel>
      <ul className='space-y-px px-2'>
        {dmItems.map((channel) => (
          <li key={channel.id}>
            <DmNavItem
              channel={channel}
              isActive={isOnChatPage && activeChannelId === channel.id}
              onClick={() => handleChannelClick(channel)}
            />
          </li>
        ))}
        <li>
          <button
            onClick={() => setShowCreateDm(true)}
            className='flex h-7 w-full items-center gap-2 rounded-[10px] px-2 text-[14px] text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(94%_0_0)] hover:text-[oklch(14.5%_0_0)]'
          >
            <RiAddLine className='size-4' />
            <span>Nova mensagem</span>
          </button>
        </li>
      </ul>

      {/* Dialogs */}
      <CreateChannelDialog
        open={showCreateChannel}
        onOpenChange={setShowCreateChannel}
      />
      <CreateDmDialog
        open={showCreateDm}
        onOpenChange={setShowCreateDm}
      />
    </>
  );
}

/* ── Channel nav item (# icon + badge) ── */

function ChannelNavItem({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}) {
  const unread = useChatStore((s) => s.unreadCounts[channel.id] ?? 0);
  const abbr = channel.name?.substring(0, 2).toUpperCase() ?? '';
  const badgeColor = CHANNEL_BADGE_COLORS[abbr] ?? 'bg-gray-500';

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-7 w-full items-center gap-2 rounded-[10px] px-2 text-left text-[14px] transition-colors',
        isActive
          ? 'rounded-[6px] bg-[oklch(94%_0_0)] font-medium text-[oklch(14.5%_0_0)]'
          : 'text-[oklch(14.5%_0_0)] hover:bg-[oklch(94%_0_0)]',
      )}
    >
      <span className='flex items-center gap-[2px]'>
        {channel.visibility === 'PRIVATE' ? (
          <RiLockLine className='size-4 text-[oklch(55.6%_0_0)]' />
        ) : (
          <RiHashtag className='size-4 text-[oklch(55.6%_0_0)]' />
        )}
        <span
          className={cn(
            'flex size-3 items-center justify-center rounded-[3px] text-[5px] font-semibold text-white',
            badgeColor,
          )}
        >
          {abbr}
        </span>
      </span>
      <span className='min-w-0 flex-1 truncate'>{channel.name}</span>
      {unread > 0 && (
        <span className='flex min-w-[16px] items-center justify-center rounded-full bg-[oklch(14.5%_0_0)] px-1 text-[10px] font-semibold text-white'>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

/* ── DM nav item (avatar) ── */

function DmNavItem({
  channel,
  isActive,
  onClick,
}: {
  channel: Channel;
  isActive: boolean;
  onClick: () => void;
}) {
  const unread = useChatStore((s) => s.unreadCounts[channel.id] ?? 0);
  const name = channel.name ?? 'DM';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <button
      onClick={onClick}
      className={cn(
        'flex h-7 w-full items-center gap-2 rounded-[10px] px-2 text-left text-[14px] transition-colors',
        isActive
          ? 'rounded-[6px] bg-[oklch(94%_0_0)] font-medium text-[oklch(14.5%_0_0)]'
          : 'text-[oklch(14.5%_0_0)] hover:bg-[oklch(94%_0_0)]',
      )}
    >
      <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-[9px] font-semibold text-white'>
        {initials}
      </span>
      <span className='min-w-0 flex-1 truncate'>{name}</span>
      {unread > 0 && (
        <span className='flex min-w-[16px] items-center justify-center rounded-full bg-[oklch(14.5%_0_0)] px-1 text-[10px] font-semibold text-white'>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </button>
  );
}

/* ════════════════════════════════════════════════════════
   SectionLabel — 12px, medium, 70% opacity, letter-spacing
   ════════════════════════════════════════════════════════ */

function SectionLabel({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className='flex items-center justify-between px-4 pb-1 pt-4 first:pt-1'>
      <span className='text-[12px] font-medium tracking-[-0.132px] text-[oklch(14.5%_0_0_/_0.7)]'>
        {title}
      </span>
      {children && (
        <div className='flex items-center gap-0.5'>{children}</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   NavLeaf — 28px height, compact
   ════════════════════════════════════════════════════════ */

function NavLeaf({
  label,
  href,
  icon: Icon,
  isActive,
  isExpanded,
}: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isExpanded: boolean;
}) {
  const link = (
    <Link
      href={href}
      data-active={isActive || undefined}
      className={cn(
        'flex h-7 items-center gap-2 rounded-[10px] px-2 text-[14px] transition-colors',
        isActive
          ? 'rounded-[6px] bg-[oklch(94%_0_0)] font-medium text-[oklch(14.5%_0_0)]'
          : 'text-[oklch(14.5%_0_0)] hover:bg-[oklch(94%_0_0)]',
        !isExpanded && 'justify-center px-0',
      )}
    >
      <Icon
        className={cn(
          'size-4 shrink-0',
          isActive ? 'text-[oklch(14.5%_0_0)]' : 'text-[oklch(55.6%_0_0)]',
        )}
      />
      {isExpanded && <span>{label}</span>}
    </Link>
  );

  if (!isExpanded) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>{link}</Tooltip.Trigger>
        <Tooltip.Content side='right'>{label}</Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return link;
}

/* ════════════════════════════════════════════════════════
   DeptAvatar — 20x20, rounded 5px, distinct colors
   ════════════════════════════════════════════════════════ */

function DeptAvatar({
  abbr,
  color,
  isOpen,
}: {
  abbr: string;
  color: string | null;
  isOpen: boolean;
}) {
  return (
    <span
      className='relative inline-flex size-5 shrink-0 items-center justify-center rounded-[5px]'
      style={{ backgroundColor: color || DEPT_COLORS[abbr] || '#6b7280' }}
      aria-hidden='true'
    >
      <span className='text-[8px] font-semibold uppercase leading-none text-white transition-opacity duration-150 group-hover/dept:opacity-0'>
        {abbr}
      </span>
      <span className='absolute inset-0 flex items-center justify-center text-white opacity-0 transition-opacity duration-150 group-hover/dept:opacity-100'>
        {isOpen ? <RiArrowUpSLine className='size-3.5' /> : <RiArrowDownSLine className='size-3.5' />}
      </span>
    </span>
  );
}

/* ════════════════════════════════════════════════════════
   AreaItem — collapsible area inside a department
   ════════════════════════════════════════════════════════ */

function AreaItem({
  area,
  deptSlug,
  pathname,
  isOpen,
  onToggle,
  isRenaming,
  onStartRename,
  onCancelRename,
  onDelete,
  addingProcess,
  onStartAddProcess,
  onCancelAddProcess,
  onCreateProcess,
  isCreatingProcess,
  onInvalidateSidebar,
}: {
  area: SidebarArea;
  deptSlug: string;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  isRenaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  addingProcess: boolean;
  onStartAddProcess: () => void;
  onCancelAddProcess: () => void;
  onCreateProcess: (name: string, areaId: string) => void;
  isCreatingProcess: boolean;
  onInvalidateSidebar: () => void;
}) {
  const areaActive = isAreaActive(area, deptSlug, pathname);

  return (
    <div>
      <div
        data-active={areaActive || undefined}
        className={cn(
          'group/area flex items-center rounded-[6px] transition-colors',
          areaActive ? 'bg-[oklch(94%_0_0)]' : 'hover:bg-[oklch(94%_0_0)]',
        )}
      >
        {isRenaming ? (
          <div className='flex h-7 min-w-0 flex-1 items-center pl-9 pr-2'>
            <InlineRenameInput
              currentName={area.name}
              entityId={area.id}
              entityType='area'
              onCancel={onCancelRename}
              onInvalidateSidebar={onInvalidateSidebar}
            />
          </div>
        ) : (
          <button
            type='button'
            onClick={onToggle}
            aria-expanded={isOpen}
            className='flex h-7 min-w-0 flex-1 items-center gap-1.5 pl-9 pr-2 text-[14px]'
          >
            <RiArrowDownSLine
              className={cn(
                'size-3.5 shrink-0 text-[oklch(55.6%_0_0)] transition-transform duration-150',
                isOpen ? 'rotate-0' : '-rotate-90',
              )}
            />
            <span
              className={cn(
                'flex-1 truncate text-left',
                areaActive ? 'font-medium text-[oklch(14.5%_0_0)]' : 'text-[oklch(14.5%_0_0)]',
              )}
            >
              {area.name}
            </span>
          </button>
        )}
        {!isRenaming && (
          <div className='flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity duration-150 group-hover/area:opacity-100'>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(92.2%_0_0)]'
                  aria-label={`Opcoes de ${area.name}`}
                >
                  <RiMoreLine className='size-3.5' />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align='end' className='w-40'>
                <Dropdown.Item onSelect={onStartRename}>
                  <Dropdown.ItemIcon as={RiEditLine} />
                  Renomear
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={onDelete}
                  disabled={area.isDefault}
                >
                  <Dropdown.ItemIcon as={RiDeleteBinLine} />
                  Excluir
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>
            <button
              type='button'
              onClick={() => {
                onStartAddProcess();
                if (!isOpen) onToggle();
              }}
              className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(92.2%_0_0)]'
              aria-label={`Adicionar em ${area.name}`}
            >
              <RiAddLine className='size-3.5' />
            </button>
          </div>
        )}
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <ul className='overflow-hidden'>
          {area.processes.map((process) => {
            const processHref =
              process.featureRoute || `/d/${deptSlug}/p/${process.slug}`;
            const active = isProcessActive(process, deptSlug, pathname);
            return (
              <li key={process.id}>
                <Link
                  href={processHref}
                  data-active={active || undefined}
                  className={cn(
                    'flex h-7 items-center gap-2 rounded-[6px] py-1 pl-12 pr-3 text-[14px] transition-colors',
                    active
                      ? 'bg-[oklch(94%_0_0)] font-medium text-[oklch(14.5%_0_0)]'
                      : 'text-[oklch(14.5%_0_0)] hover:bg-[oklch(94%_0_0)]',
                  )}
                >
                  <span className='truncate'>{process.name}</span>
                </Link>
              </li>
            );
          })}
          {addingProcess && (
            <li>
              <InlineCreateInput
                placeholder='Nome do processo'
                indentClass='pl-12 pr-3'
                onConfirm={(name) => onCreateProcess(name, area.id)}
                onCancel={onCancelAddProcess}
                isPending={isCreatingProcess}
              />
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   DeptItem
   ════════════════════════════════════════════════════════ */

function DeptItem({
  dept,
  isExpanded,
  isOpen,
  isActive,
  pathname,
  onToggle,
  expandedAreas,
  renamingDeptId,
  onStartRenameDept,
  onCancelRenameDept,
  onOpenStatusConfig,
  onDeleteDept,
  addingAreaForDeptId,
  onStartAddArea,
  onCancelAddArea,
  onCreateArea,
  isCreatingArea,
  renamingAreaId,
  onStartRenameArea,
  onCancelRenameArea,
  onDeleteArea,
  addingProcessForAreaId,
  onStartAddProcess,
  onCancelAddProcess,
  onCreateProcess,
  isCreatingProcess,
  onInvalidateSidebar,
}: {
  dept: SidebarDepartment;
  isExpanded: boolean;
  isOpen: boolean;
  isActive: boolean;
  pathname: string;
  onToggle: () => void;
  expandedAreas: Record<string, boolean>;
  renamingDeptId: string | null;
  onStartRenameDept: (id: string) => void;
  onCancelRenameDept: () => void;
  onOpenStatusConfig: (id: string) => void;
  onDeleteDept: (id: string, name: string, isProtected: boolean) => void;
  addingAreaForDeptId: string | null;
  onStartAddArea: (deptId: string) => void;
  onCancelAddArea: () => void;
  onCreateArea: (name: string, departmentId: string) => void;
  isCreatingArea: boolean;
  renamingAreaId: string | null;
  onStartRenameArea: (id: string) => void;
  onCancelRenameArea: () => void;
  onDeleteArea: (id: string, name: string, isDefault: boolean) => void;
  addingProcessForAreaId: string | null;
  onStartAddProcess: (areaId: string) => void;
  onCancelAddProcess: () => void;
  onCreateProcess: (name: string, areaId: string) => void;
  isCreatingProcess: boolean;
  onInvalidateSidebar: () => void;
}) {
  const { toggleArea } = useSidebarStore();
  const abbr = getAbbr(dept.name);
  const isRenamingThis = renamingDeptId === dept.id;

  if (!isExpanded) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            onClick={onToggle}
            className={cn(
              'flex w-full items-center justify-center rounded-lg p-2 transition-colors',
              isActive ? 'bg-[oklch(94%_0_0)]' : 'hover:bg-[oklch(94%_0_0)]',
            )}
          >
            <DeptAvatar abbr={abbr} color={dept.color} isOpen={isOpen} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content side='right'>{dept.name}</Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return (
    <div>
      <div
        data-active={isActive || undefined}
        className={cn(
          'group/dept flex items-center rounded-[10px] transition-colors',
          isActive ? 'bg-[oklch(94%_0_0)]' : 'hover:bg-[oklch(94%_0_0)]',
        )}
      >
        {isRenamingThis ? (
          <div className='flex h-7 min-w-0 flex-1 items-center gap-2 px-2'>
            <DeptAvatar abbr={abbr} color={dept.color} isOpen={isOpen} />
            <InlineRenameInput
              currentName={dept.name}
              entityId={dept.id}
              entityType='dept'
              onCancel={onCancelRenameDept}
              onInvalidateSidebar={onInvalidateSidebar}
            />
          </div>
        ) : (
          <button
            type='button'
            onClick={onToggle}
            aria-expanded={isOpen}
            className='flex h-7 min-w-0 flex-1 items-center gap-2 px-2 text-[14px]'
          >
            <DeptAvatar abbr={abbr} color={dept.color} isOpen={isOpen} />
            <span
              className={cn(
                'flex-1 truncate text-left',
                isActive ? 'font-medium text-[oklch(14.5%_0_0)]' : 'text-[oklch(14.5%_0_0)]',
              )}
            >
              {dept.name}
            </span>
          </button>
        )}
        {!isRenamingThis && (
          <div className='flex shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity duration-150 group-hover/dept:opacity-100'>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(92.2%_0_0)]'
                  aria-label={`Opcoes de ${dept.name}`}
                >
                  <RiMoreLine className='size-3.5' />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align='end' className='w-44'>
                <Dropdown.Item onSelect={() => onStartRenameDept(dept.id)}>
                  <Dropdown.ItemIcon as={RiEditLine} />
                  Renomear
                </Dropdown.Item>
                <Dropdown.Item onSelect={() => onOpenStatusConfig(dept.id)}>
                  <Dropdown.ItemIcon as={RiSettings3Line} />
                  Editar status
                </Dropdown.Item>
                <Dropdown.Separator className='my-1 h-px bg-[oklch(92%_0_0)]' />
                <Dropdown.Item
                  onSelect={() => onDeleteDept(dept.id, dept.name, dept.isProtected)}
                  disabled={dept.isProtected}
                >
                  <Dropdown.ItemIcon as={RiDeleteBinLine} />
                  Excluir
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>
            <button
              type='button'
              onClick={() => onStartAddArea(dept.id)}
              className='rounded p-0.5 text-[oklch(55.6%_0_0)] transition-colors hover:bg-[oklch(92.2%_0_0)]'
              aria-label={`Adicionar em ${dept.name}`}
            >
              <RiAddLine className='size-3.5' />
            </button>
          </div>
        )}
      </div>
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200',
          isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <ul className='overflow-hidden'>
          {dept.areas.map((area) => (
            <li key={area.id}>
              <AreaItem
                area={area}
                deptSlug={dept.slug}
                pathname={pathname}
                isOpen={!!expandedAreas[area.id]}
                onToggle={() => toggleArea(area.id)}
                isRenaming={renamingAreaId === area.id}
                onStartRename={() => onStartRenameArea(area.id)}
                onCancelRename={onCancelRenameArea}
                onDelete={() => onDeleteArea(area.id, area.name, area.isDefault)}
                addingProcess={addingProcessForAreaId === area.id}
                onStartAddProcess={() => onStartAddProcess(area.id)}
                onCancelAddProcess={onCancelAddProcess}
                onCreateProcess={onCreateProcess}
                isCreatingProcess={isCreatingProcess}
                onInvalidateSidebar={onInvalidateSidebar}
              />
            </li>
          ))}
          {addingAreaForDeptId === dept.id && (
            <li>
              <InlineCreateInput
                placeholder='Nome da area'
                indentClass='pl-9 pr-2'
                onConfirm={(name) => onCreateArea(name, dept.id)}
                onCancel={onCancelAddArea}
                isPending={isCreatingArea}
              />
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   InlineCreateInput — reusable inline input for creating areas/processes
   ════════════════════════════════════════════════════════ */

function InlineCreateInput({
  placeholder,
  indentClass,
  onConfirm,
  onCancel,
  isPending,
}: {
  placeholder: string;
  indentClass: string;
  onConfirm: (name: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || isPending) return;
    onConfirm(trimmed);
  }

  return (
    <div className={cn('flex h-7 items-center', indentClass)}>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSubmit();
          if (e.key === 'Escape') onCancel();
        }}
        onBlur={onCancel}
        placeholder={placeholder}
        disabled={isPending}
        className='h-6 w-full min-w-0 flex-1 rounded border border-[oklch(80%_0_0)] bg-white px-1.5 text-[13px] text-[oklch(14.5%_0_0)] outline-none placeholder:text-[oklch(55.6%_0_0)] focus:border-[oklch(55.6%_0_0)] disabled:opacity-50'
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   InlineRenameInput — reusable inline input for renaming depts/areas
   ════════════════════════════════════════════════════════ */

function InlineRenameInput({
  currentName,
  entityId,
  entityType,
  onCancel,
  onInvalidateSidebar,
}: {
  currentName: string;
  entityId: string;
  entityType: 'dept' | 'area';
  onCancel: () => void;
  onInvalidateSidebar: () => void;
}) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { notification } = useNotification();

  const updateDept = useUpdateDepartment(entityType === 'dept' ? entityId : '');
  const updateArea = useUpdateArea(entityType === 'area' ? entityId : '');

  const isPending = updateDept.isPending || updateArea.isPending;

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function handleSubmit() {
    const trimmed = value.trim();
    if (!trimmed || trimmed === currentName || isPending) {
      onCancel();
      return;
    }

    const mutation = entityType === 'dept' ? updateDept : updateArea;
    mutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: `${entityType === 'dept' ? 'Departamento' : 'Area'} renomeado(a).`,
            status: 'success',
          });
          onInvalidateSidebar();
          onCancel();
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: `Falha ao renomear ${entityType === 'dept' ? 'departamento' : 'area'}.`,
            status: 'error',
          });
        },
      },
    );
  }

  return (
    <input
      ref={inputRef}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleSubmit();
        if (e.key === 'Escape') onCancel();
      }}
      onBlur={handleSubmit}
      disabled={isPending}
      className='h-5 min-w-0 flex-1 rounded border border-[oklch(80%_0_0)] bg-white px-1.5 text-[13px] text-[oklch(14.5%_0_0)] outline-none focus:border-[oklch(55.6%_0_0)] disabled:opacity-50'
    />
  );
}
