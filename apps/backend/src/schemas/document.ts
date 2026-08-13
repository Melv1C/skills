import * as z from "zod";

import { visibility$ } from "./asset";

export const documentClientKey$ = z.string().trim().min(1).max(1024);
export const documentDescription$ = z.string().trim().max(200);
export const documentFilename$ = z.string().trim().min(1).max(512);
export const forceNew$ = z.enum(["true", "1", "false", "0"]);

export const updateDocumentBody$ = z
  .object({
    description: documentDescription$.optional(),
    visibility: visibility$.optional(),
    filename: documentFilename$.optional(),
  })
  .refine(
    (value) =>
      value.description !== undefined ||
      value.visibility !== undefined ||
      value.filename !== undefined,
    {
      error: "At least one of description, visibility, or filename is required",
    },
  );

export const listDocumentsQuery$ = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().min(1).max(100).optional(),
});
