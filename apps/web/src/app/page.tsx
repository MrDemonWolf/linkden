"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { PublicPage } from "@/components/public/public-page";

export default function Home() {
	const pageData = useQuery(trpc.public.getPage.queryOptions());
	const trackView = useMutation(trpc.public.trackView.mutationOptions());
	const { data: session } = authClient.useSession();

	useEffect(() => {
		trackView.mutate({
			referrer: document.referrer || undefined,
			userAgent: navigator.userAgent || undefined,
		});
	}, []);

	if (pageData.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Loading">
					<span className="sr-only">Loading</span>
				</div>
			</div>
		);
	}

	if (!pageData.data?.profile) {
		return (
			<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030303]">
				{/* Ambient glow */}
				<div className="pointer-events-none absolute inset-0">
					<div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px]" />
					<div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-violet-500/8 blur-[100px]" />
				</div>

				{/* Grid pattern */}
				<div
					className="pointer-events-none absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage:
							"linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
						backgroundSize: "60px 60px",
					}}
				/>

				<div className="relative z-10 mx-auto max-w-lg px-6 text-center">
					{/* Logo mark */}
					<div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.06] ring-1 ring-white/[0.08] backdrop-blur-xl">
						<span className="text-2xl font-bold tracking-tight text-white">LD</span>
					</div>

					<h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
						Welcome to LinkDen
					</h1>
					<p className="mt-3 text-base leading-relaxed text-white/50">
						Your self-hosted link-in-bio page is almost ready. Complete the setup wizard to create your profile and start sharing.
					</p>

					{/* Feature hints */}
					<div className="mt-8 grid grid-cols-3 gap-3 text-center">
						{[
							{ label: "Custom Links", desc: "Add unlimited blocks" },
							{ label: "Analytics", desc: "Track every click" },
							{ label: "Your Brand", desc: "Fully customizable" },
						].map((item) => (
							<div
								key={item.label}
								className="rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06] px-3 py-4"
							>
								<p className="text-xs font-semibold text-white/80">{item.label}</p>
								<p className="mt-0.5 text-[11px] text-white/30">{item.desc}</p>
							</div>
						))}
					</div>

					{/* CTA */}
					<a
						href="/admin/setup"
						className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-black transition-all hover:bg-white/90 hover:scale-[1.02] active:scale-[0.98]"
					>
						Get Started
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</a>

					<p className="mt-6 text-xs text-white/20">
						Already set up?{" "}
						<a href="/admin/login" className="text-white/40 underline underline-offset-2 hover:text-white/60 transition-colors">
							Sign in
						</a>
					</p>
				</div>
			</div>
		);
	}

	return (
		<PublicPage
			data={pageData.data as Parameters<typeof PublicPage>[0]["data"]}
			isAdmin={!!session?.user}
		/>
	);
}
