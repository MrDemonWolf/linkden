"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: string;
	description?: string;
	actions?: React.ReactNode;
	badge?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function PageHeader({
	title,
	description,
	actions,
	badge,
	children,
	className,
	style,
}: PageHeaderProps) {
	return (
		<div
			role="banner"
			aria-label={title}
			style={style}
			className={cn("pb-4 md:pb-6", className)}
		>
			<div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div className="min-w-0">
					<div className="flex items-center gap-2">
						<h1 className="text-base font-semibold tracking-tight truncate">{title}</h1>
						{badge}
					</div>
					{description && (
						<p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
					)}
				</div>
				{actions && (
					<div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">{actions}</div>
				)}
			</div>
			{children && <div className="mt-3">{children}</div>}
		</div>
	);
}
