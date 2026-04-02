"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import type { ThemeColors } from "./public-page";
import { usePreview } from "./preview-context";

const WHERE_MET_OPTIONS = [
	"Conference",
	"Online",
	"Work",
	"Mutual Friend",
	"Social Media",
	"Other",
] as const;

interface ConnectBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
	ppUrl?: string;
}

function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const toLinear = (c: number) =>
		c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
	return L > 0.179 ? "#000000" : "#FFFFFF";
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
}) {
	const [touched, setTouched] = useState(false);

	const fieldStyle: React.CSSProperties = themeColors
		? {
				borderColor: themeColors.border,
				backgroundColor: `${themeColors.bg}40`,
				color: themeColors.cardFg,
			}
		: {};

	const errorBorderStyle: React.CSSProperties =
		error && touched ? { borderColor: "#f87171" } : {};

	const baseClasses =
		"peer w-full rounded-xl border px-4 pt-5 pb-2 text-sm outline-none transition-all duration-200 placeholder-transparent focus:ring-1 focus:ring-current/20";

	const labelBase =
		"pointer-events-none absolute left-4 text-sm transition-all duration-200";

	const labelClasses = `${labelBase} top-1/2 -translate-y-1/2 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-medium ${
		value ? "top-3 translate-y-0 text-[10px] font-medium" : ""
	}`;

	const labelClassesMultiline = `${labelBase} top-4 peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-medium ${
		value ? "top-2 text-[10px] font-medium" : ""
	}`;

	const labelStyle: React.CSSProperties = themeColors
		? { color: themeColors.mutedFg }
		: {};

	if (multiline) {
		return (
			<div className="relative">
				<textarea
					id={id}
					placeholder={label}
					required={required}
					rows={3}
					value={value}
					onChange={(e) => onChange(e.target.value)}
					onBlur={() => setTouched(true)}
					className={`${baseClasses} pt-6 resize-none`}
					style={{ ...fieldStyle, ...errorBorderStyle }}
					aria-describedby={error && touched ? `${id}-error` : undefined}
					aria-invalid={error && touched ? true : undefined}
				/>
				<label htmlFor={id} className={labelClassesMultiline} style={labelStyle}>
					{label}
				</label>
				{error && touched && (
					<span id={`${id}-error`} className="mt-1 block text-xs text-red-400" role="alert">
						{error}
					</span>
				)}
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
				value={value}
				onChange={(e) => onChange(e.target.value)}
				onBlur={() => setTouched(true)}
				className={baseClasses}
				style={{ ...fieldStyle, ...errorBorderStyle }}
				aria-describedby={error && touched ? `${id}-error` : undefined}
				aria-invalid={error && touched ? true : undefined}
			/>
			<label htmlFor={id} className={labelClasses} style={labelStyle}>
				{label}
			</label>
			{error && touched && (
				<span id={`${id}-error`} className="mt-1 block text-xs text-red-400" role="alert">
					{error}
				</span>
			)}
		</div>
	);
}

function WhereMetSelect({
	id,
	value,
	onChange,
	error,
	themeColors,
}: {
	id: string;
	value: string;
	onChange: (val: string) => void;
	error?: string;
	themeColors?: ThemeColors;
}) {
	const [touched, setTouched] = useState(false);
	const [showOtherInput, setShowOtherInput] = useState(false);

	const fieldStyle: React.CSSProperties = themeColors
		? {
				borderColor: themeColors.border,
				backgroundColor: `${themeColors.bg}40`,
				color: themeColors.cardFg,
			}
		: {};

	const errorBorderStyle: React.CSSProperties =
		error && touched ? { borderColor: "#f87171" } : {};

	const labelStyle: React.CSSProperties = themeColors
		? { color: themeColors.mutedFg }
		: {};

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
					className="peer w-full rounded-xl border px-4 pt-5 pb-2 text-sm outline-none transition-all duration-200 focus:ring-1 focus:ring-current/20 appearance-none bg-transparent"
					style={{ ...fieldStyle, ...errorBorderStyle }}
					aria-describedby={error && touched ? `${id}-error` : undefined}
					aria-invalid={error && touched ? true : undefined}
				>
					<option value="">Select...</option>
					{WHERE_MET_OPTIONS.map((opt) => (
						<option key={opt} value={opt}>
							{opt}
						</option>
					))}
				</select>
				<label
					htmlFor={id}
					className="pointer-events-none absolute left-4 top-3 translate-y-0 text-[10px] font-medium transition-all duration-200"
					style={labelStyle}
				>
					Where did we meet? <span className="text-red-400" aria-hidden="true">*</span>
				</label>
				{/* Chevron icon */}
				<svg
					className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2"
					style={{ color: themeColors?.mutedFg || "#9ca3af" }}
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					strokeWidth={2}
				>
					<path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</div>
			{showOtherInput && (
				<FloatingField
					id={`${id}-other`}
					label="Please specify..."
					required
					value={value}
					onChange={onChange}
					error={!value && touched ? "Please specify where we met" : undefined}
					themeColors={themeColors}
				/>
			)}
			{error && touched && !showOtherInput && (
				<span id={`${id}-error`} className="mt-1 block text-xs text-red-400" role="alert">
					{error}
				</span>
			)}
		</div>
	);
}

