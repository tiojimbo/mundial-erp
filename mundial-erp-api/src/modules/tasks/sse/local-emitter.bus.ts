/**
 * LocalEmitterBus — implementacao in-process do `TaskSseBus` (PLANO-TASKS §7.5).
 *
 * Usa `EventEmitter2` ja registrado globalmente em `app.module.ts`
 * (EventEmitterModule.forRoot). Channel key: `task.sse.<taskId>` — namespacing
 * explicito para isolar de outros eventos emitidos por outros modulos.
 *
 * Escopo: single-instance. Em deploy multi-replica, eventos publicados em uma
 * replica nao chegam em subscribers de outra. Para a Sprint 8+ avaliar
 * substituicao por Redis Pub/Sub atraves do mesmo `TaskSseBus` interface —
 * consumidores (controller + worker) nao precisam mudar.
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  TaskSseBus,
  TaskSseHandler,
  TaskSseServerEvent,
} from './task-sse-bus.interface';

/** Prefixo canonico do canal EventEmitter2 por task. */
const CHANNEL_PREFIX = 'task.sse';

function channelKey(taskId: string): string {
  return `${CHANNEL_PREFIX}.${taskId}`;
}

@Injectable()
export class LocalEmitterBus implements TaskSseBus {
  private readonly logger = new Logger(LocalEmitterBus.name);

  constructor(private readonly emitter: EventEmitter2) {}

  subscribe(taskId: string, handler: TaskSseHandler): () => void {
    const key = channelKey(taskId);
    // Adapter tipado: EventEmitter2 entrega o payload como `unknown`; aqui
    // assumimos o contrato `TaskSseServerEvent` porque a unica origem de
    // publish e o worker do outbox, que usa este mesmo modulo.
    const listener = (payload: TaskSseServerEvent): void => handler(payload);
    this.emitter.on(key, listener);
    return () => {
      this.emitter.off(key, listener);
    };
  }

  publish(taskId: string, event: TaskSseServerEvent): void {
    const key = channelKey(taskId);
    try {
      this.emitter.emit(key, event);
    } catch (err) {
      // EventEmitter2 nao deveria lancar em emit, mas mantemos guard para
      // nao derrubar o caller (worker do outbox).
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.warn(
        `LocalEmitterBus.publish falhou para taskId=${taskId} eventType=${event.type}: ${msg}`,
      );
    }
  }
}
