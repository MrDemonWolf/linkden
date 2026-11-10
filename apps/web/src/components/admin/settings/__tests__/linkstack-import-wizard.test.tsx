import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const importLinks = vi.hoisted(() => vi.fn());
vi.mock("@/utils/trpc", () => ({
	trpc: { backup: { importLinkStack: { mutationOptions: () => ({ mutationFn: importLinks }) } } },
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { LinkStackImportWizard } from "../linkstack-import-wizard";

afterEach(cleanup);
beforeEach(() => {
	importLinks
		.mockReset()
		.mockResolvedValue({ stats: { linksImported: 1, settingsUpdated: false } });
});

it("keeps profile and theme opt-outs when importing links with the shared checkboxes", async () => {
	const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
	const complete = vi.fn();
	render(
		<QueryClientProvider client={client}>
			<LinkStackImportWizard open onOpenChange={vi.fn()} onImportComplete={complete} />
		</QueryClientProvider>,
	);
	const data = {
		littlelink_name: "Ada",
		theme: "Ocean Blue",
		links: [{ link: "https://example.com", title: "Website" }],
	};
	const file = new File([JSON.stringify(data)], "linkstack.json", { type: "application/json" });
	Object.defineProperty(file, "text", { value: async () => JSON.stringify(data) });
	fireEvent.change(screen.getByLabelText("Select LinkStack export file"), {
		target: { files: [file] },
	});
	await screen.findByText("File parsed successfully");
	fireEvent.click(screen.getByRole("button", { name: "Next" }));
	fireEvent.click(screen.getByText("Import Profile"));
	fireEvent.click(screen.getByRole("checkbox", { name: /^Import Theme/ }));
	expect(screen.getByRole("checkbox", { name: /^Import Profile/ })).not.toBeChecked();
	expect(screen.getByRole("checkbox", { name: /^Import Theme/ })).not.toBeChecked();
	expect(screen.getByRole("checkbox", { name: /^Import Links/ })).toBeChecked();
	fireEvent.click(screen.getByRole("button", { name: "Import" }));
	await waitFor(() =>
		expect(importLinks).toHaveBeenCalledWith(
			expect.objectContaining({
				options: { importLinks: true, importProfile: false, importTheme: false },
			}),
			expect.anything(),
		),
	);
	expect(await screen.findByText("Import Complete")).toBeTruthy();
	expect(complete).toHaveBeenCalledOnce();
});
