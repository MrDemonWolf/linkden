"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { PublicPage } from "@/components/public/public-page";
import { WolfLogo } from "@/components/wolf-logo";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";
import { ConsentBanner, hasAnalyticsConsent } from "@/components/public/consent-banner";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Link, BarChart3, Palette } from "lucide-react";

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

	const consentSettings = pageData.data?.settings
		? {
				consentBannerEnabled: pageData.data.settings.consentBannerEnabled,
				consentBannerText: pageData.data.settings.consentBannerText,
				consentPrivacyUrl: pageData.data.settings.consentPrivacyUrl,
				consentCategories: pageData.data.settings.consentCategories,
			}
		: undefined;

	return (
		<>
			<ConsentBanner settings={consentSettings} />
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
	{ label: "Custom Links", desc: "Add unlimited blocks", icon: Link },
	{ label: "Analytics", desc: "Track every click", icon: BarChart3 },
	{ label: "Your Brand", desc: "Fully customizable", icon: Palette },
];

function WelcomePage() {
	const { getAnimationProps } = useEntranceAnimation({ baseDelay: 100, stagger: 100 });

	return (
		<div className="login-bg relative flex min-h-screen items-center justify-center overflow-hidden">
			{/* Theme toggle */}
			<div className="absolute right-4 top-4 z-20">
				<ThemeToggle />
			</div>

			<div className="relative z-10 mx-auto max-w-lg px-6 text-center">
				{/* Logo mark */}
				<div {...getAnimationProps(0)}>
					<div className="mx-auto mb-8 flex h-18 w-18 items-center justify-center rounded-2xl bg-card ring-1 ring-border shadow-[0_0_40px_-12px_rgba(59,130,246,0.25)] backdrop-blur-xl">
						<WolfLogo className="h-24 w-24" />
					</div>
				</div>

				{/* Title */}
				<div {...getAnimationProps(1)}>
					<h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
						Welcome to{" "}
						<span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
							LinkDen
						</span>
					</h1>
					<p className="mt-4 text-base leading-relaxed text-muted-foreground">
						Your self-hosted link-in-bio page is almost ready. Complete the setup wizard to create your profile and start sharing.
					</p>
				</div>

				{/* Feature cards */}
				<div className="mt-10 grid grid-cols-3 gap-3 text-center" {...getAnimationProps(2)}>
					{features.map(({ label, desc, icon: Icon }) => (
						<div
							key={label}
							className="group rounded-xl bg-card/50 ring-1 ring-border px-3 py-5 transition-colors duration-300 hover:bg-card"
						>
							<div className="mx-auto mb-2.5 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors duration-300 group-hover:text-primary">
								<Icon className="h-5 w-5" />
							</div>
							<p className="text-xs font-semibold text-foreground">{label}</p>
							<p className="mt-0.5 text-[11px] text-muted-foreground">{desc}</p>
						</div>
					))}
				</div>

				{/* CTA */}
				<div {...getAnimationProps(3)}>
					<a
						href="/admin/setup"
						className="mt-10 inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-7 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all duration-200 hover:from-blue-500 hover:to-blue-400 hover:scale-[1.02] active:scale-[0.98]"
					>
						Get Started
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</a>
				</div>

				{/* Sign in link */}
				<div {...getAnimationProps(4)}>
					<p className="mt-8 text-xs text-muted-foreground/50">
						Already set up?{" "}
						<a href="/admin/login" className="text-primary/70 underline underline-offset-2 transition-colors duration-200 hover:text-primary">
							Sign in
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
