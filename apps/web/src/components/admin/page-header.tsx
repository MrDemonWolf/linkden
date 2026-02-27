"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: React.ReactNode;
	badge?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
}

export function PageHeader({
	title,
	description,
	actions,
	badge,
	children,
	className,
}: PageHeaderProps) {
	return (
		<div
			role="banner"
			aria-label={title}
			className={cn(
				"sticky top-12 md:top-0 z-20 -mx-2 sm:mx-0 md:rounded-2xl border-x-0 sm:border-x bg-white/50 dark:bg-white/5 backdrop-blur-2xl border border-white/20 dark:border-white/10 shadow-lg shadow-black/5 dark:shadow-black/20 px-4 py-2 md:py-3",
				children
					? "flex flex-col gap-2 md:gap-3"
					: "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
				!(actions || children) && "hidden md:flex",
				className,
			)}
		>
			{children ? (
				<div className="flex items-center justify-between">
					<div className="hidden md:flex items-center gap-2 min-w-0">
						<h1 className="text-lg font-semibold truncate">{title}</h1>
						{badge}
						{description && (
							<p className="text-xs text-muted-foreground">{description}</p>
						)}
					</div>
					{actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
				</div>
			) : (
				<>
					<div className="hidden md:block">
						<h1 className="text-lg font-semibold">{title}</h1>
						{description && (
							<p className="text-xs text-muted-foreground">{description}</p>
						)}
					</div>
					{actions && <div className="flex items-center gap-2 ml-auto">{actions}</div>}
				</>
			)}
			{children}
		</div>
	);
}
