"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { X, ExternalLink } from "lucide-react";
import { getAccessibleIconFill, isLowLuminance } from "@linkden/ui/color-contrast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn, getAdminThemeColors } from "@/lib/utils";
import { type Block, EMBED_URL_PATTERNS, validateEmbedUrl } from "./builder-constants";

function GlassSelect({
	id,
	value,
	onChange,
	children,
}: {
	id?: string;
	value: string;
	onChange: (value: string) => void;
	children: React.ReactNode;
}) {
	return (
		<select
			id={id}
			value={value}
			onChange={(e) => onChange(e.target.value)}
			className="dark:bg-input/30 border-white/15 h-8 w-full rounded-lg border bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
		>
			{children}
		</select>
	);
}

export function BlockEditPanel({
	block,
	onClose,
	onSave,
	isSaving,
	contactDelivery,
	onDeliveryChange,
	socialNetworks = [],
	onChange,
}: {
	block: Block;
	onClose: () => void;
	onSave: (data: Partial<Block>) => void;
	isSaving: boolean;
	contactDelivery: string;
	onDeliveryChange: (value: string) => void;
	socialNetworks?: Array<{ slug: string; name: string; url: string; hex: string; svgPath: string }>;
	onChange?: (data: Partial<Block>) => void;
}) {
	const { resolvedTheme } = useTheme();
	const panelRef = useRef<HTMLDivElement>(null);
	const [title, setTitle] = useState(block.title ?? "");
	const [url, setUrl] = useState(block.url ?? "");
	const [icon, setIcon] = useState(block.icon ?? "");
	const [embedType, setEmbedType] = useState(block.embedType ?? "");
	const [embedUrl, setEmbedUrl] = useState(block.embedUrl ?? "");
	const [socialIcons, setSocialIcons] = useState(block.socialIcons ?? "");
	const [config, setConfig] = useState(block.config ?? "{}");
	const [activeTab, setActiveTab] = useState<"content" | "style" | "options" | "schedule">("content");
	const [scheduledStart, setScheduledStart] = useState(
		block.scheduledStart ? new Date(block.scheduledStart).toISOString().slice(0, 16) : "",
	);
	const [scheduledEnd, setScheduledEnd] = useState(
		block.scheduledEnd ? new Date(block.scheduledEnd).toISOString().slice(0, 16) : "",
	);

	// Emit changes for real-time preview
	useEffect(() => {
		onChange?.({
			id: block.id,
			title: title || null,
			url: url || null,
			icon: icon || null,
			embedType: embedType || null,
			embedUrl: embedUrl || null,
			socialIcons: socialIcons || null,
			config: config || null,
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	}, [title, url, icon, config, embedType, embedUrl, socialIcons, scheduledStart, scheduledEnd]);

	// Auto-focus first input when panel opens
	useEffect(() => {
		const timer = setTimeout(() => {
			const firstInput = panelRef.current?.querySelector<HTMLInputElement>("input, textarea, select");
			firstInput?.focus();
		}, 100);
		return () => clearTimeout(timer);
	}, []);

	const parsedConfig = (() => {
		try {
			return JSON.parse(config);
		} catch {
			return {};
		}
	})();

	const updateConfigField = (key: string, value: unknown) => {
		const updated = { ...parsedConfig, [key]: value };
		setConfig(JSON.stringify(updated, null, 2));
	};

	const embedUrlError = validateEmbedUrl(embedType, embedUrl);

	const handleSave = () => {
		onSave({
			id: block.id,
			title: title || null,
			url: url || null,
			icon: icon || null,
			embedType: embedType || null,
			embedUrl: embedUrl || null,
			socialIcons: socialIcons || null,
			config: config || null,
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	};

	const tabs = ["content", "style", "options", "schedule"] as const;

	return (
		<div ref={panelRef} className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-white/15 dark:border-white/10 bg-white/80 dark:bg-black/60 backdrop-blur-2xl shadow-lg sm:w-96 animate-in slide-in-from-right duration-200">
			<div className="flex h-full flex-col">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-white/15 px-4 py-3">
					<h3 className="text-sm font-medium">
						Edit {block.type.replace("_", " ")}
					</h3>
					<button
						type="button"
						onClick={onClose}
						className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-foreground"
						aria-label="Close edit panel"
					>
						<X className="h-4 w-4" />
					</button>
				</div>

				{/* Tabs */}
				<div className="flex border-b border-white/15" role="tablist">
					{tabs.map((tab) => (
						<button
							key={tab}
							type="button"
							role="tab"
							aria-selected={activeTab === tab}
							onClick={() => setActiveTab(tab)}
							className={cn(
								"flex-1 py-2 text-xs font-medium capitalize transition-colors",
								activeTab === tab
									? "border-b-2 border-primary text-primary"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{tab}
						</button>
					))}
				</div>

				{/* Content */}
				<div className="flex-1 overflow-y-auto p-4 space-y-3" role="tabpanel">
					{activeTab === "content" && (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="edit-title">Title</Label>
								<Input
									id="edit-title"
									value={title}
									onChange={(e) => setTitle(e.target.value)}
									placeholder="Block title"
									className="dark:bg-input/30 border-white/15"
								/>
							</div>
							{(block.type === "link") && (
								<div className="space-y-1.5">
									<Label htmlFor="edit-url">URL</Label>
									<Input
										id="edit-url"
										value={url}
										onChange={(e) => setUrl(e.target.value)}
										placeholder="https://example.com"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
							)}
							{block.type === "embed" && (
								<>
									<div className="space-y-1.5">
										<Label htmlFor="edit-embed-type">Embed Type</Label>
										<GlassSelect
											id="edit-embed-type"
											value={embedType}
											onChange={setEmbedType}
										>
											<option value="">Select type</option>
											<option value="youtube">YouTube</option>
											<option value="spotify">Spotify</option>
											<option value="soundcloud">SoundCloud</option>
											<option value="custom">Custom</option>
										</GlassSelect>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="edit-embed-url">Embed URL</Label>
										<Input
											id="edit-embed-url"
											value={embedUrl}
											onChange={(e) => setEmbedUrl(e.target.value)}
											placeholder={EMBED_URL_PATTERNS[embedType]?.placeholder ?? "https://..."}
											className={cn("dark:bg-input/30 border-white/15", embedUrlError && "border-destructive")}
										/>
										{embedUrlError && (
											<p className="text-[11px] text-destructive">{embedUrlError}</p>
										)}
									</div>
								</>
							)}
							{block.type === "form" && (
								<div className="space-y-3">
									<div className="space-y-1.5">
										<Label htmlFor="edit-preset">Preset</Label>
										<GlassSelect
											id="edit-preset"
											value={parsedConfig.preset ?? "contact"}
											onChange={(v) => {
												updateConfigField("preset", v);
												const presetDefaults: Record<string, { buttonText: string; buttonEmoji?: string; successMessage?: string; showPhone?: boolean; showCompany?: boolean; showWhereMet?: boolean; showRating?: boolean; showAttending?: boolean; showGuests?: boolean }> = {
													contact: { buttonText: "Contact Me", buttonEmoji: "✉️", successMessage: "Thanks for reaching out!" },
													connect: { buttonText: "Connect with Me", buttonEmoji: "🤝", successMessage: "Thanks for connecting!", showPhone: true, showCompany: true, showWhereMet: true },
													feedback: { buttonText: "Leave Feedback", buttonEmoji: "💬", successMessage: "Thanks for your feedback!", showRating: true },
													rsvp: { buttonText: "RSVP", buttonEmoji: "🎉", successMessage: "Your RSVP has been received!", showAttending: true, showGuests: true },
												};
												const defaults = presetDefaults[v];
												if (defaults) {
													const updated = { ...parsedConfig, preset: v, ...defaults };
													setConfig(JSON.stringify(updated, null, 2));
												}
											}}
										>
											<option value="contact">Contact Form</option>
											<option value="connect">Connect with Me</option>
											<option value="feedback">Feedback</option>
											<option value="rsvp">RSVP</option>
										</GlassSelect>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="edit-button-text">Button Text</Label>
										<Input
											id="edit-button-text"
											value={parsedConfig.buttonText ?? "Contact Me"}
											onChange={(e) => updateConfigField("buttonText", e.target.value)}
											placeholder="Contact Me"
											className="dark:bg-input/30 border-white/15"
										/>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="edit-button-emoji">Button Emoji</Label>
										<Input
											id="edit-button-emoji"
											value={parsedConfig.buttonEmoji ?? ""}
											onChange={(e) => updateConfigField("buttonEmoji", e.target.value)}
											placeholder="e.g. ✉️"
											className="dark:bg-input/30 border-white/15"
										/>
									</div>
									<div className="space-y-1.5">
										<Label>Emoji Position</Label>
										<div className="flex rounded-lg border border-white/15 overflow-hidden">
											{[
												{ value: "left", label: "Left" },
												{ value: "right", label: "Right" },
											].map((opt) => (
												<button
													key={opt.value}
													type="button"
													onClick={() => updateConfigField("buttonEmojiPosition", opt.value)}
													className={cn(
														"flex-1 py-1.5 text-xs font-medium transition-colors",
														(parsedConfig.buttonEmojiPosition ?? "left") === opt.value
															? "bg-primary/15 text-primary"
															: "text-muted-foreground hover:text-foreground",
													)}
												>
													{opt.label}
												</button>
											))}
										</div>
									</div>
									<div className="space-y-1.5">
										<Label htmlFor="edit-success-msg">Success Message</Label>
										<Input
											id="edit-success-msg"
											value={parsedConfig.successMessage ?? "Thanks for reaching out!"}
											onChange={(e) => updateConfigField("successMessage", e.target.value)}
											placeholder="Thanks for reaching out!"
											className="dark:bg-input/30 border-white/15"
										/>
									</div>
								</div>
							)}
							{block.type === "social_icons" && (
								<div className="space-y-3">
									<Label>Active Networks</Label>
									{socialNetworks.length > 0 ? (
										<div className="flex flex-wrap gap-1.5">
											{socialNetworks.map((network) => {
												const { bg: adminBg, fg: adminFg } = getAdminThemeColors(resolvedTheme);
												const fillColor = getAccessibleIconFill(network.hex, adminBg, adminFg);
												const needsRing = isLowLuminance(network.hex);
												return (
													<span
														key={network.slug}
														className={cn(
															"inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs",
															needsRing && "ring-1 ring-white/10",
														)}
													>
														<svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0" fill={fillColor}>
															<path d={network.svgPath} />
														</svg>
														{network.name}
													</span>
												);
											})}
										</div>
									) : (
										<div className="flex items-center justify-center rounded-lg border-2 border-dashed border-white/15 px-4 py-6">
											<p className="text-xs text-muted-foreground">No active networks</p>
										</div>
									)}
									<Link
										href="/admin/social"
										className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 dark:bg-input/30 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
									>
										Manage Social Networks
										<ExternalLink className="h-3 w-3" />
									</Link>
									<details>
										<summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
											Advanced: Override JSON
										</summary>
										<div className="mt-2 space-y-1.5">
											<textarea
												id="edit-social"
												value={socialIcons}
												onChange={(e) => setSocialIcons(e.target.value)}
												placeholder='[{"platform":"twitter","url":"https://twitter.com/you"}]'
												rows={4}
												className="dark:bg-input/30 border-white/15 w-full rounded-lg border bg-transparent backdrop-blur-sm px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
											/>
										</div>
									</details>
								</div>
							)}
						</>
					)}

					{activeTab === "style" && (
						<>
							{block.type !== "social_icons" && (
								<div className="space-y-1.5">
									<Label htmlFor="edit-icon">Icon name</Label>
									<Input
										id="edit-icon"
										value={icon}
										onChange={(e) => setIcon(e.target.value)}
										placeholder="e.g. globe, github, twitter"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
							)}

							{block.type === "social_icons" && (
								<div className="space-y-4">
									{/* Icon Size */}
									<div className="space-y-1.5">
										<Label>Icon Size</Label>
										<div className="flex rounded-lg border border-white/15 overflow-hidden">
											{[
												{ value: "sm", label: "Small" },
												{ value: "md", label: "Medium" },
												{ value: "lg", label: "Large" },
											].map((opt) => (
												<button
													key={opt.value}
													type="button"
													onClick={() => updateConfigField("iconSize", opt.value)}
													className={cn(
														"flex-1 py-1.5 text-xs font-medium transition-colors",
														(parsedConfig.iconSize ?? "md") === opt.value
															? "bg-primary/15 text-primary"
															: "text-muted-foreground hover:text-foreground",
													)}
												>
													{opt.label}
												</button>
											))}
										</div>
									</div>

									{/* Icon Shape */}
									<div className="space-y-1.5">
										<Label>Icon Shape</Label>
										<div className="flex rounded-lg border border-white/15 overflow-hidden">
											{[
												{
													value: "circle",
													label: "Circle",
													svg: <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" fill="none" />,
												},
												{
													value: "rounded",
													label: "Rounded",
													svg: <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.5" fill="none" />,
												},
												{
													value: "square",
													label: "Square",
													svg: <rect x="3" y="3" width="18" height="18" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />,
												},
												{
													value: "bare",
													label: "Bare",
													svg: <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3" fill="none" />,
												},
											].map((opt) => (
												<button
													key={opt.value}
													type="button"
													onClick={() => updateConfigField("iconStyle", opt.value)}
													className={cn(
														"flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
														(parsedConfig.iconStyle ?? "circle") === opt.value
															? "bg-primary/15 text-primary"
															: "text-muted-foreground hover:text-foreground",
													)}
												>
													<svg viewBox="0 0 24 24" className="h-5 w-5">{opt.svg}</svg>
													{opt.label}
												</button>
											))}
										</div>
									</div>

									{/* Spacing */}
									<div className="space-y-1.5">
										<Label>Spacing</Label>
										<div className="flex rounded-lg border border-white/15 overflow-hidden">
											{[
												{ value: "compact", label: "Compact" },
												{ value: "default", label: "Default" },
												{ value: "spacious", label: "Spacious" },
											].map((opt) => (
												<button
													key={opt.value}
													type="button"
													onClick={() => updateConfigField("spacing", opt.value)}
													className={cn(
														"flex-1 py-1.5 text-xs font-medium transition-colors",
														(parsedConfig.spacing ?? "default") === opt.value
															? "bg-primary/15 text-primary"
															: "text-muted-foreground hover:text-foreground",
													)}
												>
													{opt.label}
												</button>
											))}
										</div>
									</div>

									{/* Show Labels */}
									<div className="flex items-center justify-between">
										<div className="space-y-0.5">
											<Label>Show Labels</Label>
											<p className="text-[11px] text-muted-foreground">Display platform names below icons</p>
										</div>
										<button
											type="button"
											role="switch"
											aria-checked={!!parsedConfig.showLabels}
											onClick={() => updateConfigField("showLabels", !parsedConfig.showLabels)}
											className={cn(
												"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
												parsedConfig.showLabels ? "bg-primary" : "bg-muted",
											)}
										>
											<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showLabels ? "translate-x-[18px]" : "translate-x-[3px]")} />
										</button>
									</div>
								</div>
							)}

							{block.type === "link" && (
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Label>No Follow</Label>
										<button
											type="button"
											role="switch"
											aria-checked={!!parsedConfig.noFollow}
											onClick={() => updateConfigField("noFollow", !parsedConfig.noFollow)}
											className={cn(
												"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
												parsedConfig.noFollow ? "bg-primary" : "bg-muted",
											)}
										>
											<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.noFollow ? "translate-x-[18px]" : "translate-x-[3px]")} />
										</button>
									</div>
									<div className="flex items-center justify-between">
										<Label>Open in New Tab</Label>
										<button
											type="button"
											role="switch"
											aria-checked={!!parsedConfig.newTab}
											onClick={() => updateConfigField("newTab", !parsedConfig.newTab)}
											className={cn(
												"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
												parsedConfig.newTab ? "bg-primary" : "bg-muted",
											)}
										>
											<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.newTab ? "translate-x-[18px]" : "translate-x-[3px]")} />
										</button>
									</div>
									<div className="space-y-1.5">
										<Label>Animation</Label>
										<GlassSelect value={parsedConfig.animation ?? "none"} onChange={(v) => updateConfigField("animation", v)}>
											<option value="none">None</option>
											<option value="pulse">Pulse</option>
											<option value="shake">Shake</option>
										</GlassSelect>
									</div>
									<div className="space-y-1.5">
										<Label>Thumbnail URL</Label>
										<Input
											value={parsedConfig.thumbnail ?? ""}
											onChange={(e) => updateConfigField("thumbnail", e.target.value)}
											placeholder="https://example.com/thumb.jpg"
											className="dark:bg-input/30 border-white/15"
										/>
									</div>
								</div>
							)}

							{block.type === "form" && (
								<div className="space-y-3">
									<div className="flex items-center justify-between">
										<Label>Outlined Style</Label>
										<button
											type="button"
											role="switch"
											aria-checked={!!parsedConfig.isOutlined}
											onClick={() => updateConfigField("isOutlined", !parsedConfig.isOutlined)}
											className={cn(
												"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
												parsedConfig.isOutlined ? "bg-primary" : "bg-muted",
											)}
										>
											<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.isOutlined ? "translate-x-[18px]" : "translate-x-[3px]")} />
										</button>
									</div>
									<div className="space-y-1.5">
										<Label>Animation</Label>
										<GlassSelect value={parsedConfig.animation ?? "none"} onChange={(v) => updateConfigField("animation", v)}>
											<option value="none">None</option>
											<option value="pulse">Pulse</option>
											<option value="shake">Shake</option>
										</GlassSelect>
									</div>
								</div>
							)}

							{block.type === "embed" && (
								<div className="space-y-3">
									<div className="space-y-1.5">
										<Label>Aspect Ratio</Label>
										<GlassSelect value={parsedConfig.aspectRatio ?? "16:9"} onChange={(v) => updateConfigField("aspectRatio", v)}>
											<option value="16:9">16:9</option>
											<option value="4:3">4:3</option>
											<option value="1:1">1:1</option>
										</GlassSelect>
									</div>
									<div className="space-y-1.5">
										<Label>Max Width</Label>
										<GlassSelect value={parsedConfig.maxWidth ?? "full"} onChange={(v) => updateConfigField("maxWidth", v)}>
											<option value="sm">Small</option>
											<option value="md">Medium</option>
											<option value="lg">Large</option>
											<option value="full">Full</option>
										</GlassSelect>
									</div>
									<div className="flex items-center justify-between">
										<Label>Show Title</Label>
										<button
											type="button"
											role="switch"
											aria-checked={parsedConfig.showTitle !== false}
											onClick={() => updateConfigField("showTitle", parsedConfig.showTitle === false)}
											className={cn(
												"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
												parsedConfig.showTitle !== false ? "bg-primary" : "bg-muted",
											)}
										>
											<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showTitle !== false ? "translate-x-[18px]" : "translate-x-[3px]")} />
										</button>
									</div>
								</div>
							)}

							<details className="pt-2">
								<summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
									Advanced JSON
								</summary>
								<div className="mt-2 space-y-1.5">
									<textarea
										id="edit-config"
										value={config}
										onChange={(e) => setConfig(e.target.value)}
										rows={6}
										placeholder='{"style":"outline","animation":"none"}'
										className="dark:bg-input/30 border-white/15 w-full rounded-lg border bg-transparent backdrop-blur-sm px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
									/>
								</div>
							</details>
						</>
					)}

					{activeTab === "options" && (
						<>
							{block.type === "form" ? (
								<div className="space-y-3">
									<div className="space-y-1.5">
										<Label htmlFor="edit-delivery">Delivery mode</Label>
										<p className="text-[11px] text-muted-foreground">
											How contact form submissions are handled
										</p>
										<div className="flex rounded-lg border border-white/15 overflow-hidden">
											{[
												{ value: "database", label: "Database" },
												{ value: "email", label: "Email" },
												{ value: "both", label: "Both" },
											].map((opt) => (
												<button
													key={opt.value}
													type="button"
													onClick={() => onDeliveryChange(opt.value)}
													className={cn(
														"flex-1 py-1.5 text-xs font-medium transition-colors",
														contactDelivery === opt.value
															? "bg-primary/15 text-primary"
															: "text-muted-foreground hover:text-foreground",
													)}
												>
													{opt.label}
												</button>
											))}
										</div>
									</div>
									<div className="mt-4 space-y-3">
										<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Optional Fields</Label>
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Phone Field</Label>
												<p className="text-[11px] text-muted-foreground">Show phone number input</p>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={!!parsedConfig.showPhone}
												onClick={() => updateConfigField("showPhone", !parsedConfig.showPhone)}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
													parsedConfig.showPhone ? "bg-primary" : "bg-muted",
												)}
											>
												<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showPhone ? "translate-x-[18px]" : "translate-x-[3px]")} />
											</button>
										</div>
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Subject Field</Label>
												<p className="text-[11px] text-muted-foreground">Show subject line input</p>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={!!parsedConfig.showSubject}
												onClick={() => updateConfigField("showSubject", !parsedConfig.showSubject)}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
													parsedConfig.showSubject ? "bg-primary" : "bg-muted",
												)}
											>
												<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showSubject ? "translate-x-[18px]" : "translate-x-[3px]")} />
											</button>
										</div>
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Company Field</Label>
												<p className="text-[11px] text-muted-foreground">Show company name input</p>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={!!parsedConfig.showCompany}
												onClick={() => updateConfigField("showCompany", !parsedConfig.showCompany)}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
													parsedConfig.showCompany ? "bg-primary" : "bg-muted",
												)}
											>
												<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showCompany ? "translate-x-[18px]" : "translate-x-[3px]")} />
											</button>
										</div>
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Where Met Field</Label>
												<p className="text-[11px] text-muted-foreground">Ask where you met (Connect preset)</p>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={!!parsedConfig.showWhereMet}
												onClick={() => updateConfigField("showWhereMet", !parsedConfig.showWhereMet)}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
													parsedConfig.showWhereMet ? "bg-primary" : "bg-muted",
												)}
											>
												<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showWhereMet ? "translate-x-[18px]" : "translate-x-[3px]")} />
											</button>
										</div>
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Rating Field</Label>
												<p className="text-[11px] text-muted-foreground">Show 1-5 star rating (Feedback preset)</p>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={!!parsedConfig.showRating}
												onClick={() => updateConfigField("showRating", !parsedConfig.showRating)}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
													parsedConfig.showRating ? "bg-primary" : "bg-muted",
												)}
											>
												<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showRating ? "translate-x-[18px]" : "translate-x-[3px]")} />
											</button>
										</div>
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Attending Field</Label>
												<p className="text-[11px] text-muted-foreground">Yes/No/Maybe selector (RSVP preset)</p>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={!!parsedConfig.showAttending}
												onClick={() => updateConfigField("showAttending", !parsedConfig.showAttending)}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
													parsedConfig.showAttending ? "bg-primary" : "bg-muted",
												)}
											>
												<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showAttending ? "translate-x-[18px]" : "translate-x-[3px]")} />
											</button>
										</div>
										<div className="flex items-center justify-between">
											<div className="space-y-0.5">
												<Label>Guests Field</Label>
												<p className="text-[11px] text-muted-foreground">Number of guests input (RSVP preset)</p>
											</div>
											<button
												type="button"
												role="switch"
												aria-checked={!!parsedConfig.showGuests}
												onClick={() => updateConfigField("showGuests", !parsedConfig.showGuests)}
												className={cn(
													"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
													parsedConfig.showGuests ? "bg-primary" : "bg-muted",
												)}
											>
												<span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform", parsedConfig.showGuests ? "translate-x-[18px]" : "translate-x-[3px]")} />
											</button>
										</div>
									</div>
								</div>
							) : (
								<div className="space-y-3">
									<p className="text-xs text-muted-foreground">
										Additional options for this block can be configured in the
										Style tab.
									</p>
								</div>
							)}
						</>
					)}

					{activeTab === "schedule" && (
						<>
							<p className="text-xs text-muted-foreground">
								Optionally schedule this block to only be visible during a
								specific time window.
							</p>
							<div className="space-y-1.5">
								<Label htmlFor="edit-start">Start date/time</Label>
								<Input
									id="edit-start"
									type="datetime-local"
									value={scheduledStart}
									onChange={(e) => setScheduledStart(e.target.value)}
									className="dark:bg-input/30 border-white/15"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-end">End date/time</Label>
								<Input
									id="edit-end"
									type="datetime-local"
									value={scheduledEnd}
									onChange={(e) => setScheduledEnd(e.target.value)}
									className="dark:bg-input/30 border-white/15"
								/>
							</div>
							{(scheduledStart || scheduledEnd) && (
								<Button
									variant="ghost"
									size="xs"
									onClick={() => {
										setScheduledStart("");
										setScheduledEnd("");
									}}
								>
									Clear schedule
								</Button>
							)}
						</>
					)}
				</div>

				{/* Footer */}
				<div className="border-t border-white/15 px-4 py-3">
					<Button className="w-full" onClick={handleSave} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</div>
		</div>
	);
}
