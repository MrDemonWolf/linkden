"use client";

import { BarChart3, Link, Palette } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WolfLogo } from "@/components/wolf-logo";
import { useEntranceAnimation } from "@/hooks/use-entrance-animation";

const features = [
	{ label: "Custom Links", desc: "Add unlimited blocks", icon: Link },
	{ label: "Analytics", desc: "Track every click", icon: BarChart3 },
	{ label: "Your Brand", desc: "Fully customizable", icon: Palette },
];

/** Shown at `/` until the setup wizard creates the admin account. Lives outside
 * `components/public` on purpose: there is no page palette yet, so it uses the
 * app-shell tokens (and the admin entrance hook) like the login/setup pages. */
export function WelcomePage() {
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
						Your self-hosted link-in-bio page is almost ready. Complete the setup wizard to create
						your profile and start sharing.
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
							<p className="mt-0.5 text-micro text-muted-foreground">{desc}</p>
						</div>
					))}
				</div>

				{/* CTA */}
				<div {...getAnimationProps(3)}>
					<a
						href="/admin/setup"
						className="mt-10 inline-flex h-12 items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-primary to-[color:var(--chart-2)] px-7 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_-8px_var(--primary)] transition-all duration-200 hover:shadow-[0_0_40px_-8px_var(--primary)] hover:scale-[1.02] active:scale-[0.98]"
					>
						Get Started
						<svg
							className="h-4 w-4"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={2}
							aria-hidden="true"
						>
							<path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</a>
				</div>

				{/* Sign in link */}
				<div {...getAnimationProps(4)}>
					<p className="mt-8 text-xs text-muted-foreground">
						Already set up?{" "}
						<a
							href="/admin/login"
							className="text-primary underline underline-offset-2 transition-colors duration-200 hover:text-primary/80"
						>
							Sign in
						</a>
					</p>
				</div>
			</div>
		</div>
	);
}
