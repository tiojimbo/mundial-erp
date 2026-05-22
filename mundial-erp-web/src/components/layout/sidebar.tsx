'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  RiCloseLine,
  RiMoreLine,
  RiAddLine,
  RiArrowLeftDoubleLine,
  RiArrowRightDoubleLine,
  RiSearchLine,
  RiEditLine,
  RiDeleteBinLine,
  RiSettings3Line,
  RiFolderLine,
  RiListCheck3,
  RiStackLine,
  RiEqualizerLine,
  RiTeamLine,
} from '@remixicon/react';
import {
  Check,
  ChevronRight,
  Folder,
  FolderOpen,
  Hash,
  List,
  Lock,
  Plus,
} from 'lucide-react';
import { getIconByName } from '@/features/tasks/components/icon-picker';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as ScrollArea from '@radix-ui/react-scroll-area';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/cn';
import { homeItems, type NavItem } from '@/config/navigation';
import {
  useSidebarTree,
  SIDEBAR_TREE_KEY,
} from '@/features/navigation/hooks/use-sidebar-tree';
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
import { useUnreadCount } from '@/features/inbox/hooks/use-unread-count';
import {
  useChannels,
  useDeleteChannel,
} from '@/features/chat/hooks/use-channels';
import { useChatStore } from '@/stores/chat.store';
import { CreateChannelDialog } from '@/features/chat/components/create-channel-dialog';
import { CreateDmDialog } from '@/features/chat/components/create-dm-dialog';
import { WorkspaceSwitcher } from '@/features/workspaces/components/workspace-switcher';
import { CreateDepartmentDialog } from '@/features/processes/components/create-department-dialog';
import { CreateAreaDialog } from '@/features/processes/components/create-area-dialog';
import { CreateProcessDialog } from '@/features/processes/components/create-process-dialog';
import { StatusEditorDialog } from '@/features/settings/components/status-editor/status-editor-dialog';
import { CustomTaskTypesDialog } from '@/features/tasks/components/custom-task-types-dialog';
import { CustomFieldsManagerDialog } from '@/features/custom-fields/components/manager/custom-fields-manager-dialog';
import { ScopeSettingsModal } from '@/features/scope-settings/components/scope-settings-modal';
import {
  useUpdateDepartment,
  useDeleteDepartment,
  useCreateArea,
  useUpdateArea,
  useDeleteArea,
} from '@/features/settings/hooks/use-departments';
import {
  useCreateProcess,
  useUpdateProcess,
  useDeleteProcess,
} from '@/features/settings/hooks/use-processes';
import { useWorkspaceTaskTypes } from '@/features/tasks/hooks/use-workspace-task-types';
import { useWorkspaceStore } from '@/stores/workspace.store';
import { useNotification } from '@/hooks/use-notification';
import { FavoritesSection } from '@/features/favorites/components/favorites-section';
import type { Channel } from '@/features/chat/types/chat.types';

/* Cores fallback por abreviação de departamento */
const DEPT_COLORS: Record<string, string> = {
  CO: '#d97706',
  CM: '#0d9488',
  FI: '#ea580c',
  PR: '#22c55e',
  SI: '#7c3aed',
};

const CHANNEL_BADGE_PALETTE = [
  'rgb(217, 119, 6)',
  'rgb(234, 88, 12)',
  'rgb(202, 138, 4)',
  'rgb(22, 163, 74)',
  'rgb(13, 148, 136)',
  'rgb(37, 99, 235)',
  'rgb(124, 58, 237)',
  'rgb(192, 38, 211)',
];

function channelBadgeColorFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  return CHANNEL_BADGE_PALETTE[
    Math.abs(hash) % CHANNEL_BADGE_PALETTE.length
  ] as string;
}

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
        className='relative flex h-screen flex-col bg-sidebar transition-[width] duration-200'
        style={{ width: isExpanded ? sidebarWidth : SIDEBAR_COLLAPSED_WIDTH }}
      >
        {/* Workspace Switcher — sempre fora do card, não é afetado pelo colapso */}
        <div className='flex h-14 items-center px-2'>
          <WorkspaceSwitcher />
        </div>

        {/* Conteúdo do sidebar: vira "cartão flutuante" quando colapsado */}
        <div
          className={cn(
            'flex flex-1 flex-col overflow-hidden transition-[padding] duration-300 ease-out',
            !isExpanded && '-mt-1 pb-2 pl-2 pr-0',
          )}
        >
          <div
            data-slot='sidebar-inner'
            className={cn(
              'flex flex-1 flex-col overflow-hidden transition-[background-color,border-color,border-radius,padding,box-shadow] duration-300 ease-out',
              !isExpanded &&
                'rounded-[14px] border border-sidebar-border bg-[#15263a] px-1 py-4 dark:bg-[#202020]',
            )}
            style={
              !isExpanded
                ? {
                    boxShadow:
                      '0 1px 3px 0 rgba(0,0,0,0.1), 0 1px 2px -1px rgba(0,0,0,0.1)',
                  }
                : undefined
            }
          >
            <SidebarContent
              isExpanded={isExpanded}
              pathname={pathname}
              toggleSidebar={toggleSidebar}
              showHeader={false}
            />
          </div>
        </div>

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
          'shadow-xl fixed inset-y-0 left-0 z-50 flex w-[272px] flex-col bg-sidebar transition-transform duration-200',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className='absolute right-2 top-4 z-10'>
          <button
            type='button'
            onClick={closeMobileSidebar}
            className='rounded-lg p-1.5 text-text-sub-600 transition-colors hover:bg-sidebar-accent'
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

function isProcessActive(
  process: SidebarProcess,
  deptSlug: string,
  pathname: string,
) {
  const processPath =
    process.featureRoute || `/d/${deptSlug}/p/${process.slug}`;
  return pathname === processPath || pathname.startsWith(processPath + '/');
}

function isAreaActive(area: SidebarArea, deptSlug: string, pathname: string) {
  return area.processes.some((p) => isProcessActive(p, deptSlug, pathname));
}

function isDeptActive(dept: SidebarDepartment, pathname: string) {
  const areaActive = dept.areas.some((a) =>
    isAreaActive(a, dept.slug, pathname),
  );
  const directActive = (dept.directProcesses ?? []).some((p) =>
    isProcessActive(p, dept.slug, pathname),
  );
  return areaActive || directActive;
}

function isLeafActive(item: NavItem, pathname: string) {
  if (!item.href) return false;
  return (
    pathname === item.href ||
    (item.href !== '/inicio' && pathname.startsWith(item.href))
  );
}

/* ════════════════════════════════════════════════════════
   SidebarContent
   ════════════════════════════════════════════════════════ */

