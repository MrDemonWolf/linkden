"use client";

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

interface ContactFormBlockProps {
	block: {
		id: string;
		title: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
	captchaProvider: string;
	captchaSiteKey: string | null;
}

function FloatingField({
	id,
	label,
	type = "text",
	required = false,
	value,
	onChange,
	error,
	isDark,
	multiline = false,
}: {
	id: string;
	label: string;
	type?: string;
	required?: boolean;
	value: string;
	onChange: (val: string) => void;
	error?: string;
	isDark: boolean;
	multiline?: boolean;
}) {
	const [touched, setTouched] = useState(false);

	const baseClasses = `peer w-full rounded-xl border px-4 pt-5 pb-2 text-sm outline-none transition-all duration-200 placeholder-transparent ${
		isDark
			? "border-white/10 bg-white/5 text-white focus:border-white/30 focus:bg-white/10"
			: "border-gray-200/60 bg-white/80 text-gray-900 focus:border-gray-400 focus:bg-white"
	} ${error && touched ? (isDark ? "border-red-400/60" : "border-red-400") : ""}`;

	const labelClasses = `pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm transition-all duration-200 peer-focus:top-3 peer-focus:translate-y-0 peer-focus:text-[10px] peer-focus:font-medium ${
		value
			? "top-3 translate-y-0 text-[10px] font-medium"
			: ""
	} ${
		isDark
			? "text-gray-400 peer-focus:text-gray-300"
			: "text-gray-500 peer-focus:text-gray-600"
	}`;

	const labelClassesMultiline = `pointer-events-none absolute left-4 top-4 text-sm transition-all duration-200 peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-medium ${
		value ? "top-2 text-[10px] font-medium" : ""
	} ${
		isDark
			? "text-gray-400 peer-focus:text-gray-300"
			: "text-gray-500 peer-focus:text-gray-600"
	}`;

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
					aria-describedby={error && touched ? `${id}-error` : undefined}
					aria-invalid={error && touched ? true : undefined}
				/>
				<label htmlFor={id} className={labelClassesMultiline}>
					{label}
				</label>
				{error && touched && (
					<span
						id={`${id}-error`}
						className="mt-1 block text-xs text-red-400"
						role="alert"
					>
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
				aria-describedby={error && touched ? `${id}-error` : undefined}
				aria-invalid={error && touched ? true : undefined}
			/>
			<label htmlFor={id} className={labelClasses}>
				{label}
			</label>
			{error && touched && (
				<span
					id={`${id}-error`}
					className="mt-1 block text-xs text-red-400"
					role="alert"
				>
					{error}
				</span>
			)}
		</div>
	);
}

export function ContactFormBlock({
	block,
	config,
	colorMode,
}: ContactFormBlockProps) {
	const buttonText = (config.buttonText as string) || "Send Message";
	const buttonEmoji = config.buttonEmoji as string | undefined;
	const buttonEmojiPosition = (config.buttonEmojiPosition as string) || "left";
	const successMessage =
		(config.successMessage as string) || "Thanks for reaching out!";

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		message: "",
		phone: "",
		subject: "",
		company: "",
	});
	const [submitted, setSubmitted] = useState(false);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const submitContact = useMutation({
		...trpc.public.submitContact.mutationOptions(),
		onSuccess: () => {
			setSubmitted(true);
			setFormData({
				name: "",
				email: "",
				message: "",
				phone: "",
				subject: "",
				company: "",
			});
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
		return errs;
	}, [formData]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
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
		});
	};

	const isDark = colorMode === "dark";

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

	if (submitted) {
		return (
			<div
				role="listitem"
				className={`rounded-2xl p-8 text-center backdrop-blur-xl ${
					isDark
						? "border border-white/10 bg-white/5"
						: "border border-gray-200/60 bg-white/80"
				}`}
			>
				{/* Animated checkmark */}
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
					className={`mt-3 text-xs transition-colors ${
						isDark
							? "text-gray-400 hover:text-white"
							: "text-gray-500 hover:text-gray-900"
					}`}
				>
					Send another message
				</button>
			</div>
		);
	}

	return (
		<div
			role="listitem"
			className={`ld-contact-block rounded-2xl p-6 backdrop-blur-xl ${
				isDark
					? "border border-white/10 bg-white/5"
					: "border border-gray-200/60 bg-white/80"
			}`}
		>
			{block.title && (
				<h3 className="mb-5 text-center text-lg font-semibold">
					{block.title}
				</h3>
			)}
			<form onSubmit={handleSubmit} className="space-y-3" noValidate>
				{/* Name + Email side-by-side on desktop */}
				<div className="grid gap-3 sm:grid-cols-2">
					<FloatingField
						id="contact-name"
						label="Your Name"
						required
						value={formData.name}
						onChange={updateField("name")}
						error={errors.name}
						isDark={isDark}
					/>
					<FloatingField
						id="contact-email"
						label="Email Address"
						type="email"
						required
						value={formData.email}
						onChange={updateField("email")}
						error={errors.email}
						isDark={isDark}
					/>
				</div>

				<FloatingField
					id="contact-message"
					label="Your message..."
					required
					multiline
					value={formData.message}
					onChange={updateField("message")}
					error={errors.message}
					isDark={isDark}
				/>

				<button
					type="submit"
					disabled={submitContact.isPending}
					className={`w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 ${
						isDark
							? "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 focus-visible:outline-blue-400"
							: "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus-visible:outline-blue-500"
					}`}
				>
					{submitContact.isPending ? (
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
						<span className="inline-flex items-center justify-center gap-2">
							{buttonEmoji && buttonEmojiPosition === "left" && (
								<span aria-hidden="true">{buttonEmoji}</span>
							)}
							{buttonText}
							{buttonEmoji && buttonEmojiPosition === "right" && (
								<span aria-hidden="true">{buttonEmoji}</span>
							)}
						</span>
					)}
				</button>
				{submitContact.isError && (
					<p
						className="text-center text-sm text-red-400"
						role="alert"
					>
						Failed to send. Please try again.
					</p>
				)}
			</form>
		</div>
	);
}
