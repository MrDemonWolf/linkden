import { cn } from "@/lib/utils";

export function FieldGroup({
	children,
	columns = 1,
}: {
	children: React.ReactNode;
	columns?: 1 | 2;
}) {
	return <div className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>{children}</div>;
}
