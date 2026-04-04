"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { PublicPage } from "@/components/public/public-page";
import { WolfLogo } from "@/components/wolf-logo";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { ConsentBanner, hasAnalyticsConsent } from "@/components/public/consent-banner";

export default function Home() {
	const pageData = useQuery({
		...trpc.public.getPage.queryOptions(),
		retry: false,
		refetchOnWindowFocus: false,
		meta: { skipErrorToast: true },
	});
	const trackView = useMutation(trpc.public.trackView.mutationOptions());
	const { mutate: trackViewMutate } = trackView;

	useEffect(() => {
		if (pageData.data?.profile && hasAnalyticsConsent()) {
			trackViewMutate({
				referrer: document.referrer || undefined,
				userAgent: navigator.userAgent || undefined,
			});
		}
	}, [pageData.data?.profile, trackViewMutate]);

	// Show welcome page on error (API unreachable) or when no profile exists
	if (pageData.isError || (!pageData.isLoading && !pageData.data?.profile)) {
		return <WelcomePage />;
	}

	if (pageData.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" role="status" aria-label="Loading">
					<span className="sr-only">Loading</span>
				</div>
			</div>
		);
	}

	return (
		<>
			<ConsentBanner />
			<AuthenticatedPublicPage
				data={pageData.data as Parameters<typeof PublicPage>[0]["data"]}
			/>
		</>
	);
}

function AuthenticatedPublicPage({ data }: { data: Parameters<typeof PublicPage>[0]["data"] }) {
	const { data: session } = authClient.useSession();
	return <PublicPage data={data} isAdmin={!!session?.user} />;
}

const features = [
	{
		label: "Custom Links",
		desc: "Add unlimited blocks",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.02a4.5 4.5 0 0 0-1.242-7.244l-4.5-4.5a4.5 4.5 0 0 0-6.364 6.364L4.25 8.81" />
			</svg>
		),
	},
	{
		label: "Analytics",
		desc: "Track every click",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
			</svg>
		),
	},
	{
		label: "Your Brand",
		desc: "Fully customizable",
		icon: (
			<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42" />
			</svg>
		),
	},
];

function WelcomePage() {
	const { getAnimationProps } = useEntranceAnimation({ baseDelay: 100, stagger: 100 });

	return (
		<div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#030303]">
			{/* Ambient glow */}
			<div className="pointer-events-none absolute inset-0">
				<div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-blue-500/[0.07] blur-[150px]" />
				<div className="absolute right-1/3 bottom-1/4 h-[400px] w-[400px] rounded-full bg-violet-500/[0.05] blur-[120px]" />
				<div className="absolute left-1/4 bottom-1/3 h-[300px] w-[300px] rounded-full bg-cyan-500/[0.04] blur-[100px]" />
			</div>

			{/* Grid pattern */}
			<div
				className="pointer-events-none absolute inset-0 opacity-[0.025]"
				style={{
					backgroundImage:
						"linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
					backgroundSize: "60px 60px",
				}}
			/>

			{/* Radial vignette */}
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,3,3,0.6)_70%)]" />

			<div className="relative z-10 mx-auto max-w-lg px-6 text-center">
				{/* Logo mark */}
				<div {...getAnimationProps(0)}>
					<div className="mx-auto mb-8 flex h-18 w-18 items-center justify-center rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.03] ring-1 ring-white/[0.08] shadow-[0_0_40px_-12px_rgba(59,130,246,0.3)] backdrop-blur-xl">
						<WolfLogo className="h-24 w-24" />
					</div>
				</div>

				{/* Title */}
				<div {...getAnimationProps(1)}>
					<h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
						Welcome to{" "}
						<span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">
							LinkDen
						</span>
					</h1>
					<p className="mt-4 text-base leading-relaxed text-white/45">
						Your self-hosted link-in-bio page is almost ready. Complete the setup wizard to create your profile and start sharing.
					</p>
				</div>

				{/* Feature cards */}
				<div className="mt-10 grid grid-cols-3 gap-3 text-center" {...getAnimationProps(2)}>
					{features.map((item) => (
						<div
							key={item.label}
							className="group rounded-xl bg-white/[0.03] ring-1 ring-white/[0.06] px-3 py-5 transition-colors duration-300 hover:bg-white/[0.06] hover:ring-white/[0.1]"
						>
							<div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-white/[0.05] text-white/40 transition-colors duration-300 group-hover:text-white/70">
								{item.icon}
							</div>
							<p className="text-xs font-semibold text-white/80">{item.label}</p>
							<p className="mt-0.5 text-[11px] text-white/30">{item.desc}</p>
						</div>
					))}
				</div>

				{/* CTA */}
				<div {...getAnimationProps(3)}>
					<a
						href="/admin/setup"
						className="mt-10 inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-b from-white to-white/90 px-7 text-sm font-semibold text-black shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)] transition-all duration-200 hover:shadow-[0_0_32px_-4px_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-[0.98]"
					>
						Get Started
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</a>
				</div>

				{/* Sign in link */}
				<div {...getAnimationProps(4)}>
					<p className="mt-8 text-xs text-white/20">
						Already set up?{" "}
						<a href="/admin/login" className="text-white/40 underline underline-offset-2 transition-colors duration-200 hover:text-white/60">
							Sign in
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
