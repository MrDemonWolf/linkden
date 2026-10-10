"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LegalTextDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	title: string;
	/** Plain text; line breaks are kept. */
	text: string;
	/** Surface colours (the public page passes its theme; the login page uses the tokens). */
	style?: React.CSSProperties;
	titleStyle?: React.CSSProperties;
	textStyle?: React.CSSProperties;
}

/** A text-mode legal document (privacy policy / terms) in a scrollable dialog. */
export function LegalTextDialog({
	open,
	onOpenChange,
	title,
	text,
	style,
	titleStyle,
	textStyle,
}: LegalTextDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[80vh] overflow-y-auto" style={style}>
				<DialogHeader>
					<DialogTitle style={titleStyle}>{title}</DialogTitle>
				</DialogHeader>
				<div
					className={
						textStyle
							? "whitespace-pre-wrap text-sm"
							: "whitespace-pre-wrap text-sm text-muted-foreground"
					}
					style={textStyle}
				>
					{text}
				</div>
			</DialogContent>
		</Dialog>
	);
}
