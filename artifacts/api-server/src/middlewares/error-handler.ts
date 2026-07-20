import crypto from "node:crypto";
import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger";

type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    requestId: string;
    fields?: unknown;
  };
};

function requestId(req: Request): string {
  return String(req.id ?? req.get("x-request-id") ?? crypto.randomUUID());
}

function defaultCode(status: number): string {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 413) return "PAYLOAD_TOO_LARGE";
  if (status === 415) return "UNSUPPORTED_MEDIA_TYPE";
  if (status === 429) return "RATE_LIMITED";
  return status >= 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR";
}

function structuredError(
  req: Request,
  status: number,
  message: string,
  code = defaultCode(status),
  fields?: unknown,
): ApiErrorBody {
  return {
    error: {
      code,
      message,
      requestId: requestId(req),
      ...(fields === undefined ? {} : { fields }),
    },
  };
}

export function normalizeErrorResponses(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    if (res.statusCode >= 400) {
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof (body as { error?: unknown }).error === "string"
      ) {
        const source = body as { error: string; fields?: unknown; code?: string };
        return originalJson(structuredError(
          req,
          res.statusCode,
          source.error,
          source.code ?? defaultCode(res.statusCode),
          source.fields,
        ));
      }
    }
    return originalJson(body);
  }) as Response["json"];
  next();
}

export function requireJsonContentType(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!["POST", "PUT", "PATCH"].includes(req.method)) {
    next();
    return;
  }

  const contentLength = Number(req.get("content-length") ?? "0");
  const hasBody = contentLength > 0 || Boolean(req.get("transfer-encoding"));
  if (!hasBody) {
    next();
    return;
  }

  const contentType = req.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json" && !contentType?.endsWith("+json")) {
    res.status(415).json({
      error: "O corpo da requisicao deve usar application/json",
      code: "UNSUPPORTED_MEDIA_TYPE",
    });
    return;
  }

  next();
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: "Rota nao encontrada", code: "NOT_FOUND" });
}

export const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    (error as { status?: number }).status === 400
  ) {
    res.status(400).json(structuredError(
      req,
      400,
      "JSON malformado",
      "INVALID_JSON",
    ));
    return;
  }

  if (
    error &&
    typeof error === "object" &&
    "type" in error &&
    (error as { type?: string }).type === "entity.too.large"
  ) {
    res.status(413).json(structuredError(
      req,
      413,
      "O corpo da requisicao excede o limite permitido",
      "PAYLOAD_TOO_LARGE",
    ));
    return;
  }

  if (error && typeof error === "object" && "code" in error) {
    const prismaCode = (error as { code?: unknown }).code;
    if (prismaCode === "P2002") {
      res.status(409).json(structuredError(req, 409, "Registro duplicado", "CONFLICT"));
      return;
    }
    if (prismaCode === "P2025") {
      res.status(404).json(structuredError(req, 404, "Registro nao encontrado", "NOT_FOUND"));
      return;
    }
  }

  logger.error({
    err: error,
    requestId: requestId(req),
    method: req.method,
    path: req.path,
  }, "Unhandled API error");
  res.status(500).json(structuredError(
    req,
    500,
    "Erro interno do servidor",
    "INTERNAL_ERROR",
  ));
};
