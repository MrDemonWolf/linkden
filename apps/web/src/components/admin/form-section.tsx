import { cn } from "@/lib/utils";

interface FormSectionProps {
	title: string;
	description?: string;
	children: React.ReactNode;
	className?: string;
}

export function FormSection({ title, description, children, className }: FormSectionProps) {
	return (
		<div className={cn("mb-6 pb-6 border-b border-border/40 last:border-0 last:mb-0 last:pb-0", className)}>
			<h3 className="text-sm font-semibold mb-1">{title}</h3>
			{description && (
				<p className="text-xs text-muted-foreground mb-4">{description}</p>
			)}
			{children}
		</div>
	);
}
