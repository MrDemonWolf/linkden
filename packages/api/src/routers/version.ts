import { router, publicProcedure } from "../index";

export const versionRouter = router({
	current: publicProcedure.query(() => {
		return { version: "0.1.0" };
	}),

	checkUpdate: publicProcedure.query(async () => {
		const current = "0.1.0";

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
				hasUpdate: latest !== current,
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
