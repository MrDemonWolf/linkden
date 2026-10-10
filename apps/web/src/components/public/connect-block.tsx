"use client";

import { Dialog } from "@base-ui/react/dialog";
import { getReadableTextColor } from "@linkden/ui/color-contrast";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useId, useRef, useState } from "react";
import {
	CONTACT_LIMITS,
	type ContactFormField,
	type ContactFormValues,
	contactSubmitErrorMessage,
	pickContrasting,
	shouldAskWhereMet,
	validateContactForm,
	WHERE_MET_OPTIONS,
} from "@/lib/contact-form";
import { trackClick } from "@/lib/track";
import { trpc } from "@/utils/trpc";
import { CaptchaWidget, isCaptchaRequired, resolveCaptchaProvider } from "./captcha-widget";
import { usePreview } from "./preview-context";
import { type PrivacyNotice, PrivacyNoticeLink } from "./privacy-notice";
import type { ThemeColors } from "./public-page";

// Public blocks style inline from the resolved themeColors instead of CSS design
// tokens: the public page renders under a per-page theme preset, not the app's
// global .dark class, so tokens like var(--card) would resolve to the admin theme.

// Fixed accessible red pair for error text/borders on the themed public page
// (admin tokens like text-destructive would resolve to the admin theme here).
const getErrorColor = (colorMode: "light" | "dark") =>
	colorMode === "dark" ? "#F87171" : "#B91C1C";

/**
 * Control boundary + focus ring that stay visible on the form surface: the
 * decorative `border` token is ~1.2:1 on most light presets, so form controls
 * fall back to a stronger token until they reach 3:1 (WCAG 1.4.11), and the
 * 2px focus ring uses primary unless primary is too faint on the card.
 */
function controlColors(themeColors?: ThemeColors) {
	if (!themeColors) return { border: undefined, focus: "#2563eb" };
	return {
		border: pickContrasting(
			themeColors.card,
			[themeColors.border, themeColors.mutedFg, themeColors.cardFg],
			3,
		),
		focus: pickContrasting(themeColors.card, [themeColors.primary, themeColors.cardFg], 3),
	};
}

// Native outline (not a 20%-alpha ring) so the indicator is 2px and inherits
// the computed `outlineColor`.
const controlClasses =
	"peer w-full rounded-xl border px-4 pt-5 pb-2 text-sm transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-solid";

interface ConnectBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
	/** Where the privacy policy lives (link or text-mode dialog), shown in the consent label. */
	privacyNotice?: PrivacyNotice | null;
	/** `captcha_provider` setting ("none" | "turnstile" | "recaptcha" | "hcaptcha"). */
	captchaProvider?: string;
	/** Public site key for the provider widget (never the secret). */
	captchaSiteKey?: string | null;
}

