import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
import { Inbox } from "lucide-react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/settings/wallet" }));

import { SettingsShell } from "@/app/admin/settings/settings-shell";
import { EmptyState } from "../empty-state";

afterEach(cleanup);

const SRC = join(__dirname, "../../..");

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const path = join(dir, name);
		if (statSync(path).isDirectory()) return name === "__tests__" ? [] : sourceFiles(path);
		return path.endsWith(".tsx") ? [path] : [];
	});
}

describe("navigation styled as a button keeps link semantics", () => {
	it("renders the Settings section nav as links, the current one marked as the page", () => {
		render(<SettingsShell>content</SettingsShell>);
		const nav = screen.getAllByRole("navigation", { name: "Settings sections" });
		const links = nav.flatMap((n) => [...n.querySelectorAll("a")]);
		expect(links.length).toBeGreaterThan(0);
		for (const link of links) expect(link.hasAttribute("role")).toBe(false);
		const wallet = screen.getAllByRole("link", { name: "Wallet" });
		expect(wallet.every((a) => a.getAttribute("aria-current") === "page")).toBe(true);
		expect(screen.queryAllByRole("button", { name: "Wallet" })).toHaveLength(0);
	});

	it("renders an EmptyState href action as a link, and an onClick action as a button", () => {
		render(
			<EmptyState
				icon={Inbox}
				title="No messages yet"
				description="Messages appear here."
				action={{ label: "Open settings", href: "/admin/settings" }}
			/>,
		);
		expect(screen.getByRole("link", { name: "Open settings" }).getAttribute("href")).toBe(
			"/admin/settings",
		);
		cleanup();
		render(
			<EmptyState
				icon={Inbox}
				title="No messages yet"
				description="Messages appear here."
				action={{ label: "Add a block", onClick: () => {} }}
			/>,
		);
		expect(screen.getByRole("button", { name: "Add a block" })).toBeTruthy();
	});

	// Base UI's Button gives a non-<button> render `role="button"`; links must be
	// styled with buttonVariants instead (see components/ui/button.tsx).
	it("never renders an anchor or Link through Button with nativeButton={false}", () => {
		const offenders = sourceFiles(SRC).filter((file) => {
			const source = readFileSync(file, "utf8");
			return [...source.matchAll(/nativeButton=\{false\}/g)].some((match) =>
				/render=\{\s*<(a|Link)\b/.test(
					source.slice(Math.max(0, (match.index ?? 0) - 400), (match.index ?? 0) + 400),
				),
			);
		});
		expect(offenders.map((file) => relative(SRC, file))).toEqual([]);
	});
});
