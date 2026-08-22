"use client";

import { type BlockType, blockTypeSchema, httpUrlSchema } from "@linkden/validators/blocks";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, type SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { isoToLocal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { configErrors, fieldError } from "@/lib/validate";
import { trpc } from "@/utils/trpc";
import { ColorField } from "../color-field";
import { ImageUploadField } from "../image-upload-field";
import { type Block, EMBED_URL_PATTERNS, validateEmbedUrl } from "./builder-constants";
import { CollapsibleSection } from "./collapsible-section";
import { IconPicker } from "./icon-picker";

// Mirrors `blockFieldsSchema.title` in @linkden/validators — kept local because
// the server schema doesn't export the per-column pieces.
const titleSchema = z.string().max(200);
const emailSchema = z.email();
const TEXT_BODY_MAX = 2000;

/** Blank means "cleared" everywhere in this editor; only filled values are checked. */
function optionalError(schema: z.ZodType, value: unknown): string | null {
	return typeof value === "string" && value ? fieldError(schema, value) : null;
}

// Flipped by a save attempt: every field shows its error, not just the ones
// the admin has already left. Until then a field validates on blur, so typing
// "h" into a URL doesn't immediately announce "Enter a full URL…".
const ShowAllErrors = createContext(false);

/** Blur-gated error: null until the field has been left or a save was attempted. */
function useVisibleError(error: string | null | undefined) {
	const [touched, setTouched] = useState(false);
	const showAll = useContext(ShowAllErrors);
	return {
		visibleError: touched || showAll ? (error ?? null) : null,
		markTouched: () => setTouched(true),
	};
}

function FieldError({ id, error }: { id: string; error: string | null | undefined }) {
	if (!error) return null;
	return (
		<p id={id} role="status" className="text-micro text-destructive">
			{error}
		</p>
	);
}

function Hint({ children }: { children: React.ReactNode }) {
	return <p className="text-micro text-muted-foreground">{children}</p>;
}

function TextField({
	id,
	label,
	value,
	onChange,
	placeholder,
	type = "text",
	error,
	hint,
	maxLength,
}: {
	id: string;
	label: string;
	value: string;
	onChange: (value: string) => void;
	placeholder?: string;
	type?: string;
	error?: string | null;
	hint?: string;
	maxLength?: number;
}) {
	const errorId = `${id}-error`;
	const { visibleError, markTouched } = useVisibleError(error);
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-small">
				{label}
			</Label>
			<Input
				id={id}
				type={type}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={markTouched}
				placeholder={placeholder}
				maxLength={maxLength}
				aria-invalid={!!visibleError}
				aria-describedby={visibleError ? errorId : undefined}
				className="dark:bg-input/30 border-input"
			/>
			{hint && !visibleError && <Hint>{hint}</Hint>}
			<FieldError id={errorId} error={visibleError} />
		</div>
	);
}

function SelectField({
	id,
	label,
	value,
	onValueChange,
	items,
	hint,
	placeholder,
}: {
	id: string;
	label: string;
	value: string;
	onValueChange: (value: string) => void;
	items: readonly SelectItem[];
	hint?: string;
	placeholder?: string;
}) {
	return (
		<div className="space-y-1.5">
			<Label htmlFor={id} className="text-small">
				{label}
			</Label>
			<Select
				id={id}
				value={value}
				onValueChange={onValueChange}
				items={items}
				placeholder={placeholder}
			/>
			{hint && <Hint>{hint}</Hint>}
		</div>
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
		<div className="flex items-center justify-between gap-3">
			<div className="space-y-0.5">
				<Label htmlFor={id} className="text-small">
					{label}
				</Label>
				{description && <Hint>{description}</Hint>}
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
	options: Array<{ value: string; label: string }>;
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
						"flex min-h-11 flex-1 items-center justify-center px-2 text-xs font-medium transition-colors md:min-h-8",
						value === opt.value
							? "bg-primary/15 text-primary"
							: "text-muted-foreground hover:text-foreground",
					)}
				>
					{opt.label}
				</button>
			))}
		</div>
	);
}

function SectionLabel({ children }: { children: React.ReactNode }) {
	return (
		<div className="pt-2">
			<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
				{children}
			</p>
		</div>
	);
}

const CONNECT_PRESET_DEFAULTS: Record<
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

