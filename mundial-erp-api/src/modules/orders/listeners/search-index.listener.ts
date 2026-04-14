import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Listener: order.created / order.updated / order.deleted
 *
 * Re-emite eventos para o Squad Search indexar no Elasticsearch.
 * Mantido como bridge separada para desacoplamento.
 */
@Injectable()
export class SearchIndexListener {
  private readonly logger = new Logger(SearchIndexListener.name);

  constructor(private readonly eventEmitter: EventEmitter2) {}

  @OnEvent('order.created')
  handleCreated(event: { orderId: string; orderNumber?: string }) {
    this.logger.debug(`Indexando order.created: ${event.orderId}`);
    this.eventEmitter.emit('search.index', {
      entity: 'order',
      action: 'created',
      entityId: event.orderId,
    });
  }

  @OnEvent('order.updated')
  handleUpdated(event: { orderId: string }) {
    this.logger.debug(`Indexando order.updated: ${event.orderId}`);
    this.eventEmitter.emit('search.index', {
      entity: 'order',
      action: 'updated',
      entityId: event.orderId,
    });
  }

  @OnEvent('order.deleted')
  handleDeleted(event: { orderId: string }) {
    this.logger.debug(`Indexando order.deleted: ${event.orderId}`);
    this.eventEmitter.emit('search.index', {
      entity: 'order',
      action: 'deleted',
      entityId: event.orderId,
    });
  }
}
