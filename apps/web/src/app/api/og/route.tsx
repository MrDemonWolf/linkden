import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

export const runtime = "edge";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
	const h = hex.replace("#", "");
	return {
		r: parseInt(h.substring(0, 2), 16),
		g: parseInt(h.substring(2, 4), 16),
		b: parseInt(h.substring(4, 6), 16),
	};
}

function darken(hex: string, amount: number): string {
	const { r, g, b } = hexToRgb(hex);
	const f = 1 - amount;
	return `rgb(${Math.round(r * f)}, ${Math.round(g * f)}, ${Math.round(b * f)})`;
}

export async function GET(req: NextRequest) {
	const { searchParams } = req.nextUrl;
	const template = searchParams.get("template") ?? "minimal";
	const name = searchParams.get("name") ?? "My Links";
	const bio = searchParams.get("bio") ?? "";
	const theme = searchParams.get("theme") ?? "#6366f1";
	const avatar = searchParams.get("avatar") ?? "";

	const width = 1200;
	const height = 630;
	const darkTheme = darken(theme, 0.3);

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
					backgroundColor: "#fafafa",
					fontFamily: "sans-serif",
					position: "relative",
				}}
			>
				{/* Subtle decorative dots */}
				<div style={{ display: "flex", position: "absolute", top: 40, left: 40, opacity: 0.06 }}>
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} style={{ display: "flex", flexDirection: "column", marginRight: 24 }}>
							{Array.from({ length: 5 }).map((_, j) => (
								<div key={j} style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#000", marginBottom: 24 }} />
							))}
						</div>
					))}
				</div>
				<div
					style={{
						display: "flex",
						width: 56,
						height: 4,
						borderRadius: 2,
						backgroundColor: theme,
						marginBottom: 32,
					}}
				/>
				<div
					style={{
						fontSize: 64,
						fontWeight: 700,
						color: "#111",
						letterSpacing: -2,
					}}
				>
					{name}
				</div>
				{bio && (
					<div
						style={{
							fontSize: 26,
							color: "#666",
							marginTop: 16,
							maxWidth: 700,
							textAlign: "center",
							lineHeight: 1.4,
						}}
					>
						{bio}
					</div>
				)}
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: 40,
						fontSize: 16,
						color: "#aaa",
						letterSpacing: 2,
					}}
				>
					LINKDEN
				</div>
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
					background: `linear-gradient(135deg, ${theme} 0%, ${darkTheme} 50%, #0f0f23 100%)`,
					fontFamily: "sans-serif",
					position: "relative",
					overflow: "hidden",
				}}
			>
				{/* Decorative circle */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: -120,
						right: -120,
						width: 400,
						height: 400,
						borderRadius: "50%",
						backgroundColor: "rgba(255,255,255,0.06)",
					}}
				/>
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: -80,
						left: -80,
						width: 300,
						height: 300,
						borderRadius: "50%",
						backgroundColor: "rgba(255,255,255,0.04)",
					}}
				/>
				<div
					style={{
						fontSize: 76,
						fontWeight: 800,
						color: "#fff",
						letterSpacing: -2,
						textShadow: "0 4px 20px rgba(0,0,0,0.3)",
					}}
				>
					{name}
				</div>
				{bio && (
					<div
						style={{
							fontSize: 28,
							color: "rgba(255,255,255,0.85)",
							marginTop: 16,
							maxWidth: 700,
							textAlign: "center",
							lineHeight: 1.4,
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
					position: "relative",
					overflow: "hidden",
				}}
			>
				{/* Left accent bar */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						left: 0,
						top: 0,
						width: 8,
						height: "100%",
						background: `linear-gradient(180deg, ${theme}, ${darkTheme})`,
					}}
				/>
				{/* Bottom accent line */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						bottom: 0,
						left: 0,
						width: "100%",
						height: 3,
						background: `linear-gradient(90deg, ${theme}, transparent)`,
					}}
				/>
				{/* Corner accent */}
				<div
					style={{
						display: "flex",
						position: "absolute",
						top: 0,
						right: 0,
						width: 200,
						height: 200,
						background: `linear-gradient(225deg, ${theme}22, transparent)`,
					}}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						justifyContent: "center",
						padding: "0 80px 0 60px",
						flex: 1,
					}}
				>
					<div
						style={{
							fontSize: 20,
							fontWeight: 600,
							color: theme,
							letterSpacing: 3,
							textTransform: "uppercase",
							marginBottom: 16,
						}}
					>
						LINKS
					</div>
					<div
						style={{
							fontSize: 72,
							fontWeight: 800,
							color: "#fff",
							letterSpacing: -2,
							lineHeight: 1.1,
						}}
					>
						{name}
					</div>
					{bio && (
						<div
							style={{
								fontSize: 26,
								color: "rgba(255,255,255,0.6)",
								marginTop: 20,
								maxWidth: 700,
								lineHeight: 1.4,
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
					background: `linear-gradient(160deg, #f0f0f0 0%, #e8e8e8 100%)`,
					fontFamily: "sans-serif",
				}}
			>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						backgroundColor: "#fff",
						borderRadius: 28,
						padding: "56px 80px",
						boxShadow:
							"0 8px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.04)",
					}}
				>
					{/* Avatar */}
					{avatar ? (
						/* eslint-disable-next-line @next/next/no-img-element */
						<img
							src={avatar}
							alt=""
							width={100}
							height={100}
							style={{
								width: 100,
								height: 100,
								borderRadius: "50%",
								objectFit: "cover",
								marginBottom: 28,
								boxShadow: `0 4px 20px ${theme}44`,
							}}
						/>
					) : (
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
								width: 100,
								height: 100,
								borderRadius: "50%",
								background: `linear-gradient(135deg, ${theme}, ${darkTheme})`,
								color: "#fff",
								fontSize: 42,
								fontWeight: 700,
								marginBottom: 28,
								boxShadow: `0 4px 20px ${theme}44`,
							}}
						>
							{name
								.split(/\s+/)
								.slice(0, 2)
								.map((w) => w[0])
								.join("")
								.toUpperCase()}
						</div>
					)}
					<div
						style={{
							fontSize: 48,
							fontWeight: 700,
							color: "#111",
							letterSpacing: -1,
						}}
					>
						{name}
					</div>
					{bio && (
						<div
							style={{
								fontSize: 22,
								color: "#666",
								marginTop: 12,
								maxWidth: 460,
								textAlign: "center",
								lineHeight: 1.5,
							}}
						>
							{bio}
						</div>
					)}
					{/* Bottom accent */}
					<div
						style={{
							display: "flex",
							width: 40,
							height: 3,
							borderRadius: 2,
							backgroundColor: theme,
							marginTop: 28,
						}}
					/>
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
