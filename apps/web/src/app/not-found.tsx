import Link from "next/link";
import { WolfLogo } from "@/components/wolf-logo";

// Public 404 page. Server component — no client state needed.
export default function NotFound() {
	return (
		<div className="flex min-h-screen items-center justify-center px-6">
			<div className="mx-auto max-w-md text-center">
				<div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-card ring-1 ring-border">
					<WolfLogo className="h-12 w-12" />
				</div>
				<p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">404</p>
				<h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
					Page not found
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					The page you're looking for doesn't exist or has been moved.
				</p>
				<Link
					href="/"
					className="mt-8 inline-flex h-10 items-center justify-center rounded-xl bg-foreground px-5 text-sm font-medium text-background transition-all hover:shadow-md hover:shadow-primary/20"
				>
					Back to home
				</Link>
			</div>
		</div>
	);
}
