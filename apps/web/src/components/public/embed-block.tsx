interface EmbedBlockProps {
	block: {
		id: string;
		title: string | null;
		embedType: string | null;
		embedUrl: string | null;
	};
	config: Record<string, unknown>;
	colorMode: "light" | "dark";
}

function getEmbedUrl(embedType: string | null, embedUrl: string | null): string | null {
	if (!embedUrl) return null;

	switch (embedType) {
		case "youtube": {
			const match = embedUrl.match(
				/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/,
			);
			return match
				? `https://www.youtube-nocookie.com/embed/${match[1]}`
				: null;
		}
		case "spotify": {
			const match = embedUrl.match(
				/spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/,
			);
			return match
				? `https://open.spotify.com/embed/${match[1]}/${match[2]}`
				: null;
		}
		case "soundcloud":
			return `https://w.soundcloud.com/player/?url=${encodeURIComponent(embedUrl)}&auto_play=false&visual=true`;
		default:
			return embedUrl;
	}
}

const aspectRatioClasses: Record<string, string> = {
	"16:9": "aspect-video",
	"4:3": "aspect-[4/3]",
	"1:1": "aspect-square",
};

const maxWidthClasses: Record<string, string> = {
	sm: "max-w-sm",
	md: "max-w-md",
	lg: "max-w-lg",
	full: "max-w-full",
};

export function EmbedBlock({ block, config, colorMode }: EmbedBlockProps) {
	const aspectRatio = (config.aspectRatio as string) || "16:9";
	const maxWidth = (config.maxWidth as string) || "full";
	const showTitle = config.showTitle !== false;

	const src = getEmbedUrl(block.embedType, block.embedUrl);

	if (!src) return null;

	return (
		<div
			role="listitem"
			className={`ld-embed-block mx-auto ${maxWidthClasses[maxWidth] || "max-w-full"}`}
		>
			{showTitle && block.title && (
				<h3
					className={`mb-2 text-sm font-medium ${
						colorMode === "dark" ? "text-gray-300" : "text-gray-700"
					}`}
				>
					{block.title}
				</h3>
			)}
			<div
				className={`overflow-hidden rounded-lg ${
					aspectRatioClasses[aspectRatio] || "aspect-video"
				}`}
			>
				<iframe
					src={src}
					className="h-full w-full"
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
					loading="lazy"
					title={block.title || "Embedded content"}
				/>
			</div>
		</div>
	);
}
