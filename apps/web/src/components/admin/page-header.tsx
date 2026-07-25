"use client";

import { cn } from "@/lib/utils";

interface PageHeaderProps {
	title: React.ReactNode;
	description?: string;
	actions?: React.ReactNode;
	badge?: React.ReactNode;
	kicker?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

export function PageHeader({
	title,
	description,
	actions,
	badge,
	kicker,
	children,
	className,
	style,
}: PageHeaderProps) {
	return (
		<header style={style} className={cn(className)}>
			<div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div className="min-w-0">
					{kicker && (
						<p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-mono mb-1">
							{kicker}
						</p>
					)}
					<div className="flex items-center gap-2">
						<h1 className="text-xl font-semibold tracking-[-0.015em] truncate">{title}</h1>
						{badge}
					</div>
					{description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
				</div>
				{actions && <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">{actions}</div>}
			</div>
			{children && <div className="mt-3">{children}</div>}
		</header>
	);
}
