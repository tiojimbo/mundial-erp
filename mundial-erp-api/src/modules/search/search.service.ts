import { Injectable, Logger } from '@nestjs/common';
import { SearchRepository } from './search.repository';
import { SearchDataRepository } from './search-data.repository';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchHitDto, SearchResultDto } from './dto/search-result.dto';
import {
  ENTITY_INDEX_MAP,
  ALL_INDICES,
  SearchEntityType,
  CIRCUIT_BREAKER_THRESHOLD,
  CIRCUIT_BREAKER_RESET_MS,
} from './search.constants';

type CircuitState = 'closed' | 'open' | 'half-open';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  // Circuit breaker state
  private circuitState: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;

  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly dataRepository: SearchDataRepository,
  ) {}

  /**
   * Main search: tries Elasticsearch first, falls back to PostgreSQL.
   */
  async search(dto: SearchQueryDto): Promise<SearchResultDto> {
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker OPEN — using PostgreSQL fallback');
      return this.fallbackSearch(dto);
    }

    try {
      const indices = this.resolveIndices(dto.type);
      const result = await this.searchRepository.search(
        indices,
        dto.q,
        dto.from,
        dto.size,
      );

      this.onSuccess();

      const items = result.hits.map((hit) => SearchHitDto.fromEsHit(hit));
      return SearchResultDto.create(items, result.total);
    } catch (error) {
      this.onFailure(error as Error);
      this.logger.warn(
        `ES search failed, falling back to PostgreSQL: ${(error as Error).message}`,
      );
      return this.fallbackSearch(dto);
    }
  }

  /**
   * Elasticsearch cluster health (delegates to repository).
   */
  async health() {
    return this.searchRepository.clusterHealth();
  }

  /**
   * Fallback: ILIKE search on PostgreSQL (slower but functional).
   */
  private async fallbackSearch(dto: SearchQueryDto): Promise<SearchResultDto> {
    const skip = dto.from;
    const take = dto.size;
    const items: SearchHitDto[] = [];
    let totalCount = 0;

    const shouldSearch = (type: SearchEntityType) =>
      dto.type === 'all' || dto.type === type;

    if (shouldSearch('clients')) {
      const { items: rows, total } = await this.dataRepository.searchClients(dto.q, skip, take);
      totalCount += total;
      for (const row of rows) {
        const hit = new SearchHitDto();
        hit.id = row.id;
        hit.entityType = 'clients';
        hit.index = 'mundial_clients';
        hit.score = 0;
        hit.source = { name: row.name, tradeName: row.tradeName, cpfCnpj: row.cpfCnpj, email: row.email, phone: row.phone, city: row.city };
        items.push(hit);
      }
    }

    if (shouldSearch('products')) {
      const { items: rows, total } = await this.dataRepository.searchProducts(dto.q, skip, take);
      totalCount += total;
      for (const row of rows) {
        const hit = new SearchHitDto();
        hit.id = row.id;
        hit.entityType = 'products';
        hit.index = 'mundial_products';
        hit.score = 0;
        hit.source = { name: row.name, code: row.code, barcode: row.barcode };
        items.push(hit);
      }
    }

    if (shouldSearch('orders')) {
      const { items: rows, total } = await this.dataRepository.searchOrders(dto.q, skip, take);
      totalCount += total;
      for (const row of rows) {
        const hit = new SearchHitDto();
        hit.id = row.id;
        hit.entityType = 'orders';
        hit.index = 'mundial_orders';
        hit.score = 0;
        hit.source = {
          orderNumber: row.orderNumber,
          title: row.title,
          clientName: row.client?.name ?? null,
          status: row.status,
        };
        items.push(hit);
      }
    }

    if (shouldSearch('invoices')) {
      const { items: rows, total } = await this.dataRepository.searchInvoices(dto.q, skip, take);
      totalCount += total;
      for (const row of rows) {
        const hit = new SearchHitDto();
        hit.id = row.id;
        hit.entityType = 'invoices';
        hit.index = 'mundial_invoices';
        hit.score = 0;
        hit.source = {
          invoiceNumber: row.invoiceNumber,
          accessKey: row.accessKey,
          clientName: row.client?.name ?? null,
        };
        items.push(hit);
      }
    }

    if (shouldSearch('suppliers')) {
      const { items: rows, total } = await this.dataRepository.searchSuppliers(dto.q, skip, take);
      totalCount += total;
      for (const row of rows) {
        const hit = new SearchHitDto();
        hit.id = row.id;
        hit.entityType = 'suppliers';
        hit.index = 'mundial_suppliers';
        hit.score = 0;
        hit.source = { name: row.name, tradeName: row.tradeName, cpfCnpj: row.cpfCnpj, email: row.email };
        items.push(hit);
      }
    }

    return SearchResultDto.create(items, totalCount);
  }

  // -- Circuit breaker logic --

  private resolveIndices(type: string): string[] {
    if (type === 'all') return [...ALL_INDICES];
    const index = ENTITY_INDEX_MAP[type as SearchEntityType];
    return index ? [index] : [...ALL_INDICES];
  }

  private isCircuitOpen(): boolean {
    if (this.circuitState === 'closed') return false;
    if (this.circuitState === 'open') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= CIRCUIT_BREAKER_RESET_MS) {
        this.circuitState = 'half-open';
        this.logger.log('Circuit breaker → HALF-OPEN (attempting ES again)');
        return false;
      }
      return true;
    }
    // half-open: allow one attempt
    return false;
  }

  private onSuccess(): void {
    if (this.circuitState !== 'closed') {
      this.logger.log('Circuit breaker → CLOSED (ES recovered)');
    }
    this.circuitState = 'closed';
    this.failureCount = 0;
  }

  private onFailure(error: Error): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.logger.warn(
      `ES failure ${this.failureCount}/${CIRCUIT_BREAKER_THRESHOLD}: ${error.message}`,
    );
    if (this.failureCount >= CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitState = 'open';
      this.logger.error('Circuit breaker → OPEN (ES unreachable)');
    }
  }
}
