import { Users, MessageCircle, Code2, Briefcase, FileText, Music, Gamepad2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SOCIAL_CATEGORIES, type SocialCategory } from "@linkden/ui/social-brands";

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
const _ICONS: Record<SocialCategory, LucideIcon> = {
	social: Users,
	messaging: MessageCircle,
	developer: Code2,
	business: Briefcase,
	content: FileText,
	music: Music,
	gaming: Gamepad2,
};

export const CATEGORY_LABELS: Record<string, string> = _LABELS;
export const CATEGORY_ICONS: Record<string, LucideIcon> = _ICONS;
export const ALL_CATEGORIES: ReadonlyArray<"all" | SocialCategory> = ["all", ...SOCIAL_CATEGORIES];
