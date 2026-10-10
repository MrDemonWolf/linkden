import { CAPTCHA_PROVIDERS, SETTING_REGISTRY } from "@linkden/validators/settings-registry";
import { z } from "zod";
import { FieldError } from "@/components/admin/field-feedback";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { fieldError } from "@/lib/validate";
import { FieldGroup } from "./field-group";
import { SecretInput } from "./secret-input";

// Same caps the server applies (settings registry).
const SITE_KEY_MAX = SETTING_REGISTRY.captcha_site_key?.maxLength ?? 512;
const SECRET_KEY_MAX = SETTING_REGISTRY.captcha_secret_key?.maxLength ?? 512;

/**
 * Both keys are required once a provider is on: the contact form renders the
 * widget from the site key, and the server verifies with the secret and fails
 * closed, so a missing key means every submission is rejected.
 */
const siteKeySchema = z.string().trim().min(1, "Required").max(SITE_KEY_MAX);
const secretKeySchema = z.string().trim().min(1, "Required").max(SECRET_KEY_MAX);

const PROVIDER_LABELS: Record<(typeof CAPTCHA_PROVIDERS)[number], string> = {
	none: "None",
	turnstile: "Cloudflare Turnstile",
	recaptcha: "Google reCAPTCHA v2 (checkbox)",
	hcaptcha: "hCaptcha",
};

// Every provider the server can verify (the registry enum), nothing more.
const PROVIDER_ITEMS = CAPTCHA_PROVIDERS.map((value) => ({ value, label: PROVIDER_LABELS[value] }));

/** Field → message for invalid CAPTCHA keys. Only checked while a provider is selected. */
export function captchaErrors(v: {
	captchaProvider: string;
	captchaSiteKey: string;
	captchaSecretKey: string;
}): Record<string, string> {
	if (!v.captchaProvider || v.captchaProvider === "none") return {};
	const errors: Record<string, string> = {};
	const site = fieldError(siteKeySchema, v.captchaSiteKey);
	if (site) errors.captchaSiteKey = site;
	// A saved secret comes back masked, which counts as filled.
	const secret = fieldError(secretKeySchema, v.captchaSecretKey);
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
					items={PROVIDER_ITEMS}
				/>
				<p className="text-micro text-muted-foreground">
					Visitors solve the challenge on the contact form before it sends. Use the site and secret
					keys from the same provider and site.
				</p>
			</div>
			{captchaProvider !== "none" && (
				<FieldGroup columns={2}>
					<div className="space-y-1.5">
						<Label htmlFor="s-captcha-site">Site Key</Label>
						<Input
							id="s-captcha-site"
							value={captchaSiteKey}
							onChange={(e) => onCaptchaSiteKeyChange(e.target.value)}
							maxLength={SITE_KEY_MAX}
							spellCheck={false}
							autoComplete="off"
							aria-invalid={!!errors.captchaSiteKey}
							aria-describedby={errors.captchaSiteKey ? "s-captcha-site-error" : undefined}
						/>
						<FieldError id="s-captcha-site-error" error={errors.captchaSiteKey} />
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="s-captcha-secret">Secret Key</Label>
						<SecretInput
							id="s-captcha-secret"
							type="password"
							value={captchaSecretKey}
							onValueChange={onCaptchaSecretKeyChange}
							hintId="s-captcha-secret-hint"
							maxLength={SECRET_KEY_MAX}
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
