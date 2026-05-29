import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { AvatarController } from './avatar.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { MembersRepository } from '../workspaces/members/members.repository';

@Module({
  controllers: [UsersController, AvatarController],
  providers: [UsersService, UsersRepository, MembersRepository],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
