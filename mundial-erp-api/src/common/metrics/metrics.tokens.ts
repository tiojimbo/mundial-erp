/**
 * DI token para o `Registry` do prom-client (Sprint 5 — TTT-050).
 *
 * Mantemos UM registry por processo para evitar contadores duplicados
 * quando varios modules instanciam metricas — `prom-client` lanca se a
 * mesma metrica for registrada duas vezes no mesmo registry.
 */
export const PROM_REGISTRY = Symbol('PROM_REGISTRY');
