import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const requestId = request.headers['x-request-id'] as string;

    // Extract error message/details
    let errorMessage: string | string[];
    if (status >= 500) {
      // Never expose internals in 5xx
      errorMessage = 'Internal server error';
      this.logger.error(
        JSON.stringify({
          message: exception instanceof Error ? exception.message : 'Unknown error',
          requestId,
          path: request.url,
          method: request.method,
        }),
        exception instanceof Error ? exception.stack : undefined,
      );
    } else if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      } else if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const body = exceptionResponse as Record<string, unknown>;
        errorMessage = (body.message as string | string[]) || exception.message;
      } else {
        errorMessage = exception.message;
      }
    } else {
      errorMessage = 'Internal server error';
    }

    response.status(status).json({
      data: null,
      meta: {
        timestamp: new Date().toISOString(),
        requestId,
        path: request.url,
        statusCode: status,
        error: errorMessage,
      },
    });
  }
}
