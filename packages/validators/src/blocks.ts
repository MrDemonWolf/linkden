import { z } from "zod";

export const blockTypeSchema = z.enum([
  "link",
  "header",
  "social_icons",
  "embed",
  "contact_form",
]);

export type BlockType = z.infer<typeof blockTypeSchema>;

export const blockConfigBaseSchema = z.object({
  colorVariant: z.string().optional(),
  customBgColor: z.string().optional(),
  customTextColor: z.string().optional(),
  customBorderColor: z.string().optional(),
  borderRadius: z.string().optional(),
  borderWidth: z.number().optional(),
  shadow: z.string().optional(),
  animation: z.string().optional(),
  padding: z.string().optional(),
});

export const linkConfigSchema = blockConfigBaseSchema.extend({
  emoji: z.string().optional(),
  emojiPosition: z.enum(["left", "right"]).optional(),
  iconSlug: z.string().optional(),
  iconPosition: z.enum(["left", "right"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  fontWeight: z.string().optional(),
  isOutlined: z.boolean().optional(),
  openInNewTab: z.boolean().optional(),
});

export const headerConfigSchema = blockConfigBaseSchema.extend({
  headingLevel: z.enum(["h1", "h2", "h3", "h4", "h5", "h6"]).optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  fontWeight: z.string().optional(),
  emoji: z.string().optional(),
  emojiPosition: z.enum(["left", "right"]).optional(),
  showDivider: z.boolean().optional(),
});

export const socialIconsConfigSchema = blockConfigBaseSchema.extend({
  iconSize: z.number().optional(),
  iconStyle: z.enum(["filled", "outlined", "rounded"]).optional(),
  showLabels: z.boolean().optional(),
  spacing: z.number().optional(),
  useBrandColors: z.boolean().optional(),
});

export const embedConfigSchema = blockConfigBaseSchema.extend({
  aspectRatio: z.string().optional(),
  maxWidth: z.string().optional(),
  showTitle: z.boolean().optional(),
});

export const contactFormConfigSchema = blockConfigBaseSchema.extend({
  buttonText: z.string().optional(),
  buttonEmoji: z.string().optional(),
  buttonEmojiPosition: z.enum(["left", "right"]).optional(),
  successMessage: z.string().optional(),
});

export const socialIconItemSchema = z.object({
  platform: z.string(),
  url: z.string().url(),
});

export const createBlockSchema = z.object({
  type: blockTypeSchema,
  title: z.string().optional(),
  url: z.string().url().optional(),
  icon: z.string().optional(),
  embedType: z.string().optional(),
  embedUrl: z.string().url().optional(),
  socialIcons: z.array(socialIconItemSchema).optional(),
  isEnabled: z.boolean().optional(),
  position: z.number(),
  scheduledStart: z.number().optional(),
  scheduledEnd: z.number().optional(),
  config: z
    .union([
      linkConfigSchema,
      headerConfigSchema,
      socialIconsConfigSchema,
      embedConfigSchema,
      contactFormConfigSchema,
      blockConfigBaseSchema,
    ])
    .optional(),
});

export const updateBlockSchema = z.object({
  id: z.string(),
  type: blockTypeSchema.optional(),
  title: z.string().optional(),
  url: z.string().url().optional(),
  icon: z.string().optional(),
  embedType: z.string().optional(),
  embedUrl: z.string().url().optional(),
  socialIcons: z.array(socialIconItemSchema).optional(),
  isEnabled: z.boolean().optional(),
  position: z.number().optional(),
  scheduledStart: z.number().optional(),
  scheduledEnd: z.number().optional(),
  config: z
    .union([
      linkConfigSchema,
      headerConfigSchema,
      socialIconsConfigSchema,
      embedConfigSchema,
      contactFormConfigSchema,
      blockConfigBaseSchema,
    ])
    .optional(),
});

export const reorderBlocksSchema = z.array(
  z.object({
    id: z.string(),
    position: z.number(),
  }),
);
