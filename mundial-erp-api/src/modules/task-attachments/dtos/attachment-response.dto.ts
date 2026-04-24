import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type ScanStatus = 'PENDING' | 'CLEAN' | 'INFECTED' | 'ERROR';

export interface AttachmentShape {
  id: string;
  workItemId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
  scanStatus: string;
  uploadedBy: string;
  createdAt: Date;
  deletedAt: Date | null;
}

export class AttachmentResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  workItemId!: string;

  @ApiProperty()
  filename!: string;

  @ApiProperty()
  mimeType!: string;

  @ApiProperty()
  sizeBytes!: number;

  @ApiProperty({
    enum: ['PENDING', 'CLEAN', 'INFECTED', 'ERROR'],
    description:
      'Download liberado APENAS quando scanStatus=CLEAN (PLANO §8.10).',
  })
  scanStatus!: string;

  @ApiProperty()
  uploadedBy!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'URL absoluta nao exposta; use GET /task-attachments/:id/download-url.',
  })
  downloadAvailable!: boolean;

  static fromEntity(entity: AttachmentShape): AttachmentResponseDto {
    const dto = new AttachmentResponseDto();
    dto.id = entity.id;
    dto.workItemId = entity.workItemId;
    dto.filename = entity.filename;
    dto.mimeType = entity.mimeType;
    dto.sizeBytes = entity.sizeBytes;
    dto.scanStatus = entity.scanStatus;
    dto.uploadedBy = entity.uploadedBy;
    dto.createdAt = entity.createdAt;
    dto.downloadAvailable = entity.scanStatus === 'CLEAN';
    return dto;
  }
}

export class SignedUrlResponseDto {
  @ApiProperty({ description: 'PUT signed URL (TTL 300s)' })
  url!: string;

  @ApiProperty()
  storageKey!: string;

  @ApiProperty()
  expiresAt!: Date;
}

export class DownloadUrlResponseDto {
  @ApiProperty({ description: 'GET signed URL (TTL 300s)' })
  url!: string;

  @ApiProperty()
  expiresAt!: Date;
}
