import { Injectable, Logger } from '@nestjs/common';
import { SyncEntity } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { ProFinancasClientService } from './pro-financas/pro-financas-client.service';
import { SyncLogRepository } from './repositories/sync-log.repository';
import { SyncMappingRepository } from './repositories/sync-mapping.repository';

// Repositories from other modules
import { CompaniesRepository } from '../companies/companies.repository';
import { StatesRepository } from '../states/states.repository';
import { CitiesRepository } from '../cities/cities.repository';
import { ClientClassificationsRepository } from '../client-classifications/client-classifications.repository';
import { DeliveryRoutesRepository } from '../delivery-routes/delivery-routes.repository';
import { PaymentMethodsRepository } from '../payment-methods/payment-methods.repository';
import { CarriersRepository } from '../carriers/carriers.repository';
import { OrderTypesRepository } from '../order-types/order-types.repository';
import { OrderFlowsRepository } from '../order-flows/order-flows.repository';
import { OrderModelsRepository } from '../order-models/order-models.repository';
import { ClientsRepository } from '../clients/clients.repository';
import { OrdersRepository } from '../orders/orders.repository';

// Mappers
import { CompanyMapper } from './mappers/company.mapper';
import { CarrierMapper } from './mappers/carrier.mapper';
import { PaymentMethodMapper } from './mappers/payment-method.mapper';
import { ClientClassificationMapper } from './mappers/client-classification.mapper';
import { DeliveryRouteMapper } from './mappers/delivery-route.mapper';
import { OrderTypeMapper } from './mappers/order-type.mapper';
import { OrderFlowMapper } from './mappers/order-flow.mapper';
import { OrderModelMapper } from './mappers/order-model.mapper';
import { ClientMapper } from './mappers/client.mapper';
import { OrderMapper } from './mappers/order.mapper';

