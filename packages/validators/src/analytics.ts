import { z } from "zod";

export const AnalyticsQuerySchema = z.object({
  period: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export const TrackEventSchema = z.object({
  linkId: z.string().uuid().optional(),
  event: z.enum(["page_view", "link_click"]),
  referrer: z.string().max(2000).default(""),
});

export type AnalyticsQueryInput = z.infer<typeof AnalyticsQuerySchema>;
export type TrackEventInput = z.infer<typeof TrackEventSchema>;
