import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from './workspaces.repository';
import { WorkspaceUsersController } from './members/workspace-users.controller';
import { MembersService } from './members/members.service';
import { MembersRepository } from './members/members.repository';
import { WorkspaceGuard } from './guards/workspace.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WorkspacesController, WorkspaceUsersController],
  providers: [
    WorkspacesService,
    WorkspacesRepository,
    MembersService,
    MembersRepository,
    WorkspaceGuard,
  ],
  exports: [
    WorkspacesService,
    WorkspacesRepository,
    MembersRepository,
    WorkspaceGuard,
  ],
})
export class WorkspacesModule {}
