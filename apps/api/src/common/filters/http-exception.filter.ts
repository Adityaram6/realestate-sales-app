import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

interface ErrorBody {
  statusCode: number;
  message: string;
  code?: string;
  path: string;
  timestamp: string;
  details?: unknown;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const body = this.normalize(exception, request.url);

    if (body.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} → ${body.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(body.statusCode).json(body);
  }

  private normalize(exception: unknown, path: string): ErrorBody {
    const base = {
      path,
      timestamp: new Date().toISOString(),
    };

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const message =
        typeof payload === "string"
          ? payload
          : ((payload as { message?: string | string[] }).message ??
            exception.message);
      return {
        ...base,
        statusCode: status,
        message: Array.isArray(message) ? message.join(", ") : message,
        details:
          typeof payload === "object" && payload != null
            ? (payload as Record<string, unknown>)
            : undefined,
      };
    }

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.mapPrismaKnown(exception, base);
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        ...base,
        statusCode: HttpStatus.BAD_REQUEST,
        message: "Invalid payload",
        code: "PRISMA_VALIDATION",
      };
    }

    return {
      ...base,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message:
        exception instanceof Error
          ? exception.message
          : "Unexpected server error",
    };
  }

  private mapPrismaKnown(
    err: Prisma.PrismaClientKnownRequestError,
    base: { path: string; timestamp: string },
  ): ErrorBody {
    switch (err.code) {
      case "P2002": {
        const target = (err.meta?.target as string[] | undefined)?.join(", ");
        return {
          ...base,
          statusCode: HttpStatus.CONFLICT,
          code: err.code,
          message: `A record with this ${target ?? "value"} already exists.`,
        };
      }
      case "P2025":
        return {
          ...base,
          statusCode: HttpStatus.NOT_FOUND,
          code: err.code,
          message: "Record not found.",
        };
      case "P2003":
        return {
          ...base,
          statusCode: HttpStatus.CONFLICT,
          code: err.code,
          message: "Related record missing or still referenced.",
        };
      default:
        return {
          ...base,
          statusCode: HttpStatus.BAD_REQUEST,
          code: err.code,
          message: err.message.split("\n").pop() ?? err.message,
        };
    }
  }
}
