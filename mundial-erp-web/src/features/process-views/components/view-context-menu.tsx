'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  RiStarLine,
  RiPencilLine,
  RiLinkM,
  RiSettings3Line,
  RiArrowRightSLine,
  RiPushpinLine,
  RiHome2Line,
  RiEyeOffLine,
  RiShieldLine,
  RiStackLine,
  RiSaveLine,
  RiFileCopyLine,
  RiDeleteBin6Line,
  RiShareLine,
  type RemixiconComponentType,
} from '@remixicon/react';

export type ViewContextMenuState = {
  open: boolean;
  x: number;
  y: number;
  viewId: string | null;
};

type ViewContextMenuProps = {
  state: ViewContextMenuState;
  onOpenChange: (open: boolean) => void;
  onRename?: () => void;
  onCopyLink?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  canDelete?: boolean;
  isPinned?: boolean;
  onTogglePinned?: (value: boolean) => void;
  isDefault?: boolean;
  onToggleDefault?: (value: boolean) => void;
  isPrivate?: boolean;
  onTogglePrivate?: (value: boolean) => void;
  isProtected?: boolean;
  onToggleProtected?: (value: boolean) => void;
  groupByType?: boolean;
  onToggleGroupByType?: (value: boolean) => void;
  autoSave?: boolean;
  onToggleAutoSave?: (value: boolean) => void;
};

function MenuItem({
  icon: Icon,
  label,
  trailing,
  muted = false,
  destructive = false,
  disabled = false,
  onClick,
}: {
  icon: RemixiconComponentType;
  label: string;
  trailing?: React.ReactNode;
  muted?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  const textClass = disabled
    ? 'text-[oklch(0.556_0_0)] opacity-50 cursor-not-allowed'
    : destructive
      ? 'text-[#dc2626]'
      : muted
        ? 'text-[oklch(0.556_0_0)]'
        : 'text-[oklch(0.145_0_0)]';
  const iconClass = disabled
    ? 'text-[oklch(0.556_0_0)] opacity-50'
    : destructive
      ? 'text-[#dc2626]'
      : 'text-[oklch(0.556_0_0)]';
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none transition-colors ${textClass} ${
        disabled ? '' : 'hover:bg-[oklch(0.97_0_0)]'
      } ${destructive && !disabled ? 'hover:bg-[oklch(0.97_0.03_25)]' : ''}`}
    >
      <Icon className={`size-4 ${iconClass}`} />
      <span className="flex-1 text-left">{label}</span>
      {trailing}
    </button>
  );
}

function ToggleItem({
  icon: Icon,
  label,
  checked,
  onToggle,
}: {
  icon: RemixiconComponentType;
  label: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!checked)}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-[oklch(0.145_0_0)] outline-none transition-colors hover:bg-[oklch(0.97_0_0)]"
    >
      <Icon className="size-4 text-[oklch(0.556_0_0)]" />
      <span className="flex-1 text-left">{label}</span>
      <span
        data-state={checked ? 'checked' : 'unchecked'}
        className="peer pointer-events-none inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-[oklch(0.145_0_0)] data-[state=unchecked]:bg-[oklch(0.922_0_0)]"
      >
        <span
          data-state={checked ? 'checked' : 'unchecked'}
          className="pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0"
        />
      </span>
    </button>
  );
}

export function ViewContextMenu({
  state,
  onOpenChange,
  onRename,
  onCopyLink,
  onDuplicate,
  onDelete,
  canDelete = false,
  isPinned = false,
  onTogglePinned,
  isDefault = false,
  onToggleDefault,
  isPrivate = false,
  onTogglePrivate,
  isProtected = false,
  onToggleProtected,
  groupByType = false,
  onToggleGroupByType,
  autoSave = true,
  onToggleAutoSave,
}: ViewContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!state.open) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onOpenChange(false);
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [state.open, onOpenChange]);

  if (!mounted || !state.open) return null;

  function runAndClose(fn?: () => void) {
    return () => {
      fn?.();
      onOpenChange(false);
    };
  }

  const menu = (
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[9999] w-56 rounded-md border border-[oklch(0.922_0_0)] bg-white p-0 text-[oklch(0.145_0_0)] shadow-md outline-none"
      style={{ left: state.x, top: state.y }}
    >
      {/* Section 1 */}
      <div className="p-1">
        <MenuItem
          icon={RiStarLine}
          label="Favoritar"
          trailing={
            <RiArrowRightSLine className="size-3.5 text-[oklch(0.556_0_0)]" />
          }
        />
        <MenuItem
          icon={RiPencilLine}
          label="Renomear"
          onClick={runAndClose(onRename)}
        />
        <MenuItem
          icon={RiLinkM}
          label="Copiar link da view"
          onClick={runAndClose(onCopyLink)}
        />
        <MenuItem
          icon={RiSettings3Line}
          label="Personalizar view"
          trailing={
            <RiArrowRightSLine className="size-3.5 text-[oklch(0.556_0_0)]" />
          }
        />
      </div>

      <div className="border-t border-[oklch(0.922_0_0)]" />

      {/* Section 2: view attributes */}
      <div className="p-1">
        <ToggleItem
          icon={RiPushpinLine}
          label="Fixar view"
          checked={isPinned}
          onToggle={(v) => onTogglePinned?.(v)}
        />
        <ToggleItem
          icon={RiHome2Line}
          label="View padrão"
          checked={isDefault}
          onToggle={(v) => onToggleDefault?.(v)}
        />
        <ToggleItem
          icon={RiEyeOffLine}
          label="View privada"
          checked={isPrivate}
          onToggle={(v) => onTogglePrivate?.(v)}
        />
        <ToggleItem
          icon={RiShieldLine}
          label="Proteger view"
          checked={isProtected}
          onToggle={(v) => onToggleProtected?.(v)}
        />
      </div>

      <div className="border-t border-[oklch(0.922_0_0)]" />

      {/* Section 3: behavior */}
      <div className="p-1">
        <ToggleItem
          icon={RiStackLine}
          label="Agrupar por tipo"
          checked={groupByType}
          onToggle={(v) => onToggleGroupByType?.(v)}
        />
        <ToggleItem
          icon={RiSaveLine}
          label="Auto-save"
          checked={autoSave}
          onToggle={(v) => onToggleAutoSave?.(v)}
        />
      </div>

      <div className="border-t border-[oklch(0.922_0_0)]" />

      {/* Section 4: duplicate */}
      <div className="p-1">
        <MenuItem
          icon={RiFileCopyLine}
          label="Duplicar view"
          onClick={runAndClose(onDuplicate)}
        />
      </div>

      <div className="border-t border-[oklch(0.922_0_0)]" />

      {/* Section 5: destructive (admin-only) */}
      <div className="p-1">
        <MenuItem
          icon={RiDeleteBin6Line}
          label="Excluir view"
          destructive={canDelete}
          muted={!canDelete}
          disabled={!canDelete}
          onClick={runAndClose(onDelete)}
        />
      </div>

      <div className="border-t border-[oklch(0.922_0_0)]">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 px-3 py-2.5 text-[13px] font-medium text-[oklch(0.556_0_0)] transition-colors hover:bg-[oklch(0.97_0_0)] hover:text-[oklch(0.145_0_0)]"
        >
          <RiShareLine className="size-3.5" />
          Compartilhamento e Permissões
        </button>
      </div>
    </div>
  );

  return createPortal(menu, document.body);
}
