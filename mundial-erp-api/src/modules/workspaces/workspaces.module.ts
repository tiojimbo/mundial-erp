import { Module } from '@nestjs/common';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesRepository } from './workspaces.repository';
import { MembersController } from './members/members.controller';
import { MembersService } from './members/members.service';
import { MembersRepository } from './members/members.repository';
import { InvitesController } from './invites/invites.controller';
import { InvitesService } from './invites/invites.service';
import { InvitesRepository } from './invites/invites.repository';
import { WorkspaceGuard } from './guards/workspace.guard';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WorkspacesController, MembersController, InvitesController],
  providers: [
    WorkspacesService,
    WorkspacesRepository,
    MembersService,
    MembersRepository,
    InvitesService,
    InvitesRepository,
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
