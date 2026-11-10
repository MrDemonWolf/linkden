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

/** Page heading and description precede actions on phones; the shell owns the kicker. */
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
		<header
			style={style}
			className={cn(
				"mb-4 grid gap-3 sm:mb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-6 sm:gap-y-2",
				className,
			)}
		>
			<div className="flex min-w-0 flex-wrap items-center gap-2">
				<h1 className="font-display text-[24px] font-semibold leading-tight tracking-[-0.025em] sm:text-[28px]">
					{title}
				</h1>
				{badge}
			</div>
			{children && <div className="min-w-0 sm:col-start-1 sm:row-start-2">{children}</div>}
			{actions && (
				<div className="flex flex-wrap items-center gap-2 sm:col-start-2 sm:row-start-1 sm:self-start">
					{actions}
				</div>
			)}
		</header>
	);
}
