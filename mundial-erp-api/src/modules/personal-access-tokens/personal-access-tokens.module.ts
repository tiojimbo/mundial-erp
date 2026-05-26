import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { PersonalAccessTokensController } from './personal-access-tokens.controller';
import { PersonalAccessTokensService } from './personal-access-tokens.service';
import { PersonalAccessTokensRepository } from './personal-access-tokens.repository';
import { JwtOrPkAuthGuard } from './guards/jwt-or-pk-auth.guard';

@Module({
  imports: [UsersModule],
  controllers: [PersonalAccessTokensController],
  providers: [
    PersonalAccessTokensService,
    PersonalAccessTokensRepository,
    JwtOrPkAuthGuard,
  ],
  exports: [
    PersonalAccessTokensService,
    PersonalAccessTokensRepository,
    JwtOrPkAuthGuard,
  ],
})
export class PersonalAccessTokensModule {}
