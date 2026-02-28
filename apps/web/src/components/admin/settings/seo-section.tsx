import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldGroup } from "./field-group";

interface SeoSectionProps {
	seoTitle: string;
	seoDescription: string;
	seoOgImage: string;
	onSeoTitleChange: (v: string) => void;
	onSeoDescriptionChange: (v: string) => void;
	onSeoOgImageChange: (v: string) => void;
}

export function SeoSection({
	seoTitle,
	seoDescription,
	seoOgImage,
	onSeoTitleChange,
	onSeoDescriptionChange,
	onSeoOgImageChange,
}: SeoSectionProps) {
	return (
		<div className="space-y-4">
			<FieldGroup>
				<div className="space-y-1.5">
					<Label htmlFor="s-seo-title">Page Title</Label>
					<Input
						id="s-seo-title"
						value={seoTitle}
						onChange={(e) => onSeoTitleChange(e.target.value)}
						placeholder="My Links"
					/>
				</div>
			</FieldGroup>
			<div className="space-y-1.5">
				<Label htmlFor="s-seo-desc">Description</Label>
				<textarea
					id="s-seo-desc"
					value={seoDescription}
					onChange={(e) => onSeoDescriptionChange(e.target.value)}
					rows={2}
					placeholder="Check out all my links"
					className="dark:bg-input/30 border-input w-full rounded-md border bg-transparent backdrop-blur-sm px-3 py-2 text-xs outline-none focus-visible:ring-1 focus-visible:ring-ring"
				/>
			</div>
			<div className="space-y-1.5">
				<Label htmlFor="s-seo-og">OG Image URL</Label>
				<Input
					id="s-seo-og"
					value={seoOgImage}
					onChange={(e) => onSeoOgImageChange(e.target.value)}
					placeholder="https://..."
				/>
				<p className="text-[11px] text-muted-foreground">
					Preview image shown when your page is shared on social media
				</p>
			</div>
		</div>
	);
}
