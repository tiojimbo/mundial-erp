import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import {
  ATTACHMENT_MAX_SIZE_BYTES,
  ATTACHMENT_MIME_WHITELIST_REGEX,
} from './signed-url-request.dto';

export class RegisterAttachmentDto {
  @ApiProperty({ example: 'relatorio.pdf' })
  @IsString()
  @MaxLength(255)
  filename!: string;

  @ApiProperty({ example: 'application/pdf' })
  @IsString()
  @Matches(ATTACHMENT_MIME_WHITELIST_REGEX)
  mimeType!: string;

  @ApiProperty({ example: 102_400 })
  @IsInt()
  @Min(1)
  @Max(ATTACHMENT_MAX_SIZE_BYTES)
  sizeBytes!: number;

  @ApiProperty({
    example: 'ws_123/wi_456/abc-relatorio.pdf',
    description:
      'StorageKey retornado pela signed URL request — deve bater com o request prévio.',
  })
  @IsString()
  @MaxLength(512)
  storageKey!: string;
}
