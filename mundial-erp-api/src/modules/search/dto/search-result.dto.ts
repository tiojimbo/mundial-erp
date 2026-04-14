import { ApiProperty } from '@nestjs/swagger';

export class SearchHitDto {
  @ApiProperty({ description: 'ID da entidade' })
  id: string;

  @ApiProperty({ description: 'Tipo da entidade', example: 'clients' })
  entityType: string;

  @ApiProperty({ description: 'Nome do índice ES' })
  index: string;

  @ApiProperty({ description: 'Score de relevância' })
  score: number;

  @ApiProperty({ description: 'Campos do documento' })
  source: Record<string, unknown>;

  static fromEsHit(hit: {
    _id: string;
    _index: string;
    _score: number | null;
    _source?: Record<string, unknown>;
  }): SearchHitDto {
    const dto = new SearchHitDto();
    dto.id = hit._id;
    dto.index = hit._index;
    dto.score = hit._score ?? 0;
    dto.source = hit._source ?? {};
    dto.entityType = SearchHitDto.indexToType(hit._index);
    return dto;
  }

  private static indexToType(index: string): string {
    const map: Record<string, string> = {
      mundial_clients: 'clients',
      mundial_products: 'products',
      mundial_orders: 'orders',
      mundial_invoices: 'invoices',
      mundial_suppliers: 'suppliers',
    };
    return map[index] ?? 'unknown';
  }
}

export class SearchResultDto {
  items: SearchHitDto[];
  total: number;

  static create(items: SearchHitDto[], total: number): SearchResultDto {
    const dto = new SearchResultDto();
    dto.items = items;
    dto.total = total;
    return dto;
  }
}
