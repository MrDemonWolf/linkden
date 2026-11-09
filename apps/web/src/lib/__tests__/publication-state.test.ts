// @vitest-environment node
import type { QueryKey } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { changesPublicationSource } from "../publication-state";

vi.mock("@linkden/env/web", () => ({ env: { NEXT_PUBLIC_SERVER_URL: "http://localhost:13000" } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { queryClient, trpc } from "@/utils/trpc";

const statusKey: QueryKey = trpc.publication.status.queryOptions().queryKey;
beforeEach(() => {
	queryClient.clear();
	queryClient.setQueryData(statusKey, undefined);
});
afterEach(() => queryClient.clear());

describe("publication source refresh", () => {
	it("includes public authoring writes and excludes credentials, Inbox, Wallet and publication requests", () => {
		for (const path of [
			["blocks", "update"],
			["social", "update"],
			["vcard", "updateConfig"],
			["backup", "import"],
			["danger", "deleteAllContent"],
		]) {
			expect(changesPublicationSource([path], {})).toBe(true);
		}
		expect(
			changesPublicationSource(
				[["settings", "updateBulk"]],
				[{ key: "profile_name", value: "Saved name" }],
			),
		).toBe(true);
		for (const path of [
			["publication", "request"],
			["forms", "markRead"],
			["wallet", "updateConfig"],
		])
			expect(changesPublicationSource([path], {})).toBe(false);
		expect(
			changesPublicationSource(
				[["settings", "updateBulk"]],
				[{ key: "email_api_key", value: "dummy" }],
			),
		).toBe(false);
		expect(changesPublicationSource(undefined, {})).toBe(false);
	});

	it("invalidates cached status only after a successful saved-source mutation", async () => {
		queryClient.setQueryData(statusKey, { status: "draft" });
		const mutation = queryClient.getMutationCache().build(queryClient, {
			...trpc.settings.updateBulk.mutationOptions(),
			mutationFn: async () => ({ success: true }),
		});
		await mutation.execute([{ key: "profile_name", value: "Saved name" }]);
		expect(queryClient.getQueryState(statusKey)?.isInvalidated).toBe(true);
	});

	it("refreshes publication status after a public single-setting save such as the Inbox toggle", async () => {
		queryClient.setQueryData(statusKey, { status: "draft" });
		const mutation = queryClient.getMutationCache().build(queryClient, {
			mutationKey: trpc.settings.update.mutationOptions().mutationKey,
			mutationFn: async (_input: { key: string; value: string }) => ({ success: true }),
		});
		await mutation.execute({ key: "contact_form_enabled", value: "false" });
		expect(queryClient.getQueryState(statusKey)?.isInvalidated).toBe(true);
		expect(
			changesPublicationSource([["settings", "update"]], { key: "email_api_key", value: "dummy" }),
		).toBe(false);
	});

	it("does not invalidate for an unsuccessful save or a private-only settings save", async () => {
		queryClient.setQueryData(statusKey, { status: "draft" });
		const failed = queryClient.getMutationCache().build(queryClient, {
			...trpc.settings.updateBulk.mutationOptions(),
			mutationFn: async () => {
				throw new Error("save failed");
			},
		});
		await expect(failed.execute([{ key: "profile_name", value: "Unsaved name" }])).rejects.toThrow(
			"save failed",
		);
		expect(queryClient.getQueryState(statusKey)?.isInvalidated).toBe(false);
		const privateSave = queryClient.getMutationCache().build(queryClient, {
			...trpc.settings.updateBulk.mutationOptions(),
			mutationFn: async () => ({ success: true }),
		});
		await privateSave.execute([{ key: "email_api_key", value: "dummy" }]);
		expect(queryClient.getQueryState(statusKey)?.isInvalidated).toBe(false);
	});
});