export type SyncJobType = 'reference-data' | 'clients' | 'orders' | 'all';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pfClient: ProFinancasClientService,
    private readonly syncLogRepo: SyncLogRepository,
    private readonly syncMappingRepo: SyncMappingRepository,
    private readonly companiesRepo: CompaniesRepository,
    private readonly statesRepo: StatesRepository,
    private readonly citiesRepo: CitiesRepository,
    private readonly classificationsRepo: ClientClassificationsRepository,
    private readonly deliveryRoutesRepo: DeliveryRoutesRepository,
    private readonly paymentMethodsRepo: PaymentMethodsRepository,
    private readonly carriersRepo: CarriersRepository,
    private readonly orderTypesRepo: OrderTypesRepository,
    private readonly orderFlowsRepo: OrderFlowsRepository,
    private readonly orderModelsRepo: OrderModelsRepository,
    private readonly clientsRepo: ClientsRepository,
    private readonly ordersRepo: OrdersRepository,
  ) {}

  // ── Orchestrators ─────────────────────────────────────────────────────

  /**
   * PLANO 5.3 — Sync order by dependency:
   * 1. Companies → 2. States/Cities → 3. Classifications, Routes
   * → 4. PaymentMethods, Carriers → 5. OrderTypes/Flows/Models
   * → 6. Clients → 7. Orders (with items)
   */
  async syncAll(onProgress?: (msg: string) => void): Promise<void> {
    await this.syncReferenceData(onProgress);
    await this.syncClients(onProgress);
    await this.syncOrders(onProgress);
  }

  async syncReferenceData(onProgress?: (msg: string) => void): Promise<void> {
    // Step 1: Companies
    await this.syncCompanies(onProgress);
    // Step 2: States & Cities
    await this.syncStates(onProgress);
    // Step 3: Classifications & Routes (parallel)
    await Promise.all([
      this.syncClientClassifications(onProgress),
      this.syncDeliveryRoutes(onProgress),
    ]);
    // Step 4: PaymentMethods & Carriers (parallel)
    await Promise.all([
      this.syncPaymentMethods(onProgress),
      this.syncCarriers(onProgress),
    ]);
    // Step 5: OrderTypes, OrderFlows, OrderModels (parallel)
    await Promise.all([
      this.syncOrderTypes(onProgress),
      this.syncOrderFlows(onProgress),
      this.syncOrderModels(onProgress),
    ]);
  }

  // ── Individual entity sync methods ────────────────────────────────────

  async syncCompanies(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.COMPANY);
    try {
      const pfData = await this.pfClient.listCompanies();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} companies`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            CompanyMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.COMPANY,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = CompanyMapper.toCreateInput(pf);
          const record = await this.companiesRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.COMPANY,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(`Company PF#${pf.id}: ${(err as Error).message}`);
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncStates(onProgress?: (msg: string) => void): Promise<void> {
    // States don't have their own SyncEntity enum — we sync them as part of reference-data
    const pfStates = await this.pfClient.listStates();
    onProgress?.(`Syncing ${pfStates.length} states`);

    for (const pf of pfStates) {
      const data = { name: pf.nome, uf: pf.sigla };
      const record = await this.statesRepo.upsertByProFinancasId(pf.id, data);

      // Sync cities for this state
      const pfCities = await this.pfClient.listStateCities(pf.id);
      for (const city of pfCities) {
        await this.citiesRepo.upsertByProFinancasId(city.id, {
          name: city.nome,
          state: { connect: { id: record.id } },
          ibgeCode: city.codigo_ibge || null,
        });
      }
    }
  }

  async syncClientClassifications(
    onProgress?: (msg: string) => void,
  ): Promise<void> {
    const syncLog = await this.syncLogRepo.create(
      SyncEntity.CLIENT_CLASSIFICATION,
    );
    try {
      const pfData = await this.pfClient.listClientClassifications();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} client classifications`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            ClientClassificationMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.CLIENT_CLASSIFICATION,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = ClientClassificationMapper.toCreateInput(pf);
          const record = await this.classificationsRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.CLIENT_CLASSIFICATION,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(
            `Classification PF#${pf.id}: ${(err as Error).message}`,
          );
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncDeliveryRoutes(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.DELIVERY_ROUTE);
    try {
      const pfData = await this.pfClient.listDeliveryRoutes();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} delivery routes`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            DeliveryRouteMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.DELIVERY_ROUTE,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = DeliveryRouteMapper.toCreateInput(pf);
          const record = await this.deliveryRoutesRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.DELIVERY_ROUTE,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(
            `DeliveryRoute PF#${pf.id}: ${(err as Error).message}`,
          );
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncPaymentMethods(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.PAYMENT_METHOD);
    try {
      const pfData = await this.pfClient.listPaymentMethods();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} payment methods`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            PaymentMethodMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.PAYMENT_METHOD,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = PaymentMethodMapper.toCreateInput(pf);
          const record = await this.paymentMethodsRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.PAYMENT_METHOD,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(
            `PaymentMethod PF#${pf.id}: ${(err as Error).message}`,
          );
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncCarriers(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.CARRIER);
    try {
      const pfData = await this.pfClient.listCarriers();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} carriers`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            CarrierMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.CARRIER,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = CarrierMapper.toCreateInput(pf);
          const record = await this.carriersRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.CARRIER,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(`Carrier PF#${pf.id}: ${(err as Error).message}`);
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncOrderTypes(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.ORDER_TYPE);
    try {
      const pfData = await this.pfClient.listOrderTypes();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} order types`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            OrderTypeMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.ORDER_TYPE,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = OrderTypeMapper.toCreateInput(pf);
          const record = await this.orderTypesRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.ORDER_TYPE,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(`OrderType PF#${pf.id}: ${(err as Error).message}`);
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncOrderFlows(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.ORDER_FLOW);
    try {
      const pfData = await this.pfClient.listOrderFlows();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} order flows`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            OrderFlowMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.ORDER_FLOW,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = OrderFlowMapper.toCreateInput(pf);
          const record = await this.orderFlowsRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.ORDER_FLOW,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(`OrderFlow PF#${pf.id}: ${(err as Error).message}`);
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncOrderModels(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.ORDER_MODEL);
    try {
      const pfData = await this.pfClient.listOrderModels();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} order models`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            OrderModelMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.ORDER_MODEL,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          const data = OrderModelMapper.toCreateInput(pf);
          const record = await this.orderModelsRepo.upsertByProFinancasId(
            pf.id,
            data,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.ORDER_MODEL,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(
            `OrderModel PF#${pf.id}: ${(err as Error).message}`,
          );
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncClients(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.CLIENT);
    try {
      const pfData = await this.pfClient.listClients();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} clients`);

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            ClientMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.CLIENT,
              pf.id,
              checksum,
            ))
          ) {
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          // Resolve FK references via SyncMapping
          const classificationErpId = pf.cliente_classificacao_id
            ? await this.syncMappingRepo.getMundialErpId(
                SyncEntity.CLIENT_CLASSIFICATION,
                pf.cliente_classificacao_id,
              )
            : null;

          const deliveryRouteErpId = pf.cliente_rota_entrega_id
            ? await this.syncMappingRepo.getMundialErpId(
                SyncEntity.DELIVERY_ROUTE,
                pf.cliente_rota_entrega_id,
              )
            : null;

          const mapped = ClientMapper.toMappedData(
            pf,
            classificationErpId,
            deliveryRouteErpId,
          );
          const record = await this.clientsRepo.upsertByProFinancasId(
            pf.id,
            mapped,
          );
          await this.syncMappingRepo.upsert(
            SyncEntity.CLIENT,
            pf.id,
            record.id,
            checksum,
          );
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(`Client PF#${pf.id}: ${(err as Error).message}`);
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  async syncOrders(onProgress?: (msg: string) => void): Promise<void> {
    const syncLog = await this.syncLogRepo.create(SyncEntity.ORDER);
    try {
      const pfData = await this.pfClient.listOrders();
      await this.syncLogRepo.markInProgress(syncLog.id, pfData.length);
      onProgress?.(`Syncing ${pfData.length} orders`);

      // Pre-load all FK mappings to avoid N+1 (C4 fix)
      const mappingCache = await this.buildMappingCache([
        SyncEntity.CLIENT,
        SyncEntity.COMPANY,
        SyncEntity.PAYMENT_METHOD,
        SyncEntity.CARRIER,
        SyncEntity.ORDER_TYPE,
        SyncEntity.ORDER_FLOW,
        SyncEntity.ORDER_MODEL,
      ]);

      // Pre-load system user for order creation
      const systemUser = await this.prisma.user.findFirst({
        where: { deletedAt: null },
        orderBy: { createdAt: 'asc' },
      });

      let maxOrderNumber = 0;

      for (const pf of pfData) {
        try {
          const checksum = SyncMappingRepository.computeChecksum(
            OrderMapper.checksumFields(pf),
          );
          if (
            !(await this.syncMappingRepo.hasChanged(
              SyncEntity.ORDER,
              pf.id,
              checksum,
            ))
          ) {
            if (pf.codigo > maxOrderNumber) maxOrderNumber = pf.codigo;
            await this.syncLogRepo.incrementSynced(syncLog.id);
            continue;
          }

          // Resolve FK references from pre-loaded cache
          const clientErpId =
            mappingCache.get(SyncEntity.CLIENT)?.get(pf.cliente_id) ?? null;
          if (!clientErpId) {
            this.logger.warn(
              `Order PF#${pf.id}: client PF#${pf.cliente_id} not found, skipping`,
            );
            await this.syncLogRepo.incrementFailed(syncLog.id);
            continue;
          }

          const mapped = OrderMapper.toMappedData(pf, {
            clientId: clientErpId,
            companyId: pf.empresa_id
              ? (mappingCache.get(SyncEntity.COMPANY)?.get(pf.empresa_id) ??
                null)
              : null,
            paymentMethodId: pf.pedido_forma_pagamento_id
              ? (mappingCache
                  .get(SyncEntity.PAYMENT_METHOD)
                  ?.get(pf.pedido_forma_pagamento_id) ?? null)
              : null,
            carrierId: pf.transportadora_id
              ? (mappingCache
                  .get(SyncEntity.CARRIER)
                  ?.get(pf.transportadora_id) ?? null)
              : null,
            orderTypeId: pf.pedido_tipo_id
              ? (mappingCache
                  .get(SyncEntity.ORDER_TYPE)
                  ?.get(pf.pedido_tipo_id) ?? null)
              : null,
            orderFlowId: pf.pedido_fluxo_id
              ? (mappingCache
                  .get(SyncEntity.ORDER_FLOW)
                  ?.get(pf.pedido_fluxo_id) ?? null)
              : null,
            orderModelId: pf.pedido_modelo_id
              ? (mappingCache
                  .get(SyncEntity.ORDER_MODEL)
                  ?.get(pf.pedido_modelo_id) ?? null)
              : null,
          });

          // Upsert order + items in transaction (C3 fix: atomic delete+create)
          const orderId = await this.prisma.$transaction(async (tx) => {
            const existing = await tx.order.findFirst({
              where: { proFinancasId: pf.id, deletedAt: null },
            });

            let id: string;
            if (existing) {
              const { orderNumber: _on, clientId: _ci, ...updateData } = mapped;
              await tx.order.update({
                where: { id: existing.id },
                data: updateData,
              });
              id = existing.id;
            } else {
              if (!systemUser) {
                throw new Error(
                  `No system user found — cannot create order PF#${pf.id}`,
                );
              }
              const created = await tx.order.create({
                data: {
                  ...mapped,
                  proFinancasId: pf.id,
                  createdByUserId: systemUser.id,
                },
              });
              id = created.id;
            }

            // Sync order items (PLANO 5.7: no productId, use productName)
            if (pf.itens?.length) {
              await tx.orderItem.deleteMany({ where: { orderId: id } });
              await tx.orderItem.createMany({
                data: pf.itens.map((item, i) => {
                  const itemMapped = OrderMapper.mapItem(item, i);
                  return {
                    orderId: id,
                    productId: null,
                    productName: itemMapped.productName,
                    quantity: itemMapped.quantity,
                    unitPriceCents: itemMapped.unitPriceCents,
                    discountCents: itemMapped.discountCents,
                    totalCents: itemMapped.totalCents,
                    sortOrder: itemMapped.sortOrder,
                  };
                }),
              });
            }

            return id;
          });

          await this.syncMappingRepo.upsert(
            SyncEntity.ORDER,
            pf.id,
            orderId,
            checksum,
          );
          if (pf.codigo > maxOrderNumber) maxOrderNumber = pf.codigo;
          await this.syncLogRepo.incrementSynced(syncLog.id);
        } catch (err) {
          this.logger.error(`Order PF#${pf.id}: ${(err as Error).message}`);
          await this.syncLogRepo.incrementFailed(syncLog.id);
        }
      }

      // PLANO 5.5: Update OrderSequence to avoid collision
      if (maxOrderNumber > 0) {
        await this.prisma.orderSequence.upsert({
          where: { id: 'singleton' },
          create: { id: 'singleton', lastNumber: maxOrderNumber },
          update: { lastNumber: maxOrderNumber },
        });
        this.logger.log(`OrderSequence.lastNumber set to ${maxOrderNumber}`);
      }

      await this.syncLogRepo.markSuccess(syncLog.id);
    } catch (err) {
      await this.syncLogRepo.markFailed(syncLog.id, (err as Error).message);
      throw err;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────

  /**
   * Pre-load all SyncMappings for given entities into a Map<entity, Map<pfId, erpId>>.
   * Eliminates N+1 queries when resolving FK references in batch sync.
   */
  private async buildMappingCache(
    entities: SyncEntity[],
  ): Promise<Map<SyncEntity, Map<number, string>>> {
    const cache = new Map<SyncEntity, Map<number, string>>();

    await Promise.all(
      entities.map(async (entity) => {
        const mappings = await this.syncMappingRepo.findAllByEntity(entity);
        const entityMap = new Map<number, string>();
        for (const m of mappings) {
          entityMap.set(m.proFinancasId, m.mundialErpId);
        }
        cache.set(entity, entityMap);
      }),
    );

    return cache;
  }
}
