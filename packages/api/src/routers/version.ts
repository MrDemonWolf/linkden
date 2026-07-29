import { router, publicProcedure } from "../index";
import { APP_VERSION, compareSemver } from "../utils/version";

export const versionRouter = router({
	current: publicProcedure.query(() => {
		return { version: APP_VERSION };
	}),

	checkUpdate: publicProcedure.query(async () => {
		const current = APP_VERSION;

		try {
			const response = await fetch(
				"https://api.github.com/repos/mrdemonwolf/LinkDen/releases/latest",
				{
					headers: {
						Accept: "application/vnd.github.v3+json",
						"User-Agent": "LinkDen",
					},
				},
			);

			if (!response.ok) {
				return {
					current,
					latest: current,
					hasUpdate: false,
					releaseUrl: null,
					changelog: null,
				};
			}

			const data = (await response.json()) as {
				tag_name: string;
				html_url: string;
				body: string;
			};
			const latest = data.tag_name.replace(/^v/, "");

			return {
				current,
				latest,
				hasUpdate: compareSemver(latest, current) > 0,
				releaseUrl: data.html_url,
				changelog: data.body,
			};
		} catch {
			return {
				current,
				latest: current,
				hasUpdate: false,
				releaseUrl: null,
				changelog: null,
			};
		}
	}),
});
