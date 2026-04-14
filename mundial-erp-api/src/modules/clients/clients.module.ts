import { Module } from '@nestjs/common';
import { ClientsRepository } from './clients.repository';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';

@Module({
  controllers: [ClientsController],
  providers: [ClientsRepository, ClientsService],
  exports: [ClientsService, ClientsRepository],
})
export class ClientsModule {}
