import { z } from "zod";

const linkTypeEnum = z.enum([
  "link",
  "heading",
  "spacer",
  "text",
  "email",
  "phone",
  "vcard",
  "wallet",
  "divider",
  "image",
  "video",
  "html",
  "contact_form",
  "social_button",
]);

const iconTypeEnum = z.enum(["brand", "lucide", "custom"]);

export const CreateLinkSchema = z.object({
  type: linkTypeEnum.default("link"),
  title: z.string().min(1).max(200),
  url: z.string().max(2000).default(""),
  icon: z.string().max(100).default(""),
  iconType: iconTypeEnum.default("brand"),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).optional(),
});

export const UpdateLinkSchema = z.object({
  id: z.string().uuid(),
  type: linkTypeEnum.optional(),
  title: z.string().min(1).max(200).optional(),
  url: z.string().max(2000).optional(),
  icon: z.string().max(100).optional(),
  iconType: iconTypeEnum.optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export const ReorderLinksSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().uuid(),
      sortOrder: z.number().int().min(0),
    }),
  ),
});

export type CreateLinkInput = z.infer<typeof CreateLinkSchema>;
export type UpdateLinkInput = z.infer<typeof UpdateLinkSchema>;
export type ReorderLinksInput = z.infer<typeof ReorderLinksSchema>;
