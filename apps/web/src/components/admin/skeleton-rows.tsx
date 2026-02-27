import { Skeleton } from "@/components/ui/skeleton";

interface SkeletonRowsProps {
	count?: number;
	height?: string;
}

export function SkeletonRows({ count = 3, height = "h-14" }: SkeletonRowsProps) {
	return (
		<div className="space-y-2" aria-busy="true" role="status" aria-label="Loading">
			{Array.from({ length: count }).map((_, i) => (
				<Skeleton key={`skel-${i}`} className={height} />
			))}
		</div>
	);
}
