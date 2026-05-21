import { HttpException, HttpStatus } from '@nestjs/common';

export class InvalidCnpjError extends HttpException {
  constructor(reason: string) {
    super(
      { code: 'INVALID_CNPJ', message: reason },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}

export class CnpjNotFoundError extends HttpException {
  constructor() {
    super(
      {
        code: 'CNPJ_NOT_FOUND',
        message: 'CNPJ não encontrado em nenhuma fonte',
      },
      HttpStatus.NOT_FOUND,
    );
  }
}

export class AllProvidersDownError extends HttpException {
  constructor() {
    super(
      {
        code: 'ALL_PROVIDERS_DOWN',
        message: 'Todas as fontes externas estão indisponíveis',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
