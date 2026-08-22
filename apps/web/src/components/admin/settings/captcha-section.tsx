import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { FieldGroup } from "./field-group";

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
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="s-captcha-secret">Secret Key</Label>
						<Input
							id="s-captcha-secret"
							type="password"
							value={captchaSecretKey}
							onChange={(e) => onCaptchaSecretKeyChange(e.target.value)}
						/>
					</div>
				</FieldGroup>
			)}
		</div>
	);
}
