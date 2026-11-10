import { cn } from "@/lib/utils";

export function FieldGroup({
	children,
	columns = 1,
}: {
	children: React.ReactNode;
	columns?: 1 | 2;
}) {
	return (
		<div className="@container/admin-fields">
			<div className={cn("grid gap-4", columns === 2 && "@min-[480px]/admin-fields:grid-cols-2")}>
				{children}
			</div>
		</div>
	);
}