function FloatingField({
	id,
	label,
	type = "text",
	required = false,
	value,
	onChange,
	error,
	themeColors,
	multiline = false,
	submitAttempted = false,
	colorMode = "light",
	autoComplete,
	maxLength,
}: {
	id: string;
	label: string;
	type?: string;
	required?: boolean;
	value: string;
	onChange: (val: string) => void;
	error?: string;
	themeColors?: ThemeColors;
	multiline?: boolean;
	submitAttempted?: boolean;
	colorMode?: "light" | "dark";
	autoComplete?: string;
	maxLength?: number;
}) {
	const [touched, setTouched] = useState(false);
	// Show the error once the field is blurred OR the form has been submitted, so
	// an untouched-but-invalid field is never a silent dead-end.
	const showError = !!error && (touched || submitAttempted);
	const errorColor = getErrorColor(colorMode);
	const colors = controlColors(themeColors);

	const fieldStyle: React.CSSProperties = themeColors
		? {
				borderColor: colors.border,
				backgroundColor: `${themeColors.bg}40`,
				color: themeColors.cardFg,
				outlineColor: colors.focus,
			}
		: { outlineColor: colors.focus };

	const errorBorderStyle: React.CSSProperties = showError ? { borderColor: errorColor } : {};

	const labelBase = "pointer-events-none absolute left-4 text-sm transition-all duration-200";
	// Filled and empty states are mutually exclusive class sets — mixing `top-1/2`
	// and `top-3` in one string let CSS order (not intent) pick the winner.
	const labelClasses = value
		? `${labelBase} top-3 translate-y-0 text-micro font-medium`
		: `${labelBase} top-1/2 -translate-y-1/2 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-micro peer-focus:font-medium`;
	const labelClassesMultiline = value
		? `${labelBase} top-2 text-micro font-medium`
		: `${labelBase} top-4 peer-focus:top-2 peer-focus:text-micro peer-focus:font-medium`;

	const labelStyle: React.CSSProperties = themeColors ? { color: themeColors.mutedFg } : {};

	const errorNode = showError && (
		<span
			id={`${id}-error`}
			className="mt-1 block text-sm"
			style={{ color: errorColor }}
			role="alert"
		>
			{error}
		</span>
	);

	if (multiline) {
		return (
			<div className="relative">
				<textarea
					id={id}
					placeholder={label}
					required={required}
					rows={3}
					maxLength={maxLength}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onBlur={() => setTouched(true)}
					className={`${controlClasses} placeholder-transparent pt-6 resize-none`}
					style={{ ...fieldStyle, ...errorBorderStyle }}
					aria-describedby={showError ? `${id}-error` : undefined}
					aria-invalid={showError ? true : undefined}
				/>
				<label htmlFor={id} className={labelClassesMultiline} style={labelStyle}>
					{label}
				</label>
				{errorNode}
			</div>
		);
	}

	return (
		<div className="relative">
			<input
				id={id}
				type={type}
				placeholder={label}
				required={required}
				autoComplete={autoComplete}
				maxLength={maxLength}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={() => setTouched(true)}
				className={`${controlClasses} placeholder-transparent`}
				style={{ ...fieldStyle, ...errorBorderStyle }}
				aria-describedby={showError ? `${id}-error` : undefined}
				aria-invalid={showError ? true : undefined}
			/>
			<label htmlFor={id} className={labelClasses} style={labelStyle}>
				{label}
			</label>
			{errorNode}
		</div>
	);
}

function WhereMetSelect({
	id,
	value,
	onChange,
	error,
	themeColors,
	submitAttempted = false,
	colorMode = "light",
}: {
	id: string;
	value: string;
	onChange: (val: string) => void;
	error?: string;
	themeColors?: ThemeColors;
	submitAttempted?: boolean;
	colorMode?: "light" | "dark";
}) {
	const [touched, setTouched] = useState(false);
	const [showOtherInput, setShowOtherInput] = useState(false);
	const showError = !!error && (touched || submitAttempted);
	const errorColor = getErrorColor(colorMode);
	const colors = controlColors(themeColors);

	// The native <option> popup inherits the <select>'s background/color. A
	// translucent bg makes the popup unreadable on dark presets, so use a SOLID
	// surface here (and set each option explicitly for cross-browser safety).
	const solidBg = themeColors?.card ?? (colorMode === "dark" ? "#1f2937" : "#ffffff");
	const solidFg = themeColors?.cardFg ?? (colorMode === "dark" ? "#f9fafb" : "#111827");

	const fieldStyle: React.CSSProperties = {
		borderColor: colors.border,
		backgroundColor: solidBg,
		color: solidFg,
		outlineColor: colors.focus,
	};

	const errorBorderStyle: React.CSSProperties = showError ? { borderColor: errorColor } : {};

	const labelStyle: React.CSSProperties = themeColors ? { color: themeColors.mutedFg } : {};
	const optionStyle: React.CSSProperties = { backgroundColor: solidBg, color: solidFg };

	const handleSelectChange = (val: string) => {
		if (val === "Other") {
			setShowOtherInput(true);
			onChange("");
		} else {
			setShowOtherInput(false);
			onChange(val);
		}
	};

	return (
		<div className="space-y-2">
			<div className="relative">
				<select
					id={id}
					value={showOtherInput ? "Other" : value}
					onChange={(e) => handleSelectChange(e.target.value)}
					onBlur={() => setTouched(true)}
					className={`${controlClasses} appearance-none`}
					style={{ ...fieldStyle, ...errorBorderStyle }}
					aria-describedby={showError ? `${id}-error` : undefined}
					aria-invalid={showError ? true : undefined}
				>
					<option value="" style={optionStyle}>
						Select...
					</option>
					{WHERE_MET_OPTIONS.map((opt) => (
						<option key={opt} value={opt} style={optionStyle}>
							{opt}
						</option>
					))}
				</select>
				<label
					htmlFor={id}
					className="pointer-events-none absolute left-4 top-3 translate-y-0 text-micro font-medium transition-all duration-200"
					style={labelStyle}
				>
					Where did we meet?{" "}
					<span style={{ color: errorColor }} aria-hidden="true">
						*
					</span>
				</label>
				{/* Chevron icon */}
				<svg
					className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2"
					style={{ color: themeColors?.mutedFg || "#9ca3af" }}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
					aria-hidden="true"
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</div>
			{showOtherInput && (
				<FloatingField
					id={`${id}-other`}
					label="Please specify..."
					required
					maxLength={CONTACT_LIMITS.whereMet}
					value={value}
					onChange={onChange}
					error={!value ? "Please specify where we met" : undefined}
					themeColors={themeColors}
					submitAttempted={submitAttempted}
					colorMode={colorMode}
				/>
			)}
			{showError && !showOtherInput && (
				<span
					id={`${id}-error`}
					className="mt-1 block text-sm"
					style={{ color: errorColor }}
					role="alert"
				>
					{error}
				</span>
			)}
		</div>
	);
}