function ConnectForm({
	blockId,
	blockTitle,
	config,
	colorMode,
	themeColors,
	isPreview,
	onClose,
	isModal = false,
	ppUrl,
}: {
	blockId: string;
	blockTitle: string | null;
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
	isPreview?: boolean;
	onClose?: () => void;
	isModal?: boolean;
	ppUrl?: string;
}) {
	const successMessage =
		(config.successMessage as string) || "Thanks for connecting! I'll be in touch.";

	const [formData, setFormData] = useState({
		firstName: "",
		lastName: "",
		email: "",
		whereMet: "",
		message: "",
		consent: false,
	});
	const [submitted, setSubmitted] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const submitContact = useMutation({
		...trpc.public.submitContact.mutationOptions(),
		onSuccess: () => {
			setSubmitted(true);
			setFormData({ firstName: "", lastName: "", email: "", whereMet: "", message: "", consent: false });
		},
	});

	const validate = useCallback(() => {
		const errs: Record<string, string> = {};
		if (!formData.firstName.trim()) errs.firstName = "First name is required";
		if (!formData.lastName.trim()) errs.lastName = "Last name is required";
		if (!formData.email.trim()) {
			errs.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errs.email = "Invalid email address";
		}
		if (!formData.whereMet.trim()) errs.whereMet = "Please select where we met";
		if (!formData.consent) errs.consent = "You must agree to continue";
		return errs;
	}, [formData]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isPreview) return;
		const errs = validate();
		setErrors(errs);
		if (Object.keys(errs).length > 0) return;

		submitContact.mutate({
			firstName: formData.firstName,
			lastName: formData.lastName,
			email: formData.email,
			whereMet: formData.whereMet,
			message: formData.message || undefined,
			blockId,
			blockTitle: blockTitle || undefined,
			consent: true,
		});
	};

	const updateField = (field: string) => (value: string) => {
		setFormData((prev) => ({ ...prev, [field]: value }));
		if (errors[field]) {
			setErrors((prev) => {
				const next = { ...prev };
				delete next[field];
				return next;
			});
		}
	};

	const primaryColor = themeColors?.primary || (colorMode === "dark" ? "#3b82f6" : "#2563eb");

	if (submitted) {
		return (
			<div className="py-6 text-center">
				<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-500/20">
					<svg
						className="h-7 w-7 text-green-400"
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
					className="mt-3 text-xs transition-colors hover:opacity-70"
					style={{ color: primaryColor }}
				>
					Send another message
				</button>
			</div>
		);
	}

	return (
		<form onSubmit={handleSubmit} className="space-y-3" noValidate>
			{isPreview && (
				<p className="mb-3 text-center text-[10px] uppercase tracking-widest opacity-40">
					Preview
				</p>
			)}

			<div className="grid gap-3 sm:grid-cols-2">
				<FloatingField
					id={`connect-fname-${blockId}`}
					label="First Name"
					required
					value={formData.firstName}
					onChange={updateField("firstName")}
					error={errors.firstName}
					themeColors={themeColors}
				/>
				<FloatingField
					id={`connect-lname-${blockId}`}
					label="Last Name"
					required
					value={formData.lastName}
					onChange={updateField("lastName")}
					error={errors.lastName}
					themeColors={themeColors}
				/>
			</div>

			<FloatingField
				id={`connect-email-${blockId}`}
				label="Email Address"
				type="email"
				required
				value={formData.email}
				onChange={updateField("email")}
				error={errors.email}
				themeColors={themeColors}
			/>

			<WhereMetSelect
				id={`connect-wheremet-${blockId}`}
				value={formData.whereMet}
				onChange={updateField("whereMet")}
				error={errors.whereMet}
				themeColors={themeColors}
			/>

			<FloatingField
				id={`connect-message-${blockId}`}
				label="Message (optional)"
				multiline
				value={formData.message}
				onChange={updateField("message")}
				themeColors={themeColors}
			/>

		<div className="flex flex-col gap-1">
			<label className="flex items-start gap-2.5 cursor-pointer">
				<input
					type="checkbox"
					checked={formData.consent}
					onChange={(e) => {
						setFormData((prev) => ({ ...prev, consent: e.target.checked }));
						if (errors.consent) setErrors((prev) => { const n = { ...prev }; delete n.consent; return n; });
					}}
					className="mt-0.5 h-4 w-4 shrink-0 rounded"
					aria-describedby={errors.consent ? "consent-error" : undefined}
				/>
				<span className="text-xs leading-relaxed" style={{ color: themeColors?.mutedFg || (colorMode === "dark" ? "#9ca3af" : "#6b7280") }}>
					I agree to the processing of my personal data to respond to my enquiry.
					{ppUrl && (<>{" "}<a href={ppUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:opacity-70" style={{ color: primaryColor }}>Privacy Policy</a></>)}
				</span>
			</label>
			{errors.consent && (<span id="consent-error" className="text-xs text-red-400" role="alert">{errors.consent}</span>)}
		</div>

			<button
				type="submit"
				disabled={submitContact.isPending}
				className="w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 hover:brightness-110"
				style={{
					backgroundColor: primaryColor,
					color: getContrastColor(primaryColor),
					outlineColor: primaryColor,
				}}
			>
				{submitContact.isPending ? (
					<span className="inline-flex items-center gap-2">
						<svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
							<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
							<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
						</svg>
						Sending...
					</span>
				) : (
					"Connect"
				)}
			</button>

			{submitContact.isError && (
				<p className="text-center text-sm text-red-400" role="alert">
					Failed to send. Please try again.
				</p>
			)}
		</form>
	);
}

function ConnectModal({
	blockId,
	blockTitle,
	config,
	colorMode,
	themeColors,
	isPreview,
	onClose,
	ppUrl,
}: {
	blockId: string;
	blockTitle: string | null;
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
	isPreview?: boolean;
	onClose: () => void;
	ppUrl?: string;
}) {
	const modalRef = useRef<HTMLDivElement>(null);
	const modalTitle = blockTitle || "Connect With Me";

	const cardStyle: React.CSSProperties = themeColors
		? { backgroundColor: themeColors.card, color: themeColors.cardFg }
		: colorMode === "dark"
			? { backgroundColor: "#1f2937", color: "#f9fafb" }
			: { backgroundColor: "#ffffff", color: "#111827" };

	// Close on Escape
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	// Focus trap
	useEffect(() => {
		const modal = modalRef.current;
		if (!modal) return;

		const focusableSelector =
			'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const focusableElements = modal.querySelectorAll<HTMLElement>(focusableSelector);
		const first = focusableElements[0];
		const last = focusableElements[focusableElements.length - 1];

		first?.focus();

		const handleTab = (e: KeyboardEvent) => {
			if (e.key !== "Tab") return;
			if (e.shiftKey) {
				if (document.activeElement === first) {
					e.preventDefault();
					last?.focus();
				}
			} else {
				if (document.activeElement === last) {
					e.preventDefault();
					first?.focus();
				}
			}
		};

		modal.addEventListener("keydown", handleTab);
		return () => modal.removeEventListener("keydown", handleTab);
	}, []);

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center p-4"
			style={{ backgroundColor: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
			onClick={(e) => {
				if (e.target === e.currentTarget) onClose();
			}}
		>
			<div
				ref={modalRef}
				role="dialog"
				aria-modal="true"
				aria-label={modalTitle}
				className="w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
				style={cardStyle}
			>
				{/* Header */}
				<div className="mb-5 flex items-center justify-between">
					<h3 className="text-lg font-semibold">{modalTitle}</h3>
					<button
						type="button"
						onClick={onClose}
						className="flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:opacity-70 focus-visible:ring-2 focus-visible:ring-offset-2"
						aria-label="Close"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<ConnectForm
					blockId={blockId}
					blockTitle={blockTitle}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
					isPreview={isPreview}
					onClose={onClose}
					isModal
					ppUrl={ppUrl}
				/>
			</div>
		</div>
	);
}

export function ConnectBlock({
	block,
	config,
	colorMode,
	themeColors,
	ppUrl,
}: ConnectBlockProps) {
	const { isPreview } = usePreview();
	const [modalOpen, setModalOpen] = useState(false);

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

	// Inline mode: render form directly in the block list
	if (displayMode === "inline") {
		const cardStyle: React.CSSProperties = themeColors
			? {
					backgroundColor: `${themeColors.card}cc`,
					color: themeColors.cardFg,
					borderColor: themeColors.border,
				}
			: colorMode === "dark"
				? { backgroundColor: "rgba(31,41,55,0.8)", color: "#f9fafb", borderColor: "rgba(255,255,255,0.08)" }
				: { backgroundColor: "rgba(255,255,255,0.8)", color: "#111827", borderColor: "rgba(0,0,0,0.06)" };

		return (
			<div role="listitem" className="ld-connect-block">
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
					<ConnectForm
						blockId={block.id}
						blockTitle={block.title}
						config={config}
						colorMode={colorMode}
						themeColors={themeColors}
						isPreview={isPreview}
					ppUrl={ppUrl}
					/>
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
	} ${shadowClasses[shadow || "none"]} ${
		textAlignClasses[textAlign] || "text-center"
	}`;

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
			style.color = getContrastColor(themeColors.primary);
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

	return (
		<div role="listitem" className="ld-connect-block">
			<button
				type="button"
				onClick={() => setModalOpen(true)}
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
			</button>

			{modalOpen && (
				<ConnectModal
					blockId={block.id}
					blockTitle={block.title}
					config={config}
					colorMode={colorMode}
					themeColors={themeColors}
					isPreview={isPreview}
					onClose={() => setModalOpen(false)}
				ppUrl={ppUrl}
				/>
			)}
		</div>
	);
}
