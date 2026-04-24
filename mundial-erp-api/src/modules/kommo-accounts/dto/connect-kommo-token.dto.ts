import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * DTO do endpoint dev `POST /kommo/accounts/token` (ADR-004 §2.1).
 *
 * Recebe um long-lived token ja gerado no painel Kommo + o `hmacSecret`
 * compartilhado usado para validar webhooks (ADR-005). NAO aceita
 * `refreshToken` nem `expiresAt` — long-lived nao rotaciona (ADR-004 §2.1
 * invariante runtime).
 *
 * Os tres campos (`accessToken`, `hmacSecret`, `refreshToken` futuro)
 * serao armazenados encriptados via envelope encryption (ADR-006, futura).
 * Ate essa ADR entrar em vigor, a persistencia e em plain-text no banco —
 * documentado como TODO no service.
 */
export class ConnectKommoTokenDto {
  @ApiProperty({
    example: 'mundialtelhas',
    description:
      'Subdomain Kommo do tenant (ex.: `<sub>.kommo.com`). Apenas letras minusculas, digitos e hifens. Nao inclui dominio nem protocolo.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(63)
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/, {
    message:
      'subdomain deve conter apenas letras minusculas, digitos e hifens (entre caracteres)',
  })
  subdomain!: string;

  @ApiProperty({
    description:
      'Long-lived access token gerado manualmente pelo admin no painel Kommo. NAO e trocado por refresh — persistido como-esta (ADR-004).',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2048)
  accessToken!: string;

  @ApiProperty({
    description:
      'HMAC secret compartilhado para validar assinaturas de webhook (ADR-005). Gerado junto com o token no painel Kommo.',
  })
  @IsString()
  @MinLength(32)
  @MaxLength(512)
  hmacSecret!: string;
}
