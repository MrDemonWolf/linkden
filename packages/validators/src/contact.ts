import { z } from "zod";

export const ContactSubmissionSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Invalid email address").max(200),
  message: z.string().min(1, "Message is required").max(5000),
  captchaToken: z.string().min(1, "CAPTCHA verification required"),
});

export type ContactSubmissionInput = z.infer<typeof ContactSubmissionSchema>;
