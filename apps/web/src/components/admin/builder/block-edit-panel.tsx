"use client";

import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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
}: {
	block: Block;
	onClose: () => void;
	onSave: (data: Partial<Block>) => void;
	isSaving: boolean;
	contactDelivery: string;
	onDeliveryChange: (value: string) => void;
}) {
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
							{block.type === "social_icons" && (
								<div className="space-y-1.5">
									<Label htmlFor="edit-social">Social Icons (JSON)</Label>
									<textarea
										id="edit-social"
										value={socialIcons}
										onChange={(e) => setSocialIcons(e.target.value)}
										placeholder='[{"platform":"twitter","url":"https://twitter.com/you"}]'
										rows={4}
										className="dark:bg-input/30 border-white/15 w-full rounded-lg border bg-transparent backdrop-blur-sm px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
									/>
								</div>
							)}
						</>
					)}

					{activeTab === "style" && (
						<>
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
							{block.type === "contact_form" ? (
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
