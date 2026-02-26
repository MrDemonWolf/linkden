import {
	Users,
	MessageCircle,
	Code2,
	Briefcase,
	FileText,
	Music,
	Gamepad2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NetworkDraft {
	url: string;
	isActive: boolean;
}

export const CATEGORY_LABELS: Record<string, string> = {
	social: "Social Media",
	messaging: "Messaging",
	developer: "Developer",
	business: "Business",
	content: "Content",
	music: "Music & Audio",
	gaming: "Gaming",
};

export const ALL_CATEGORIES = ["all", ...Object.keys(CATEGORY_LABELS)];

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
	social: Users,
	messaging: MessageCircle,
	developer: Code2,
	business: Briefcase,
	content: FileText,
	music: Music,
	gaming: Gamepad2,
};
