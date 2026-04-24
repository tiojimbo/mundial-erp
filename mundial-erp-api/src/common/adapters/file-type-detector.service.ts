/**
 * FileTypeDetectorService (Sprint 4, PLANO §8.10)
 *
 * Valida MIME real via magic number usando a lib `file-type`. Baixa
 * apenas os primeiros 4KB via Range GET para minimizar custo/banda.
 *
 * Alguns MIMEs genericos (text/plain, text/csv) nao tem magic number
 * confiavel — tratados como "unknown" e aceitos se o declarado estiver
 * na whitelist text/* segura.
 */
import { Injectable, Logger } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import { S3AdapterService } from './s3-adapter.service';
import { MimeMismatchException } from '../exceptions/mime-mismatch.exception';

const MAGIC_NUMBER_PROBE_BYTES = 4096;

// MIMEs que `file-type` nao detecta por nao terem magic number universal.
// Para estes, confiamos no declarado se estiver na whitelist do DTO.
const MIMES_WITHOUT_RELIABLE_MAGIC: ReadonlySet<string> = new Set<string>([
  'text/plain',
  'text/csv',
]);

// Aliases aceitos como equivalentes (ex.: variantes office com/sem sufixo).
const MIME_ALIASES: Readonly<Record<string, readonly string[]>> = {
  'image/jpeg': ['image/jpg'],
  'image/jpg': ['image/jpeg'],
  'application/vnd.ms-excel': ['application/x-cfb'],
  'application/msword': ['application/x-cfb'],
};

@Injectable()
export class FileTypeDetectorService {
  private readonly logger = new Logger(FileTypeDetectorService.name);

  constructor(private readonly s3: S3AdapterService) {}

  async detectMimeFromStorage(
    storageKey: string,
    declaredMimeType: string,
    bucket?: string,
  ): Promise<string> {
    const buffer = await this.s3.downloadRange({
      bucket,
      key: storageKey,
      rangeStart: 0,
      rangeEnd: MAGIC_NUMBER_PROBE_BYTES - 1,
    });

    const detected = await fileTypeFromBuffer(buffer);

    if (!detected) {
      if (MIMES_WITHOUT_RELIABLE_MAGIC.has(declaredMimeType)) {
        this.logger.debug(
          `file-type.no-magic key=${storageKey} declared=${declaredMimeType} accepted-as-text`,
        );
        return declaredMimeType;
      }
      throw new MimeMismatchException(declaredMimeType, 'unknown');
    }

    const detectedMime = detected.mime;
    if (this.isMimeCompatible(declaredMimeType, detectedMime)) {
      return detectedMime;
    }

    this.logger.warn(
      `file-type.mismatch key=${storageKey} declared=${declaredMimeType} detected=${detectedMime}`,
    );
    throw new MimeMismatchException(declaredMimeType, detectedMime);
  }

  private isMimeCompatible(declared: string, detected: string): boolean {
    if (declared === detected) return true;
    const aliases = MIME_ALIASES[declared] ?? [];
    return aliases.includes(detected);
  }
}
