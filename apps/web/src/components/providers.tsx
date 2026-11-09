"use client";

import { env } from "@linkden/env/web";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { lazy, Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import { queryClient, trpcClient } from "@/utils/trpc";
import { type PublicRuntime, PublicRuntimeProvider } from "./public/public-runtime";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

const DynamicBlockIcon = lazy(() => import("./public/block-icon-dynamic"));

const publicRuntime: PublicRuntime = {
	renderUnresolvedIcon: (icon, className) => (
		<Suspense
			fallback={
				<span className={cn("inline-flex h-5 w-5 shrink-0", className)} aria-hidden="true" />
			}
		>
			<DynamicBlockIcon icon={icon} className={className} />
		</Suspense>
	),
	submitContact: (input) => trpcClient.public.submitContact.mutate(input),
	vcardHref: (blockId) =>
		`${env.NEXT_PUBLIC_SERVER_URL}/api/vcard${blockId ? `?block=${encodeURIComponent(blockId)}` : ""}`,
};

export default function Providers({ children }: { children: React.ReactNode }) {
	// Devtools crash with "RangeError: Incorrect locale information provided"
	// in minimal-ICU browsers (e.g. headless Chromium), tripping the Next error
	// overlay. Mount them only once Intl can resolve the browser locale; the
	// effect also keeps SSR markup free of the client-only check.
	const [devtoolsSupported, setDevtoolsSupported] = useState(false);
	useEffect(() => {
		try {
			new Intl.Locale(navigator.language);
			new Intl.DateTimeFormat(navigator.language);
			setDevtoolsSupported(true);
		} catch {
			// minimal-ICU environment — leave devtools unmounted
		}
	}, []);

	return (
		<ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
			<QueryClientProvider client={queryClient}>
				<PublicRuntimeProvider value={publicRuntime}>{children}</PublicRuntimeProvider>
				{devtoolsSupported && <ReactQueryDevtools />}
			</QueryClientProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
