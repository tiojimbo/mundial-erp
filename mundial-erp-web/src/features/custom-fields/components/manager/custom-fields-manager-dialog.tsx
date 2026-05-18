'use client';

import { useMemo } from 'react';
import * as Modal from '@/components/ui/modal';
import { useCustomFieldsManager } from '../../hooks/use-custom-field-definitions';
import {
  useCustomFieldsManagerState,
  viewToScope,
  type ManagerView,
} from '../../hooks/use-custom-fields-manager-state';
import { ManagerSidebar } from './manager-sidebar';
import { ManagerFieldsTable } from './manager-fields-table';
import { ManagerFieldDetailSidebar } from './manager-field-detail-sidebar';
import { ManagerCreateFieldPanel } from './manager-create-field-panel';
import { ManagerNewGroupDialog } from './manager-new-group-dialog';

interface CustomFieldsManagerDialogProps {
  open: boolean;
  onClose: () => void;
  initialView?: ManagerView;
}

export function CustomFieldsManagerDialog({
  open,
  onClose,
  initialView,
}: CustomFieldsManagerDialogProps) {
  const {
    state,
    setView,
    selectDef,
    openCreate,
    closeCreate,
    openNewGroup,
    closeNewGroup,
    setSearchTerm,
    setTypeFilter,
  } = useCustomFieldsManagerState({ initialView });

  const { scope, targetId } = viewToScope(state.view);
  const managerQuery = useCustomFieldsManager(scope, targetId);

  const selectedDef = useMemo(() => {
    if (!state.selectedDefId) return null;
    return (
      managerQuery.data?.find((item) => item.id === state.selectedDefId) ??
      null
    );
  }, [managerQuery.data, state.selectedDefId]);

  return (
    <>
      <Modal.Root open={open} onOpenChange={(next) => !next && onClose()}>
        <Modal.Content
          showClose={false}
          className="!w-[95vw] !max-w-[95vw] flex h-[90vh] max-h-[90vh] flex-col overflow-hidden !rounded-lg border p-0"
        >
          <Modal.Title className="sr-only">
            Campos personalizados
          </Modal.Title>
          <div className="flex h-full min-h-0 w-full">
            <ManagerSidebar view={state.view} onChangeView={setView} />
            <ManagerFieldsTable
              view={state.view}
              searchTerm={state.searchTerm}
              typeFilter={state.typeFilter}
              selectedDefId={state.selectedDefId}
              onSelectDef={selectDef}
              onChangeSearchTerm={setSearchTerm}
              onChangeTypeFilter={setTypeFilter}
              onOpenCreate={openCreate}
              onOpenNewGroup={openNewGroup}
              onClose={onClose}
            />
            {state.createOpen && state.createType ? (
              <ManagerCreateFieldPanel
                type={state.createType}
                view={state.view}
                onClose={closeCreate}
              />
            ) : (
              <ManagerFieldDetailSidebar
                def={selectedDef}
                onDeleted={() => selectDef(null)}
                onClose={() => selectDef(null)}
              />
            )}
          </div>
        </Modal.Content>
      </Modal.Root>

      <ManagerNewGroupDialog
        open={state.newGroupOpen}
        onClose={closeNewGroup}
      />
    </>
  );
}
