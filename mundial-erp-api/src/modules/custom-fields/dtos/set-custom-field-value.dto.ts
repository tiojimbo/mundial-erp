import { ApiProperty } from '@nestjs/swagger';
import { IsDefined } from 'class-validator';

/**
 * Body do PATCH /tasks/:id/custom-fields/:definitionId.
 *
 * O tipo do `value` depende do `CustomFieldType` da definition referenciada.
 * Aceitamos `unknown` aqui porque o despacho de validacao acontece no service
 * apos carregar a definition — class-validator nao consegue avaliar
 * cross-record. Aceitar `null` permite limpar o valor (apenas se `required=false`).
 */
export class SetCustomFieldValueDto {
  @ApiProperty({
    description:
      'Valor a persistir. Tipo dispatcheado pelo CustomFieldType da definition.',
    oneOf: [
      { type: 'string' },
      { type: 'number' },
      { type: 'boolean' },
      { type: 'null' },
    ],
  })
  @IsDefined()
  value!: unknown;
}
