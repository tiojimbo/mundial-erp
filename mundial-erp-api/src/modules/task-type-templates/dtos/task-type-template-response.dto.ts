import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomFieldType } from '@prisma/client';

/**
 * Categoria de anexo configurada no template (PLANO §"Modelo de Dados → M2"
 * → `attachmentCategories Json?`).
 *
 * O backend nao valida o conteudo deste JSON em runtime — confiamos no
 * formato do seed (`{slug, label, required, mimeWhitelist?}`). O frontend
 * (M4) consome esta lista para renderizar chips de categoria. Mantemos o
 * tipo aqui como `Record<string, unknown>[]` no DTO para nao acoplar a
 * camada de leitura ao schema do seed; futuros valores extras nao quebram
 * o contrato.
 */
export interface TaskTypeTemplateAttachmentCategory {
  slug: string;
  label: string;
  required: boolean;
  mimeWhitelist?: string[];
}

/**
 * Definicao embutida de um custom field referenciado pelo template.
 *
 * NUNCA exponha `workspaceId` da definition aqui — esta projecao serve
 * todos os callers (incluindo cross-tenant seria errado mostrar). Para
 * o detalhe completo (com workspaceId), o cliente bate em
 * `GET /custom-field-definitions/:id` que aplica regras de exposicao
 * contextuais no proprio M1.
 */
export class TaskTypeTemplateFieldDefinitionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ enum: CustomFieldType, enumName: 'CustomFieldType' })
  type!: CustomFieldType;

  @ApiProperty()
  required!: boolean;

  @ApiPropertyOptional({ nullable: true })
  config!: Record<string, unknown> | null;

  @ApiProperty()
  sortOrder!: number;

  @ApiProperty()
  isBuiltin!: boolean;
}

/**
 * Entrada do array `fields` no template — ordenada por `sortOrder` asc.
 * `requiredOverride` permite o template forcar campo como obrigatorio
 * mesmo quando `definition.required = false` (PLANO M2 schema).
 */
export class TaskTypeTemplateFieldDto {
  @ApiProperty()
  definitionId!: string;

  @ApiProperty()
  sortOrder!: number;

  @ApiPropertyOptional({ nullable: true })
  requiredOverride!: boolean | null;

  @ApiProperty({ type: TaskTypeTemplateFieldDefinitionDto })
  definition!: TaskTypeTemplateFieldDefinitionDto;
}

/**
 * Response DTO de `TaskTypeTemplate` (read-only nesta sprint).
 *
 * Regras de exposicao (PLANO §"Boundaries de modulo backend",
 * §"Anti-patterns" 99-referencia 829-846):
 *   - `workspaceId` do template NUNCA e exposto (template e gerenciado por
 *     1:1 com CustomTaskType — workspaceId derivado).
 *   - `workspaceId` da `CustomFieldDefinition` referenciada NUNCA e exposto
 *     aqui — projecao reduzida em `TaskTypeTemplateFieldDefinitionDto`.
 *   - Campos JSON (`attachmentCategories`, `defaultDescriptionBlocks`)
 *     passam direto, mas com tipos `Record<string, unknown>` para nao
 *     comprometer o backend a um formato concreto (frontend valida).
 */
export class TaskTypeTemplateResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  customTaskTypeId!: string;

  @ApiPropertyOptional({
    description:
      'Categorias de anexo configuradas no template (slug, label, required, mimeWhitelist).',
    type: 'array',
    items: { type: 'object' },
    nullable: true,
  })
  attachmentCategories!: TaskTypeTemplateAttachmentCategory[] | null;

  @ApiPropertyOptional({
    description:
      'BlockNote AST default aplicado a `markdownContent` quando a task ' +
      'e criada via tipo com template e o cliente nao envia descricao.',
    type: Object,
    nullable: true,
  })
  defaultDescriptionBlocks!: Record<string, unknown> | null;

  @ApiProperty({ type: [TaskTypeTemplateFieldDto] })
  fields!: TaskTypeTemplateFieldDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  /**
   * Constroi o DTO a partir do entity Prisma incluindo `fields.definition`.
   * O input e tipado como uma forma minima compativel com o `findFirst`
   * do repository — evita acoplar a tipos gerados do Prisma neste arquivo
   * (mantem o DTO importavel sem o cliente Prisma carregar).
   */
  static fromEntity(entity: {
    id: string;
    customTaskTypeId: string;
    attachmentCategories: unknown;
    defaultDescriptionBlocks: unknown;
    createdAt: Date;
    updatedAt: Date;
    fields: Array<{
      definitionId: string;
      sortOrder: number;
      requiredOverride: boolean | null;
      definition: {
        id: string;
        key: string;
        label: string;
        type: CustomFieldType;
        required: boolean;
        config: unknown;
        sortOrder: number;
        isBuiltin: boolean;
      };
    }>;
  }): TaskTypeTemplateResponseDto {
    const dto = new TaskTypeTemplateResponseDto();
    dto.id = entity.id;
    dto.customTaskTypeId = entity.customTaskTypeId;
    dto.attachmentCategories = parseAttachmentCategories(
      entity.attachmentCategories,
    );
    dto.defaultDescriptionBlocks = parseRecord(entity.defaultDescriptionBlocks);
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.fields = entity.fields.map((f) => {
      const fieldDto = new TaskTypeTemplateFieldDto();
      fieldDto.definitionId = f.definitionId;
      fieldDto.sortOrder = f.sortOrder;
      fieldDto.requiredOverride = f.requiredOverride;
      const defDto = new TaskTypeTemplateFieldDefinitionDto();
      defDto.id = f.definition.id;
      defDto.key = f.definition.key;
      defDto.label = f.definition.label;
      defDto.type = f.definition.type;
      defDto.required = f.definition.required;
      defDto.config = parseRecord(f.definition.config);
      defDto.sortOrder = f.definition.sortOrder;
      defDto.isBuiltin = f.definition.isBuiltin;
      fieldDto.definition = defDto;
      return fieldDto;
    });
    return dto;
  }
}

function parseRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseAttachmentCategories(
  value: unknown,
): TaskTypeTemplateAttachmentCategory[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return null;
  // Filtra entradas malformadas defensivamente — confia no seed mas nao
  // assume nada se admin futuramente abrir mutacoes.
  const out: TaskTypeTemplateAttachmentCategory[] = [];
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null) continue;
    const obj = raw as Record<string, unknown>;
    if (typeof obj.slug !== 'string' || typeof obj.label !== 'string') {
      continue;
    }
    const entry: TaskTypeTemplateAttachmentCategory = {
      slug: obj.slug,
      label: obj.label,
      required: obj.required === true,
    };
    if (Array.isArray(obj.mimeWhitelist)) {
      entry.mimeWhitelist = obj.mimeWhitelist.filter(
        (m): m is string => typeof m === 'string',
      );
    }
    out.push(entry);
  }
  return out;
}
