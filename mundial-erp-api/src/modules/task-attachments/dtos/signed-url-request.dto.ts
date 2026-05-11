import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Matches,
  Max,
  Min,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export const ATTACHMENT_MIME_WHITELIST_REGEX =
  /^(image\/[\w.+-]+|application\/pdf|text\/[\w.+-]+|video\/mp4)$/;

export const ATTACHMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

export class SignedUrlRequestDto {
  @ApiProperty({ description: 'Id da task que vai receber o anexo' })
  @IsString()
  @MaxLength(64)
  taskId!: string;

  @ApiPropertyOptional({
    example: 'relatorio.pdf',
    maxLength: 255,
    deprecated: true,
    description: 'Legacy ERP. Use `fileName` (camelCase) preferencialmente.',
  })
  @ValidateIf((o) => o.fileName === undefined)
  @IsString()
  @MaxLength(255)
  filename?: string;

  @ApiPropertyOptional({
    example: 'relatorio.pdf',
    maxLength: 255,
    description: 'Alias Hoppe-compat. Tem precedencia sobre `filename`.',
  })
  @ValidateIf((o) => o.filename === undefined)
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiPropertyOptional({
    example: 'application/pdf',
    deprecated: true,
    description: 'Legacy ERP. Use `fileType` preferencialmente.',
  })
  @ValidateIf((o) => o.fileType === undefined)
  @IsString()
  @Matches(ATTACHMENT_MIME_WHITELIST_REGEX, {
    message:
      'mimeType fora da whitelist (image/*, application/pdf, text/*, video/mp4)',
  })
  mimeType?: string;

  @ApiPropertyOptional({
    example: 'application/pdf',
    description: 'Alias Hoppe-compat. Tem precedencia sobre `mimeType`.',
  })
  @ValidateIf((o) => o.mimeType === undefined)
  @IsString()
  @Matches(ATTACHMENT_MIME_WHITELIST_REGEX, {
    message:
      'fileType fora da whitelist (image/*, application/pdf, text/*, video/mp4)',
  })
  fileType?: string;

  @ApiPropertyOptional({
    example: 102_400,
    maximum: ATTACHMENT_MAX_SIZE_BYTES,
    deprecated: true,
    description: 'Legacy ERP. Use `fileSize` preferencialmente.',
  })
  @ValidateIf((o) => o.fileSize === undefined)
  @IsInt()
  @Min(1)
  @Max(ATTACHMENT_MAX_SIZE_BYTES)
  sizeBytes?: number;

  @ApiPropertyOptional({
    example: 102_400,
    maximum: ATTACHMENT_MAX_SIZE_BYTES,
    description: 'Alias Hoppe-compat. Tem precedencia sobre `sizeBytes`.',
  })
  @ValidateIf((o) => o.sizeBytes === undefined)
  @IsInt()
  @Min(1)
  @Max(ATTACHMENT_MAX_SIZE_BYTES)
  fileSize?: number;
}

export interface NormalizedSignedUrlInput {
  taskId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export function normalizeSignedUrlInput(
  dto: SignedUrlRequestDto,
): NormalizedSignedUrlInput {
  return {
    taskId: dto.taskId,
    filename: (dto.fileName ?? dto.filename) as string,
    mimeType: (dto.fileType ?? dto.mimeType) as string,
    sizeBytes: (dto.fileSize ?? dto.sizeBytes) as number,
  };
}
