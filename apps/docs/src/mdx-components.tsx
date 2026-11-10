import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import {
	ControlScale,
	PresetPalette,
	PresetVars,
	RadiusScale,
	SharedDarkSurfaces,
	TokenTable,
	TypeScale,
} from "@/components/design-tokens";
import { EmailPreview } from "@/components/email-preview";
import { Screenshot, ScreenshotGrid } from "@/components/screenshot";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return {
		...defaultMdxComponents,
		EmailPreview,
		Screenshot,
		ScreenshotGrid,
		// Build-time token tables read from apps/web/src/index.css and packages/ui/src/themes.ts.
		TokenTable,
		RadiusScale,
		TypeScale,
		ControlScale,
		PresetPalette,
		PresetVars,
		SharedDarkSurfaces,
		...components,
	};
}
