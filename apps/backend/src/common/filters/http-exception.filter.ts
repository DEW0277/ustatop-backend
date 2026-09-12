import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';

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
    const statusCode = isHttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
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

    if (!isHttpException) {
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
