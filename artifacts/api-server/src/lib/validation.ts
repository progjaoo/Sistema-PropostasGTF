import { z } from "zod/v4";
import type { IRouter } from "express";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/;

export const idSchema = z.string()
  .trim()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, "Identificador invalido");

export const optionalImageDataUrlSchema = z.string()
  .max(2_800_000)
  .superRefine((value, context) => {
    if (!value) return;
    const match = DATA_IMAGE_PATTERN.exec(value);
    if (!match) {
      context.addIssue({
        code: "custom",
        message: "Imagem deve ser PNG, JPEG ou WebP em Data URL Base64",
      });
      return;
    }
    const payload = match[2] ?? "";
    const padding = payload.endsWith("==") ? 2 : payload.endsWith("=") ? 1 : 0;
    const decodedBytes = Math.floor((payload.length * 3) / 4) - padding;
    if (decodedBytes > MAX_IMAGE_BYTES) {
      context.addIssue({
        code: "custom",
        message: "Imagem deve ter no maximo 2 MB",
      });
    }
  });

export const moneyStringSchema = z.string()
  .trim()
  .max(50)
  .regex(/^[R$\s\d.,+-]*$/, "Valor monetario invalido");

export function registerIdParamValidation(
  router: IRouter,
  names: string[] = ["id"],
): void {
  for (const name of names) {
    router.param(name, (req, res, next, value) => {
      const parsed = idSchema.safeParse(value);
      if (!parsed.success) {
        res.status(400).json({
          error: `Parametro ${name} invalido`,
          fields: parsed.error.issues,
        });
        return;
      }
      req.params[name] = parsed.data;
      next();
    });
  }
}
