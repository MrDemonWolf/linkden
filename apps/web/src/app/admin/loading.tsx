import { Skeleton } from "@/components/ui/skeleton";

// Streaming UI for any admin route while parallel tRPC queries resolve.
// The dashboard fires ~12 queries on mount; this skeleton softens that wait
// without changing the data-fetching strategy.
export default function AdminLoading() {
	return (
		<div className="space-y-6 p-6">
			{/* Page header skeleton */}
			<div className="space-y-2">
				<Skeleton className="h-7 w-48" />
				<Skeleton className="h-4 w-72" />
			</div>

			{/* Stat cards row */}
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
				{Array.from({ length: 4 }).map((_, i) => (
					<div key={i} className="rounded-2xl border border-border bg-card p-5">
						<Skeleton className="mb-3 h-4 w-20" />
						<Skeleton className="h-8 w-24" />
					</div>
				))}
			</div>

			{/* Chart panel */}
			<div className="rounded-2xl border border-border bg-card p-6">
				<Skeleton className="mb-4 h-5 w-40" />
				<Skeleton className="h-64 w-full" />
			</div>

			{/* Two-column lists */}
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				{Array.from({ length: 2 }).map((_, i) => (
					<div key={i} className="rounded-2xl border border-border bg-card p-6">
						<Skeleton className="mb-4 h-5 w-32" />
						<div className="space-y-3">
							{Array.from({ length: 4 }).map((_, j) => (
								<Skeleton key={j} className="h-4 w-full" />
							))}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
