import { Skeleton } from "@/components/ui/skeleton";

// Streaming UI for any admin route while its tRPC queries resolve. Sits inside
// the shell's tool column, so no padding of its own.
export default function AdminLoading() {
	return (
		<div className="space-y-6" role="status" aria-label="Loading">
			<Skeleton className="h-7 w-48" />
			<Skeleton className="h-10 w-full max-w-sm" />
			{Array.from({ length: 3 }).map((_, i) => (
				<div key={i} className="rounded-xl border border-border bg-card p-5">
					<Skeleton className="mb-4 h-4 w-32" />
					<div className="space-y-3">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-9 w-2/3" />
					</div>
				</div>
			))}
		</div>
	);
}
