import { z } from "zod";

export const updateSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export const themeSettingsSchema = z.object({
  preset: z.string().optional(),
  customColors: z
    .object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
      background: z.string().optional(),
    })
    .optional(),
});

export const captchaSettingsSchema = z.object({
  provider: z.string().optional(),
  siteKey: z.string().optional(),
  secretKey: z.string().optional(),
});

export const contactFormSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  fields: z
    .object({
      phone: z.boolean().optional(),
      subject: z.boolean().optional(),
      company: z.boolean().optional(),
    })
    .optional(),
  delivery: z
    .object({
      email: z.string().email().optional(),
      webhook: z.string().url().optional(),
    })
    .optional(),
});

export const emailSettingsSchema = z.object({
  provider: z.string().optional(),
  apiKey: z.string().optional(),
  from: z.string().optional(),
});

export const seoSettingsSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  ogImage: z.string().optional(),
});

export const brandingSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  text: z.string().optional(),
  link: z.string().optional(),
});

export const walletSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  teamId: z.string().optional(),
  passTypeId: z.string().optional(),
  customQrUrl: z.string().optional(),
});

export const vcardDataSchema = z.object({
  fullName: z.string().optional(),
  nickname: z.string().optional(),
  birthday: z.string().optional(),
  photo: z.string().optional(),
  org: z.string().optional(),
  title: z.string().optional(),
  department: z.string().optional(),
  workEmail: z.string().email().optional(),
  workPhone: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  urls: z.array(z.string().url()).optional(),
});

export const vcardSettingsSchema = z.object({
  enabled: z.boolean().optional(),
  vcardData: vcardDataSchema.optional(),
});
