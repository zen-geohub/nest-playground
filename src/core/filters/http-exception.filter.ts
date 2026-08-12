import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from "@nestjs/common";
import type { Response } from "express";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const statusCode = exception.getStatus();
    const res = exception.getResponse();

    response.status(statusCode).json({
      statusCode,
      message: typeof res === "string" ? res : (res as any).message,
      error: typeof res === "string" ? exception.name : (res as any).error,
    });
  }
}
