import * as z from "zod";

export const visibility$ = z.enum(["private", "public"]);

export const updateAssetBody$ = z
  .object({
    filename: z.string().trim().min(1).max(512).optional(),
    visibility: visibility$.optional(),
  })
  .refine((value) => value.filename !== undefined || value.visibility !== undefined, {
    error: "At least one of filename or visibility is required",
  });

export const createTokenBody$ = z.object({
  name: z.string().trim().min(1).max(128),
  expiresIn: z.int().positive().optional(),
});
