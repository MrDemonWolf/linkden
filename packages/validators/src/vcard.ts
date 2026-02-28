// Re-export vcardDataSchema from settings for standalone use
export { vcardDataSchema } from "./settings";

import type { z } from "zod";
import type { vcardDataSchema } from "./settings";

export type VcardData = z.infer<typeof vcardDataSchema>;
