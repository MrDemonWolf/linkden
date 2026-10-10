"use client";

import { useState } from "react";
import type { ThemeColors } from "@/lib/theme-colors";
import { LegalTextDialog } from "./legal-text-dialog";

/**
 * Where the site's privacy policy lives: a link (url mode) or text shown in a
 * dialog (text mode). public.getPage only sends the field for the active mode.
 */
export type PrivacyNotice = { kind: "url"; url: string } | { kind: "text"; text: string };

/** A link wins over text; null when the admin published neither. */
export function resolvePrivacyNotice(
	url: string | null | undefined,
	text: string | null | undefined,
): PrivacyNotice | null {
	if (url) return { kind: "url", url };
	if (text?.trim()) return { kind: "text", text };
	return null;
}

interface PrivacyNoticeLinkProps {
	notice: PrivacyNotice;
	children: React.ReactNode;
	className?: string;
	style?: React.CSSProperties;
	/** Themes the text-mode dialog to match the public page. */
	themeColors?: ThemeColors;
}

/** "Privacy Policy" as a link, or a button opening the policy text. */
export function PrivacyNoticeLink({
	notice,
	children,
	className,
	style,
	themeColors,
}: PrivacyNoticeLinkProps) {
	const [open, setOpen] = useState(false);

	if (notice.kind === "url") {
		return (
			<a
				href={notice.url}
				target="_blank"
				rel="noopener noreferrer"
				className={className}
				style={style}
			>
				{children}
			</a>
		);
	}

	return (
		<>
			<button type="button" onClick={() => setOpen(true)} className={className} style={style}>
				{children}
			</button>
			<LegalTextDialog
				open={open}
				onOpenChange={setOpen}
				title="Privacy Policy"
				text={notice.text}
				style={
					themeColors
						? {
								backgroundColor: themeColors.card,
								color: themeColors.cardFg,
								borderColor: themeColors.border,
							}
						: undefined
				}
				titleStyle={themeColors ? { color: themeColors.cardFg } : undefined}
				textStyle={themeColors ? { color: themeColors.mutedFg } : undefined}
			/>
		</>
	);
}
