import { Module, forwardRef } from '@nestjs/common';
import { FoldersController } from './folders.controller';
import { FoldersService } from './folders.service';
import { FoldersRepository } from './folders.repository';
import { DatabaseModule } from '../../database/database.module';
import { SpacesModule } from '../spaces/spaces.module';
import { StatusModule } from '../status/status.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => SpacesModule),
    forwardRef(() => StatusModule),
  ],
  controllers: [FoldersController],
  providers: [FoldersService, FoldersRepository],
  exports: [FoldersService, FoldersRepository],
})
export class FoldersModule {}
