"use client";

import { createContext, useContext, useEffect } from "react";
import { cn } from "@/lib/utils";

// The page's sub-tab label ("Profile", "SEO") is reported to the shell, whose
// top bar renders the single kicker breadcrumb (`LINKS / PROFILE`).
const KickerCtx = createContext<(label: string | null) => void>(() => {});
export const KickerSetter = KickerCtx.Provider;

interface PageHeaderProps {
	title: React.ReactNode;
	/** Sub-tab label for the top-bar kicker. Omit on a destination's root page. */
	kicker?: string;
	actions?: React.ReactNode;
	badge?: React.ReactNode;
	children?: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
}

/** Page h1 row (title · badge · actions). The kicker lives in the shell top bar. */
export function PageHeader({
	title,
	kicker,
	actions,
	badge,
	children,
	className,
	style,
}: PageHeaderProps) {
	const setKicker = useContext(KickerCtx);
	useEffect(() => {
		setKicker(kicker ?? null);
		return () => setKicker(null);
	}, [kicker, setKicker]);

	return (
		<header style={style} className={cn(className)}>
			<div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
				<div className="flex min-w-0 items-center gap-2">
					<h1 className="text-xl font-semibold tracking-[-0.015em] truncate">{title}</h1>
					{badge}
				</div>
				{actions && <div className="flex items-center gap-2 shrink-0 mt-2 sm:mt-0">{actions}</div>}
			</div>
			{children && <div className="mt-3">{children}</div>}
		</header>
	);
}
