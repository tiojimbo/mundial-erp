import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, Min, MaxLength } from 'class-validator';

/**
 * MIME whitelist (PLANO §8.10).
 *
 * Padroes aceitos:
 *   - image/* (qualquer subtype)
 *   - application/pdf
 *   - text/* (qualquer subtype)
 *   - video/mp4 (explicito)
 *
 * A validacao de magic number acontece pos-upload no ClamAV worker (TODO).
 */
export const ATTACHMENT_MIME_WHITELIST_REGEX =
  /^(image\/[\w.+-]+|application\/pdf|text\/[\w.+-]+|video\/mp4)$/;

/** Tamanho maximo em bytes. 25MB = 26_214_400. */
export const ATTACHMENT_MAX_SIZE_BYTES = 25 * 1024 * 1024;

export class SignedUrlRequestDto {
  @ApiProperty({ example: 'relatorio.pdf', maxLength: 255 })
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @Matches(ATTACHMENT_MIME_WHITELIST_REGEX, {
    message:
      'mimeType fora da whitelist (image/*, application/pdf, text/*, video/mp4)',
  })
  mimeType!: string;

  @ApiProperty({ example: 102_400, maximum: ATTACHMENT_MAX_SIZE_BYTES })
  @IsInt()
  @Min(1)
  @Max(ATTACHMENT_MAX_SIZE_BYTES)
  sizeBytes!: number;
}
