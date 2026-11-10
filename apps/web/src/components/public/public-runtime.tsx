"use client";

import type { contactSubmissionSchema } from "@linkden/validators/blocks";
import { createContext, type ReactNode, useContext } from "react";
import type { z } from "zod";

export type ContactSubmission = z.input<typeof contactSubmissionSchema>;

export interface PublicRuntime {
	submitContact: (input: ContactSubmission) => Promise<unknown>;
	vcardHref: (blockId?: string) => string | undefined;
	renderUnresolvedIcon?: (icon: string, className?: string) => ReactNode;
}

const PublicRuntimeContext = createContext<PublicRuntime>({
	submitContact: async () => {
		throw new Error("Contact delivery is not configured");
	},
	vcardHref: (blockId) => `/api/vcard${blockId ? `?block=${encodeURIComponent(blockId)}` : ""}`,
});

export const PublicRuntimeProvider = PublicRuntimeContext.Provider;
export const usePublicRuntime = () => useContext(PublicRuntimeContext);
