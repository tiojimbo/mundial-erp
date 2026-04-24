import { PartialType } from '@nestjs/swagger';
import { CreateTemplateDto } from './create-template.dto';

/**
 * Update de template — todos os campos opcionais via `PartialType`. Validacao
 * profunda do `payload` (quando enviado) passa pelo mesmo pipe da criacao.
 */
export class UpdateTemplateDto extends PartialType(CreateTemplateDto) {}
