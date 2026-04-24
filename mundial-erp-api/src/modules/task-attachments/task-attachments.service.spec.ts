/**
 * Unit tests — TaskAttachmentsService (rodavel hoje, mocka S3 adapter).
 *
 * Cobertura:
 *   - MIME whitelist: aceita image/*, application/pdf, e office docs.
 *     Rejeita application/octet-stream, application/x-msdownload, .exe etc.
 *   - Size cap: sizeBytes > 25MB → rejeita.
 *   - storageKey formato: `{workspaceId}/{workItemId}/{uuid}-{filename}` com
 *     UUID v4 prefixado para evitar colisao.
 *
 * Contract-first: TaskAttachmentsServiceStub mirrors API esperada pela
 * Beatriz. Quando o real estiver em mainline, substituir o stub por import
 * e remover a classe inline.
 */

import { BadRequestException } from '@nestjs/common';

interface S3AdapterMock {
  getSignedPutUrl: jest.Mock;
}

const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const MIME_WHITELIST: readonly string[] = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

interface SignedUrlRequest {
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

class TaskAttachmentsServiceStub {
  constructor(private readonly s3: S3AdapterMock) {}

  private uuidV4(): string {
    // Deterministic stub for tests; the real impl uses crypto.randomUUID().
    return '00000000-0000-4000-8000-000000000000';
  }

  buildStorageKey(
    workspaceId: string,
    workItemId: string,
    filename: string,
  ): string {
    const uuid = this.uuidV4();
    const safeName = filename.replace(/[^\w.\-]+/g, '_');
    return `${workspaceId}/${workItemId}/${uuid}-${safeName}`;
  }

  validateMime(mimeType: string): void {
    if (!MIME_WHITELIST.includes(mimeType)) {
      throw new BadRequestException(
        `MIME type nao permitido: ${mimeType}`,
      );
    }
  }

  validateSize(sizeBytes: number): void {
    if (sizeBytes <= 0) {
      throw new BadRequestException('sizeBytes deve ser positivo');
    }
    if (sizeBytes > MAX_SIZE_BYTES) {
      throw new BadRequestException(
        `Arquivo excede limite de 25MB (recebido: ${sizeBytes} bytes)`,
      );
    }
  }

  async issueSignedUrl(
    workspaceId: string,
    workItemId: string,
    req: SignedUrlRequest,
  ): Promise<{ uploadUrl: string; storageKey: string }> {
    this.validateMime(req.mimeType);
    this.validateSize(req.sizeBytes);
    const storageKey = this.buildStorageKey(
      workspaceId,
      workItemId,
      req.filename,
    );
    const uploadUrl = (await this.s3.getSignedPutUrl({
      key: storageKey,
      contentType: req.mimeType,
      contentLength: req.sizeBytes,
    })) as string;
    return { uploadUrl, storageKey };
  }
}

describe('TaskAttachmentsService (unit, stub)', () => {
  let s3: S3AdapterMock;
  let service: TaskAttachmentsServiceStub;

  beforeEach(() => {
    s3 = { getSignedPutUrl: jest.fn().mockResolvedValue('https://s3.mock/put') };
    service = new TaskAttachmentsServiceStub(s3);
  });

  describe('validateMime', () => {
    it.each(MIME_WHITELIST)('aceita %s', (mime) => {
      expect(() => service.validateMime(mime)).not.toThrow();
    });

    it.each([
      'application/octet-stream',
      'application/x-msdownload',
      'application/x-executable',
      'text/html',
    ])('rejeita %s', (mime) => {
      expect(() => service.validateMime(mime)).toThrow(BadRequestException);
    });
  });

  describe('validateSize', () => {
    it('aceita 1 byte (limite inferior)', () => {
      expect(() => service.validateSize(1)).not.toThrow();
    });

    it('aceita exato 25MB (26_214_400 bytes)', () => {
      expect(() => service.validateSize(25 * 1024 * 1024)).not.toThrow();
    });

    it('rejeita 25MB + 1 byte', () => {
      expect(() => service.validateSize(25 * 1024 * 1024 + 1)).toThrow(
        BadRequestException,
      );
    });

    it('rejeita 0 ou negativo', () => {
      expect(() => service.validateSize(0)).toThrow(BadRequestException);
      expect(() => service.validateSize(-1)).toThrow(BadRequestException);
    });
  });

  describe('buildStorageKey', () => {
    it('formata como {workspaceId}/{workItemId}/{uuid}-{filename}', () => {
      const key = service.buildStorageKey('ws-1', 'wi-2', 'report.pdf');
      expect(key).toBe(
        'ws-1/wi-2/00000000-0000-4000-8000-000000000000-report.pdf',
      );
    });

    it('normaliza caracteres perigosos no filename', () => {
      const key = service.buildStorageKey('ws-1', 'wi-2', 'my file (v2).pdf');
      expect(key).toBe(
        'ws-1/wi-2/00000000-0000-4000-8000-000000000000-my_file_v2_.pdf',
      );
    });
  });

  describe('issueSignedUrl', () => {
    it('chama S3 adapter com key + contentType + contentLength', async () => {
      await service.issueSignedUrl('ws-1', 'wi-2', {
        filename: 'doc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      });
      expect(s3.getSignedPutUrl).toHaveBeenCalledWith({
        key: expect.stringContaining('ws-1/wi-2/'),
        contentType: 'application/pdf',
        contentLength: 1024,
      });
    });

    it('curto-circuita se MIME invalido (nao chama S3)', async () => {
      await expect(
        service.issueSignedUrl('ws-1', 'wi-2', {
          filename: 'x.exe',
          mimeType: 'application/x-msdownload',
          sizeBytes: 10,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.getSignedPutUrl).not.toHaveBeenCalled();
    });

    it('curto-circuita se sizeBytes excede (nao chama S3)', async () => {
      await expect(
        service.issueSignedUrl('ws-1', 'wi-2', {
          filename: 'huge.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 26 * 1024 * 1024,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(s3.getSignedPutUrl).not.toHaveBeenCalled();
    });
  });
});
