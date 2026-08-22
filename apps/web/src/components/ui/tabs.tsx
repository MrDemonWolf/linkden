"use client";

import {
	Tabs,
	TabsContent,
	TabsList as UiTabsList,
	TabsTrigger as UiTabsTrigger,
} from "@linkden/ui/components/tabs";
import type * as React from "react";

import { cn } from "@/lib/utils";

/**
 * MOBILE-FIRST RULE — a tab trigger is an interactive control, so it clears the
 * 44px touch target below `md` (WCAG 2.5.8) and only collapses to the dense
 * desktop height at `md` and up. The shared `@linkden/ui` primitive stays
 * layout-neutral (the public page uses it too); the sizing floor is applied in
 * this app-level re-export so every admin consumer inherits it, and a call site
 * can still override by passing its own `min-h-*`, which wins in `cn`.
 */
function TabsList({ className, ...props }: React.ComponentProps<typeof UiTabsList>) {
	// `h-auto` only bites on the `default` variant (the one with a fixed `h-10`);
	// `pills` and `bar` are already content-sized. It lets the list grow to the
	// 44px triggers on touch and settle back to 40px at md.
	return <UiTabsList className={cn("h-auto", className)} {...props} />;
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof UiTabsTrigger>) {
	return <UiTabsTrigger className={cn("min-h-11 md:min-h-8", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