const EMPTY_FORM: ContactFormValues = {
	firstName: "",
	lastName: "",
	email: "",
	whereMet: "",
	message: "",
	consent: false,
};

export function ConnectForm({
	blockId,
	blockTitle,
	config,
	colorMode,
	themeColors,
	isPreview,
	privacyNotice,
	captchaProvider,
	captchaSiteKey,
}: {
	blockId: string;
	blockTitle: string | null;
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
	isPreview?: boolean;
	privacyNotice?: PrivacyNotice | null;
	captchaProvider?: string;
	captchaSiteKey?: string | null;
}) {
	const successMessage =
		(config.successMessage as string) || "Thanks for connecting! I'll be in touch.";
	const askWhereMet = shouldAskWhereMet(config);
	// CAPTCHA on means the server rejects token-less submissions (fail closed),
	// so the widget gates submit; a provider without a site key can't be solved.
	const captchaRequired = isCaptchaRequired(captchaProvider);
	const widgetProvider = resolveCaptchaProvider(captchaProvider, captchaSiteKey);

	const [formData, setFormData] = useState<ContactFormValues>(EMPTY_FORM);
	const [submitted, setSubmitted] = useState(false);
	const [errors, setErrors] = useState<Partial<Record<ContactFormField, string>>>({});
	// Once the visitor tries to submit, reveal errors on every field — even ones
	// they never focused — so an untouched-empty form isn't a silent dead-end.
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [captchaToken, setCaptchaToken] = useState<string | null>(null);
	// Honeypot: hidden from people, so only bots fill it. The server then answers
	// success but stores and sends nothing.
	const [honeypot, setHoneypot] = useState("");
	// Tokens are single-use: bumping the key remounts a fresh widget.
	const [captchaKey, setCaptchaKey] = useState(0);
	const errorColor = getErrorColor(colorMode);
	// Unique per form instance so an inline block and a modal mounted at the same
	// time never share the same consent-error element id.
	const consentErrorId = useId();
	const successRef = useRef<HTMLDivElement>(null);

	// Move focus to the success panel so keyboard/screen-reader users hear the
	// confirmation instead of being left on a form that just disappeared.
	useEffect(() => {
		if (submitted) successRef.current?.focus();
	}, [submitted]);

	const resetCaptcha = () => {
		setCaptchaToken(null);
		setCaptchaKey((k) => k + 1);
	};

	const submitContact = useMutation({
		...trpc.public.submitContact.mutationOptions(),
		onSuccess: () => {
			trackClick(blockId, { preview: !!isPreview });
			setSubmitted(true);
			setSubmitAttempted(false);
			setFormData(EMPTY_FORM);
			setHoneypot("");
			// The widget unmounts with the form; "Send another message" mounts a fresh one.
			setCaptchaToken(null);
		},
		onError: resetCaptcha,
	});
	const pending = submitContact.isPending;

	const fieldIds: Record<ContactFormField, string> = {
		firstName: `connect-fname-${blockId}`,
		lastName: `connect-lname-${blockId}`,
		email: `connect-email-${blockId}`,
		whereMet: `connect-wheremet-${blockId}`,
		message: `connect-message-${blockId}`,
		consent: `connect-consent-${blockId}`,
		captcha: `connect-captcha-${blockId}`,
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// aria-disabled (not `disabled`) keeps focus on the button while sending.
		if (isPreview || pending) return;
		setSubmitAttempted(true);
		const errs = validateContactForm(formData, { askWhereMet, captchaRequired, captchaToken });
		setErrors(errs);
		const firstInvalid = (Object.keys(fieldIds) as ContactFormField[]).find((f) => errs[f]);
		if (firstInvalid) {
			// Move focus to the first invalid control so keyboard/screen-reader users
			// land on the problem instead of a form that silently refuses to submit.
			document.getElementById(fieldIds[firstInvalid])?.focus();
			return;
		}

		submitContact.mutate({
			firstName: formData.firstName.trim(),
			lastName: formData.lastName.trim(),
			email: formData.email.trim(),
			whereMet: askWhereMet ? formData.whereMet.trim() : "",
			message: formData.message.trim() || undefined,
			blockId,
			blockTitle: blockTitle || undefined,
			consent: true,
			captchaToken: captchaToken ?? undefined,
			website: honeypot || undefined,
		});
	};

	const updateField = (field: keyof ContactFormValues) => (value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => {
				const next = { ...prev };
				delete next[field];
				return next;
			});
		}
	};

	const onCaptchaToken = (token: string | null) => {
		setCaptchaToken(token);
		if (token && errors.captcha) {
			setErrors((prev) => {
				const next = { ...prev };
				delete next.captcha;
				return next;
			});
		}
	};

	const primaryColor = themeColors?.primary || (colorMode === "dark" ? "#3b82f6" : "#2563eb");

	if (submitted) {
		// Mode-aware success green: light surfaces need the darker pair for contrast.
		const successFg = colorMode === "dark" ? "#4ADE80" : "#166534";
		const successBg = colorMode === "dark" ? "rgba(74,222,128,0.12)" : "rgba(22,101,52,0.10)";
		return (
			<div
				ref={successRef}
				tabIndex={-1}
				role="status"
				aria-live="polite"
				className="py-6 text-center outline-none"
			>
				<div
					className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full"
					style={{ backgroundColor: successBg }}
				>
					<svg
						className="h-7 w-7"
						style={{ color: successFg }}
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={2.5}
						aria-hidden="true"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M5 13l4 4L19 7"
							style={{
								strokeDasharray: 24,
								strokeDashoffset: 0,
								animation: "checkmark-draw 0.4s ease-out",
							}}
						/>
					</svg>
				</div>
				<p className="text-lg font-medium">{successMessage}</p>
				<button
					type="button"
					onClick={() => setSubmitted(false)}
					className="mt-3 min-h-11 px-3 text-small underline underline-offset-4 transition-colors hover:opacity-70"
					style={{ color: primaryColor }}
				>
					Send another message
				</button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3" noValidate aria-busy={pending || undefined}>
			{isPreview && (
				<p className="mb-3 text-center text-micro uppercase tracking-widest opacity-40">Preview</p>
			)}

			{/* Honeypot: off-screen (not display:none, which some bots skip), out of
			    the tab order and hidden from assistive tech. */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -left-[10000px] top-auto h-px w-px overflow-hidden"
			>
				<label>
					Website
					<input
						type="text"
						name="website"
						tabIndex={-1}
						autoComplete="off"
						value={honeypot}
						onChange={(e) => setHoneypot(e.target.value)}
					/>
				</label>
			</div>

			<div className="grid gap-3 sm:grid-cols-2">
				<FloatingField
					id={fieldIds.firstName}
					label="First Name"
					required
					autoComplete="given-name"
					maxLength={CONTACT_LIMITS.firstName}
					value={formData.firstName}
					onChange={updateField("firstName")}
					error={errors.firstName}
					themeColors={themeColors}
					submitAttempted={submitAttempted}
					colorMode={colorMode}
				/>
				<FloatingField
					id={fieldIds.lastName}
					label="Last Name"
					required
					autoComplete="family-name"
					maxLength={CONTACT_LIMITS.lastName}
					value={formData.lastName}
					onChange={updateField("lastName")}
					error={errors.lastName}
					themeColors={themeColors}
					submitAttempted={submitAttempted}
					colorMode={colorMode}
				/>
			</div>

			<FloatingField
				id={fieldIds.email}
				label="Email Address"
				type="email"
				required
				autoComplete="email"
				maxLength={CONTACT_LIMITS.email}
				value={formData.email}
				onChange={updateField("email")}
				error={errors.email}
				themeColors={themeColors}
				submitAttempted={submitAttempted}
				colorMode={colorMode}
			/>

			{askWhereMet && (
				<WhereMetSelect
					id={fieldIds.whereMet}
					value={formData.whereMet}
					onChange={updateField("whereMet")}
					error={errors.whereMet}
					themeColors={themeColors}
					submitAttempted={submitAttempted}
					colorMode={colorMode}
				/>
			)}

			<FloatingField
				id={fieldIds.message}
				label="Message (optional)"
				multiline
				maxLength={CONTACT_LIMITS.message}
				value={formData.message}
				onChange={updateField("message")}
				error={errors.message}
				themeColors={themeColors}
				submitAttempted={submitAttempted}
				colorMode={colorMode}
			/>

			<div className="flex flex-col gap-1">
				<label className="flex items-start gap-2.5 cursor-pointer">
					<input
						id={fieldIds.consent}
						type="checkbox"
						checked={formData.consent}
						onChange={(e) => {
							setFormData((prev) => ({ ...prev, consent: e.target.checked }));
							if (errors.consent)
								setErrors((prev) => {
									const n = { ...prev };
									delete n.consent;
									return n;
								});
						}}
						className="mt-0.5 h-4 w-4 shrink-0 rounded"
						style={{ accentColor: primaryColor }}
						aria-describedby={errors.consent ? consentErrorId : undefined}
						aria-invalid={errors.consent ? true : undefined}
					/>
					<span
						className="text-small leading-relaxed"
						style={{
							color: themeColors?.mutedFg || (colorMode === "dark" ? "#9ca3af" : "#6b7280"),
						}}
					>
						I agree to the processing of my personal data to respond to my enquiry.
						{privacyNotice && (
							<>
								{" "}
								<PrivacyNoticeLink
									notice={privacyNotice}
									themeColors={themeColors}
									className="underline underline-offset-2 hover:opacity-70"
									style={{ color: primaryColor }}
								>
									Privacy Policy
								</PrivacyNoticeLink>
							</>
						)}
					</span>
				</label>
				{errors.consent && (
					<span id={consentErrorId} className="text-sm" style={{ color: errorColor }} role="alert">
						{errors.consent}
					</span>
				)}
			</div>

			{captchaRequired &&
				!isPreview &&
				(widgetProvider && captchaSiteKey ? (
					<div className="flex flex-col items-center gap-1">
						<CaptchaWidget
							key={captchaKey}
							id={fieldIds.captcha}
							provider={widgetProvider}
							siteKey={captchaSiteKey}
							colorMode={colorMode}
							onToken={onCaptchaToken}
							errorColor={errorColor}
						/>
						{errors.captcha && (
							<span className="text-sm" style={{ color: errorColor }} role="alert">
								{errors.captcha}
							</span>
						)}
					</div>
				) : (
					// Provider on but no site key: the server would reject every submit.
					<p className="text-center text-sm" style={{ color: errorColor }} role="alert">
						This form can&apos;t accept messages right now. Please try again later.
					</p>
				))}

			<button
				type="submit"
				aria-disabled={pending || undefined}
				className="min-h-11 w-full rounded-xl px-4 py-3 text-small font-semibold transition-all duration-200 aria-disabled:cursor-wait aria-disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 hover:brightness-110"
				style={{
					backgroundColor: primaryColor,
					color: getReadableTextColor(primaryColor),
					outlineColor: primaryColor,
				}}
			>
				{pending ? (
					<span className="inline-flex items-center gap-2">
						<svg
							className="h-4 w-4 animate-spin"
							viewBox="0 0 24 24"
							fill="none"
							aria-hidden="true"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							/>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
							/>
						</svg>
						Sending...
					</span>
				) : (
					"Connect"
				)}
			</button>

			{/* Announces the in-flight state; success/failure have their own regions. */}
			<p role="status" aria-live="polite" className="sr-only">
				{pending ? "Sending your message…" : ""}
			</p>

			{submitContact.isError && (
				<p className="text-center text-sm" style={{ color: errorColor }} role="alert">
					{contactSubmitErrorMessage(submitContact.error)}
				</p>
			)}
		</form>
	);
}

export function ConnectBlock({
	block,
	config,
	colorMode,
	themeColors,
	privacyNotice,
	captchaProvider,
	captchaSiteKey,
}: ConnectBlockProps) {
	const { isPreview } = usePreview();
	const [modalOpen, setModalOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const displayMode = (config.displayMode as string) || "modal";
	const buttonText = (config.buttonText as string) || "Connect With Me";
	const buttonEmoji = config.buttonEmoji as string | undefined;
	const buttonEmojiPosition = (config.buttonEmojiPosition as string) || "left";
	const textAlign = (config.textAlign as string) || "center";
	const isOutlined = config.isOutlined as boolean | undefined;
	const borderRadius = (config.borderRadius as string) || "2xl";
	const shadow = config.shadow as string | undefined;
	const customBgColor = config.customBgColor as string | undefined;
	const customTextColor = config.customTextColor as string | undefined;

	const form = (
		<ConnectForm
			blockId={block.id}
			blockTitle={block.title}
			config={config}
			colorMode={colorMode}
			themeColors={themeColors}
			isPreview={isPreview}
			privacyNotice={privacyNotice}
			captchaProvider={captchaProvider}
			captchaSiteKey={captchaSiteKey}
		/>
	);

	// Inline mode: render form directly in the block list
	if (displayMode === "inline") {
		const cardStyle: React.CSSProperties = themeColors
			? {
					backgroundColor: `${themeColors.card}cc`,
					color: themeColors.cardFg,
					borderColor: themeColors.border,
				}
			: colorMode === "dark"
				? {
						backgroundColor: "rgba(31,41,55,0.8)",
						color: "#f9fafb",
						borderColor: "rgba(255,255,255,0.08)",
					}
				: {
						backgroundColor: "rgba(255,255,255,0.8)",
						color: "#111827",
						borderColor: "rgba(0,0,0,0.06)",
					};

		return (
			<div className="ld-connect-block ld-contact-block">
				<div
					className="rounded-2xl border p-5 backdrop-blur-xl"
					style={{
						...cardStyle,
						transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease",
					}}
				>
					<h3 className="mb-4 text-base font-semibold text-center">
						{block.title || "Connect With Me"}
					</h3>
					{form}
				</div>
			</div>
		);
	}

	// Modal mode: show a button that opens the form in a modal
	const radiusClasses: Record<string, string> = {
		none: "rounded-none",
		sm: "rounded-sm",
		md: "rounded-md",
		lg: "rounded-lg",
		xl: "rounded-xl",
		"2xl": "rounded-2xl",
		full: "rounded-full",
	};

	const shadowClasses: Record<string, string> = {
		none: "",
		sm: "shadow-sm",
		md: "shadow-md",
		lg: "shadow-lg",
	};

	const textAlignClasses: Record<string, string> = {
		left: "text-left",
		center: "text-center",
		right: "text-right",
	};

	const baseClasses = `block w-full px-6 py-3.5 font-medium transition-all duration-200 ${
		radiusClasses[borderRadius] || "rounded-2xl"
	} ${shadowClasses[shadow || "none"]} ${textAlignClasses[textAlign] || "text-center"}`;

	const style: React.CSSProperties = {
		transition: "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease",
	};

	if (customBgColor) {
		style.backgroundColor = customBgColor;
		if (customTextColor) style.color = customTextColor;
	} else if (themeColors) {
		if (isOutlined) {
			style.border = `2px solid ${themeColors.border}`;
			style.color = themeColors.cardFg;
			style.backgroundColor = "transparent";
		} else {
			style.backgroundColor = themeColors.primary;
			style.color = getReadableTextColor(themeColors.primary);
		}
	}

	const colorClasses =
		customBgColor || themeColors
			? ""
			: isOutlined
				? colorMode === "dark"
					? "border-2 border-gray-600 text-white hover:bg-gray-800"
					: "border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
				: colorMode === "dark"
					? "bg-gray-800 text-white hover:bg-gray-700"
					: "bg-white text-gray-900 border border-gray-200 shadow-sm hover:shadow-md";

	const modalTitle = block.title || "Connect With Me";
	const modalCardStyle: React.CSSProperties = themeColors
		? { backgroundColor: themeColors.card, color: themeColors.cardFg }
		: colorMode === "dark"
			? { backgroundColor: "#1f2937", color: "#f9fafb" }
			: { backgroundColor: "#ffffff", color: "#111827" };

	// The shared Base UI dialog gives a live focus trap, focus return to the
	// trigger, Escape/backdrop dismissal, scroll lock and an inert background.
	// It portals to <body> so `.ld-page`'s size containment and the blocks'
	// entrance transform can't become the containing block of the fixed
	// overlay. In the admin preview it stays inside the (scaled) phone frame and
	// only traps focus, so it never covers or locks the admin shell. Theming is
	// inline from themeColors, so leaving the `--ld-*` scope changes nothing.
	return (
		<div ref={wrapperRef} className="ld-connect-block ld-contact-block">
			<Dialog.Root
				open={modalOpen}
				onOpenChange={setModalOpen}
				modal={isPreview ? "trap-focus" : true}
			>
				<Dialog.Trigger
					className={`${baseClasses} ${colorClasses} cursor-pointer hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2`}
					style={{ ...style, outlineColor: themeColors?.primary || "#3b82f6" }}
				>
					<span className="flex items-center justify-center gap-2">
						{buttonEmoji && buttonEmojiPosition === "left" && (
							<span aria-hidden="true">{buttonEmoji}</span>
						)}
						<span>{buttonText}</span>
						{buttonEmoji && buttonEmojiPosition === "right" && (
							<span aria-hidden="true">{buttonEmoji}</span>
						)}
					</span>
				</Dialog.Trigger>
				<Dialog.Portal container={isPreview ? wrapperRef : undefined}>
					<Dialog.Backdrop
						className="fixed inset-0 z-50 duration-200 data-[open]:animate-in data-[open]:fade-in-0"
						style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
					/>
					<Dialog.Popup
						className="ld-connect-dialog fixed left-1/2 top-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl p-6 shadow-2xl outline-none duration-200 data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95"
						style={modalCardStyle}
					>
						<div className="mb-5 flex items-center justify-between">
							<Dialog.Title className="text-lg font-semibold">{modalTitle}</Dialog.Title>
							<Dialog.Close
								className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-2"
								style={{ outlineColor: themeColors?.primary || "#3b82f6" }}
								aria-label="Close"
							>
								<svg
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									strokeWidth={2}
									aria-hidden="true"
								>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</Dialog.Close>
						</div>
						{form}
					</Dialog.Popup>
				</Dialog.Portal>
			</Dialog.Root>
		</div>
	);
}
