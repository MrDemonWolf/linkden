import { z } from "zod";

export const UpdateSettingsSchema = z.object({
  settings: z.array(
    z.object({
      key: z.string().min(1).max(100),
      value: z.string().max(10000),
    })
  ),
});

export type UpdateSettingsInput = z.infer<typeof UpdateSettingsSchema>;
