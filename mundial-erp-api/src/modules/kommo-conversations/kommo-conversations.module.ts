/**
 * KommoConversationsModule
 *
 * Expoe `KommoConversationsService` + `KommoConversationsRepository` para
 * consumo pelos handlers do Mateus (`kommo-workers/handlers/`) e, em
 * futuras rodadas, pelos adapters do squad-dashboards.
 *
 * Observacao: NAO ha controller nesta rodada — o acesso web do usuario a
 * "lista de conversas" e via adapter do dashboard, nao via endpoint
 * dedicado. Se em algum Sprint posterior aparecer uma tela
 * "Conversas Kommo", um controller pode ser adicionado aqui.
 */

import { Module } from '@nestjs/common';
import { KommoConversationsRepository } from './kommo-conversations.repository';
import { KommoConversationsService } from './kommo-conversations.service';

@Module({
  providers: [KommoConversationsRepository, KommoConversationsService],
  exports: [KommoConversationsRepository, KommoConversationsService],
})
export class KommoConversationsModule {}
