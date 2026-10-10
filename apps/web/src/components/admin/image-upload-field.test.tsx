import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { ImageUploadField } from "./image-upload-field";

// The cropper needs a real canvas; stand in a dialog that confirms straight away.
vi.mock("./image-crop-dialog", () => ({
	ImageCropDialog: ({ open, onConfirm }: { open: boolean; onConfirm: (file: File) => void }) =>
		open ? (
			<button
				type="button"
				onClick={() => onConfirm(new File(["x"], "crop.webp", { type: "image/webp" }))}
			>
				confirm crop
			</button>
		) : null,
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const SAVED = "/api/images/avatar/saved.webp";
let sent: FormData[] = [];

/** A settings-style parent: value + saved baseline, reporting unsaved like every admin form. */
function Harness() {
	const [value, setValue] = useState(SAVED);
	const [saved, setSaved] = useState(SAVED);
	useUnsavedChanges(value !== saved);
	return (
		<>
			<ImageUploadField label="Avatar" value={value} purpose="avatar" onUploadComplete={setValue} />
			<button type="button" onClick={() => setSaved(value)}>
				save
			</button>
			<button type="button" onClick={() => setValue(saved)}>
				discard
			</button>
		</>
	);
}

/** A second form on the same page (Design → Branding has two) that stays dirty. */
function OtherForm() {
	const [dirty, setDirty] = useState(false);
	useUnsavedChanges(dirty);
	return (
		<button type="button" onClick={() => setDirty(true)}>
			edit other form
		</button>
	);
}

async function uploadOnce() {
	const input = screen.getByLabelText(/avatar/i, { selector: "input" });
	fireEvent.change(input, {
		target: { files: [new File(["x"], "me.png", { type: "image/png" })] },
	});
	fireEvent.click(await screen.findByRole("button", { name: "confirm crop" }));
	await waitFor(() => expect(screen.queryByRole("button", { name: "confirm crop" })).toBeNull());
	const count = sent.length;
	await waitFor(() => expect(screen.getByRole("img").getAttribute("src")).toMatch(/^blob:/));
	return sent[count - 1];
}

describe("ImageUploadField", () => {
	beforeEach(() => {
		sent = [];
		let n = 0;
		let blob = 0;
		vi.stubGlobal(
			"fetch",
			vi.fn(async (_url: string, init: RequestInit) => {
				sent.push(init.body as FormData);
				n += 1;
				return new Response(JSON.stringify({ publicUrl: `/api/images/avatar/up-${n}.webp` }));
			}),
		);
		URL.createObjectURL = vi.fn(() => `blob:local-${++blob}`);
		URL.revokeObjectURL = vi.fn();
	});
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("deletes only this session's unsaved uploads, never the saved image", async () => {
		render(<Harness />);

		// Replacing the saved image must not delete it: a Discard would point at nothing.
		expect((await uploadOnce()).get("replaces")).toBeNull();
		// A second upload before saving cleans up the first (never saved) one.
		expect((await uploadOnce()).get("replaces")).toBe("/api/images/avatar/up-1.webp");

		// Once saved, that object is live — the next replace leaves it to the sweep.
		act(() => fireEvent.click(screen.getByRole("button", { name: "save" })));
		expect((await uploadOnce()).get("replaces")).toBeNull();
	});

	it("never deletes a saved upload while another form on the page is still dirty", async () => {
		render(
			<>
				<Harness />
				<OtherForm />
			</>,
		);
		act(() => fireEvent.click(screen.getByRole("button", { name: "edit other form" })));

		expect((await uploadOnce()).get("replaces")).toBeNull();
		act(() => fireEvent.click(screen.getByRole("button", { name: "save" })));
		// up-1 is saved (live) now, even though the page still has unsaved changes.
		expect((await uploadOnce()).get("replaces")).toBeNull();
		// up-2 is this edit's unsaved upload: replacing it again cleans it up.
		expect((await uploadOnce()).get("replaces")).toBe("/api/images/avatar/up-2.webp");
	});

	it("drops the local preview when the parent discards the upload", async () => {
		render(<Harness />);
		await uploadOnce();

		act(() => fireEvent.click(screen.getByRole("button", { name: "discard" })));
		expect(screen.getByRole("img").getAttribute("src")).toBe(SAVED);
		expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:local-2");
	});

	it("shows the endpoint's reason when an upload is rejected", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response(JSON.stringify({ error: "File content does not match its type." }), {
						status: 400,
					}),
			),
		);
		render(<Harness />);
		const input = screen.getByLabelText(/avatar/i, { selector: "input" });
		fireEvent.change(input, {
			target: { files: [new File(["x"], "me.png", { type: "image/png" })] },
		});
		fireEvent.click(await screen.findByRole("button", { name: "confirm crop" }));
		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				"Failed to upload image: File content does not match its type.",
			),
		);
		expect(screen.getByRole("img").getAttribute("src")).toBe(SAVED);
	});
});
