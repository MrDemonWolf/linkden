import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldGroup, selectClassName } from "./field-group";

interface EmailSectionProps {
	emailProvider: string;
	emailApiKey: string;
	emailFrom: string;
	onEmailProviderChange: (v: string) => void;
	onEmailApiKeyChange: (v: string) => void;
	onEmailFromChange: (v: string) => void;
}

export function EmailSection({
	emailProvider,
	emailApiKey,
	emailFrom,
	onEmailProviderChange,
	onEmailApiKeyChange,
	onEmailFromChange,
}: EmailSectionProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-1.5">
				<Label htmlFor="s-email-provider">Provider</Label>
				<select
					id="s-email-provider"
					value={emailProvider}
					onChange={(e) => onEmailProviderChange(e.target.value)}
					className={selectClassName}
				>
					<option value="resend">Resend</option>
					<option value="cloudflare">Cloudflare Email Workers</option>
				</select>
			</div>
			<FieldGroup columns={2}>
				<div className="space-y-1.5">
					<Label htmlFor="s-email-key">API Key</Label>
					<Input
						id="s-email-key"
						type="password"
						value={emailApiKey}
						onChange={(e) => onEmailApiKeyChange(e.target.value)}
						placeholder="re_..."
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="s-email-from">From Address</Label>
					<Input
						id="s-email-from"
						value={emailFrom}
						onChange={(e) => onEmailFromChange(e.target.value)}
						placeholder="noreply@yourdomain.com"
					/>
				</div>
			</FieldGroup>
		</div>
	);
}
