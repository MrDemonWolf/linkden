import { z } from "zod";

export const analyticsRangeSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  period: z.enum(["7d", "30d", "90d", "custom"]).optional(),
});

export const trackViewSchema = z.object({
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  country: z.string().optional(),
});

export const trackClickSchema = z.object({
  blockId: z.string().min(1),
  referrer: z.string().optional(),
  userAgent: z.string().optional(),
  country: z.string().optional(),
});
