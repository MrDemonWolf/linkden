import { z } from "zod";
import type { ConsentCategoriesConfig } from "./consent";

/** Write-side check for `consent_categories`: exactly the three boolean flags. */
export const consentCategoriesSchema = z.object({
	analytics: z.boolean(),
	marketing: z.boolean(),
	functional: z.boolean(),
}) satisfies z.ZodType<ConsentCategoriesConfig>;