function SidebarContent({
  isExpanded,
  pathname,
  toggleSidebar,
  showHeader = true,
}: {
  isExpanded: boolean;
  pathname: string;
  toggleSidebar: () => void;
  showHeader?: boolean;
}) {
  const {
    expandedGroups,
    toggleGroup,
    setGroupExpanded,
    expandedAreas,
    setAreaExpanded,
  } = useSidebarStore();
  const { data: deptTree } = useSidebarTree();
  const queryClient = useQueryClient();
  const { notification } = useNotification();

  /* ── CRUD state ── */
  const [showCreateDeptDialog, setShowCreateDeptDialog] = useState(false);
  const [addingAreaForDeptId, setAddingAreaForDeptId] = useState<string | null>(
    null,
  );
  const [addingProcessForAreaId, setAddingProcessForAreaId] = useState<
    string | null
  >(null);
  const [renamingDeptId, setRenamingDeptId] = useState<string | null>(null);
  const [renamingAreaId, setRenamingAreaId] = useState<string | null>(null);
  const [renamingProcessId, setRenamingProcessId] = useState<string | null>(
    null,
  );
  const [statusConfigDeptId, setStatusConfigDeptId] = useState<string | null>(
    null,
  );
  const [statusConfigAreaCtx, setStatusConfigAreaCtx] = useState<{
    areaId: string;
    areaName: string;
    deptId: string;
    deptName: string;
  } | null>(null);
  const [statusConfigListCtx, setStatusConfigListCtx] = useState<{
    listId: string;
    listName: string;
    deptId: string;
    parentName: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'dept' | 'area' | 'list';
    id: string;
    name: string;
  } | null>(null);
  const [customTaskTypesCtx, setCustomTaskTypesCtx] = useState<{
    open: boolean;
    spaceId: string | null;
  }>({ open: false, spaceId: null });
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [createAreaDialogDept, setCreateAreaDialogDept] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [createProcessDialogCtx, setCreateProcessDialogCtx] = useState<{
    folderId: string;
    parentName: string;
  } | null>(null);

  /* ── Mutations ── */
  const deleteDepartment = useDeleteDepartment();
  const deleteArea = useDeleteArea();
  const deleteProcess = useDeleteProcess();
  const createArea = useCreateArea();
  const createProcess = useCreateProcess();

  const invalidateSidebar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: SIDEBAR_TREE_KEY });
  }, [queryClient]);

  /* ── Delete handler ── */
  function handleConfirmDelete() {
    if (!deleteTarget) return;
    const label =
      deleteTarget.type === 'dept'
        ? 'Departamento'
        : deleteTarget.type === 'area'
          ? 'Area'
          : 'Processo';
    const mutation =
      deleteTarget.type === 'dept'
        ? deleteDepartment
        : deleteTarget.type === 'area'
          ? deleteArea
          : deleteProcess;
    mutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        notification({
          title: 'Sucesso',
          description: `${label} "${deleteTarget.name}" removido(a).`,
          status: 'success',
        });
        invalidateSidebar();
        setDeleteTarget(null);
      },
      onError: () => {
        notification({
          title: 'Erro',
          description: `Falha ao remover ${label.toLowerCase()}.`,
          status: 'error',
        });
      },
    });
  }

  /* ── Create area handler ── */
  function handleCreateArea(name: string, spaceId: string) {
    createArea.mutate(
      { name, spaceId },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: 'Area criada com sucesso.',
            status: 'success',
          });
          invalidateSidebar();
          setAddingAreaForDeptId(null);
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: 'Falha ao criar area.',
            status: 'error',
          });
        },
      },
    );
  }

  /* ── Create process handler ── */
  function handleCreateProcess(name: string, folderId: string) {
    createProcess.mutate(
      { name, folderId },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: 'Processo criado com sucesso.',
            status: 'success',
          });
          invalidateSidebar();
          setAddingProcessForAreaId(null);
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: 'Falha ao criar processo.',
            status: 'error',
          });
        },
      },
    );
  }

  /* Find the dept for status config */
  const statusConfigDept = (deptTree ?? []).find(
    (d) => d.id === statusConfigDeptId,
  );

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
      {/* Header — Workspace Switcher (sempre full size, não colapsa) */}
      {showHeader && (
        <div className='flex h-14 items-center px-2'>
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Scrollable nav */}
      <ScrollArea.Root type='auto' className='flex-1 overflow-hidden'>
        <ScrollArea.Viewport className='size-full'>
          <nav aria-label='Menu principal' className='pb-3'>
            {/* ── Home ── */}
            {isExpanded ? (
              <SectionLabel title='Home'>
                <button
                  type='button'
                  onClick={toggleSidebar}
                  className='rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent'
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
                      className='rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent'
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
                    badge={
                      item.href === '/caixa-de-entrada' ? (
                        <InboxBadge />
                      ) : undefined
                    }
                  />
                </li>
              ))}
            </ul>

            {/* ── Channels (Chat) ── */}
            {isExpanded && <ChatChannelsSection pathname={pathname} />}

            {/* ── Favoritos: SIDEBAR ── */}
            <FavoritesSection isExpanded={isExpanded} />

            {/* ── Departamentos ── */}
            {isExpanded && (
              <SectionLabel title='Departamentos'>
                <button
                  type='button'
                  className='rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent'
                  aria-label='Buscar departamento'
                >
                  <RiSearchLine className='size-4' />
                </button>
                <button
                  type='button'
                  onClick={() => setShowCreateDeptDialog(true)}
                  className='rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent'
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
                    isOpen={expandedGroups[dept.slug] !== false}
                    isActive={isDeptActive(dept, pathname)}
                    pathname={pathname}
                    onToggle={() => toggleGroup(dept.slug)}
                    expandedAreas={expandedAreas}
                    renamingDeptId={renamingDeptId}
                    onStartRenameDept={(id) => setRenamingDeptId(id)}
                    onCancelRenameDept={() => setRenamingDeptId(null)}
                    onOpenStatusConfig={(id) => setStatusConfigDeptId(id)}
                    onOpenAreaStatusConfig={({ area, dept: d }) =>
                      setStatusConfigAreaCtx({
                        areaId: area.id,
                        areaName: area.name,
                        deptId: d.id,
                        deptName: d.name,
                      })
                    }
                    onOpenListStatusConfig={({ process, parentName }) =>
                      setStatusConfigListCtx({
                        listId: process.id,
                        listName: process.name,
                        deptId: dept.id,
                        parentName,
                      })
                    }
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
                    onOpenCreateAreaDialog={(deptId, deptName) =>
                      setCreateAreaDialogDept({ id: deptId, name: deptName })
                    }
                    onOpenCreateProcessDialog={(ctx) =>
                      setCreateProcessDialogCtx(ctx)
                    }
                    onOpenCustomTaskTypes={(spaceId) =>
                      setCustomTaskTypesCtx({
                        open: true,
                        spaceId: spaceId ?? null,
                      })
                    }
                    onOpenCustomFields={() => setCustomFieldsOpen(true)}
                    renamingAreaId={renamingAreaId}
                    onStartRenameArea={(id) => setRenamingAreaId(id)}
                    onCancelRenameArea={() => setRenamingAreaId(null)}
                    onDeleteArea={(id, name, isDefault) => {
                      if (isDefault) return;
                      setDeleteTarget({ type: 'area', id, name });
                    }}
                    renamingProcessId={renamingProcessId}
                    onStartRenameProcess={(id) => setRenamingProcessId(id)}
                    onCancelRenameProcess={() => setRenamingProcessId(null)}
                    onDeleteProcess={(id, name) => {
                      setDeleteTarget({ type: 'list', id, name });
                    }}
                    addingProcessForAreaId={addingProcessForAreaId}
                    onStartAddProcess={(areaId) =>
                      setAddingProcessForAreaId(areaId)
                    }
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
          <ScrollArea.Thumb className='relative flex-1 rounded-full bg-border' />
        </ScrollArea.Scrollbar>
      </ScrollArea.Root>

      {/* ── Dialogs ── */}
      <CreateDepartmentDialog
        open={showCreateDeptDialog}
        onOpenChange={setShowCreateDeptDialog}
      />

      <CustomTaskTypesDialog
        open={customTaskTypesCtx.open}
        onOpenChange={(open) => setCustomTaskTypesCtx((s) => ({ ...s, open }))}
        spaceId={customTaskTypesCtx.spaceId}
      />

      <CustomFieldsManagerDialog
        open={customFieldsOpen}
        onClose={() => setCustomFieldsOpen(false)}
      />

      {statusConfigDept && (
        <StatusEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setStatusConfigDeptId(null);
          }}
          targetType='department'
          targetId={statusConfigDept.id}
          targetName={statusConfigDept.name}
          departmentId={statusConfigDept.id}
          initialMode='custom'
        />
      )}

      {statusConfigAreaCtx && (
        <StatusEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setStatusConfigAreaCtx(null);
          }}
          targetType='area'
          targetId={statusConfigAreaCtx.areaId}
          targetName={statusConfigAreaCtx.areaName}
          parentName={statusConfigAreaCtx.deptName}
          departmentId={statusConfigAreaCtx.deptId}
          initialMode='custom'
          /* TODO(backend): usar area.useSpaceStatuses do sidebar-tree para setar initialMode/initialUseSpaceStatuses. */
        />
      )}

      {statusConfigListCtx && (
        <StatusEditorDialog
          open
          onOpenChange={(open) => {
            if (!open) setStatusConfigListCtx(null);
          }}
          targetType='list'
          targetId={statusConfigListCtx.listId}
          targetName={statusConfigListCtx.listName}
          parentName={statusConfigListCtx.parentName}
          departmentId={statusConfigListCtx.deptId}
          initialMode='inherit'
        />
      )}

      {/* Create Area Dialog */}
      {createAreaDialogDept && (
        <CreateAreaDialog
          spaceId={createAreaDialogDept.id}
          spaceName={createAreaDialogDept.name}
          open
          onOpenChange={(open) => {
            if (!open) setCreateAreaDialogDept(null);
          }}
        />
      )}

      {/* Create Process Dialog */}
      {createProcessDialogCtx && (
        <CreateProcessDialog
          folderId={createProcessDialogCtx.folderId}
          parentName={createProcessDialogCtx.parentName}
          open
          onOpenChange={(open) => {
            if (!open) setCreateProcessDialogCtx(null);
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <Modal.Root open onOpenChange={() => setDeleteTarget(null)}>
          <Modal.Content>
            <Modal.Header
              title={
                deleteTarget.type === 'dept'
                  ? 'Remover Departamento'
                  : deleteTarget.type === 'area'
                    ? 'Remover Area'
                    : 'Remover Processo'
              }
              description={`Tem certeza que deseja remover "${deleteTarget.name}"? Esta acao nao pode ser desfeita.`}
            />
            <Modal.Footer>
              <Button.Root
                variant='neutral'
                mode='stroke'
                size='small'
                onClick={() => setDeleteTarget(null)}
              >
                Cancelar
              </Button.Root>
              <Button.Root
                variant='error'
                mode='filled'
                size='small'
                onClick={handleConfirmDelete}
                disabled={
                  deleteDepartment.isPending ||
                  deleteArea.isPending ||
                  deleteProcess.isPending
                }
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
  const channelItems = channels.filter(
    (c) => c.type === 'PUBLIC' || c.type === 'PRIVATE',
  );
  const dmItems = channels.filter(
    (c) => c.type === 'DIRECT' || c.type === 'GROUP_DM',
  );

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
          className='rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent'
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
            className='flex h-7 w-full items-center gap-2 rounded-[10px] px-2 text-[14px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
          className='rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent'
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
            className='flex h-7 w-full items-center gap-2 rounded-[10px] px-2 text-[14px] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground'
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
      <CreateDmDialog open={showCreateDm} onOpenChange={setShowCreateDm} />
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
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const abbr = channel.name?.substring(0, 2).toUpperCase() ?? '';
  const badgeColor = channelBadgeColorFromId(channel.id);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutate: deleteChannel, isPending: isDeleting } = useDeleteChannel();
  const label = channel.name ?? 'Canal';

  const handleConfirmDelete = () => {
    deleteChannel(channel.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        if (activeChannelId === channel.id) setActiveChannel(null);
      },
    });
  };

  return (
    <>
      <div
        role='button'
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        data-slot='sidebar-menu-button'
        data-sidebar='menu-button'
        data-active={isActive || undefined}
        className={cn(
          'group/channel relative flex h-7 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-2 text-left text-[14px] leading-5 text-sidebar-foreground transition-colors',
          'hover:bg-sidebar-accent',
          'data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium',
        )}
      >
        <div className='relative size-5 shrink-0'>
          {channel.type === 'PRIVATE' ? (
            <Lock className='size-4 text-sidebar-foreground' aria-hidden />
          ) : (
            <Hash className='size-4 text-sidebar-foreground' aria-hidden />
          )}
          <span
            data-slot='avatar'
            className='absolute -bottom-0.5 -right-0.5 flex size-3 shrink-0 overflow-hidden rounded-[3px]'
          >
            <span
              data-slot='avatar-fallback'
              className='flex size-full items-center justify-center rounded-[3px] !text-[5px] font-semibold'
              style={{
                backgroundColor: badgeColor,
                color: 'rgb(255, 255, 255)',
              }}
            >
              {abbr}
            </span>
          </span>
        </div>
        <span
          className={cn(
            'min-w-0 flex-1 truncate',
            unread > 0 && 'font-semibold',
          )}
        >
          {channel.name}
        </span>
        {unread > 0 && (
          <span className='flex size-4 shrink-0 items-center justify-center rounded-full bg-[#e93d82] text-[9px] font-medium text-white group-hover/channel:hidden'>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <Dropdown.Root>
          <Dropdown.Trigger asChild>
            <button
              type='button'
              onClick={(e) => e.stopPropagation()}
              className='absolute right-0 size-5 cursor-pointer rounded-md text-muted-foreground opacity-0 hover:bg-sidebar-accent group-hover/channel:opacity-100'
              aria-label={`Opcoes de ${label}`}
            >
              <RiMoreLine className='size-3' />
            </button>
          </Dropdown.Trigger>
          <Dropdown.Content align='end' className='w-44'>
            <Dropdown.Item
              onSelect={() => setConfirmOpen(true)}
              className='text-error-base data-[highlighted]:bg-error-lighter data-[highlighted]:text-error-base'
            >
              <Dropdown.ItemIcon as={RiDeleteBinLine} />
              Excluir canal
            </Dropdown.Item>
          </Dropdown.Content>
        </Dropdown.Root>
      </div>

      <Modal.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Modal.Content>
          <Modal.Header
            title='Excluir canal'
            description={`Tem certeza que deseja excluir o canal "${label}"? Todas as mensagens serao perdidas. Essa acao nao pode ser desfeita.`}
          />
          <Modal.Footer>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='error'
              mode='filled'
              size='small'
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
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
  const setActiveChannel = useChatStore((s) => s.setActiveChannel);
  const activeChannelId = useChatStore((s) => s.activeChannelId);
  const name = channel.name ?? 'DM';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutate: deleteChannel, isPending: isDeleting } = useDeleteChannel();

  const handleConfirmDelete = () => {
    deleteChannel(channel.id, {
      onSuccess: () => {
        setConfirmOpen(false);
        if (activeChannelId === channel.id) setActiveChannel(null);
      },
    });
  };

  return (
    <>
      <div
        role='button'
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        className={cn(
          'group/dm flex h-7 w-full cursor-pointer items-center gap-2 rounded-[10px] px-2 text-left text-[14px] transition-colors',
          isActive
            ? 'rounded-[6px] bg-sidebar-accent font-medium text-sidebar-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent',
        )}
      >
        <span className='flex size-6 shrink-0 items-center justify-center rounded-full bg-[#7c3aed] text-[9px] font-semibold text-white'>
          {initials}
        </span>
        <span className='min-w-0 flex-1 truncate'>{name}</span>
        {unread > 0 && (
          <span className='flex min-w-[16px] shrink-0 items-center justify-center rounded-full bg-sidebar-foreground px-1 text-[10px] font-semibold text-sidebar group-hover/dm:hidden'>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
        <div className='flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity duration-150 group-hover/dm:opacity-100'>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button
                type='button'
                onClick={(e) => e.stopPropagation()}
                className='rounded p-0.5 text-muted-foreground transition-colors hover:bg-sidebar-accent'
                aria-label={`Opcoes de ${name}`}
              >
                <RiMoreLine className='size-3.5' />
              </button>
            </Dropdown.Trigger>
            <Dropdown.Content align='end' className='w-44'>
              <Dropdown.Item
                onSelect={() => setConfirmOpen(true)}
                className='text-error-base data-[highlighted]:bg-error-lighter data-[highlighted]:text-error-base'
              >
                <Dropdown.ItemIcon as={RiDeleteBinLine} />
                Excluir conversa
              </Dropdown.Item>
            </Dropdown.Content>
          </Dropdown.Root>
        </div>
      </div>

      <Modal.Root open={confirmOpen} onOpenChange={setConfirmOpen}>
        <Modal.Content>
          <Modal.Header
            title='Excluir conversa'
            description={`Tem certeza que deseja excluir a conversa com "${name}"? Todas as mensagens serao perdidas. Essa acao nao pode ser desfeita.`}
          />
          <Modal.Footer>
            <Button.Root
              variant='neutral'
              mode='stroke'
              size='small'
              onClick={() => setConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button.Root>
            <Button.Root
              variant='error'
              mode='filled'
              size='small'
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button.Root>
          </Modal.Footer>
        </Modal.Content>
      </Modal.Root>
    </>
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
      <span className='text-[12px] font-medium tracking-[-0.132px] text-sidebar-foreground'>
        {title}
      </span>
      {children && <div className='flex items-center gap-0.5'>{children}</div>}
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
  badge,
}: {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isActive: boolean;
  isExpanded: boolean;
  badge?: React.ReactNode;
}) {
  const link = (
    <Link
      href={href}
      data-active={isActive || undefined}
      className={cn(
        'flex h-7 items-center gap-2 rounded-[10px] px-2 text-[14px] transition-colors',
        isActive
          ? 'rounded-[6px] bg-sidebar-accent font-medium text-sidebar-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent',
        !isExpanded && 'justify-center px-0',
      )}
    >
      <Icon className='size-4 shrink-0 text-sidebar-foreground' />
      {isExpanded && <span className='min-w-0 flex-1 truncate'>{label}</span>}
      {isExpanded && badge}
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
   InboxBadge — pink unread count badge for sidebar
   ════════════════════════════════════════════════════════ */

function InboxBadge() {
  const { data: count } = useUnreadCount();

  if (!count || count === 0) return null;

  return (
    <span className='text-xs flex h-5 min-w-5 items-center justify-center rounded-full bg-[oklch(70%_0.15_350)] px-1.5 font-medium text-white'>
      {count > 99 ? '99+' : count}
    </span>
  );
}

/* ════════════════════════════════════════════════════════
   DeptAvatar — 20x20, rounded 5px, distinct colors
   ════════════════════════════════════════════════════════ */

function DeptAvatar({ abbr, color }: { abbr: string; color: string | null }) {
  return (
    <span
      data-slot='avatar'
      className='relative flex size-5 shrink-0 overflow-hidden rounded-[5px]'
      style={{ backgroundColor: color || DEPT_COLORS[abbr] || '#6b7280' }}
      aria-hidden='true'
    >
      <span
        data-slot='avatar-fallback'
        className='flex size-full items-center justify-center rounded-[5px] !text-[10px] font-semibold uppercase leading-none text-white'
      >
        {abbr}
      </span>
    </span>
  );
}

type DefaultTaskTypeScope = 'lists' | 'folders' | 'spaces';

type DefaultTaskTypeContext = {
  scope: DefaultTaskTypeScope;
  entityId: string;
  spaceId: string;
  currentId: string | null;
};

function DefaultTaskTypeSubmenu({
  scope,
  entityId,
  spaceId,
  currentId,
  onOpenCustomTaskTypes,
}: DefaultTaskTypeContext & {
  onOpenCustomTaskTypes?: (spaceId?: string) => void;
}) {
  const queryClient = useQueryClient();
  const { notification } = useNotification();
  const currentWorkspace = useWorkspaceStore((s) => s.currentWorkspace);
  const typesQuery = useWorkspaceTaskTypes(currentWorkspace?.id);
  const updateProcess = useUpdateProcess(scope === 'lists' ? entityId : '');
  const updateArea = useUpdateArea(scope === 'folders' ? entityId : '');
  const updateDept = useUpdateDepartment(scope === 'spaces' ? entityId : '');

  const types = typesQuery.data ?? [];
  const isPending =
    updateProcess.isPending || updateArea.isPending || updateDept.isPending;

  function apply(next: string | null) {
    if (next === currentId) return;
    const handlers = {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: SIDEBAR_TREE_KEY });
        notification({
          title: 'Tipo padrão atualizado',
          description: next
            ? 'Novo tipo definido como padrão.'
            : 'Padrão removido.',
          status: 'success',
        });
      },
      onError: () =>
        notification({
          title: 'Erro',
          description: 'Falha ao atualizar tipo padrão.',
          status: 'error',
        }),
    };
    if (scope === 'lists') {
      updateProcess.mutate({ defaultTaskTypeId: next }, handlers);
    } else if (scope === 'folders') {
      updateArea.mutate({ defaultTaskTypeId: next }, handlers);
    } else {
      updateDept.mutate({ defaultTaskTypeId: next }, handlers);
    }
  }

  const itemBase =
    'relative flex items-center gap-2 rounded-sm px-2 py-1 text-[12px] outline-hidden select-none cursor-pointer ' +
    'hover:bg-accent focus:bg-accent focus:text-accent-foreground ' +
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50';

  return (
    <Dropdown.MenuSubContent className='!shadow-lg z-50 max-h-72 min-w-[180px] !animate-none !gap-0 overflow-y-auto !rounded-md !border !border-border !bg-popover !p-1 !text-popover-foreground !ring-0'>
      <Dropdown.Item
        onSelect={(e) => {
          e.preventDefault();
          apply(null);
        }}
        disabled={isPending}
        className={itemBase}
      >
        <span className='flex-1 text-muted-foreground'>Nenhum</span>
      </Dropdown.Item>

      <Dropdown.Separator className='-mx-1 my-1 h-px bg-border' />

      {typesQuery.isLoading && (
        <div className='px-2 py-1 text-[12px] text-muted-foreground'>
          Carregando...
        </div>
      )}
      {!typesQuery.isLoading && types.length === 0 && (
        <div className='px-2 py-1 text-[12px] text-muted-foreground'>
          Nenhum tipo cadastrado
        </div>
      )}
      {types.map((t) => {
        const Icon = getIconByName(t.icon);
        const selected = currentId === t.id;
        return (
          <Dropdown.Item
            key={t.id}
            onSelect={(e) => {
              e.preventDefault();
              apply(t.id);
            }}
            disabled={isPending}
            className={cn(itemBase, selected && 'bg-accent/50')}
          >
            <Icon
              className={cn(
                'size-3.5 shrink-0',
                selected ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-hidden
            />
            <span className='flex-1 truncate font-medium tracking-tight'>
              {t.value}
            </span>
            {selected && (
              <Check className='text-primary size-3.5 shrink-0' aria-hidden />
            )}
          </Dropdown.Item>
        );
      })}

      {onOpenCustomTaskTypes && (
        <>
          <Dropdown.Separator className='-mx-1 my-1 h-px bg-border' />
          <Dropdown.Item
            onSelect={(e) => {
              e.preventDefault();
              onOpenCustomTaskTypes(spaceId);
            }}
            className={cn(itemBase, 'text-muted-foreground')}
          >
            <Plus className='size-3.5 shrink-0' aria-hidden />
            <span className='flex-1'>Criar tipo</span>
          </Dropdown.Item>
        </>
      )}
    </Dropdown.MenuSubContent>
  );
}

/* ════════════════════════════════════════════════════════
   ItemOptionsMenu — shared rich dropdown for dept/area/process
   ════════════════════════════════════════════════════════ */

function ItemOptionsMenu({
  onRename,
  onEditStatus,
  onOpenCustomTaskTypes,
  onOpenCustomFields,
  onDelete,
  onOpenSettings,
  deleteDisabled,
  defaultTaskType,
}: {
  onRename: () => void;
  onEditStatus: () => void;
  onOpenCustomTaskTypes: (spaceId?: string) => void;
  onOpenCustomFields: () => void;
  onDelete: () => void;
  onOpenSettings?: () => void;
  deleteDisabled?: boolean;
  defaultTaskType: DefaultTaskTypeContext;
}) {
  return (
    <Dropdown.Content
      side='bottom'
      align='start'
      alignOffset={0}
      sideOffset={8}
      collisionPadding={8}
      avoidCollisions
      className='shadow-md w-[275px] !animate-none !rounded-lg border border-border bg-popover px-2 py-2 text-popover-foreground'
    >
      <Dropdown.Item
        onSelect={onRename}
        className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
      >
        <RiEditLine className='size-4 shrink-0' />
        Renomear
      </Dropdown.Item>
      <Dropdown.Separator className='my-1 h-px bg-border' />
      <Dropdown.Item
        onSelect={onEditStatus}
        className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
      >
        <RiSettings3Line className='size-4 shrink-0' />
        Editar status
      </Dropdown.Item>
      <Dropdown.Item
        onSelect={() => onOpenCustomTaskTypes(defaultTaskType.spaceId)}
        className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
      >
        <RiStackLine className='size-4 shrink-0' />
        Tipos de Tarefas
      </Dropdown.Item>
      <Dropdown.Item
        onSelect={onOpenCustomFields}
        className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
      >
        <RiEqualizerLine className='size-4 shrink-0' />
        Campos personalizados
      </Dropdown.Item>
      <Dropdown.MenuSub>
        <Dropdown.MenuSubTrigger className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'>
          <RiListCheck3 className='size-4 shrink-0' />
          Tipo padrão
        </Dropdown.MenuSubTrigger>
        <DefaultTaskTypeSubmenu
          {...defaultTaskType}
          onOpenCustomTaskTypes={onOpenCustomTaskTypes}
        />
      </Dropdown.MenuSub>
      <Dropdown.Separator className='my-1 h-px bg-border' />
      <Dropdown.Item
        onSelect={onDelete}
        disabled={deleteDisabled}
        className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
      >
        <RiDeleteBinLine className='size-4 shrink-0' />
        Excluir
      </Dropdown.Item>
      <Dropdown.Separator className='my-1 h-px bg-border' />
      <div className='flex h-12 w-full items-center px-1'>
        <button
          type='button'
          onClick={onOpenSettings}
          disabled={!onOpenSettings}
          className='shadow-xs inline-flex h-9 w-full cursor-pointer items-center justify-start gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-medium leading-5 text-white transition-all hover:opacity-90 disabled:opacity-50'
          style={{ backgroundColor: '#000' }}
        >
          <RiTeamLine className='size-4 shrink-0 text-white' />
          Compartilhamento e permissões
        </button>
      </div>
    </Dropdown.Content>
  );
}

/* ════════════════════════════════════════════════════════
   ProcessItem — process row with hover "..." dropdown
   ════════════════════════════════════════════════════════ */

function ProcessItem({
  process,
  href,
  active,
  spaceId,
  isRenaming,
  onStartRename,
  onCancelRename,
  onDelete,
  onInvalidateSidebar,
  onOpenCustomTaskTypes,
  onOpenCustomFields,
  onOpenListStatusConfig,
}: {
  process: SidebarProcess;
  href: string;
  active: boolean;
  spaceId: string;
  isRenaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  onInvalidateSidebar: () => void;
  onOpenCustomTaskTypes: (spaceId?: string) => void;
  onOpenCustomFields: () => void;
  onOpenListStatusConfig: (process: SidebarProcess) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <div
      data-active={active || undefined}
      className='group/lists relative overflow-hidden rounded-md transition-colors duration-150 hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium'
    >
      {isRenaming ? (
        <div className='flex h-7 min-w-0 flex-1 items-center px-2'>
          <InlineRenameInput
            currentName={process.name}
            entityId={process.id}
            entityType='list'
            onCancel={onCancelRename}
            onInvalidateSidebar={onInvalidateSidebar}
          />
        </div>
      ) : (
        <Link
          href={href}
          data-slot='sidebar-menu-sub-button'
          data-sidebar='menu-sub-button'
          data-size='md'
          data-active={active || undefined}
          className='flex h-7 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 text-[14px] leading-5 text-sidebar-foreground transition-colors data-[active=true]:font-medium'
        >
          <span className='relative shrink-0'>
            <List
              className='lucide lucide-list size-4 shrink-0 text-muted-foreground'
              strokeWidth={2}
              aria-hidden
            />
          </span>
          {process.isPrivate && (
            <Lock
              className='size-3 shrink-0 text-muted-foreground'
              aria-hidden
            />
          )}
          <span className='min-w-0 flex-1 truncate group-hover/lists:w-[calc(100%-54px)]'>
            {process.name}
          </span>
        </Link>
      )}
      {!isRenaming && (
        <div className='absolute right-0 top-0 z-10 flex h-full items-center gap-1 pr-1 opacity-0 group-hover/lists:opacity-100'>
          <Dropdown.Root>
            <Dropdown.Trigger asChild>
              <button
                type='button'
                className='absolute right-1 top-[4px] flex aspect-square w-5 items-center justify-center rounded-sm p-0 text-muted-foreground hover:bg-accent'
                aria-label={`Opcoes de ${process.name}`}
              >
                <RiMoreLine className='size-4' />
              </button>
            </Dropdown.Trigger>
            <ItemOptionsMenu
              onRename={onStartRename}
              onEditStatus={() => onOpenListStatusConfig(process)}
              onOpenCustomTaskTypes={onOpenCustomTaskTypes}
              onOpenCustomFields={onOpenCustomFields}
              onDelete={onDelete}
              onOpenSettings={() => setSettingsOpen(true)}
              defaultTaskType={{
                scope: 'lists',
                entityId: process.id,
                spaceId,
                currentId: process.defaultTaskTypeId,
              }}
            />
          </Dropdown.Root>
        </div>
      )}
      <ScopeSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        scope='lists'
        id={process.id}
        name={process.name}
      />
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   AreaItem — collapsible area inside a department
   ════════════════════════════════════════════════════════ */

function AreaItem({
  area,
  deptSlug,
  spaceId,
  pathname,
  isOpen,
  onToggle,
  isRenaming,
  onStartRename,
  onCancelRename,
  onDelete,
  renamingProcessId,
  onStartRenameProcess,
  onCancelRenameProcess,
  onDeleteProcess,
  addingProcess,
  onStartAddProcess,
  onCancelAddProcess,
  onCreateProcess,
  isCreatingProcess,
  onInvalidateSidebar,
  onOpenCreateProcessDialog: _onOpenCreateProcessDialog,
  onOpenStatusConfig,
  onOpenListStatusConfig,
  onOpenCustomTaskTypes,
  onOpenCustomFields,
}: {
  area: SidebarArea;
  deptSlug: string;
  spaceId: string;
  pathname: string;
  isOpen: boolean;
  onToggle: () => void;
  isRenaming: boolean;
  onStartRename: () => void;
  onCancelRename: () => void;
  onDelete: () => void;
  renamingProcessId: string | null;
  onStartRenameProcess: (id: string) => void;
  onCancelRenameProcess: () => void;
  onDeleteProcess: (id: string, name: string) => void;
  addingProcess: boolean;
  onStartAddProcess: () => void;
  onCancelAddProcess: () => void;
  onCreateProcess: (name: string, folderId: string) => void;
  isCreatingProcess: boolean;
  onInvalidateSidebar: () => void;
  onOpenCreateProcessDialog: (ctx: {
    folderId: string;
    parentName: string;
  }) => void;
  onOpenStatusConfig: (area: SidebarArea) => void;
  onOpenListStatusConfig: (ctx: {
    process: SidebarProcess;
    parentName: string;
  }) => void;
  onOpenCustomTaskTypes: (spaceId?: string) => void;
  onOpenCustomFields: () => void;
}) {
  const areaExact = pathname === `/d/${deptSlug}/a/${area.slug}`;
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (o !== isOpen) onToggle();
      }}
    >
      <div
        data-active={areaExact || undefined}
        className='group/folders relative overflow-hidden rounded-md transition-colors duration-150 hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium'
      >
        {isRenaming ? (
          <div className='flex h-7 min-w-0 flex-1 items-center px-2'>
            <InlineRenameInput
              currentName={area.name}
              entityId={area.id}
              entityType='area'
              onCancel={onCancelRename}
              onInvalidateSidebar={onInvalidateSidebar}
            />
          </div>
        ) : (
          <Link
            href={`/d/${deptSlug}/a/${area.slug}`}
            data-slot='sidebar-menu-sub-button'
            data-sidebar='menu-sub-button'
            data-size='md'
            data-active={areaExact || undefined}
            className='flex h-7 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md px-2 text-[14px] leading-5 text-sidebar-foreground transition-colors data-[active=true]:font-medium'
          >
            <span
              role='button'
              tabIndex={0}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Recolher' : 'Expandir'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle();
                }
              }}
              className='relative flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded transition-colors group-hover/folders:bg-sidebar-accent'
            >
              <span className='absolute inset-0 flex items-center justify-center transition-opacity group-hover/folders:opacity-0'>
                {isOpen ? (
                  <FolderOpen
                    className='size-4 text-muted-foreground'
                    aria-hidden
                  />
                ) : (
                  <Folder
                    className='size-4 text-muted-foreground'
                    aria-hidden
                  />
                )}
              </span>
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-all duration-200 ease-out group-hover/folders:opacity-100',
                  isOpen && 'rotate-90',
                )}
                aria-hidden
              />
            </span>
            {area.isPrivate && (
              <Lock
                className='size-3 shrink-0 text-muted-foreground'
                aria-hidden
              />
            )}
            <span className='flex-1 truncate group-hover/folders:w-[calc(100%-68px)]'>
              {area.name}
            </span>
          </Link>
        )}
        {!isRenaming && (
          <div className='absolute right-0 top-0 z-10 flex h-full items-center gap-0.5 pr-1 opacity-0 group-hover/folders:opacity-100'>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className='absolute right-7 top-[4px] flex aspect-square w-5 items-center justify-center rounded-sm p-0 text-muted-foreground hover:bg-accent'
                  aria-label={`Opcoes de ${area.name}`}
                >
                  <RiMoreLine className='size-4' />
                </button>
              </Dropdown.Trigger>
              <ItemOptionsMenu
                onRename={onStartRename}
                onEditStatus={() => onOpenStatusConfig(area)}
                onOpenCustomTaskTypes={onOpenCustomTaskTypes}
                onOpenCustomFields={onOpenCustomFields}
                onDelete={onDelete}
                deleteDisabled={area.isDefault}
                onOpenSettings={() => setSettingsOpen(true)}
                defaultTaskType={{
                  scope: 'folders',
                  entityId: area.id,
                  spaceId,
                  currentId: area.defaultTaskTypeId,
                }}
              />
            </Dropdown.Root>
            <button
              type='button'
              onClick={() => {
                onStartAddProcess();
                if (!isOpen) onToggle();
              }}
              className='absolute right-1 top-[4px] flex aspect-square w-5 items-center justify-center rounded-sm p-0 text-muted-foreground hover:bg-accent'
              aria-label={`Adicionar em ${area.name}`}
            >
              <RiAddLine className='size-4' />
            </button>
          </div>
        )}
      </div>
      <Collapsible.Content className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        <ul className='ml-4 flex min-w-0 flex-col'>
          {area.processes.map((process) => {
            const processHref =
              process.featureRoute || `/d/${deptSlug}/p/${process.slug}`;
            const active = isProcessActive(process, deptSlug, pathname);
            return (
              <li
                key={process.id}
                className='relative ml-[2px] border-l border-sidebar-border'
              >
                <ProcessItem
                  process={process}
                  href={processHref}
                  active={active}
                  spaceId={spaceId}
                  isRenaming={renamingProcessId === process.id}
                  onStartRename={() => onStartRenameProcess(process.id)}
                  onCancelRename={onCancelRenameProcess}
                  onDelete={() => onDeleteProcess(process.id, process.name)}
                  onInvalidateSidebar={onInvalidateSidebar}
                  onOpenCustomTaskTypes={onOpenCustomTaskTypes}
                  onOpenCustomFields={onOpenCustomFields}
                  onOpenListStatusConfig={(p) =>
                    onOpenListStatusConfig({
                      process: p,
                      parentName: area.name,
                    })
                  }
                />
              </li>
            );
          })}
          {addingProcess && (
            <li className='relative ml-[2px] border-l border-sidebar-border'>
              <InlineCreateInput
                placeholder='Nome do processo'
                indentClass='pl-3 pr-3'
                onConfirm={(name) => onCreateProcess(name, area.id)}
                onCancel={onCancelAddProcess}
                isPending={isCreatingProcess}
              />
            </li>
          )}
        </ul>
      </Collapsible.Content>
      <ScopeSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        scope='folders'
        id={area.id}
        name={area.name}
      />
    </Collapsible.Root>
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
  onOpenAreaStatusConfig,
  onOpenListStatusConfig,
  onDeleteDept,
  addingAreaForDeptId,
  onStartAddArea: _onStartAddArea,
  onCancelAddArea,
  onCreateArea,
  isCreatingArea,
  renamingAreaId,
  onStartRenameArea,
  onCancelRenameArea,
  onDeleteArea,
  renamingProcessId,
  onStartRenameProcess,
  onCancelRenameProcess,
  onDeleteProcess,
  addingProcessForAreaId,
  onStartAddProcess,
  onCancelAddProcess,
  onCreateProcess,
  isCreatingProcess,
  onInvalidateSidebar,
  onOpenCreateAreaDialog,
  onOpenCreateProcessDialog,
  onOpenCustomTaskTypes,
  onOpenCustomFields,
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
  onOpenAreaStatusConfig: (ctx: {
    area: SidebarArea;
    dept: SidebarDepartment;
  }) => void;
  onOpenListStatusConfig: (ctx: {
    process: SidebarProcess;
    parentName: string;
  }) => void;
  onDeleteDept: (id: string, name: string, isProtected: boolean) => void;
  addingAreaForDeptId: string | null;
  onStartAddArea: (deptId: string) => void;
  onCancelAddArea: () => void;
  onCreateArea: (name: string, spaceId: string) => void;
  isCreatingArea: boolean;
  renamingAreaId: string | null;
  onStartRenameArea: (id: string) => void;
  onCancelRenameArea: () => void;
  onDeleteArea: (id: string, name: string, isDefault: boolean) => void;
  renamingProcessId: string | null;
  onStartRenameProcess: (id: string) => void;
  onCancelRenameProcess: () => void;
  onDeleteProcess: (id: string, name: string) => void;
  addingProcessForAreaId: string | null;
  onStartAddProcess: (folderId: string) => void;
  onCancelAddProcess: () => void;
  onCreateProcess: (name: string, folderId: string) => void;
  isCreatingProcess: boolean;
  onInvalidateSidebar: () => void;
  onOpenCreateAreaDialog: (spaceId: string, spaceName: string) => void;
  onOpenCreateProcessDialog: (ctx: {
    folderId: string;
    parentName: string;
  }) => void;
  onOpenCustomTaskTypes: (spaceId?: string) => void;
  onOpenCustomFields: () => void;
}) {
  const { toggleArea } = useSidebarStore();
  const abbr = getAbbr(dept.name);
  const isRenamingThis = renamingDeptId === dept.id;
  const deptExact = pathname === `/d/${dept.slug}`;
  const [settingsOpen, setSettingsOpen] = useState(false);

  if (!isExpanded) {
    return (
      <Tooltip.Root>
        <Tooltip.Trigger asChild>
          <button
            type='button'
            onClick={onToggle}
            className={cn(
              'flex w-full items-center justify-center rounded-lg p-2 transition-colors',
              isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent',
            )}
          >
            <DeptAvatar abbr={abbr} color={dept.color} />
          </button>
        </Tooltip.Trigger>
        <Tooltip.Content side='right'>{dept.name}</Tooltip.Content>
      </Tooltip.Root>
    );
  }

  return (
    <Collapsible.Root
      open={isOpen}
      onOpenChange={(o) => {
        if (o !== isOpen) onToggle();
      }}
    >
      <div
        data-active={deptExact || undefined}
        className='group/spaces relative overflow-hidden rounded-md transition-colors duration-150 hover:bg-sidebar-accent data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium'
      >
        {isRenamingThis ? (
          <div className='flex h-7 min-w-0 flex-1 items-center gap-2 px-2'>
            <DeptAvatar abbr={abbr} color={dept.color} />
            <InlineRenameInput
              currentName={dept.name}
              entityId={dept.id}
              entityType='dept'
              onCancel={onCancelRenameDept}
              onInvalidateSidebar={onInvalidateSidebar}
            />
          </div>
        ) : (
          <Link
            href={`/d/${dept.slug}`}
            data-slot='sidebar-menu-button'
            data-sidebar='menu-button'
            data-active={deptExact || undefined}
            className='peer/menu-button flex h-7 w-full cursor-pointer items-center gap-2 overflow-hidden rounded-md p-2 text-left text-[14px] leading-5 text-sidebar-foreground transition-colors data-[active=true]:font-medium'
          >
            <span
              role='button'
              tabIndex={0}
              aria-expanded={isOpen}
              aria-label={isOpen ? 'Recolher' : 'Expandir'}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggle();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggle();
                }
              }}
              className='relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-[5px] transition-colors group-hover/spaces:bg-sidebar-accent'
            >
              <span className='absolute inset-0 transition-opacity group-hover/spaces:opacity-0'>
                <DeptAvatar abbr={abbr} color={dept.color} />
              </span>
              <ChevronRight
                className={cn(
                  'h-4 w-4 shrink-0 opacity-0 transition-all duration-200 ease-out group-hover/spaces:opacity-100',
                  isOpen && 'rotate-90',
                )}
                aria-hidden
              />
            </span>
            <span className='flex-1 truncate group-hover/spaces:w-[calc(100%-54px)]'>
              {dept.name}
            </span>
          </Link>
        )}
        {!isRenamingThis && (
          <div className='absolute right-0 top-0 z-10 flex h-full items-center gap-0.5 pr-1 opacity-0 group-hover/spaces:opacity-100'>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className='absolute right-7 top-[4px] flex aspect-square w-5 items-center justify-center rounded-sm p-0 text-muted-foreground hover:bg-accent'
                  aria-label={`Opcoes de ${dept.name}`}
                >
                  <RiMoreLine className='size-4' />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content
                side='bottom'
                align='start'
                alignOffset={0}
                sideOffset={8}
                collisionPadding={8}
                avoidCollisions
                className='shadow-md w-[275px] !animate-none rounded-lg border border-border bg-popover px-2 py-2 text-popover-foreground'
              >
                <Dropdown.Item
                  onSelect={() => onStartRenameDept(dept.id)}
                  className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
                >
                  <RiEditLine className='size-4 shrink-0' />
                  Renomear
                </Dropdown.Item>
                <Dropdown.Separator className='my-1 h-px bg-border' />
                <Dropdown.Item
                  onSelect={() => onOpenStatusConfig(dept.id)}
                  className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
                >
                  <RiSettings3Line className='size-4 shrink-0' />
                  Editar status
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={() => onOpenCustomTaskTypes(dept.id)}
                  className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
                >
                  <RiStackLine className='size-4 shrink-0' />
                  Tipos de Tarefas
                </Dropdown.Item>
                <Dropdown.Item
                  onSelect={onOpenCustomFields}
                  className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground'
                >
                  <RiEqualizerLine className='size-4 shrink-0' />
                  Campos personalizados
                </Dropdown.Item>
                <Dropdown.MenuSub>
                  <Dropdown.MenuSubTrigger className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground'>
                    <RiListCheck3 className='size-4 shrink-0' />
                    Tipo padrão
                  </Dropdown.MenuSubTrigger>
                  <DefaultTaskTypeSubmenu
                    scope='spaces'
                    entityId={dept.id}
                    spaceId={dept.id}
                    currentId={dept.defaultTaskTypeId}
                    onOpenCustomTaskTypes={onOpenCustomTaskTypes}
                  />
                </Dropdown.MenuSub>
                <Dropdown.Separator className='my-1 h-px bg-border' />
                <Dropdown.Item
                  onSelect={() =>
                    onDeleteDept(dept.id, dept.name, dept.isProtected)
                  }
                  disabled={dept.isProtected}
                  className='text-sm flex h-7 w-full cursor-default select-none items-center gap-2 rounded-[6px] px-2 py-1.5 font-normal leading-5 outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                >
                  <RiDeleteBinLine className='size-4 shrink-0' />
                  Excluir
                </Dropdown.Item>
                <Dropdown.Separator className='my-1 h-px bg-border' />
                <div className='flex h-12 w-full items-center px-1'>
                  <button
                    type='button'
                    onClick={() => setSettingsOpen(true)}
                    className='shadow-xs inline-flex h-9 w-full cursor-pointer items-center justify-start gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-[14px] font-medium leading-5 text-white transition-all hover:opacity-90'
                    style={{ backgroundColor: '#000' }}
                  >
                    <RiTeamLine className='size-4 shrink-0 text-white' />
                    Compartilhamento e permissões
                  </button>
                </div>
              </Dropdown.Content>
            </Dropdown.Root>
            <Dropdown.Root>
              <Dropdown.Trigger asChild>
                <button
                  type='button'
                  className='absolute right-1 top-[4px] flex aspect-square w-5 items-center justify-center rounded-sm p-0 text-muted-foreground hover:bg-accent'
                  aria-label={`Adicionar em ${dept.name}`}
                >
                  <RiAddLine className='size-4' />
                </button>
              </Dropdown.Trigger>
              <Dropdown.Content align='end' className='w-44'>
                <Dropdown.Item
                  onSelect={() => onOpenCreateAreaDialog(dept.id, dept.name)}
                >
                  <Dropdown.ItemIcon as={RiFolderLine} />
                  Area (Pasta)
                </Dropdown.Item>
              </Dropdown.Content>
            </Dropdown.Root>
          </div>
        )}
      </div>
      <Collapsible.Content className='overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down'>
        <ul className='ml-4 flex min-w-0 flex-col'>
          {/* Direct processes (sem area) */}
          {(dept.directProcesses ?? []).map((process) => {
            const processHref =
              process.featureRoute || `/d/${dept.slug}/p/${process.slug}`;
            const active = isProcessActive(process, dept.slug, pathname);
            return (
              <li
                key={process.id}
                className='relative ml-[2px] border-l border-sidebar-border'
              >
                <ProcessItem
                  process={process}
                  href={processHref}
                  active={active}
                  spaceId={dept.id}
                  isRenaming={renamingProcessId === process.id}
                  onStartRename={() => onStartRenameProcess(process.id)}
                  onCancelRename={onCancelRenameProcess}
                  onDelete={() => onDeleteProcess(process.id, process.name)}
                  onInvalidateSidebar={onInvalidateSidebar}
                  onOpenCustomTaskTypes={onOpenCustomTaskTypes}
                  onOpenCustomFields={onOpenCustomFields}
                  onOpenListStatusConfig={(p) =>
                    onOpenListStatusConfig({
                      process: p,
                      parentName: dept.name,
                    })
                  }
                />
              </li>
            );
          })}
          {/* Areas */}
          {dept.areas.map((area) => (
            <li
              key={area.id}
              className='relative ml-[2px] border-l border-sidebar-border'
            >
              <AreaItem
                area={area}
                deptSlug={dept.slug}
                spaceId={dept.id}
                pathname={pathname}
                isOpen={expandedAreas[area.id] !== false}
                onToggle={() => toggleArea(area.id)}
                isRenaming={renamingAreaId === area.id}
                onStartRename={() => onStartRenameArea(area.id)}
                onCancelRename={onCancelRenameArea}
                onDelete={() =>
                  onDeleteArea(area.id, area.name, area.isDefault)
                }
                renamingProcessId={renamingProcessId}
                onStartRenameProcess={onStartRenameProcess}
                onCancelRenameProcess={onCancelRenameProcess}
                onDeleteProcess={onDeleteProcess}
                addingProcess={addingProcessForAreaId === area.id}
                onStartAddProcess={() => onStartAddProcess(area.id)}
                onCancelAddProcess={onCancelAddProcess}
                onCreateProcess={onCreateProcess}
                isCreatingProcess={isCreatingProcess}
                onInvalidateSidebar={onInvalidateSidebar}
                onOpenCreateProcessDialog={onOpenCreateProcessDialog}
                onOpenStatusConfig={(a) =>
                  onOpenAreaStatusConfig({ area: a, dept })
                }
                onOpenListStatusConfig={onOpenListStatusConfig}
                onOpenCustomTaskTypes={onOpenCustomTaskTypes}
                onOpenCustomFields={onOpenCustomFields}
              />
            </li>
          ))}
          {addingAreaForDeptId === dept.id && (
            <li className='relative ml-[2px] border-l border-sidebar-border'>
              <InlineCreateInput
                placeholder='Nome da area'
                indentClass='pl-3 pr-2'
                onConfirm={(name) => onCreateArea(name, dept.id)}
                onCancel={onCancelAddArea}
                isPending={isCreatingArea}
              />
            </li>
          )}
        </ul>
      </Collapsible.Content>
      <ScopeSettingsModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        scope='spaces'
        id={dept.id}
        name={dept.name}
      />
    </Collapsible.Root>
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
        className='h-6 w-full min-w-0 flex-1 rounded border border-border bg-background px-1.5 text-[13px] text-foreground outline-none placeholder:text-muted-foreground focus:border-ring disabled:opacity-50'
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
  entityType: 'dept' | 'area' | 'list';
  onCancel: () => void;
  onInvalidateSidebar: () => void;
}) {
  const [value, setValue] = useState(currentName);
  const inputRef = useRef<HTMLInputElement>(null);
  const { notification } = useNotification();

  const updateDept = useUpdateDepartment(entityType === 'dept' ? entityId : '');
  const updateArea = useUpdateArea(entityType === 'area' ? entityId : '');
  const updateProcess = useUpdateProcess(entityType === 'list' ? entityId : '');

  const isPending =
    updateDept.isPending || updateArea.isPending || updateProcess.isPending;

  const label =
    entityType === 'dept'
      ? 'Departamento'
      : entityType === 'area'
        ? 'Area'
        : 'Processo';

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

    const mutation =
      entityType === 'dept'
        ? updateDept
        : entityType === 'area'
          ? updateArea
          : updateProcess;
    mutation.mutate(
      { name: trimmed },
      {
        onSuccess: () => {
          notification({
            title: 'Sucesso',
            description: `${label} renomeado(a).`,
            status: 'success',
          });
          onInvalidateSidebar();
          onCancel();
        },
        onError: () => {
          notification({
            title: 'Erro',
            description: `Falha ao renomear ${label.toLowerCase()}.`,
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
      className='h-5 min-w-0 flex-1 rounded border border-border bg-background px-1.5 text-[13px] text-foreground outline-none focus:border-ring disabled:opacity-50'
    />
  );
}