const EMOJI_SIDE_OPTIONS = [
	{ value: "left", label: "Left" },
	{ value: "right", label: "Right" },
];

const TEXT_ALIGN_ITEMS: SelectItem[] = [
	{ value: "left", label: "Left" },
	{ value: "center", label: "Center" },
	{ value: "right", label: "Right" },
];

const TYPE_LABELS: Partial<Record<string, string>> = {
	connect: "Connect With Me",
	vcard: "vCard",
};

// Block types with anything to show under Style. image/text/divider carry
// their whole configuration in the content section.
const STYLED_TYPES = new Set(["link", "connect", "vcard", "embed"]);

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
	// Site-wide toggles that gate this block type (cached; the list page already fetches it).
	const siteSettings = useQuery(trpc.settings.getAll.queryOptions()).data;
	const [title, setTitle] = useState(block.title ?? "");
	const [url, setUrl] = useState(block.url ?? "");
	const [icon, setIcon] = useState(block.icon ?? "");
	const [embedType, setEmbedType] = useState(block.embedType ?? "");
	const [embedUrl, setEmbedUrl] = useState(block.embedUrl ?? "");
	const [config, setConfig] = useState(block.config ?? "{}");
	const [scheduledStart, setScheduledStart] = useState(isoToLocal(block.scheduledStart));
	const [scheduledEnd, setScheduledEnd] = useState(isoToLocal(block.scheduledEnd));
	const [showAllErrors, setShowAllErrors] = useState(false);

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

	// Auto-focus the first input when the inline (lg+) panel opens. Below lg
	// the panel lives in a Sheet whose dialog already manages focus, and a
	// second programmatic focus would pop the on-screen keyboard over it.
	useEffect(() => {
		if (!window.matchMedia("(min-width: 1024px)").matches) return;
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

	const parsedConfig: Record<string, unknown> = (() => {
		try {
			const parsed = JSON.parse(config);
			return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
		} catch {
			return {};
		}
	})();

	const str = (key: string, fallback = ""): string => {
		const v = parsedConfig[key];
		return typeof v === "string" ? v : fallback;
	};

	const updateConfigField = (key: string, value: unknown) => {
		const updated = { ...parsedConfig, [key]: value };
		setConfig(JSON.stringify(updated, null, 2));
	};

	// ── Validation ──────────────────────────────────────────────────────────
	// Same schemas the server runs (@linkden/validators), so an inline error
	// here is exactly what would come back as a 400. Blank values are "cleared".
	const blockType: BlockType | null = blockTypeSchema.safeParse(block.type).success
		? (block.type as BlockType)
		: null;
	const cfgErrors = blockType ? configErrors(blockType, parsedConfig) : {};
	const titleError = fieldError(titleSchema, title);
	const urlError = optionalError(httpUrlSchema, url);
	const embedUrlError =
		validateEmbedUrl(embedType, embedUrl) ?? optionalError(httpUrlSchema, embedUrl);
	const emailError = optionalError(emailSchema, parsedConfig.email);
	const workEmailError = optionalError(emailSchema, parsedConfig.workEmail);
	const scheduleError =
		scheduledStart && scheduledEnd && scheduledStart >= scheduledEnd
			? "End must be after start"
			: null;
	const hasErrors = !!(
		configError ||
		titleError ||
		urlError ||
		embedUrlError ||
		emailError ||
		workEmailError ||
		scheduleError ||
		Object.keys(cfgErrors).length
	);

	const handleSave = () => {
		if (hasErrors) {
			setShowAllErrors(true);
			return;
		}
		// Blank fields are sent as "" on purpose: the schema's `clearable` turns
		// "" into null so the column is cleared (null/undefined would mean "not
		// provided" and leave the old value in place).
		onSave({
			id: block.id,
			title,
			url,
			icon,
			embedType,
			embedUrl,
			socialIcons: null,
			config: config || "{}",
			scheduledStart: scheduledStart ? new Date(scheduledStart) : null,
			scheduledEnd: scheduledEnd ? new Date(scheduledEnd) : null,
		});
	};

	const hasSchedule = !!(scheduledStart || scheduledEnd);
	const vcardUrls = Array.isArray(parsedConfig.urls)
		? (parsedConfig.urls as Array<{ label: string; url: string }>)
		: [];
	const linkVariant = str("variant", "classic");
	const textBody = str("body");

	const panel = (
		<div ref={panelRef} className="flex h-full flex-col rounded-xl border border-border bg-card">
			{/* Header */}
			<div className="flex items-center justify-between border-b border-border px-4 py-3">
				<h3 className="text-sm font-medium">
					Edit {TYPE_LABELS[block.type] ?? block.type.replace("_", " ")}
				</h3>
				<button
					type="button"
					onClick={onClose}
					className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors lg:h-8 lg:w-8"
					aria-label="Close edit panel"
				>
					<X className="h-4 w-4" />
				</button>
			</div>

			{/* Scrollable content */}
			<div className="flex-1 overflow-y-auto">
				{/* CONTENT (always visible) */}
				<div className="space-y-3 px-4 py-4">
					<TextField
						id="edit-title"
						label="Title"
						value={title}
						onChange={setTitle}
						placeholder="Block title"
						error={titleError}
						hint={
							block.type === "text" || block.type === "divider"
								? "Only shown in the builder list."
								: undefined
						}
					/>

					{block.type === "link" && (
						<>
							<TextField
								id="edit-url"
								label="URL"
								value={url}
								onChange={setUrl}
								placeholder="https://example.com"
								type="url"
								error={urlError}
							/>
							<SelectField
								id="edit-variant"
								label="Card style"
								value={linkVariant}
								onValueChange={(v) => updateConfigField("variant", v)}
								items={[
									{ value: "classic", label: "Button" },
									{ value: "thumbnail", label: "Thumbnail" },
									{ value: "featured", label: "Featured image" },
								]}
							/>
							{linkVariant === "thumbnail" && (
								<div className="space-y-1.5">
									<ImageUploadField
										label="Thumbnail"
										value={str("thumbnail")}
										purpose="block_thumbnail"
										aspectRatio="logo"
										hint="256 × 256"
										onUploadComplete={(u) => updateConfigField("thumbnail", u || undefined)}
									/>
									<FieldError id="edit-thumbnail-error" error={cfgErrors.thumbnail} />
								</div>
							)}
							{linkVariant === "featured" && (
								<div className="space-y-1.5">
									<ImageUploadField
										label="Featured image"
										value={str("thumbnail")}
										purpose="block_image"
										aspectRatio="banner"
										hint="16:9, at least 1280×720"
										onUploadComplete={(u) => updateConfigField("thumbnail", u || undefined)}
									/>
									<FieldError id="edit-thumbnail-error" error={cfgErrors.thumbnail} />
								</div>
							)}
							<TextField
								id="edit-description"
								label="Description"
								value={str("description")}
								onChange={(v) => updateConfigField("description", v)}
								placeholder="Brief description of the link"
								error={cfgErrors.description}
								maxLength={200}
							/>
						</>
					)}

					{block.type === "header" && (
						<>
							<SelectField
								id="edit-heading-level"
								label="Heading level"
								value={str("headingLevel", "h2")}
								onValueChange={(v) => updateConfigField("headingLevel", v)}
								items={[
									{ value: "h2", label: "H2 — section" },
									{ value: "h3", label: "H3 — sub-section" },
									{ value: "h4", label: "H4 — minor" },
								]}
								hint="Your name is the page's H1. Pick the level by structure, not size."
							/>
							<SelectField
								id="edit-layout"
								label="Layout for blocks below"
								value={str("layout", "list")}
								onValueChange={(v) => updateConfigField("layout", v)}
								items={[
									{ value: "list", label: "List" },
									{ value: "grid", label: "Grid" },
									{ value: "carousel", label: "Carousel" },
								]}
								hint="Applies to every block under this header, up to the next header."
							/>
						</>
					)}

					{block.type === "image" && (
						<>
							<div className="space-y-1.5">
								<ImageUploadField
									label="Image"
									value={str("src")}
									purpose="block_image"
									aspectRatio="banner"
									hint="up to 1600px"
									onUploadComplete={(u) => updateConfigField("src", u)}
								/>
								<FieldError id="edit-src-error" error={cfgErrors.src} />
							</div>
							<TextField
								id="edit-alt"
								label="Alt text"
								value={str("alt")}
								onChange={(v) => updateConfigField("alt", v)}
								placeholder="What's in the picture"
								hint="Read aloud by screen readers; falls back to the title."
								error={cfgErrors.alt}
								maxLength={200}
							/>
							<TextField
								id="edit-caption"
								label="Caption"
								value={str("caption")}
								onChange={(v) => updateConfigField("caption", v)}
								placeholder="Optional caption under the image"
								error={cfgErrors.caption}
								maxLength={200}
							/>
							<SelectField
								id="edit-aspect"
								label="Aspect ratio"
								value={str("aspect", "auto")}
								onValueChange={(v) => updateConfigField("aspect", v)}
								items={[
									{ value: "auto", label: "Original" },
									{ value: "16:9", label: "16:9 — wide" },
									{ value: "1:1", label: "1:1 — square" },
									{ value: "4:5", label: "4:5 — portrait" },
								]}
							/>
							<TextField
								id="edit-url"
								label="Link URL"
								value={url}
								onChange={setUrl}
								placeholder="https://example.com"
								type="url"
								hint="Optional — tapping the image opens this."
								error={urlError}
							/>
						</>
					)}

					{block.type === "text" && (
						<>
							<div className="space-y-1.5">
								<Label htmlFor="edit-body" className="text-small">
									Text
								</Label>
								<Textarea
									id="edit-body"
									value={textBody}
									onChange={(e) => updateConfigField("body", e.target.value)}
									rows={5}
									maxLength={TEXT_BODY_MAX}
									placeholder="Write something here."
									aria-invalid={!!cfgErrors.body}
									aria-describedby={cfgErrors.body ? "edit-body-error" : "edit-body-count"}
									className="text-base md:text-sm"
								/>
								<div className="flex items-start justify-between gap-2">
									<FieldError id="edit-body-error" error={cfgErrors.body} />
									<p
										id="edit-body-count"
										className={cn(
											"ml-auto text-micro tabular-nums",
											textBody.length > TEXT_BODY_MAX
												? "text-destructive"
												: "text-muted-foreground",
										)}
									>
										{textBody.length}/{TEXT_BODY_MAX}
									</p>
								</div>
							</div>
							<SelectField
								id="edit-text-align"
								label="Alignment"
								value={str("textAlign", "left")}
								onValueChange={(v) => updateConfigField("textAlign", v)}
								items={TEXT_ALIGN_ITEMS}
							/>
						</>
					)}

					{block.type === "divider" && (
						<>
							<SelectField
								id="edit-divider-style"
								label="Style"
								value={str("style", "line")}
								onValueChange={(v) => updateConfigField("style", v)}
								items={[
									{ value: "line", label: "Line" },
									{ value: "space", label: "Blank space" },
									{ value: "dots", label: "Dots" },
								]}
							/>
							<SelectField
								id="edit-divider-size"
								label="Spacing"
								value={str("size", "md")}
								onValueChange={(v) => updateConfigField("size", v)}
								items={[
									{ value: "sm", label: "Small" },
									{ value: "md", label: "Medium" },
									{ value: "lg", label: "Large" },
								]}
							/>
						</>
					)}

					{block.type === "embed" && (
						<>
							<SelectField
								id="edit-embed-type"
								label="Embed type"
								value={embedType}
								onValueChange={setEmbedType}
								placeholder="Select type"
								items={[
									{ value: "youtube", label: "YouTube" },
									{ value: "spotify", label: "Spotify" },
									{ value: "soundcloud", label: "SoundCloud" },
									{ value: "custom", label: "Custom" },
								]}
							/>
							<TextField
								id="edit-embed-url"
								label="Embed URL"
								value={embedUrl}
								onChange={setEmbedUrl}
								placeholder={EMBED_URL_PATTERNS[embedType]?.placeholder ?? "https://..."}
								type="url"
								error={embedUrlError}
							/>
						</>
					)}

					{block.type === "connect" && (
						<>
							{siteSettings && siteSettings.contact_form_enabled !== "true" && (
								<p
									role="status"
									className="rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-micro text-warning"
								>
									Messages are off, so this block is hidden on your page —{" "}
									<Link href="/admin/inbox" className="font-medium underline underline-offset-2">
										turn on in Inbox
									</Link>
									.
								</p>
							)}
							<SelectField
								id="edit-preset"
								label="Preset"
								value={str("preset", "contact")}
								onValueChange={(v) => {
									const defaults = CONNECT_PRESET_DEFAULTS[v];
									setConfig(
										JSON.stringify({ ...parsedConfig, preset: v, ...(defaults ?? {}) }, null, 2),
									);
								}}
								items={[
									{ value: "contact", label: "Contact Form" },
									{ value: "connect", label: "Connect with Me" },
									{ value: "feedback", label: "Feedback" },
									{ value: "rsvp", label: "RSVP" },
								]}
							/>
							<TextField
								id="edit-button-text"
								label="Button text"
								value={str("buttonText", "Contact Me")}
								onChange={(v) => updateConfigField("buttonText", v)}
								placeholder="Contact Me"
								error={cfgErrors.buttonText}
								maxLength={80}
							/>
							<TextField
								id="edit-button-emoji"
								label="Button emoji"
								value={str("buttonEmoji")}
								onChange={(v) => updateConfigField("buttonEmoji", v)}
								placeholder="e.g. ✉️"
								error={cfgErrors.buttonEmoji}
								maxLength={16}
							/>
							<div className="space-y-1.5">
								<Label id="edit-emoji-position-label" className="text-small">
									Emoji position
								</Label>
								<SegmentedControl
									value={str("buttonEmojiPosition", "left")}
									options={EMOJI_SIDE_OPTIONS}
									onChange={(v) => updateConfigField("buttonEmojiPosition", v)}
									ariaLabelledby="edit-emoji-position-label"
								/>
							</div>
							<TextField
								id="edit-success-msg"
								label="Success message"
								value={str("successMessage", "Thanks for reaching out!")}
								onChange={(v) => updateConfigField("successMessage", v)}
								placeholder="Thanks for reaching out!"
								error={cfgErrors.successMessage}
								maxLength={200}
							/>
						</>
					)}

					{block.type === "vcard" && (
						<>
							<TextField
								id="edit-vcard-button-text"
								label="Button text"
								value={str("buttonText", "Download Contact")}
								onChange={(v) => updateConfigField("buttonText", v)}
								placeholder="Download Contact"
								error={cfgErrors.buttonText}
								maxLength={80}
							/>
							<TextField
								id="edit-vcard-button-emoji"
								label="Button emoji"
								value={str("buttonEmoji")}
								onChange={(v) => updateConfigField("buttonEmoji", v)}
								placeholder="e.g. 📇"
								error={cfgErrors.buttonEmoji}
								maxLength={16}
							/>
							<div className="space-y-1.5">
								<Label id="edit-vcard-emoji-position-label" className="text-small">
									Emoji position
								</Label>
								<SegmentedControl
									value={str("buttonEmojiPosition", "left")}
									options={EMOJI_SIDE_OPTIONS}
									onChange={(v) => updateConfigField("buttonEmojiPosition", v)}
									ariaLabelledby="edit-vcard-emoji-position-label"
								/>
							</div>

							<SectionLabel>Personal</SectionLabel>
							<TextField
								id="vc-fullname"
								label="Full name"
								value={str("fullName")}
								onChange={(v) => updateConfigField("fullName", v)}
								placeholder="John Doe"
								error={cfgErrors.fullName}
								maxLength={100}
							/>
							<TextField
								id="vc-nickname"
								label="Nickname"
								value={str("nickname")}
								onChange={(v) => updateConfigField("nickname", v)}
								placeholder="Johnny"
								error={cfgErrors.nickname}
								maxLength={100}
							/>
							<TextField
								id="vc-birthday"
								label="Birthday"
								type="date"
								value={str("birthday")}
								onChange={(v) => updateConfigField("birthday", v)}
								error={cfgErrors.birthday}
							/>
							<TextField
								id="vc-photo"
								label="Photo URL"
								type="url"
								value={str("photo")}
								onChange={(v) => updateConfigField("photo", v)}
								placeholder="https://example.com/photo.jpg"
								error={cfgErrors.photo}
							/>

							<SectionLabel>Organization</SectionLabel>
							<TextField
								id="vc-org"
								label="Organization"
								value={str("org")}
								onChange={(v) => updateConfigField("org", v)}
								placeholder="Acme Inc."
								error={cfgErrors.org}
								maxLength={100}
							/>
							<TextField
								id="vc-jobtitle"
								label="Job title"
								value={str("title")}
								onChange={(v) => updateConfigField("title", v)}
								placeholder="Software Engineer"
								error={cfgErrors.title}
								maxLength={100}
							/>
							<TextField
								id="vc-department"
								label="Department"
								value={str("department")}
								onChange={(v) => updateConfigField("department", v)}
								placeholder="Engineering"
								error={cfgErrors.department}
								maxLength={100}
							/>

							<SectionLabel>Contact</SectionLabel>
							<TextField
								id="vc-email"
								label="Personal email"
								type="email"
								value={str("email")}
								onChange={(v) => updateConfigField("email", v)}
								placeholder="john@example.com"
								error={emailError ?? cfgErrors.email}
							/>
							<TextField
								id="vc-work-email"
								label="Work email"
								type="email"
								value={str("workEmail")}
								onChange={(v) => updateConfigField("workEmail", v)}
								placeholder="john@company.com"
								error={workEmailError ?? cfgErrors.workEmail}
							/>
							<TextField
								id="vc-phone"
								label="Personal phone"
								type="tel"
								value={str("phone")}
								onChange={(v) => updateConfigField("phone", v)}
								placeholder="+1 555-0123"
								error={cfgErrors.phone}
								maxLength={40}
							/>
							<TextField
								id="vc-work-phone"
								label="Work phone"
								type="tel"
								value={str("workPhone")}
								onChange={(v) => updateConfigField("workPhone", v)}
								placeholder="+1 555-0456"
								error={cfgErrors.workPhone}
								maxLength={40}
							/>
							<TextField
								id="vc-address"
								label="Address"
								value={str("address")}
								onChange={(v) => updateConfigField("address", v)}
								placeholder="123 Main St, City, State"
								error={cfgErrors.address}
								maxLength={300}
							/>

							<SectionLabel>URLs</SectionLabel>
							{vcardUrls.map((urlItem, idx) => {
								const rowError = cfgErrors[`urls.${idx}.url`] ?? cfgErrors[`urls.${idx}.label`];
								const rowErrorId = `vc-url-${idx}-error`;
								return (
									<div key={idx} className="space-y-1">
										<div className="flex items-end gap-2">
											<div className="flex-1 space-y-1">
												<Label htmlFor={`vc-url-${idx}-label`} className="text-small">
													Label
												</Label>
												<Input
													id={`vc-url-${idx}-label`}
													value={urlItem.label ?? ""}
													onChange={(e) => {
														const urls = [...vcardUrls];
														urls[idx] = { ...urls[idx], label: e.target.value };
														updateConfigField("urls", urls);
													}}
													placeholder="Website"
													maxLength={40}
													className="dark:bg-input/30 border-input"
												/>
											</div>
											<div className="flex-[2] space-y-1">
												<Label htmlFor={`vc-url-${idx}-url`} className="text-small">
													URL
												</Label>
												<Input
													id={`vc-url-${idx}-url`}
													type="url"
													value={urlItem.url ?? ""}
													onChange={(e) => {
														const urls = [...vcardUrls];
														urls[idx] = { ...urls[idx], url: e.target.value };
														updateConfigField("urls", urls);
													}}
													placeholder="https://example.com"
													aria-invalid={!!rowError}
													aria-describedby={rowError ? rowErrorId : undefined}
													className="dark:bg-input/30 border-input"
												/>
											</div>
											<button
												type="button"
												aria-label={`Remove URL ${idx + 1}`}
												onClick={() => {
													const urls = [...vcardUrls];
													urls.splice(idx, 1);
													updateConfigField("urls", urls);
												}}
												className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:h-8 md:w-8"
											>
												<Trash2 className="h-4 w-4" />
											</button>
										</div>
										<FieldError id={rowErrorId} error={rowError} />
									</div>
								);
							})}
							<button
								type="button"
								onClick={() => updateConfigField("urls", [...vcardUrls, { label: "", url: "" }])}
								disabled={vcardUrls.length >= 20}
								className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-input dark:bg-input/30 px-3 text-small font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50 md:min-h-9"
							>
								<Plus className="h-3.5 w-3.5" />
								Add URL
							</button>
						</>
					)}

					{block.type === "location" && (
						<>
							{siteSettings && siteSettings.mapkit_enabled !== "true" && (
								<Hint>
									Want an embedded Apple Map?{" "}
									<Link
										href="/admin/settings/integrations"
										className="font-medium text-foreground underline underline-offset-2"
									>
										Configure MapKit in Settings → Integrations
									</Link>
									.
								</Hint>
							)}
							<TextField
								id="edit-address"
								label="Address"
								value={str("address")}
								onChange={(v) => updateConfigField("address", v)}
								placeholder="San Francisco, CA"
								error={cfgErrors.address}
								maxLength={300}
							/>
							<div className="space-y-1.5">
								<Label id="edit-link-type-label" className="text-small">
									Link type
								</Label>
								<SegmentedControl
									value={str("linkType", "none")}
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
								<TextField
									id="edit-custom-link"
									label="Custom link URL"
									type="url"
									value={str("customLinkUrl")}
									onChange={(v) => updateConfigField("customLinkUrl", v)}
									placeholder="https://maps.example.com/..."
									error={cfgErrors.customLinkUrl}
								/>
							)}
							{(parsedConfig.linkType === "google" || parsedConfig.linkType === "apple") &&
								str("address") && (
									<div className="space-y-1">
										<p className="text-micro text-muted-foreground">Generated URL</p>
										<p className="text-micro font-mono text-muted-foreground break-all">
											{parsedConfig.linkType === "google"
												? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(str("address"))}`
												: `https://maps.apple.com/?q=${encodeURIComponent(str("address"))}`}
										</p>
									</div>
								)}
						</>
					)}
				</div>

				{/* STYLE (collapsible) */}
				{STYLED_TYPES.has(block.type) && (
					<CollapsibleSection label="Style" defaultOpen>
						{block.type === "link" && (
							<>
								<div className="space-y-1.5">
									<Label htmlFor="edit-icon" className="text-small">
										Icon
									</Label>
									<IconPicker id="edit-icon" value={icon} onChange={setIcon} />
									<Hint>Shown on the left of the button, exactly as it appears live.</Hint>
								</div>
								<ToggleSwitch
									checked={!!parsedConfig.isHighlighted}
									onToggle={() => updateConfigField("isHighlighted", !parsedConfig.isHighlighted)}
									label="Highlighted"
									description="Uses the accent color background"
								/>
								<ToggleSwitch
									checked={parsedConfig.newTab !== false}
									onToggle={() => updateConfigField("newTab", parsedConfig.newTab === false)}
									label="Open in new tab"
								/>
								<ToggleSwitch
									checked={!!parsedConfig.noFollow}
									onToggle={() => updateConfigField("noFollow", !parsedConfig.noFollow)}
									label="No follow"
									description="Asks search engines not to follow this link"
								/>
							</>
						)}

						{(block.type === "connect" || block.type === "vcard") && (
							<ToggleSwitch
								checked={!!parsedConfig.isOutlined}
								onToggle={() => updateConfigField("isOutlined", !parsedConfig.isOutlined)}
								label="Outlined style"
							/>
						)}

						{(block.type === "link" || block.type === "connect" || block.type === "vcard") && (
							<div className="grid gap-3 sm:grid-cols-2">
								<ColorField
									id="edit-custom-bg"
									label="Custom background"
									value={str("customBgColor")}
									onChange={(v) => updateConfigField("customBgColor", v || undefined)}
									placeholder="Theme default"
								/>
								<ColorField
									id="edit-custom-text"
									label="Custom text"
									value={str("customTextColor")}
									onChange={(v) => updateConfigField("customTextColor", v || undefined)}
									placeholder="Theme default"
									contrastAgainst={
										str("customBgColor")
											? { hex: str("customBgColor"), label: "custom background" }
											: undefined
									}
								/>
							</div>
						)}

						{block.type === "embed" && (
							<>
								<SelectField
									id="edit-aspect-ratio"
									label="Aspect ratio"
									value={str("aspectRatio", "16:9")}
									onValueChange={(v) => updateConfigField("aspectRatio", v)}
									items={[
										{ value: "16:9", label: "16:9" },
										{ value: "4:3", label: "4:3" },
										{ value: "1:1", label: "1:1" },
									]}
								/>
								<SelectField
									id="edit-max-width"
									label="Max width"
									value={str("maxWidth", "full")}
									onValueChange={(v) => updateConfigField("maxWidth", v)}
									items={[
										{ value: "sm", label: "Small" },
										{ value: "md", label: "Medium" },
										{ value: "lg", label: "Large" },
										{ value: "full", label: "Full" },
									]}
								/>
								<ToggleSwitch
									checked={parsedConfig.showTitle !== false}
									onToggle={() => updateConfigField("showTitle", parsedConfig.showTitle === false)}
									label="Show title"
								/>
							</>
						)}
					</CollapsibleSection>
				)}

				{/* CONNECT FORM FIELDS (collapsible) */}
				{block.type === "connect" && (
					<CollapsibleSection label="Form Fields" defaultOpen>
						<div className="mt-2 space-y-3">
							<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
								Optional fields
							</p>
							<ToggleSwitch
								checked={!!parsedConfig.showPhone}
								onToggle={() => updateConfigField("showPhone", !parsedConfig.showPhone)}
								label="Phone field"
								description="Show phone number input"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showSubject}
								onToggle={() => updateConfigField("showSubject", !parsedConfig.showSubject)}
								label="Subject field"
								description="Show subject line input"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showCompany}
								onToggle={() => updateConfigField("showCompany", !parsedConfig.showCompany)}
								label="Company field"
								description="Show company name input"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showWhereMet}
								onToggle={() => updateConfigField("showWhereMet", !parsedConfig.showWhereMet)}
								label="Where met field"
								description="Ask where you met (Connect preset)"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showRating}
								onToggle={() => updateConfigField("showRating", !parsedConfig.showRating)}
								label="Rating field"
								description="Show 1-5 star rating (Feedback preset)"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showAttending}
								onToggle={() => updateConfigField("showAttending", !parsedConfig.showAttending)}
								label="Attending field"
								description="Yes/No/Maybe selector (RSVP preset)"
							/>
							<ToggleSwitch
								checked={!!parsedConfig.showGuests}
								onToggle={() => updateConfigField("showGuests", !parsedConfig.showGuests)}
								label="Guests field"
								description="Number of guests input (RSVP preset)"
							/>
						</div>
					</CollapsibleSection>
				)}

				{/* SCHEDULE (collapsible) */}
				<CollapsibleSection label="Schedule" defaultOpen={hasSchedule}>
					<Hint>Optionally show this block only during a specific time window.</Hint>
					<TextField
						id="edit-start"
						label="Start date/time"
						type="datetime-local"
						value={scheduledStart}
						onChange={setScheduledStart}
					/>
					<TextField
						id="edit-end"
						label="End date/time"
						type="datetime-local"
						value={scheduledEnd}
						onChange={setScheduledEnd}
						error={scheduleError}
					/>
					{hasSchedule && (
						<Button
							variant="ghost"
							size="sm"
							className="min-h-11 md:min-h-7"
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
						<Label htmlFor="edit-config" className="text-small">
							Config JSON
						</Label>
						<Textarea
							id="edit-config"
							value={config}
							onChange={(e) => setConfig(e.target.value)}
							rows={6}
							placeholder='{"variant":"classic","newTab":true}'
							aria-invalid={!!configError}
							aria-describedby={configError ? "edit-config-error" : undefined}
							className="font-mono"
						/>
						<FieldError id="edit-config-error" error={configError} />
						{!configError && Object.keys(cfgErrors).length > 0 && (
							<ul className="space-y-0.5 text-micro text-destructive">
								{Object.entries(cfgErrors).map(([key, message]) => (
									<li key={key}>
										<span className="font-mono">{key}</span>: {message}
									</li>
								))}
							</ul>
						)}
					</div>
				</CollapsibleSection>
			</div>

			{/* Footer */}
			<div className="space-y-2 border-t border-border px-4 py-3">
				{hasErrors && showAllErrors && !isSaving && (
					<p role="alert" className="text-micro text-destructive">
						Fix the highlighted fields to save.
					</p>
				)}
				<div className="flex gap-2">
					{onDelete && (
						<Button
							variant="outline"
							className="h-11 w-11 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive lg:h-8 lg:w-8"
							onClick={onDelete}
							aria-label="Delete block"
						>
							<Trash2 className="h-4 w-4" />
						</Button>
					)}
					<Button className="h-11 flex-1 lg:h-8" onClick={handleSave} disabled={isSaving}>
						{isSaving ? "Saving..." : "Save Changes"}
					</Button>
				</div>
			</div>
		</div>
	);
	return <ShowAllErrors.Provider value={showAllErrors}>{panel}</ShowAllErrors.Provider>;
}
