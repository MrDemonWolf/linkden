import type { SocialCategory } from "@linkden/ui/social-brands";

export interface NetworkDraft {
	url: string;
	isActive: boolean;
}

// Typed via SocialCategory to enforce coverage at declaration time, but exposed
// as Record<string, …> so existing string-keyed lookup sites keep compiling.
const _LABELS: Record<SocialCategory, string> = {
	social: "Social Media",
	messaging: "Messaging",
	developer: "Developer",
	business: "Business",
	content: "Content",
	music: "Music & Audio",
	gaming: "Gaming",
};

export const CATEGORY_LABELS: Record<string, string> = _LABELS;
