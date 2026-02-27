"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: React.ReactNode;
	className?: string;
}

export function PageHeader({
	title,
	description,
	actions,
	className,
}: PageHeaderProps) {
	return (
		<div
			role="banner"
			aria-label={title}
			className={cn(
				"sticky top-12 md:top-0 z-20 md:rounded-2xl bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 px-4 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
				className,
			)}
		>
			<div>
				<h1 className="text-lg font-semibold">{title}</h1>
				{description && (
					<p className="text-xs text-muted-foreground">{description}</p>
				)}
			</div>
			{actions && <div className="flex items-center gap-2">{actions}</div>}
		</div>
	);
}
