"use client";

import { useState, useRef, useEffect } from "react";
import { Code2, Info, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/* ---------- lightweight CodeMirror wrapper (lazy-loaded) ---------- */

function CssEditor({
	value,
	onChange,
}: {
	value: string;
	onChange: (value: string) => void;
}) {
	const editorRef = useRef<HTMLDivElement>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const viewRef = useRef<any>(null);
	const [loaded, setLoaded] = useState(false);

	// Keep a ref to the latest onChange so the editor extension stays stable
	const onChangeRef = useRef(onChange);
	onChangeRef.current = onChange;

	useEffect(() => {
		if (!editorRef.current) return;
		let destroyed = false;

		(async () => {
			const { EditorView, keymap, lineNumbers, highlightActiveLine, highlightActiveLineGutter, drawSelection } = await import("@codemirror/view");
			const { EditorState } = await import("@codemirror/state");
			const { css } = await import("@codemirror/lang-css");
			const { oneDark } = await import("@codemirror/theme-one-dark");
			const { defaultKeymap, history, historyKeymap } = await import("@codemirror/commands");
			const { syntaxHighlighting, defaultHighlightStyle, bracketMatching } = await import("@codemirror/language");
			const { closeBrackets, closeBracketsKeymap } = await import("@codemirror/autocomplete");

			if (destroyed || !editorRef.current) return;

			const updateListener = EditorView.updateListener.of((update) => {
				if (update.docChanged) {
					onChangeRef.current(update.state.doc.toString());
				}
			});

			const editorTheme = EditorView.theme({
				"&": {
					fontSize: "12px",
					maxHeight: "280px",
				},
				".cm-content": {
					fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace",
					padding: "8px 0",
				},
				".cm-gutters": {
					borderRight: "1px solid hsl(var(--border) / 0.3)",
					backgroundColor: "transparent",
				},
				".cm-lineNumbers .cm-gutterElement": {
					fontSize: "10px",
					color: "hsl(var(--muted-foreground) / 0.5)",
					padding: "0 8px 0 4px",
				},
				".cm-activeLine": {
					backgroundColor: "hsl(var(--accent) / 0.06)",
				},
				".cm-selectionBackground": {
					backgroundColor: "hsl(var(--primary) / 0.15) !important",
				},
				".cm-cursor": {
					borderLeftColor: "hsl(var(--primary))",
				},
				"&.cm-focused .cm-selectionBackground": {
					backgroundColor: "hsl(var(--primary) / 0.2) !important",
				},
				".cm-scroller": {
					overflow: "auto",
				},
			});

			const state = EditorState.create({
				doc: value,
				extensions: [
					lineNumbers(),
					highlightActiveLine(),
					highlightActiveLineGutter(),
					drawSelection(),
					bracketMatching(),
					closeBrackets(),
					history(),
					css(),
					oneDark,
					editorTheme,
					syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
					keymap.of([
						...defaultKeymap,
						...historyKeymap,
						...closeBracketsKeymap,
					] as Parameters<typeof keymap.of>[0]),
					updateListener,
					EditorView.lineWrapping,
				],
			});

			const view = new EditorView({
				state,
				parent: editorRef.current!,
			});
			viewRef.current = view;
			setLoaded(true);
		})();

		return () => {
			destroyed = true;
			viewRef.current?.destroy();
			viewRef.current = null;
		};
		// Only run once on mount - value is captured at creation time
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Sync external value changes into the editor (e.g. discard/reset)
	useEffect(() => {
		const view = viewRef.current;
		if (!view) return;
		const current = view.state.doc.toString();
		if (current !== value) {
			view.dispatch({
				changes: { from: 0, to: current.length, insert: value },
			});
		}
	}, [value]);

	return (
		<div className="relative">
			<div
				ref={editorRef}
				className={cn(
					"overflow-hidden rounded-lg border border-border/60 bg-[#282c34] transition-opacity",
					loaded ? "opacity-100" : "opacity-0",
				)}
			/>
			{!loaded && (
				<div className="h-[200px] rounded-lg border border-border/60 bg-[#282c34] flex items-center justify-center">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
						Loading editor...
					</div>
				</div>
			)}
		</div>
	);
}

/* ---------- CSS reference panel ---------- */

function CssReference() {
	const [open, setOpen] = useState(false);

	return (
		<div className="rounded-lg border border-border/40 bg-muted/20">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
			>
				<span className="flex items-center gap-1.5">
					<Info className="h-3.5 w-3.5" />
					CSS classes &amp; variables reference
				</span>
				<ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} />
			</button>
			{open && (
				<div className="border-t border-border/40 px-3 py-3 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
					<div>
						<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Classes</p>
						<div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
							<span className="text-primary/80">.ld-page</span><span className="text-muted-foreground">Page container</span>
							<span className="text-primary/80">.ld-profile</span><span className="text-muted-foreground">Profile section</span>
							<span className="text-primary/80">.ld-avatar</span><span className="text-muted-foreground">Profile avatar</span>
							<span className="text-primary/80">.ld-bio</span><span className="text-muted-foreground">Bio text</span>
							<span className="text-primary/80">.ld-blocks</span><span className="text-muted-foreground">Blocks container</span>
							<span className="text-primary/80">.ld-link-block</span><span className="text-muted-foreground">Link buttons</span>
							<span className="text-primary/80">.ld-header-block</span><span className="text-muted-foreground">Header blocks</span>
							<span className="text-primary/80">.ld-social-block</span><span className="text-muted-foreground">Social icons</span>
							<span className="text-primary/80">.ld-embed-block</span><span className="text-muted-foreground">Embed blocks</span>
							<span className="text-primary/80">.ld-contact-block</span><span className="text-muted-foreground">Contact form</span>
							<span className="text-primary/80">.ld-footer</span><span className="text-muted-foreground">Branding footer</span>
						</div>
					</div>
					<div>
						<p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Variables</p>
						<div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px]">
							<span className="text-primary/80">--ld-primary</span><span className="text-muted-foreground">Primary color</span>
							<span className="text-primary/80">--ld-accent</span><span className="text-muted-foreground">Accent color</span>
							<span className="text-primary/80">--ld-background</span><span className="text-muted-foreground">Page background</span>
							<span className="text-primary/80">--ld-foreground</span><span className="text-muted-foreground">Text color</span>
							<span className="text-primary/80">--ld-card</span><span className="text-muted-foreground">Card background</span>
							<span className="text-primary/80">--ld-border</span><span className="text-muted-foreground">Border color</span>
							<span className="text-primary/80">--ld-muted</span><span className="text-muted-foreground">Muted background</span>
							<span className="text-primary/80">--ld-radius</span><span className="text-muted-foreground">Border radius</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

/* ---------- main export ---------- */

export function CustomCssSection({
	customCss,
	onCustomCssChange,
}: {
	customCss: string;
	onCustomCssChange: (value: string) => void;
}) {
	return (
		<Card>
			<CardHeader>
				<h2>
					<CardTitle className="flex items-center gap-1.5">
						<Code2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
						Custom CSS
					</CardTitle>
				</h2>
				<p className="text-[11px] text-muted-foreground mt-0.5">
					Add custom styles to your public page
				</p>
			</CardHeader>
			<CardContent className="space-y-3">
				<CssEditor value={customCss} onChange={onCustomCssChange} />
				<CssReference />
			</CardContent>
		</Card>
	);
}
