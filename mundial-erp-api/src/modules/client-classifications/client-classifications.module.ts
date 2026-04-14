import { Module } from '@nestjs/common';
import { ClientClassificationsController } from './client-classifications.controller';
import { ClientClassificationsService } from './client-classifications.service';
import { ClientClassificationsRepository } from './client-classifications.repository';

@Module({
  controllers: [ClientClassificationsController],
  providers: [ClientClassificationsService, ClientClassificationsRepository],
  exports: [ClientClassificationsService, ClientClassificationsRepository],
})
export class ClientClassificationsModule {}
