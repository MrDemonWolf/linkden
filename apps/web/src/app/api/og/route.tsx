import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const template = searchParams.get("template") ?? "minimal";
	const name = searchParams.get("name") ?? "My Links";
	const bio = searchParams.get("bio") ?? "";
	const theme = searchParams.get("theme") ?? "#6366f1";

	const width = 1200;
	const height = 630;

	const templates: Record<string, React.ReactElement> = {
		minimal: (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					backgroundColor: "#ffffff",
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						fontSize: 64,
						fontWeight: 700,
						color: "#1a1a1a",
						marginBottom: 16,
					}}
				>
					{name}
				</div>
				{bio && (
					<div
						style={{
							fontSize: 28,
							color: "#666666",
							maxWidth: 800,
							textAlign: "center",
						}}
					>
						{bio}
					</div>
				)}
			</div>
		),

		gradient: (
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					background: `linear-gradient(135deg, ${theme}, ${theme}99)`,
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						fontSize: 72,
						fontWeight: 800,
						color: "#ffffff",
						marginBottom: 16,
						textShadow: "0 2px 10px rgba(0,0,0,0.2)",
					}}
				>
					{name}
				</div>
				{bio && (
					<div
						style={{
							fontSize: 28,
							color: "rgba(255,255,255,0.9)",
							maxWidth: 800,
							textAlign: "center",
						}}
					>
						{bio}
					</div>
				)}
			</div>
		),

		bold: (
			<div
				style={{
					display: "flex",
					width: "100%",
					height: "100%",
					backgroundColor: "#0a0a0a",
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						width: 12,
						height: "100%",
						backgroundColor: theme,
					}}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						padding: "0 80px",
						flex: 1,
					}}
				>
					<div
						style={{
							fontSize: 72,
							fontWeight: 800,
							color: "#ffffff",
							marginBottom: 16,
						}}
					>
						{name}
					</div>
					{bio && (
						<div
							style={{
								fontSize: 28,
								color: "rgba(255,255,255,0.7)",
								maxWidth: 700,
							}}
						>
							{bio}
						</div>
					)}
				</div>
			</div>
		),

		profile: (
			<div
				style={{
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					width: "100%",
					height: "100%",
					backgroundColor: "#f8f9fa",
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						backgroundColor: "#ffffff",
						borderRadius: 24,
						padding: "48px 64px",
						boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
						border: "1px solid rgba(0,0,0,0.06)",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							width: 96,
							height: 96,
							borderRadius: "50%",
							backgroundColor: theme,
							color: "#ffffff",
							fontSize: 40,
							fontWeight: 700,
							marginBottom: 24,
						}}
					>
						{name
							.split(/\s+/)
							.slice(0, 2)
							.map((w) => w[0])
							.join("")
							.toUpperCase()}
					</div>
					<div
						style={{
							fontSize: 48,
							fontWeight: 700,
							color: "#1a1a1a",
							marginBottom: 12,
						}}
					>
						{name}
					</div>
					{bio && (
						<div
							style={{
								fontSize: 24,
								color: "#666666",
								maxWidth: 500,
								textAlign: "center",
							}}
						>
							{bio}
						</div>
					)}
				</div>
			</div>
		),
	};

	const element = templates[template] ?? templates.minimal;

	const response = new ImageResponse(element, { width, height });

	// Aggressive caching: 1 day browser, 7 days CDN/Cloudflare edge
	response.headers.set(
		"Cache-Control",
		"public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
	);

	return response;
}
