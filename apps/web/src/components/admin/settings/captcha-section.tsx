import { z } from "zod";
import { FieldError } from "@/components/admin/field-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { fieldError } from "@/lib/validate";
import { FieldGroup } from "./field-group";

const keySchema = z.string().max(200);

/** Field → message for invalid CAPTCHA keys. Only checked while a provider is selected. */
export function captchaErrors(v: {
	captchaProvider: string;
	captchaSiteKey: string;
	captchaSecretKey: string;
}): Record<string, string> {
	if (!v.captchaProvider || v.captchaProvider === "none") return {};
	const errors: Record<string, string> = {};
	const site = fieldError(keySchema, v.captchaSiteKey);
	if (site) errors.captchaSiteKey = site;
	const secret = fieldError(keySchema, v.captchaSecretKey);
	if (secret) errors.captchaSecretKey = secret;
	return errors;
}

interface CaptchaSectionProps {
	captchaProvider: string;
	captchaSiteKey: string;
	captchaSecretKey: string;
	onCaptchaProviderChange: (v: string) => void;
	onCaptchaSiteKeyChange: (v: string) => void;
	onCaptchaSecretKeyChange: (v: string) => void;
}

export function CaptchaSection({
	captchaProvider,
	captchaSiteKey,
	captchaSecretKey,
	onCaptchaProviderChange,
	onCaptchaSiteKeyChange,
	onCaptchaSecretKeyChange,
}: CaptchaSectionProps) {
	const errors = captchaErrors({ captchaProvider, captchaSiteKey, captchaSecretKey });
	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="s-captcha-provider">Provider</Label>
				<Select
					id="s-captcha-provider"
					value={captchaProvider}
					onValueChange={onCaptchaProviderChange}
					items={[
						{ value: "none", label: "None" },
						{ value: "turnstile", label: "Cloudflare Turnstile" },
						{ value: "recaptcha", label: "Google reCAPTCHA" },
					]}
				/>
			</div>
			{captchaProvider !== "none" && (
				<FieldGroup columns={2}>
					<div className="space-y-1.5">
						<Label htmlFor="s-captcha-site">Site Key</Label>
						<Input
							id="s-captcha-site"
							value={captchaSiteKey}
							onChange={(e) => onCaptchaSiteKeyChange(e.target.value)}
							aria-invalid={!!errors.captchaSiteKey}
							aria-describedby={errors.captchaSiteKey ? "s-captcha-site-error" : undefined}
						/>
						<FieldError id="s-captcha-site-error" error={errors.captchaSiteKey} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="s-captcha-secret">Secret Key</Label>
						<Input
							id="s-captcha-secret"
							type="password"
							value={captchaSecretKey}
							onChange={(e) => onCaptchaSecretKeyChange(e.target.value)}
							aria-invalid={!!errors.captchaSecretKey}
							aria-describedby={errors.captchaSecretKey ? "s-captcha-secret-error" : undefined}
						/>
						<FieldError id="s-captcha-secret-error" error={errors.captchaSecretKey} />
					</div>
				</FieldGroup>
			)}
		</div>
	);
}
