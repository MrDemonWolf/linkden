export { cn } from "./utils";

// Components
export { buttonVariants } from "./components/button";
export type { ButtonVariantProps } from "./components/button";

export { Switch } from "./components/switch";

export { Checkbox } from "./components/checkbox";
export type { CheckboxProps } from "./components/checkbox";

export {
	Dialog,
	DialogPortal,
	DialogOverlay,
	DialogTrigger,
	DialogClose,
	DialogContent,
	DialogHeader,
	DialogFooter,
	DialogTitle,
	DialogDescription,
} from "./components/dialog";

export { Avatar, AvatarImage, AvatarFallback } from "./components/avatar";

export { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/tabs";

export { Separator } from "./components/separator";

// Theme system
export type { ThemePreset } from "./themes";
export { themePresets } from "./themes";

// Banner presets
export type { BannerPreset, CssBannerPreset, ShaderBannerPreset } from "./banner-presets";
export { bannerPresets, getPresetById, getBannerPresetsForTheme } from "./banner-presets";

// Social brands
export type { SocialBrand, SocialCategory } from "./social-brands";
export { socialBrands, socialBrandMap, SOCIAL_CATEGORIES } from "./social-brands";
