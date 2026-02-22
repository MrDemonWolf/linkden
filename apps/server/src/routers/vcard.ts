import { vcard } from "@linkden/db/schema";
import { UpdateVcardSchema } from "@linkden/validators";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { protectedProcedure, publicProcedure, router } from "../trpc";

function generateVcf(data: Record<string, unknown>): string {
  const lines: string[] = ["BEGIN:VCARD", "VERSION:3.0"];

  const s = (key: string) => (data[key] as string) ?? "";

  if (s("lastName") || s("firstName")) {
    lines.push(`N:${s("lastName")};${s("firstName")};${s("suffix")};${s("prefix")}`);
    lines.push(
      `FN:${[s("prefix"), s("firstName"), s("lastName"), s("suffix")].filter(Boolean).join(" ")}`,
    );
  }

  if (s("nickname")) lines.push(`NICKNAME:${s("nickname")}`);
  if (s("birthday")) lines.push(`BDAY:${s("birthday")}`);
  if (s("photo")) lines.push(`PHOTO;VALUE=uri:${s("photo")}`);
  if (s("organization")) lines.push(`ORG:${s("organization")}`);
  if (s("title")) lines.push(`TITLE:${s("title")}`);
  if (s("role")) lines.push(`ROLE:${s("role")}`);

  if (s("email")) lines.push(`EMAIL;TYPE=HOME:${s("email")}`);
  if (s("emailWork")) lines.push(`EMAIL;TYPE=WORK:${s("emailWork")}`);

  if (s("phone")) lines.push(`TEL;TYPE=HOME:${s("phone")}`);
  if (s("phoneWork")) lines.push(`TEL;TYPE=WORK:${s("phoneWork")}`);
  if (s("phoneMobile")) lines.push(`TEL;TYPE=CELL:${s("phoneMobile")}`);
  if (s("fax")) lines.push(`TEL;TYPE=FAX:${s("fax")}`);

  if (s("addressStreet") || s("addressCity")) {
    lines.push(
      `ADR;TYPE=HOME:;;${s("addressStreet")};${s("addressCity")};${s("addressState")};${s("addressZip")};${s("addressCountry")}`,
    );
  }

  if (s("addressWorkStreet") || s("addressWorkCity")) {
    lines.push(
      `ADR;TYPE=WORK:;;${s("addressWorkStreet")};${s("addressWorkCity")};${s("addressWorkState")};${s("addressWorkZip")};${s("addressWorkCountry")}`,
    );
  }

  if (s("website")) lines.push(`URL;TYPE=HOME:${s("website")}`);
  if (s("websiteWork")) lines.push(`URL;TYPE=WORK:${s("websiteWork")}`);

  if (s("socialTwitter")) lines.push(`X-SOCIALPROFILE;TYPE=twitter:${s("socialTwitter")}`);
  if (s("socialLinkedin")) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${s("socialLinkedin")}`);
  if (s("socialGithub")) lines.push(`X-SOCIALPROFILE;TYPE=github:${s("socialGithub")}`);
  if (s("socialInstagram")) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${s("socialInstagram")}`);
  if (s("socialFacebook")) lines.push(`X-SOCIALPROFILE;TYPE=facebook:${s("socialFacebook")}`);
  if (s("socialYoutube")) lines.push(`X-SOCIALPROFILE;TYPE=youtube:${s("socialYoutube")}`);

  if (s("notes")) lines.push(`NOTE:${s("notes")}`);

  lines.push("END:VCARD");
  return lines.join("\r\n");
}

export const vcardRouter = router({
  /** Protected: get vcard data */
  get: protectedProcedure.query(async ({ ctx }) => {
    const [card] = await ctx.db.select().from(vcard).limit(1);
    return card ?? null;
  }),

  /** Protected: upsert vcard */
  update: protectedProcedure.input(UpdateVcardSchema).mutation(async ({ ctx, input }) => {
    const [existing] = await ctx.db.select().from(vcard).limit(1);
    const now = new Date().toISOString();

    if (existing) {
      const [updated] = await ctx.db
        .update(vcard)
        .set({ ...input, updatedAt: now })
        .where(eq(vcard.id, existing.id))
        .returning();
      return updated;
    }

    const [created] = await ctx.db
      .insert(vcard)
      .values({ ...input })
      .returning();
    return created;
  }),

  /** Public: generate and return .vcf file */
  download: publicProcedure.query(async ({ ctx }) => {
    const [card] = await ctx.db.select().from(vcard).limit(1);

    if (!card) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No vCard data configured",
      });
    }

    const vcfContent = generateVcf(card as unknown as Record<string, unknown>);
    const fileName = [card.firstName, card.lastName].filter(Boolean).join("_") || "contact";

    return {
      fileName: `${fileName}.vcf`,
      content: vcfContent,
      mimeType: "text/vcard",
    };
  }),
});
