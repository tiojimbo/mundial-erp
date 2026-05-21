import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type NestExceptionBody =
  | string
  | {
      message?: string | string[];
      error?: string;
      statusCode?: number;
      [key: string]: unknown;
    };

@Catch(HttpException)
export class HoppeErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();

    const status = exception.getStatus();
    const raw = exception.getResponse() as NestExceptionBody;
    const errorName = exception.constructor.name;

    let topMessage: string;
    let detailsMessage: string | string[];
    let detailsError: string;

    if (typeof raw === 'string') {
      topMessage = raw;
      detailsMessage = raw;
      detailsError = httpReason(status);
    } else {
      const rawMessage = raw.message ?? exception.message;
      if (Array.isArray(rawMessage)) {
        topMessage = rawMessage.join(', ');
        detailsMessage = rawMessage;
      } else {
        topMessage = rawMessage;
        detailsMessage = rawMessage;
      }
      detailsError = raw.error ?? httpReason(status);
    }

    response.status(status).json({
      statusCode: status,
      message: topMessage,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request.url,
      details: {
        message: detailsMessage,
        error: detailsError,
        statusCode: status,
      },
    });
  }
}

function httpReason(status: number): string {
  const entry = Object.entries(HttpStatus).find(([, v]) => v === status);
  if (!entry) return 'Error';
  return entry[0]
    .split('_')
    .map((p) => p.charAt(0) + p.slice(1).toLowerCase())
    .join(' ');
}
