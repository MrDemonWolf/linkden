"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect, useState } from "react";

import { queryClient } from "@/utils/trpc";

import { ThemeProvider } from "./theme-provider";
import { Toaster } from "./ui/sonner";

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
		<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
			<QueryClientProvider client={queryClient}>
				{children}
				{devtoolsSupported && <ReactQueryDevtools />}
			</QueryClientProvider>
			<Toaster richColors />
		</ThemeProvider>
	);
}
