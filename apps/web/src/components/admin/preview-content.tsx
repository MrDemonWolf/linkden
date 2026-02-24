"use client";

import { Avatar } from "@/components/public/avatar";
import { BannerSection } from "@/components/public/banner-section";
import { WhitelabelFooter } from "@/components/public/whitelabel-footer";
import type { ThemeColors } from "@/components/public/public-page";

export interface PreviewContentProps {
	profile: {
		name: string;
		email: string;
		image: string | null;
		bio: string | null;
		isVerified: boolean;
	};
	blocks: Array<{
		id: string;
		type: string;
		title: string | null;
	}>;
	settings: {
		brandingEnabled: boolean;
		brandingText: string;
		bannerPreset: string | null;
		bannerEnabled: boolean;
	};
	themeColors: ThemeColors;
	colorMode: "light" | "dark";
}

export function PreviewContent({
	profile,
	blocks,
	settings,
	themeColors,
	colorMode,
}: PreviewContentProps) {
	const hasBanner = settings.bannerEnabled && settings.bannerPreset;

	return (
		<div
			className="ld-page min-h-dvh"
			style={{
				backgroundColor: themeColors.bg,
				color: themeColors.fg,
				transition: "background-color 0.5s ease, color 0.5s ease",
			}}
		>
			{hasBanner && (
				<BannerSection
					bannerPreset={settings.bannerPreset!}
					colorMode={colorMode}
					bgColor={themeColors.bg}
					themeColors={themeColors}
				/>
			)}

			<div
				className={`mx-auto max-w-lg px-4 ${hasBanner ? "py-0" : "py-8 md:py-12"}`}
			>
				{/* Profile Section */}
				<div className={`relative z-10 mb-8 text-center ${hasBanner ? "-mt-20" : ""}`}>
					<Avatar
						src={profile.image}
						name={profile.name}
						size="lg"
						hasBanner={!!hasBanner}
						ringColor={hasBanner ? themeColors.bg : undefined}
						themeColors={{ primary: themeColors.primary, accent: themeColors.accent }}
					/>
					<h1 className="mt-4 inline-flex items-center justify-center gap-1.5 text-2xl font-bold">
						{profile.name}
						{profile.isVerified && (
							<svg
								className="h-6 w-6 text-blue-500 shrink-0"
								viewBox="0 0 24 24"
								fill="currentColor"
								aria-hidden="true"
							>
								<path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
							</svg>
						)}
					</h1>
					{profile.bio && (
						<p
							className="mt-2 text-sm"
							style={{ color: themeColors.mutedFg }}
						>
							{profile.bio}
						</p>
					)}
				</div>

				{/* Placeholder Blocks */}
				<div className="space-y-3">
					{blocks.map((block) => {
						switch (block.type) {
							case "link":
								return (
									<div
										key={block.id}
										className="flex items-center gap-3 rounded-lg px-4 py-3"
										style={{
											backgroundColor: themeColors.card,
											border: `1px solid ${themeColors.border}`,
										}}
									>
										<div
											className="h-4 w-4 shrink-0 rounded"
											style={{ backgroundColor: themeColors.primary, opacity: 0.5 }}
										/>
										<span
											className="truncate text-sm font-medium"
											style={{ color: themeColors.cardFg }}
										>
											{block.title || "Link"}
										</span>
									</div>
								);
							case "header":
								return (
									<div
										key={block.id}
										className="py-2 text-center"
									>
										<span
											className="text-xs font-semibold uppercase tracking-wider"
											style={{ color: themeColors.mutedFg }}
										>
											{block.title || "Header"}
										</span>
									</div>
								);
							case "social_icons":
								return (
									<div
										key={block.id}
										className="flex items-center justify-center gap-2 py-2"
									>
										{[1, 2, 3, 4].map((i) => (
											<div
												key={i}
												className="h-8 w-8 rounded-full"
												style={{
													backgroundColor: themeColors.muted,
													border: `1px solid ${themeColors.border}`,
												}}
											/>
										))}
									</div>
								);
							case "embed":
								return (
									<div
										key={block.id}
										className="flex items-center justify-center rounded-lg"
										style={{
											backgroundColor: themeColors.muted,
											border: `1px solid ${themeColors.border}`,
											height: 80,
										}}
									>
										<svg
											className="h-6 w-6"
											style={{ color: themeColors.mutedFg, opacity: 0.5 }}
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											strokeWidth={1.5}
										>
											<path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
										</svg>
									</div>
								);
							case "contact_form":
								return (
									<div
										key={block.id}
										className="space-y-2 rounded-lg p-4"
										style={{
											backgroundColor: themeColors.card,
											border: `1px solid ${themeColors.border}`,
										}}
									>
										<div
											className="h-3 w-20 rounded"
											style={{ backgroundColor: themeColors.muted }}
										/>
										<div
											className="h-8 rounded"
											style={{
												backgroundColor: themeColors.muted,
												border: `1px solid ${themeColors.border}`,
											}}
										/>
										<div
											className="h-3 w-16 rounded"
											style={{ backgroundColor: themeColors.muted }}
										/>
										<div
											className="h-8 rounded"
											style={{
												backgroundColor: themeColors.muted,
												border: `1px solid ${themeColors.border}`,
											}}
										/>
										<div
											className="mt-2 h-8 rounded"
											style={{ backgroundColor: themeColors.primary, opacity: 0.7 }}
										/>
									</div>
								);
							default:
								return null;
						}
					})}
				</div>
			</div>

			{settings.brandingEnabled && (
				<WhitelabelFooter
					text={settings.brandingText}
					mutedFg={themeColors.mutedFg}
				/>
			)}
		</div>
	);
}
