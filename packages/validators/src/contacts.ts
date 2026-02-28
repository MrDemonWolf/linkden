import { z } from "zod";

export const submitContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(1),
  phone: z.string().optional(),
  subject: z.string().optional(),
  company: z.string().optional(),
  captchaToken: z.string().optional(),
});

export const contactFilterSchema = z.object({
  isRead: z.boolean().optional(),
  page: z.number().int().min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
