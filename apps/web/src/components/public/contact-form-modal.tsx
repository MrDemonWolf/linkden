"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import type { ThemeColors } from "./public-page";

interface ContactFormModalProps {
	blockId: string;
	blockTitle: string | null;
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	themeColors?: ThemeColors;
	isPreview?: boolean;
	onClose: () => void;
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
					rows={4}
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

export function getContrastColor(hex: string): string {
	const r = parseInt(hex.slice(1, 3), 16) / 255;
	const g = parseInt(hex.slice(3, 5), 16) / 255;
	const b = parseInt(hex.slice(5, 7), 16) / 255;
	const toLinear = (c: number) =>
		c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	const L = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
	return L > 0.179 ? "#000000" : "#FFFFFF";
}

export function ContactFormModal({
	blockId,
	blockTitle,
	config,
	colorMode,
	themeColors,
	isPreview,
	onClose,
}: ContactFormModalProps) {
	const modalRef = useRef<HTMLDivElement>(null);
	const preset = config.preset as string | undefined;
	const presetTitles: Record<string, string> = {
		contact: "Contact Me",
		connect: "Connect with Me",
		feedback: "Feedback",
		rsvp: "RSVP",
	};
	const presetSuccessMessages: Record<string, string> = {
		contact: "Thanks for reaching out!",
		connect: "Thanks for connecting!",
		feedback: "Thanks for your feedback!",
		rsvp: "Your RSVP has been received!",
	};
	const modalTitle = blockTitle || presetTitles[preset || ""] || "Contact Me";
	const successMessage = (config.successMessage as string) || presetSuccessMessages[preset || ""] || "Thanks for reaching out!";
	const showPhone = config.showPhone as boolean | undefined;
	const showSubject = config.showSubject as boolean | undefined;
	const showCompany = config.showCompany as boolean | undefined;
	const showWhereMet = config.showWhereMet as boolean | undefined;
	const showRating = config.showRating as boolean | undefined;
	const showAttending = config.showAttending as boolean | undefined;
	const showGuests = config.showGuests as boolean | undefined;

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		message: "",
		phone: "",
		subject: "",
		company: "",
		whereMet: "",
		rating: 0,
		attending: "" as "" | "yes" | "no" | "maybe",
		guests: "",
	});
	const [submitted, setSubmitted] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const submitContact = useMutation({
		...trpc.public.submitContact.mutationOptions(),
		onSuccess: () => {
			setSubmitted(true);
			setFormData({ name: "", email: "", message: "", phone: "", subject: "", company: "", whereMet: "", rating: 0, attending: "", guests: "" });
		},
	});

	const validate = useCallback(() => {
		const errs: Record<string, string> = {};
		if (!formData.name.trim()) errs.name = "Name is required";
		if (!formData.email.trim()) {
			errs.email = "Email is required";
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
			errs.email = "Invalid email address";
		}
		if (!formData.message.trim()) errs.message = "Message is required";
		if (showWhereMet && !formData.whereMet.trim()) errs.whereMet = "This field is required";
		if (showAttending && !formData.attending) errs.attending = "Please select an option";
		return errs;
	}, [formData, showWhereMet, showAttending]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isPreview) return;
		const errs = validate();
		setErrors(errs);
		if (Object.keys(errs).length > 0) return;

		submitContact.mutate({
			name: formData.name,
			email: formData.email,
			message: formData.message,
			phone: formData.phone || undefined,
			subject: formData.subject || undefined,
			company: formData.company || undefined,
			whereMet: formData.whereMet || undefined,
			rating: formData.rating > 0 ? formData.rating : undefined,
			attending: formData.attending || undefined,
			guests: formData.guests ? Number(formData.guests) : undefined,
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
	}, [submitted]);

	const cardStyle: React.CSSProperties = themeColors
		? { backgroundColor: themeColors.card, color: themeColors.cardFg }
		: colorMode === "dark"
			? { backgroundColor: "#1f2937", color: "#f9fafb" }
			: { backgroundColor: "#ffffff", color: "#111827" };

	const primaryColor = themeColors?.primary || (colorMode === "dark" ? "#3b82f6" : "#2563eb");

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
						className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:opacity-70"
						aria-label="Close"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{isPreview && (
					<p className="mb-3 text-center text-[10px] uppercase tracking-widest opacity-40">
						Preview
					</p>
				)}

				{submitted ? (
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
				) : (
					<form onSubmit={handleSubmit} className="space-y-3" noValidate>
						<div className="grid gap-3 sm:grid-cols-2">
							<FloatingField
								id={`contact-name-${blockId}`}
								label="Your Name"
								required
								value={formData.name}
								onChange={updateField("name")}
								error={errors.name}
								themeColors={themeColors}
							/>
							<FloatingField
								id={`contact-email-${blockId}`}
								label="Email Address"
								type="email"
								required
								value={formData.email}
								onChange={updateField("email")}
								error={errors.email}
								themeColors={themeColors}
							/>
						</div>

						{showPhone && (
							<FloatingField
								id={`contact-phone-${blockId}`}
								label="Phone Number"
								type="tel"
								value={formData.phone}
								onChange={updateField("phone")}
								themeColors={themeColors}
							/>
						)}

						{showSubject && (
							<FloatingField
								id={`contact-subject-${blockId}`}
								label="Subject"
								value={formData.subject}
								onChange={updateField("subject")}
								themeColors={themeColors}
							/>
						)}

						{showCompany && (
							<FloatingField
								id={`contact-company-${blockId}`}
								label="Company"
								value={formData.company}
								onChange={updateField("company")}
								themeColors={themeColors}
							/>
						)}

						{showWhereMet && (
							<FloatingField
								id={`contact-wheremet-${blockId}`}
								label="Where did we meet?"
								required
								value={formData.whereMet}
								onChange={updateField("whereMet")}
								error={errors.whereMet}
								themeColors={themeColors}
							/>
						)}

						{showRating && (
							<div className="space-y-1.5">
								<label className="text-sm" style={themeColors ? { color: themeColors.mutedFg } : {}}>
									Rating
								</label>
								<div className="flex gap-1">
									{[1, 2, 3, 4, 5].map((star) => (
										<button
											key={star}
											type="button"
											onClick={() => setFormData((prev) => ({ ...prev, rating: prev.rating === star ? 0 : star }))}
											className="p-0.5 transition-transform hover:scale-110"
											aria-label={`${star} star${star > 1 ? "s" : ""}`}
										>
											<svg
												className="h-7 w-7"
												viewBox="0 0 24 24"
												fill={formData.rating >= star ? (themeColors?.primary || "#eab308") : "none"}
												stroke={formData.rating >= star ? (themeColors?.primary || "#eab308") : (themeColors?.mutedFg || "#9ca3af")}
												strokeWidth={1.5}
											>
												<path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
											</svg>
										</button>
									))}
								</div>
							</div>
						)}

						{showAttending && (
							<div className="space-y-1.5">
								<label className="text-sm" style={themeColors ? { color: themeColors.mutedFg } : {}}>
									Attending <span className="text-red-400">*</span>
								</label>
								<div
									className="flex rounded-xl border overflow-hidden"
									style={themeColors ? { borderColor: themeColors.border } : {}}
								>
									{(["yes", "no", "maybe"] as const).map((opt) => (
										<button
											key={opt}
											type="button"
											onClick={() => setFormData((prev) => ({ ...prev, attending: opt }))}
											className="flex-1 py-2.5 text-sm font-medium transition-colors capitalize"
											style={{
												backgroundColor: formData.attending === opt ? (themeColors?.primary || "#2563eb") : "transparent",
												color: formData.attending === opt ? getContrastColor(themeColors?.primary || "#2563eb") : (themeColors?.cardFg || "inherit"),
											}}
										>
											{opt}
										</button>
									))}
								</div>
								{errors.attending && (
									<span className="mt-1 block text-xs text-red-400" role="alert">
										{errors.attending}
									</span>
								)}
							</div>
						)}

						{showGuests && (
							<FloatingField
								id={`contact-guests-${blockId}`}
								label="Number of Guests"
								type="number"
								value={formData.guests}
								onChange={updateField("guests")}
								themeColors={themeColors}
							/>
						)}

						<FloatingField
							id={`contact-message-${blockId}`}
							label="Your message..."
							required
							multiline
							value={formData.message}
							onChange={updateField("message")}
							error={errors.message}
							themeColors={themeColors}
						/>

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
								"Send Message"
							)}
						</button>

						{submitContact.isError && (
							<p className="text-center text-sm text-red-400" role="alert">
								Failed to send. Please try again.
							</p>
						)}
					</form>
				)}
			</div>
		</div>
	);
}
