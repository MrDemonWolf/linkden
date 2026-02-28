import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ContactFormSectionProps {
	contactFormEnabled: boolean;
	onContactFormEnabledChange: (v: boolean) => void;
}

export function ContactFormSection({
	contactFormEnabled,
	onContactFormEnabledChange,
}: ContactFormSectionProps) {
	return (
		<div className="space-y-4">
			<div className="flex items-center justify-between">
				<div className="space-y-0.5">
					<Label>Enable Contact Form</Label>
					<p className="text-[11px] text-muted-foreground">
						Allow visitors to send messages via a contact form on your page
					</p>
				</div>
				<Switch
					checked={contactFormEnabled}
					onCheckedChange={onContactFormEnabledChange}
					aria-label="Enable contact form"
				/>
			</div>
		</div>
	);
}
