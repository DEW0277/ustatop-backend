import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

// Express middleware (masalan body-parser) Nest HttpException emas, `status` maydonli http-errors xatolarini tashlaydi.
function getClientErrorStatus(exception: unknown): number | null {
  const status = (exception as { status?: unknown } | null)?.status;
  return typeof status === 'number' && status >= 400 && status < 500 ? status : null;
}

interface ErrorResponseBody {
  message?: string | string[];
  errors?: Record<string, string[]>;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const isHttpException = exception instanceof HttpException;
    const clientErrorStatus = isHttpException ? null : getClientErrorStatus(exception);
    const statusCode = isHttpException
      ? exception.getStatus()
      : (clientErrorStatus ?? HttpStatus.INTERNAL_SERVER_ERROR);
    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    let message = 'Ichki server xatosi';
    let errors: Record<string, string[]> | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exceptionResponse && typeof exceptionResponse === 'object') {
      const body = exceptionResponse as ErrorResponseBody;
      if (body.errors) {
        errors = body.errors;
        message = typeof body.message === 'string' ? body.message : "Validatsiya xatosi";
      } else if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (body.message) {
        message = body.message;
      }
    } else if (isHttpException) {
      message = exception.message;
    }

    if (message === 'File too large') {
      message = 'Fayl hajmi 10MB dan oshmasligi kerak';
    } else if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      message = "So'rovlar soni juda ko'p, birozdan so'ng qayta urinib ko'ring";
    } else if (clientErrorStatus === HttpStatus.PAYLOAD_TOO_LARGE) {
      message = "So'rov hajmi juda katta";
    } else if (clientErrorStatus) {
      message = (exception as Error).message;
    }

    if (!isHttpException && !clientErrorStatus) {
      // eslint-disable-next-line no-console
      console.error(exception);
    }

    response.status(statusCode).json({
      success: false,
      message,
      statusCode,
      ...(errors ? { errors } : {}),
      timestamp: new Date().toISOString(),
    });
  }
}
