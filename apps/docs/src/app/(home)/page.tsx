import {
	ArrowRight,
	BookOpen,
	LayoutDashboard,
	Link2,
	Paintbrush,
	Palette,
	ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import versionJson from "../../../../../version.json";

const guides = [
	{
		title: "Start with your page",
		description:
			"Set up LinkDen, add your profile and blocks, and choose a layout that works on every screen.",
		href: "/docs/getting-started/quick-start",
		icon: BookOpen,
	},
	{
		title: "Design your page",
		description: "Choose a theme, adjust your brand colors, and preview your public profile.",
		href: "/docs/guide/appearance",
		icon: Paintbrush,
	},
	{
		title: "Build with the design system",
		description: "Use the same colors, spacing, controls and interaction patterns as the app.",
		href: "/docs/design-system",
		icon: Palette,
	},
];

export default function HomePage() {
	return (
		<div id="nd-page" className="ld-home w-full">
			<section
				aria-labelledby="home-title"
				className="grid gap-12 lg:grid-cols-[1.2fr_1fr] lg:items-center"
			>
				<div>
					<p className="ld-eyebrow">LinkDen documentation · v{versionJson.version}</p>
					<h1 id="home-title">
						Your page.
						<br />
						Your links.
						<br />
						<span className="text-fd-primary">Your control.</span>
					</h1>
					<p className="mt-6 max-w-xl text-base leading-8 text-fd-muted-foreground">
						A personal profile page and private editor, hosted on your own Cloudflare account. Learn
						the app, understand its limits, and make it your own.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Link href="/docs/getting-started/quick-start" className="ld-action ld-action-primary">
							Get started <ArrowRight size={16} aria-hidden="true" />
						</Link>
						<Link href="/docs/design-system" className="ld-action">
							Explore the design system
						</Link>
					</div>
					<p className="mt-5 text-xs leading-6 text-fd-muted-foreground">
						Open source · MIT licensed · Cloudflare Workers, D1 and R2
					</p>
				</div>
				<div className="overflow-hidden rounded-2xl border border-fd-border bg-fd-card">
					<div className="border-b border-fd-border p-6 sm:p-8">
						<p className="ld-eyebrow">One page, one editor</p>
						<h2 className="mt-4 text-xl font-semibold tracking-tight">
							A home for your work.
							<br />A private place to shape it.
						</h2>
					</div>
					<dl className="divide-y divide-fd-border">
						<div className="p-6 sm:p-8">
							<dt className="flex items-center gap-3 text-sm font-semibold">
								<Link2 size={18} className="text-fd-primary" aria-hidden="true" />
								Profile page
							</dt>
							<dd className="mt-3 text-sm leading-7 text-fd-muted-foreground">
								Your bio, social icons, contact details and content blocks on one page that works on
								every screen.
							</dd>
						</div>
						<div className="p-6 sm:p-8">
							<dt className="flex items-center gap-3 text-sm font-semibold">
								<LayoutDashboard size={18} className="text-fd-primary" aria-hidden="true" />
								Private editor
							</dt>
							<dd className="mt-3 text-sm leading-7 text-fd-muted-foreground">
								Arrange blocks and choose your layout, colors, and branding. Preview the same
								content visitors see; only your admin account can sign in.
							</dd>
						</div>
					</dl>
				</div>
			</section>

			<section aria-labelledby="guides-title" className="mt-20 border-t border-fd-border pt-12">
				<div className="mb-6 flex flex-wrap items-end justify-between gap-3">
					<h2 id="guides-title" className="text-2xl font-semibold tracking-tight">
						Find your next step
					</h2>
					<Link
						href="/docs"
						className="inline-flex items-center gap-2 text-sm text-fd-primary hover:underline"
					>
						All documentation <ArrowRight size={16} aria-hidden="true" />
					</Link>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					{guides.map(({ title, description, href, icon: Icon }) => (
						<Link key={href} href={href} className="ld-doc-card">
							<Icon size={22} className="text-fd-primary" aria-hidden="true" />
							<h3 className="text-base font-semibold tracking-tight">{title}</h3>
							<p className="text-sm leading-7 text-fd-muted-foreground">{description}</p>
							<ArrowRight
								size={16}
								className="mt-auto text-fd-muted-foreground"
								aria-hidden="true"
							/>
						</Link>
					))}
				</div>
			</section>

			<aside className="mt-12 flex items-start gap-4 rounded-xl border border-fd-border p-6">
				<ShieldCheck
					size={22}
					className="mt-0.5 shrink-0 text-fd-muted-foreground"
					aria-hidden="true"
				/>
				<div>
					<h2 className="text-sm font-semibold">Know what is connected</h2>
					<p className="mt-2 max-w-3xl text-sm leading-7 text-fd-muted-foreground">
						Email, CAPTCHA, Wallet signing and publication need their own setup. The guides
						distinguish available controls from integrations that still need verification.
					</p>
					<Link
						href="/docs/self-hosting/cloudflare"
						className="mt-3 inline-flex text-sm text-fd-primary hover:underline"
					>
						Read the hosting and deployment guide
					</Link>
				</div>
			</aside>
		</div>
	);
}
