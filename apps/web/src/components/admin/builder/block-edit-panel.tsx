"use client";

import { useState, useEffect, useId, useRef } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ColorField } from "../color-field";
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
			className="dark:bg-input/30 border-input h-8 w-full rounded-lg border bg-transparent px-2.5 text-xs outline-none focus:ring-1 focus:ring-ring appearance-none cursor-pointer"
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
	const id = useId();
	return (
		<div className="flex items-center justify-between">
			<div className="space-y-0.5">
				<Label htmlFor={id}>{label}</Label>
				{description && <p className="text-micro text-muted-foreground">{description}</p>}
			</div>
			<Switch id={id} checked={checked} onCheckedChange={() => onToggle()} aria-label={label} />
		</div>
	);
}

function SegmentedControl({
	value,
	options,
	onChange,
	ariaLabelledby,
}: {
	value: string;
	options: Array<{ value: string; label: string; svg?: React.ReactNode }>;
	onChange: (value: string) => void;
	ariaLabelledby?: string;
}) {
	return (
		// biome-ignore lint/a11y/useSemanticElements: fieldset does not support flex layout in Chromium/WebKit; role="group" carries the aria-labelledby association instead
		<div
			role="group"
			aria-labelledby={ariaLabelledby}
			className="flex rounded-lg border border-input overflow-hidden"
		>
			{options.map((opt) => (
				<button
					key={opt.value}
					type="button"
					aria-pressed={value === opt.value}
					onClick={() => onChange(opt.value)}
					className={cn(
						"flex-1 flex flex-col items-center gap-1 py-1.5 text-xs font-medium transition-colors",
						value === opt.value
							? "bg-primary/15 text-primary"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{opt.svg && (
						<svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
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
	onDelete,
	isSaving,
	onChange,
}: {
	block: Block;
	onClose: () => void;
	onSave: (data: Partial<Block>) => void;
	onDelete?: () => void;
	isSaving: boolean;
	socialNetworks?: Array<{ slug: string; name: string; url: string; hex: string; svgPath: string }>;
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
			socialIcons: null,
			config: config || null,
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	}, [
		title,
		url,
		icon,
		config,
		embedType,
		embedUrl,
		scheduledStart,
		scheduledEnd,
		onChange,
		block.id,
	]);

	// Auto-focus first input when panel opens
	useEffect(() => {
		const timer = setTimeout(() => {
			const firstInput =
				panelRef.current?.querySelector<HTMLInputElement>("input, textarea, select");
			firstInput?.focus();
		}, 100);
		return () => clearTimeout(timer);
	}, []);

	// Validate the raw config JSON. When invalid we surface an inline error and
	// block saving so a typo in the Advanced editor can't silently wipe the
	// structured fields (which fall back to {} on parse failure).
	const configError = (() => {
		if (!config.trim()) return null;
		try {
			JSON.parse(config);
			return null;
		} catch {
			return "Invalid JSON — fix or clear this to save.";
		}
	})();

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
			socialIcons: null,
			config: config || null,
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	};

	const hasSchedule = !!(scheduledStart || scheduledEnd);

	return (
		<div
			ref={panelRef}
			className="flex h-full flex-col rounded-xl border border-border bg-card/80 backdrop-blur-xl shadow-xl"
		>
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<h3 className="text-sm font-medium">
					Edit {block.type === "connect" ? "Connect With Me" : block.type.replace("_", " ")}
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
					aria-label="Close edit panel"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto">
				{/* CONTENT (always visible) */}
				<div className="space-y-3 px-4 py-4">
					<div className="space-y-1.5">
						<Label htmlFor="edit-title">Title</Label>
						<Input
							id="edit-title"
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="Block title"
							className="dark:bg-input/30 border-input"
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
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-description">Description</Label>
								<Input
									id="edit-description"
									value={parsedConfig.description ?? ""}
									onChange={(e) => updateConfigField("description", e.target.value)}
									placeholder="Brief description of the link"
									className="dark:bg-input/30 border-input"
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
									className={cn(
										"dark:bg-input/30 border-input",
										embedUrlError && "border-destructive",
									)}
								/>
								{embedUrlError && <p className="text-micro text-destructive">{embedUrlError}</p>}
							</div>
						</>
					)}

					{block.type === "connect" && (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="edit-preset">Preset</Label>
								<GlassSelect
									id="edit-preset"
									value={parsedConfig.preset ?? "contact"}
									onChange={(v) => {
										updateConfigField("preset", v);
										const presetDefaults: Record<
											string,
											{
												buttonText: string;
												buttonEmoji?: string;
												successMessage?: string;
												showPhone?: boolean;
												showCompany?: boolean;
												showWhereMet?: boolean;
												showRating?: boolean;
												showAttending?: boolean;
												showGuests?: boolean;
											}
										> = {
											contact: {
												buttonText: "Contact Me",
												buttonEmoji: "",
												successMessage: "Thanks for reaching out!",
											},
											connect: {
												buttonText: "Connect with Me",
												buttonEmoji: "",
												successMessage: "Thanks for connecting!",
												showPhone: true,
												showCompany: true,
												showWhereMet: true,
											},
											feedback: {
												buttonText: "Leave Feedback",
												buttonEmoji: "",
												successMessage: "Thanks for your feedback!",
												showRating: true,
											},
											rsvp: {
												buttonText: "RSVP",
												buttonEmoji: "",
												successMessage: "Your RSVP has been received!",
												showAttending: true,
												showGuests: true,
											},
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
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-button-emoji">Button Emoji</Label>
								<Input
									id="edit-button-emoji"
									value={parsedConfig.buttonEmoji ?? ""}
									onChange={(e) => updateConfigField("buttonEmoji", e.target.value)}
									placeholder="e.g. envelope"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label id="edit-emoji-position-label">Emoji Position</Label>
								<SegmentedControl
									value={parsedConfig.buttonEmojiPosition ?? "left"}
									options={[
										{ value: "left", label: "Left" },
										{ value: "right", label: "Right" },
									]}
									onChange={(v) => updateConfigField("buttonEmojiPosition", v)}
									ariaLabelledby="edit-emoji-position-label"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-success-msg">Success Message</Label>
								<Input
									id="edit-success-msg"
									value={parsedConfig.successMessage ?? "Thanks for reaching out!"}
									onChange={(e) => updateConfigField("successMessage", e.target.value)}
									placeholder="Thanks for reaching out!"
									className="dark:bg-input/30 border-input"
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
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-vcard-button-emoji">Button Emoji</Label>
								<Input
									id="edit-vcard-button-emoji"
									value={parsedConfig.buttonEmoji ?? ""}
									onChange={(e) => updateConfigField("buttonEmoji", e.target.value)}
									placeholder="e.g. contact"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label id="edit-vcard-emoji-position-label">Emoji Position</Label>
								<SegmentedControl
									value={parsedConfig.buttonEmojiPosition ?? "left"}
									options={[
										{ value: "left", label: "Left" },
										{ value: "right", label: "Right" },
									]}
									onChange={(v) => updateConfigField("buttonEmojiPosition", v)}
									ariaLabelledby="edit-vcard-emoji-position-label"
								/>
							</div>

							<div className="pt-2">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Personal
								</Label>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-fullname">Full Name</Label>
								<Input
									id="vc-fullname"
									value={parsedConfig.fullName ?? ""}
									onChange={(e) => updateConfigField("fullName", e.target.value)}
									placeholder="John Doe"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-nickname">Nickname</Label>
								<Input
									id="vc-nickname"
									value={parsedConfig.nickname ?? ""}
									onChange={(e) => updateConfigField("nickname", e.target.value)}
									placeholder="Johnny"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-birthday">Birthday</Label>
								<Input
									id="vc-birthday"
									type="date"
									value={parsedConfig.birthday ?? ""}
									onChange={(e) => updateConfigField("birthday", e.target.value)}
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-photo">Photo URL</Label>
								<Input
									id="vc-photo"
									value={parsedConfig.photo ?? ""}
									onChange={(e) => updateConfigField("photo", e.target.value)}
									placeholder="https://example.com/photo.jpg"
									className="dark:bg-input/30 border-input"
								/>
							</div>

							<div className="pt-2">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Organization
								</Label>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-org">Organization</Label>
								<Input
									id="vc-org"
									value={parsedConfig.org ?? ""}
									onChange={(e) => updateConfigField("org", e.target.value)}
									placeholder="Acme Inc."
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-jobtitle">Job Title</Label>
								<Input
									id="vc-jobtitle"
									value={parsedConfig.title ?? ""}
									onChange={(e) => updateConfigField("title", e.target.value)}
									placeholder="Software Engineer"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-department">Department</Label>
								<Input
									id="vc-department"
									value={parsedConfig.department ?? ""}
									onChange={(e) => updateConfigField("department", e.target.value)}
									placeholder="Engineering"
									className="dark:bg-input/30 border-input"
								/>
							</div>

							<div className="pt-2">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									Contact
								</Label>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-email">Personal Email</Label>
								<Input
									id="vc-email"
									type="email"
									value={parsedConfig.email ?? ""}
									onChange={(e) => updateConfigField("email", e.target.value)}
									placeholder="john@example.com"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-work-email">Work Email</Label>
								<Input
									id="vc-work-email"
									type="email"
									value={parsedConfig.workEmail ?? ""}
									onChange={(e) => updateConfigField("workEmail", e.target.value)}
									placeholder="john@company.com"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-phone">Personal Phone</Label>
								<Input
									id="vc-phone"
									type="tel"
									value={parsedConfig.phone ?? ""}
									onChange={(e) => updateConfigField("phone", e.target.value)}
									placeholder="+1 555-0123"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-work-phone">Work Phone</Label>
								<Input
									id="vc-work-phone"
									type="tel"
									value={parsedConfig.workPhone ?? ""}
									onChange={(e) => updateConfigField("workPhone", e.target.value)}
									placeholder="+1 555-0456"
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="vc-address">Address</Label>
								<Input
									id="vc-address"
									value={parsedConfig.address ?? ""}
									onChange={(e) => updateConfigField("address", e.target.value)}
									placeholder="123 Main St, City, State"
									className="dark:bg-input/30 border-input"
								/>
							</div>

							<div className="pt-2">
								<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
									URLs
								</Label>
							</div>
							{((parsedConfig.urls as Array<{ label: string; url: string }>) ?? []).map(
								(urlItem: { label: string; url: string }, idx: number) => (
									<div key={idx} className="flex gap-2 items-end">
										<div className="flex-1 space-y-1">
											<Label className="text-micro">Label</Label>
											<Input
												aria-label="URL label"
												value={urlItem.label}
												onChange={(e) => {
													const urls = [...(parsedConfig.urls ?? [])];
													urls[idx] = { ...urls[idx], label: e.target.value };
													updateConfigField("urls", urls);
												}}
												placeholder="Website"
												className="dark:bg-input/30 border-input h-8 text-xs"
											/>
										</div>
										<div className="flex-[2] space-y-1">
											<Label className="text-micro">URL</Label>
											<Input
												aria-label="URL address"
												value={urlItem.url}
												onChange={(e) => {
													const urls = [...(parsedConfig.urls ?? [])];
													urls[idx] = { ...urls[idx], url: e.target.value };
													updateConfigField("urls", urls);
												}}
												placeholder="https://example.com"
												className="dark:bg-input/30 border-input h-8 text-xs"
											/>
										</div>
										<button
											type="button"
											aria-label="Remove URL"
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
								),
							)}
							<button
								type="button"
								onClick={() => {
									const urls = [...(parsedConfig.urls ?? []), { label: "", url: "" }];
									updateConfigField("urls", urls);
								}}
								className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-input dark:bg-input/30 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent"
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
									className="dark:bg-input/30 border-input"
								/>
							</div>
							<div className="space-y-1.5">
								<Label id="edit-link-type-label">Link Type</Label>
								<SegmentedControl
									value={parsedConfig.linkType ?? "none"}
									options={[
										{ value: "google", label: "Google" },
										{ value: "apple", label: "Apple" },
										{ value: "custom", label: "Custom" },
										{ value: "none", label: "None" },
									]}
									onChange={(v) => updateConfigField("linkType", v)}
									ariaLabelledby="edit-link-type-label"
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
										className="dark:bg-input/30 border-input"
									/>
								</div>
							)}
							{(parsedConfig.linkType === "google" || parsedConfig.linkType === "apple") &&
								parsedConfig.address && (
									<div className="space-y-1">
										<Label className="text-micro text-muted-foreground">Generated URL</Label>
										<p className="text-micro font-mono text-muted-foreground break-all">
											{parsedConfig.linkType === "google"
												? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parsedConfig.address as string)}`
												: `https://maps.apple.com/?q=${encodeURIComponent(parsedConfig.address as string)}`}
										</p>
									</div>
								)}
						</>
					)}
				</div>

				{/* STYLE (collapsible) */}
				<CollapsibleSection label="Style" defaultOpen>
					<div className="space-y-1.5">
						<Label htmlFor="edit-icon">Icon name</Label>
						<Input
							id="edit-icon"
							value={icon}
							onChange={(e) => setIcon(e.target.value)}
							placeholder="e.g. globe, github, twitter"
							className="dark:bg-input/30 border-input"
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
								<Label htmlFor="edit-animation">Animation</Label>
								<GlassSelect
									id="edit-animation"
									value={parsedConfig.animation ?? "none"}
									onChange={(v) => updateConfigField("animation", v)}
								>
									<option value="none">None</option>
									<option value="pulse">Pulse</option>
									<option value="shake">Shake</option>
								</GlassSelect>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-thumbnail">Thumbnail URL</Label>
								<Input
									id="edit-thumbnail"
									value={parsedConfig.thumbnail ?? ""}
									onChange={(e) => updateConfigField("thumbnail", e.target.value)}
									placeholder="https://example.com/thumb.jpg"
									className="dark:bg-input/30 border-input"
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
								<Label htmlFor="edit-animation">Animation</Label>
								<GlassSelect
									id="edit-animation"
									value={parsedConfig.animation ?? "none"}
									onChange={(v) => updateConfigField("animation", v)}
								>
									<option value="none">None</option>
									<option value="pulse">Pulse</option>
									<option value="shake">Shake</option>
								</GlassSelect>
							</div>
						</>
					)}

					{(block.type === "link" || block.type === "connect" || block.type === "vcard") && (
						<div className="grid gap-3 sm:grid-cols-2">
							<ColorField
								id="edit-custom-bg"
								label="Custom background"
								value={(parsedConfig.customBgColor as string) ?? ""}
								onChange={(v) => updateConfigField("customBgColor", v || undefined)}
								placeholder="Theme default"
							/>
							<ColorField
								id="edit-custom-text"
								label="Custom text"
								value={(parsedConfig.customTextColor as string) ?? ""}
								onChange={(v) => updateConfigField("customTextColor", v || undefined)}
								placeholder="Theme default"
								contrastAgainst={
									(parsedConfig.customBgColor as string)
										? {
												hex: parsedConfig.customBgColor as string,
												label: "custom background",
											}
										: undefined
								}
							/>
						</div>
					)}

					{block.type === "embed" && (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="edit-aspect-ratio">Aspect Ratio</Label>
								<GlassSelect
									id="edit-aspect-ratio"
									value={parsedConfig.aspectRatio ?? "16:9"}
									onChange={(v) => updateConfigField("aspectRatio", v)}
								>
									<option value="16:9">16:9</option>
									<option value="4:3">4:3</option>
									<option value="1:1">1:1</option>
								</GlassSelect>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor="edit-max-width">Max Width</Label>
								<GlassSelect
									id="edit-max-width"
									value={parsedConfig.maxWidth ?? "full"}
									onChange={(v) => updateConfigField("maxWidth", v)}
								>
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

				{/* CONNECT FORM FIELDS (collapsible) */}
				{block.type === "connect" && (
					<CollapsibleSection label="Form Fields" defaultOpen>
						<div className="mt-2 space-y-3">
							<Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Optional Fields
							</Label>
							<ToggleSwitch
								checked={!!parsedConfig.showPhone}
								onToggle={() => updateConfigField("showPhone", !parsedConfig.showPhone)}
								label="Phone Field"
								description="Show phone number input"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showSubject}
								onToggle={() => updateConfigField("showSubject", !parsedConfig.showSubject)}
								label="Subject Field"
								description="Show subject line input"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showCompany}
								onToggle={() => updateConfigField("showCompany", !parsedConfig.showCompany)}
								label="Company Field"
								description="Show company name input"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showWhereMet}
								onToggle={() => updateConfigField("showWhereMet", !parsedConfig.showWhereMet)}
								label="Where Met Field"
								description="Ask where you met (Connect preset)"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showRating}
								onToggle={() => updateConfigField("showRating", !parsedConfig.showRating)}
								label="Rating Field"
								description="Show 1-5 star rating (Feedback preset)"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showAttending}
								onToggle={() => updateConfigField("showAttending", !parsedConfig.showAttending)}
								label="Attending Field"
								description="Yes/No/Maybe selector (RSVP preset)"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showGuests}
								onToggle={() => updateConfigField("showGuests", !parsedConfig.showGuests)}
								label="Guests Field"
								description="Number of guests input (RSVP preset)"
							/>
						</div>
					</CollapsibleSection>
				)}

				{/* SCHEDULE (collapsible) */}
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
							className="dark:bg-input/30 border-input"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="edit-end">End date/time</Label>
						<Input
							id="edit-end"
							type="datetime-local"
							value={scheduledEnd}
							onChange={(e) => setScheduledEnd(e.target.value)}
							className="dark:bg-input/30 border-input"
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

				{/* ADVANCED (collapsible) */}
				<CollapsibleSection label="Advanced">
					<div className="space-y-1.5">
						<Label htmlFor="edit-config">Config JSON</Label>
						<textarea
							id="edit-config"
							value={config}
							onChange={(e) => setConfig(e.target.value)}
							rows={6}
							placeholder='{"style":"outline","animation":"none"}'
							aria-invalid={!!configError}
							aria-describedby={configError ? "edit-config-error" : undefined}
							className={cn(
								"dark:bg-input/30 w-full rounded-lg border bg-transparent backdrop-blur-sm px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring",
								configError ? "border-destructive" : "border-input",
							)}
						/>
						{configError && (
							<p id="edit-config-error" className="text-micro text-destructive">
								{configError}
							</p>
						)}
					</div>
				</CollapsibleSection>
			</div>

			{/* Footer */}
			<div className="flex gap-2 border-t border-border px-4 py-3">
				{onDelete && (
					<Button
						variant="outline"
						className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
						onClick={onDelete}
						aria-label="Delete block"
					>
						<Trash2 className="h-4 w-4" />
					</Button>
				)}
				<Button
					className="flex-1"
					onClick={handleSave}
					disabled={isSaving || !!configError || !!embedUrlError}
				>
					{isSaving ? "Saving..." : "Save Changes"}
				</Button>
			</div>
		</div>
	);
}
