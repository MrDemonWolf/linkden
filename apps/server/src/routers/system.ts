import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../trpc";

/** Current version from version.json at build time */
const CURRENT_VERSION = "0.1.0";

export const systemRouter = router({
  /** Protected: check for updates against GitHub releases */
  checkUpdate: protectedProcedure.query(async () => {
    try {
      const response = await fetch(
        "https://api.github.com/repos/mrdemonwolf/linkden/releases/latest",
        {
          headers: {
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "LinkDen-Server",
          },
        },
      );

      if (!response.ok) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to check for updates",
        });
      }

      const release = (await response.json()) as {
        tag_name: string;
        html_url: string;
        body: string;
        published_at: string;
      };

      const latestVersion = release.tag_name.replace(/^v/, "");
      const isUpdateAvailable = latestVersion !== CURRENT_VERSION;

      return {
        currentVersion: CURRENT_VERSION,
        latestVersion,
        isUpdateAvailable,
        releaseUrl: release.html_url,
        releaseNotes: release.body,
        publishedAt: release.published_at,
      };
    } catch (error) {
      if (error instanceof TRPCError) throw error;
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to check for updates",
      });
    }
  }),
});
