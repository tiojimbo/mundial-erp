/**
 * KommoMessagesModule
 *
 * Expoe `KommoMessagesService` + `KommoMessagesRepository` para consumo
 * pelos handlers do Mateus. Sem controller — acesso via adapter dashboard.
 */

import { Module } from '@nestjs/common';
import { KommoMessagesRepository } from './kommo-messages.repository';
import { KommoMessagesService } from './kommo-messages.service';

@Module({
  providers: [KommoMessagesRepository, KommoMessagesService],
  exports: [KommoMessagesRepository, KommoMessagesService],
})
export class KommoMessagesModule {}
