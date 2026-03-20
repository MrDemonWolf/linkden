"use client";

import { useState, useEffect, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { type Block, EMBED_URL_PATTERNS, validateEmbedUrl } from "./builder-constants";
import { CollapsibleSection } from "./collapsible-section";

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

function ToggleSwitch({
	checked,
	onToggle,
	label,
	description,
}: {
	checked: boolean;
	onToggle: () => void;
	label: string;
	description?: string;
}) {
	return (
		<div className="flex items-center justify-between">
			<div className="space-y-0.5">
				<Label>{label}</Label>
				{description && (
					<p className="text-[11px] text-muted-foreground">{description}</p>
				)}
			</div>
			<button
				type="button"
				role="switch"
				aria-checked={checked}
				onClick={onToggle}
				className={cn(
					"relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors",
					checked ? "bg-primary" : "bg-muted",
				)}
			>
				<span
					className={cn(
						"inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform",
						checked ? "translate-x-[18px]" : "translate-x-[3px]",
					)}
				/>
			</button>
		</div>
	);
}

function SegmentedControl({
	value,
	options,
	onChange,
}: {
	value: string;
	options: Array<{ value: string; label: string; svg?: React.ReactNode }>;
	onChange: (value: string) => void;
}) {
	return (
		<div className="flex rounded-lg border border-white/15 overflow-hidden">
			{options.map((opt) => (
				<button
					key={opt.value}
					type="button"
					onClick={() => onChange(opt.value)}
					className={cn(
						"flex-1 flex flex-col items-center gap-1 py-1.5 text-xs font-medium transition-colors",
						value === opt.value
							? "bg-primary/15 text-primary"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{opt.svg && (
						<svg viewBox="0 0 24 24" className="h-5 w-5">
							{opt.svg}
						</svg>
					)}
					{opt.label}
				</button>
			))}
		</div>
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
	onChange?: (data: Partial<Block>) => void;
}) {
	const panelRef = useRef<HTMLDivElement>(null);
	const [title, setTitle] = useState(block.title ?? "");
	const [url, setUrl] = useState(block.url ?? "");
	const [icon, setIcon] = useState(block.icon ?? "");
	const [embedType, setEmbedType] = useState(block.embedType ?? "");
	const [embedUrl, setEmbedUrl] = useState(block.embedUrl ?? "");
	const [config, setConfig] = useState(block.config ?? "{}");
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
			config: config || null,
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	}, [title, url, icon, config, embedType, embedUrl, scheduledStart, scheduledEnd]);

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
			config: config || null,
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	};

	const hasSchedule = !!(scheduledStart || scheduledEnd);

	return (
		<div ref={panelRef} className="flex h-full flex-col">
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

				{/* Scrollable content */}
				<div className="flex-1 overflow-y-auto">
					{/* ── CONTENT (always visible, not collapsible) ── */}
					<div className="space-y-3 px-4 py-4">
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

						{block.type === "link" && (
							<>
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
								<div className="space-y-1.5">
									<Label htmlFor="edit-description">Description</Label>
									<Input
										id="edit-description"
										value={parsedConfig.description ?? ""}
										onChange={(e) => updateConfigField("description", e.target.value)}
										placeholder="Brief description of the link"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
							</>
						)}

						{block.type === "embed" && (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="edit-embed-type">Embed Type</Label>
									<GlassSelect id="edit-embed-type" value={embedType} onChange={setEmbedType}>
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

						{block.type === "connect" && (
							<>
								<div className="space-y-1.5">
									<Label>Display Mode</Label>
									<SegmentedControl
										value={parsedConfig.displayMode ?? "modal"}
										options={[
											{ value: "inline", label: "Inline" },
											{ value: "modal", label: "Modal" },
										]}
										onChange={(v) => updateConfigField("displayMode", v)}
									/>
									<p className="text-[11px] text-muted-foreground">
										{parsedConfig.displayMode === "inline"
											? "Form renders directly in the block list"
											: "Button opens the form in a modal"}
									</p>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="edit-button-text">Button Text</Label>
									<Input
										id="edit-button-text"
										value={parsedConfig.buttonText ?? "Connect With Me"}
										onChange={(e) => updateConfigField("buttonText", e.target.value)}
										placeholder="Connect With Me"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="edit-button-emoji">Button Emoji</Label>
									<Input
										id="edit-button-emoji"
										value={parsedConfig.buttonEmoji ?? ""}
										onChange={(e) => updateConfigField("buttonEmoji", e.target.value)}
										placeholder="e.g. 🤝"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Emoji Position</Label>
									<SegmentedControl
										value={parsedConfig.buttonEmojiPosition ?? "left"}
										options={[
											{ value: "left", label: "Left" },
											{ value: "right", label: "Right" },
										]}
										onChange={(v) => updateConfigField("buttonEmojiPosition", v)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="edit-success-msg">Success Message</Label>
									<Input
										id="edit-success-msg"
										value={parsedConfig.successMessage ?? "Thanks for connecting! I'll be in touch."}
										onChange={(e) => updateConfigField("successMessage", e.target.value)}
										placeholder="Thanks for connecting! I'll be in touch."
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
							</>
						)}

						{block.type === "vcard" && (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="edit-vcard-button-text">Button Text</Label>
									<Input
										id="edit-vcard-button-text"
										value={parsedConfig.buttonText ?? "Download Contact"}
										onChange={(e) => updateConfigField("buttonText", e.target.value)}
										placeholder="Download Contact"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="edit-vcard-button-emoji">Button Emoji</Label>
									<Input
										id="edit-vcard-button-emoji"
										value={parsedConfig.buttonEmoji ?? ""}
										onChange={(e) => updateConfigField("buttonEmoji", e.target.value)}
										placeholder="e.g. 📇"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Emoji Position</Label>
									<SegmentedControl
										value={parsedConfig.buttonEmojiPosition ?? "left"}
										options={[
											{ value: "left", label: "Left" },
											{ value: "right", label: "Right" },
										]}
										onChange={(v) => updateConfigField("buttonEmojiPosition", v)}
									/>
								</div>

								<div className="pt-2">
									<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personal</Label>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-fullname">Full Name</Label>
									<Input id="vc-fullname" value={parsedConfig.fullName ?? ""} onChange={(e) => updateConfigField("fullName", e.target.value)} placeholder="John Doe" className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-nickname">Nickname</Label>
									<Input id="vc-nickname" value={parsedConfig.nickname ?? ""} onChange={(e) => updateConfigField("nickname", e.target.value)} placeholder="Johnny" className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-birthday">Birthday</Label>
									<Input id="vc-birthday" type="date" value={parsedConfig.birthday ?? ""} onChange={(e) => updateConfigField("birthday", e.target.value)} className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-photo">Photo URL</Label>
									<Input id="vc-photo" value={parsedConfig.photo ?? ""} onChange={(e) => updateConfigField("photo", e.target.value)} placeholder="https://example.com/photo.jpg" className="dark:bg-input/30 border-white/15" />
								</div>

								<div className="pt-2">
									<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Organization</Label>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-org">Organization</Label>
									<Input id="vc-org" value={parsedConfig.org ?? ""} onChange={(e) => updateConfigField("org", e.target.value)} placeholder="Acme Inc." className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-jobtitle">Job Title</Label>
									<Input id="vc-jobtitle" value={parsedConfig.title ?? ""} onChange={(e) => updateConfigField("title", e.target.value)} placeholder="Software Engineer" className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-department">Department</Label>
									<Input id="vc-department" value={parsedConfig.department ?? ""} onChange={(e) => updateConfigField("department", e.target.value)} placeholder="Engineering" className="dark:bg-input/30 border-white/15" />
								</div>

								<div className="pt-2">
									<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Contact</Label>
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-email">Personal Email</Label>
									<Input id="vc-email" type="email" value={parsedConfig.email ?? ""} onChange={(e) => updateConfigField("email", e.target.value)} placeholder="john@example.com" className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-work-email">Work Email</Label>
									<Input id="vc-work-email" type="email" value={parsedConfig.workEmail ?? ""} onChange={(e) => updateConfigField("workEmail", e.target.value)} placeholder="john@company.com" className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-phone">Personal Phone</Label>
									<Input id="vc-phone" type="tel" value={parsedConfig.phone ?? ""} onChange={(e) => updateConfigField("phone", e.target.value)} placeholder="+1 555-0123" className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-work-phone">Work Phone</Label>
									<Input id="vc-work-phone" type="tel" value={parsedConfig.workPhone ?? ""} onChange={(e) => updateConfigField("workPhone", e.target.value)} placeholder="+1 555-0456" className="dark:bg-input/30 border-white/15" />
								</div>
								<div className="space-y-1.5">
									<Label htmlFor="vc-address">Address</Label>
									<Input id="vc-address" value={parsedConfig.address ?? ""} onChange={(e) => updateConfigField("address", e.target.value)} placeholder="123 Main St, City, State" className="dark:bg-input/30 border-white/15" />
								</div>

								<div className="pt-2">
									<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">URLs</Label>
								</div>
								{(parsedConfig.urls as Array<{ label: string; url: string }> ?? []).map((urlItem: { label: string; url: string }, idx: number) => (
									<div key={idx} className="flex gap-2 items-end">
										<div className="flex-1 space-y-1">
											<Label className="text-[11px]">Label</Label>
											<Input
												value={urlItem.label}
												onChange={(e) => {
													const urls = [...(parsedConfig.urls ?? [])];
													urls[idx] = { ...urls[idx], label: e.target.value };
													updateConfigField("urls", urls);
												}}
												placeholder="Website"
												className="dark:bg-input/30 border-white/15 h-8 text-xs"
											/>
										</div>
										<div className="flex-[2] space-y-1">
											<Label className="text-[11px]">URL</Label>
											<Input
												value={urlItem.url}
												onChange={(e) => {
													const urls = [...(parsedConfig.urls ?? [])];
													urls[idx] = { ...urls[idx], url: e.target.value };
													updateConfigField("urls", urls);
												}}
												placeholder="https://example.com"
												className="dark:bg-input/30 border-white/15 h-8 text-xs"
											/>
										</div>
										<button
											type="button"
											onClick={() => {
												const urls = [...(parsedConfig.urls ?? [])];
												urls.splice(idx, 1);
												updateConfigField("urls", urls);
											}}
											className="flex h-8 w-8 shrink-0 items-center justify-center text-muted-foreground hover:text-destructive"
										>
											<Trash2 className="h-3.5 w-3.5" />
										</button>
									</div>
								))}
								<button
									type="button"
									onClick={() => {
										const urls = [...(parsedConfig.urls ?? []), { label: "", url: "" }];
										updateConfigField("urls", urls);
									}}
									className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/15 dark:bg-input/30 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
								>
									<Plus className="h-3 w-3" />
									Add URL
								</button>
							</>
						)}

						{block.type === "location" && (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="edit-address">Address</Label>
									<Input
										id="edit-address"
										value={parsedConfig.address ?? ""}
										onChange={(e) => updateConfigField("address", e.target.value)}
										placeholder="San Francisco, CA"
										className="dark:bg-input/30 border-white/15"
									/>
								</div>
								<div className="space-y-1.5">
									<Label>Link Type</Label>
									<SegmentedControl
										value={parsedConfig.linkType ?? "none"}
										options={[
											{ value: "google", label: "Google" },
											{ value: "apple", label: "Apple" },
											{ value: "custom", label: "Custom" },
											{ value: "none", label: "None" },
										]}
										onChange={(v) => updateConfigField("linkType", v)}
									/>
								</div>
								{parsedConfig.linkType === "custom" && (
									<div className="space-y-1.5">
										<Label htmlFor="edit-custom-link">Custom Link URL</Label>
										<Input
											id="edit-custom-link"
											value={parsedConfig.customLinkUrl ?? ""}
											onChange={(e) => updateConfigField("customLinkUrl", e.target.value)}
											placeholder="https://maps.example.com/..."
											className="dark:bg-input/30 border-white/15"
										/>
									</div>
								)}
								{(parsedConfig.linkType === "google" || parsedConfig.linkType === "apple") && parsedConfig.address && (
									<div className="space-y-1">
										<Label className="text-[11px] text-muted-foreground">Generated URL</Label>
										<p className="text-[11px] font-mono text-muted-foreground break-all">
											{parsedConfig.linkType === "google"
												? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parsedConfig.address as string)}`
												: `https://maps.apple.com/?q=${encodeURIComponent(parsedConfig.address as string)}`}
										</p>
									</div>
								)}
							</>
						)}

					</div>

					{/* ── STYLE (collapsible, default open) ── */}
					<CollapsibleSection label="Style" defaultOpen>
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
							<>
								<ToggleSwitch
									checked={!!parsedConfig.isHighlighted}
									onToggle={() => updateConfigField("isHighlighted", !parsedConfig.isHighlighted)}
									label="Highlighted"
									description="Uses accent color background"
								/>
								<ToggleSwitch
									checked={!!parsedConfig.noFollow}
									onToggle={() => updateConfigField("noFollow", !parsedConfig.noFollow)}
									label="No Follow"
								/>
								<ToggleSwitch
									checked={!!parsedConfig.newTab}
									onToggle={() => updateConfigField("newTab", !parsedConfig.newTab)}
									label="Open in New Tab"
								/>
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
							</>
						)}

						{(block.type === "connect" || block.type === "vcard") && (
							<>
								<ToggleSwitch
									checked={!!parsedConfig.isOutlined}
									onToggle={() => updateConfigField("isOutlined", !parsedConfig.isOutlined)}
									label="Outlined Style"
								/>
								<div className="space-y-1.5">
									<Label>Animation</Label>
									<GlassSelect value={parsedConfig.animation ?? "none"} onChange={(v) => updateConfigField("animation", v)}>
										<option value="none">None</option>
										<option value="pulse">Pulse</option>
										<option value="shake">Shake</option>
									</GlassSelect>
								</div>
							</>
						)}

						{block.type === "embed" && (
							<>
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
								<ToggleSwitch
									checked={parsedConfig.showTitle !== false}
									onToggle={() => updateConfigField("showTitle", parsedConfig.showTitle === false)}
									label="Show Title"
								/>
							</>
						)}
					</CollapsibleSection>

					{/* ── FORM FIELDS (collapsible, default open — form blocks only) ── */}

					{/* ── SCHEDULE (collapsible, default closed unless schedule is set) ── */}
					<CollapsibleSection label="Schedule" defaultOpen={hasSchedule}>
						<p className="text-xs text-muted-foreground">
							Optionally schedule this block to only be visible during a specific time window.
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
						{hasSchedule && (
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
					</CollapsibleSection>

					{/* ── ADVANCED (collapsible, default closed) ── */}
					<CollapsibleSection label="Advanced">
						<div className="space-y-1.5">
							<Label htmlFor="edit-config">Config JSON</Label>
							<textarea
								id="edit-config"
								value={config}
								onChange={(e) => setConfig(e.target.value)}
								rows={6}
								placeholder='{"style":"outline","animation":"none"}'
								className="dark:bg-input/30 border-white/15 w-full rounded-lg border bg-transparent backdrop-blur-sm px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring"
							/>
						</div>
					</CollapsibleSection>
				</div>

				{/* Footer */}
				<div className="border-t border-white/15 px-4 py-3">
					<Button className="w-full" onClick={handleSave} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</div>
	);
}
