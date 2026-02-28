import { cn } from "@/lib/utils";

export function FieldGroup({
	children,
	columns = 1,
}: {
	children: React.ReactNode;
	columns?: 1 | 2;
}) {
	return (
		<div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
			{children}
		</div>
	);
}

export const selectClassName =
	"dark:bg-input/30 border-input h-8 w-full rounded-md border bg-transparent px-2.5 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring";
