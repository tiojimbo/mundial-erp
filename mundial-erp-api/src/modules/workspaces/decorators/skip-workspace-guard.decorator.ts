import { SetMetadata } from '@nestjs/common';

/**
 * Marker decorator that signals to WorkspaceGuard (provided by Larissa)
 * that the current handler/controller does not require an active workspace
 * context in the JWT payload.
 *
 * Use this on endpoints whose purpose is exactly to manage the workspace
 * context itself (list workspaces, create workspace, select workspace,
 * accept invite via token).
 */
export const SKIP_WORKSPACE_GUARD_KEY = 'skipWorkspaceGuard';
export const SkipWorkspaceGuard = () =>
  SetMetadata(SKIP_WORKSPACE_GUARD_KEY, true);
