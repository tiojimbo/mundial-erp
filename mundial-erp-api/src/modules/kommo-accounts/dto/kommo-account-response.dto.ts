import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KommoAccount, KommoAccountStatus, KommoAuthType } from '@prisma/client';

/**
 * Shape publico de um `KommoAccount` — NUNCA expoe tokens ou hmacSecret
 * (principio #13 squad-kommo, ADR-004 §2.1 invariante P0).
 *
 * `fromEntity` aceita a linha do Prisma inteira mas projeta apenas os
 * campos seguros. Se o Prisma adicionar colunas novas, este DTO NAO herda
 * automaticamente — auditoria explicita por campo.
 */
export class KommoAccountResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({
    example: 'mundialtelhas',
    description: 'Subdomain Kommo do tenant.',
  })
  subdomain!: string;

  @ApiProperty({
    enum: KommoAuthType,
    description:
      'Modo de autenticacao. OAUTH2 em producao, LONG_LIVED_TOKEN em dev (ADR-004).',
  })
  authType!: KommoAuthType;

  @ApiProperty({
    enum: KommoAccountStatus,
    description:
      'Estado operacional. ACTIVE = usavel; TOKEN_EXPIRED/REVOKED/SUSPENDED = leitura so.',
  })
  status!: KommoAccountStatus;

  @ApiPropertyOptional({
    description: 'Ultima vez que a account foi reconciliada com sucesso.',
    nullable: true,
  })
  lastSyncAt!: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  static fromEntity(entity: KommoAccount): KommoAccountResponseDto {
    const dto = new KommoAccountResponseDto();
    dto.id = entity.id;
    dto.subdomain = entity.subdomain;
    dto.authType = entity.authType;
    dto.status = entity.status;
    dto.lastSyncAt = entity.lastSyncAt;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}
