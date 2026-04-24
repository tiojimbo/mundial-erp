/**
 * TaskSseBusModule — provider compartilhado entre `TasksModule` e
 * `TaskOutboxModule`.
 *
 * Criamos um modulo dedicado para evitar dependencia circular: o worker do
 * outbox (em `TaskOutboxModule`) precisa `publish` no bus, e o controller
 * SSE (em `TasksModule`) precisa `subscribe` nele. Ambos importam este
 * modulo, que expoe o simbolo DI `TASK_SSE_BUS` mapeado para `LocalEmitterBus`.
 *
 * Alternativa considerada: `forwardRef(() => TasksModule)` no TaskOutboxModule.
 * Rejeitada por adicionar carga mental no leitor e acoplar o worker ao
 * modulo de fachada inteiro quando so precisa do bus. Um modulo shim e mais
 * limpo e permite substituir `LocalEmitterBus` por Redis-backed impl no
 * futuro sem tocar nem TasksModule nem TaskOutboxModule.
 */

import { Module } from '@nestjs/common';
import { LocalEmitterBus } from './local-emitter.bus';
import { TASK_SSE_BUS } from './task-sse-bus.interface';

@Module({
  providers: [
    LocalEmitterBus,
    { provide: TASK_SSE_BUS, useExisting: LocalEmitterBus },
  ],
  exports: [TASK_SSE_BUS, LocalEmitterBus],
})
export class TaskSseBusModule {}
