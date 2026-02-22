import { z } from "zod";

export const CreatePageSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  title: z.string().min(1).max(200),
  content: z.string().max(50000).default(""),
  isPublished: z.boolean().default(false),
});

export const UpdatePageSchema = z.object({
  id: z.string().uuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens")
    .optional(),
  title: z.string().min(1).max(200).optional(),
  content: z.string().max(50000).optional(),
  isPublished: z.boolean().optional(),
});

export type CreatePageInput = z.infer<typeof CreatePageSchema>;
export type UpdatePageInput = z.infer<typeof UpdatePageSchema>;
