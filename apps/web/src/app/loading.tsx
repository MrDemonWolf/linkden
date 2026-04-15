// Streaming UI shown while the root layout's async fetchSettings() runs.
// Matches the existing spinner pattern used in `apps/web/src/app/page.tsx`.
export default function RootLoading() {
	return (
		<div
			className="flex min-h-screen items-center justify-center"
			role="status"
			aria-label="Loading"
		>
			<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			<span className="sr-only">Loading</span>
		</div>
	);
}
