export interface OgTemplate {
	id: string;
	name: string;
	description: string;
}

export const OG_TEMPLATES: OgTemplate[] = [
	{
		id: "minimal",
		name: "Minimal",
		description: "Clean white background with centered text",
	},
	{
		id: "gradient",
		name: "Gradient",
		description: "Gradient background using your primary color",
	},
	{
		id: "bold",
		name: "Bold",
		description: "Dark background with colorful accent block",
	},
	{
		id: "profile",
		name: "Profile",
		description: "Card-style layout with avatar placeholder",
	},
];
