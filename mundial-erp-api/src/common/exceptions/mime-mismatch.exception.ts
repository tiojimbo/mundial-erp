import { BadRequestException } from '@nestjs/common';

/**
 * MimeMismatchException (PLANO §8.10)
 *
 * Disparada quando o MIME real detectado via magic number diverge do
 * declarado pelo cliente. Retorna HTTP 400.
 */
export class MimeMismatchException extends BadRequestException {
  constructor(declared: string, detected: string) {
    super({
      error: 'MIME_MISMATCH',
      message: `MIME declarado "${declared}" diverge do detectado "${detected}"`,
      declared,
      detected,
    });
  }
}
