import { contactSubmissions, settings } from "@linkden/db/schema";
import { ContactSubmissionSchema } from "@linkden/validators";
import { TRPCError } from "@trpc/server";
import { count, desc, eq } from "drizzle-orm";
import { Resend } from "resend";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const contactRouter = router({
  /** Public: validate CAPTCHA, store submission, send email via Resend */
  submit: publicProcedure.input(ContactSubmissionSchema).mutation(async ({ ctx, input }) => {
    // Verify Turnstile CAPTCHA
    const captchaResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: await getSettingValue(ctx.db, "captchaSecretKey"),
          response: input.captchaToken,
        }),
      },
    );

    const captchaResult = (await captchaResponse.json()) as {
      success: boolean;
    };
    if (!captchaResult.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "CAPTCHA verification failed",
      });
    }

    // Store submission
    const [submission] = await ctx.db
      .insert(contactSubmissions)
      .values({
        name: input.name,
        email: input.email,
        message: input.message,
      })
      .returning();

    // Send notification email via Resend
    try {
      const resend = new Resend(ctx.env.RESEND_API_KEY);
      const ownerEmail = await getSettingValue(ctx.db, "contactEmail");
      const ownerName = (await getSettingValue(ctx.db, "profileName")) || "LinkDen";

      if (ownerEmail) {
        // Send notification to owner
        await resend.emails.send({
          from: `LinkDen <noreply@${getDomain(ctx.env.APP_URL)}>`,
          to: ownerEmail,
          subject: `New contact form submission from ${input.name}`,
          html: `<p><strong>From:</strong> ${input.name} (${input.email})</p><p><strong>Message:</strong></p><p>${input.message}</p>`,
        });

        // Send confirmation to submitter
        await resend.emails.send({
          from: `${ownerName} <noreply@${getDomain(ctx.env.APP_URL)}>`,
          to: input.email,
          subject: "Message received",
          html: `<p>Hi ${input.name},</p><p>Thank you for reaching out! Your message has been received and ${ownerName} will get back to you as soon as possible.</p>`,
        });
      }
    } catch {
      // Email sending failure should not block the submission
    }

    return submission;
  }),

  /** Protected: paginated list with unread count */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const offset = (input.page - 1) * input.limit;

      const [items, [total], [unread]] = await Promise.all([
        ctx.db
          .select()
          .from(contactSubmissions)
          .orderBy(desc(contactSubmissions.createdAt))
          .limit(input.limit)
          .offset(offset),
        ctx.db.select({ count: count() }).from(contactSubmissions),
        ctx.db
          .select({ count: count() })
          .from(contactSubmissions)
          .where(eq(contactSubmissions.isRead, false)),
      ]);

      return {
        items,
        total: total?.count ?? 0,
        unreadCount: unread?.count ?? 0,
        page: input.page,
        limit: input.limit,
        totalPages: Math.ceil((total?.count ?? 0) / input.limit),
      };
    }),

  /** Protected: single submission */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [submission] = await ctx.db
        .select()
        .from(contactSubmissions)
        .where(eq(contactSubmissions.id, input.id));

      if (!submission) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }
      return submission;
    }),

  /** Protected: mark as read */
  markRead: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(contactSubmissions)
        .set({ isRead: true })
        .where(eq(contactSubmissions.id, input.id))
        .returning();

      if (!updated) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }
      return updated;
    }),

  /** Protected: delete submission */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [deleted] = await ctx.db
        .delete(contactSubmissions)
        .where(eq(contactSubmissions.id, input.id))
        .returning();

      if (!deleted) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Submission not found",
        });
      }
      return deleted;
    }),
});

/** Helper: get a single setting value */
async function getSettingValue(db: any, key: string): Promise<string> {
  const rows = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return rows[0]?.value ?? "";
}

/** Helper: extract domain from URL */
function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "localhost";
  }
}
