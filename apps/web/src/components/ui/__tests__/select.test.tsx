import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Select } from "../select";

afterEach(cleanup);

describe("Select field feedback", () => {
	it("keeps a control's label, helper and validation error attached to the trigger", () => {
		render(
			<>
				<span id="delivery-label">Deliver messages to</span>
				<Select
					value="email"
					onValueChange={vi.fn()}
					items={[{ value: "email", label: "Email only" }]}
					aria-labelledby="delivery-label"
					aria-describedby="delivery-hint delivery-error"
					aria-invalid={true}
				/>
				<p id="delivery-hint">Email uses the configured provider.</p>
				<p id="delivery-error">Set an API key first.</p>
			</>,
		);
		const field = screen.getByRole("combobox", { name: "Deliver messages to" });
		expect(field.getAttribute("aria-invalid")).toBe("true");
		expect(field.getAttribute("aria-describedby")).toBe("delivery-hint delivery-error");
		for (const id of field.getAttribute("aria-describedby")?.split(" ") ?? []) {
			expect(document.getElementById(id)?.textContent).toBeTruthy();
		}
	});

	it("still selects an option by keyboard when helper metadata is supplied", async () => {
		const onValueChange = vi.fn();
		render(
			<>
				<Select
					value="database"
					onValueChange={onValueChange}
					items={[
						{ value: "database", label: "Inbox only" },
						{ value: "both", label: "Inbox and email" },
					]}
					aria-label="Deliver messages to"
					aria-describedby="delivery-hint"
				/>
				<p id="delivery-hint">Choose where messages are delivered.</p>
			</>,
		);
		const field = screen.getByRole("combobox", { name: "Deliver messages to" });
		field.focus();
		fireEvent.keyDown(field, { key: "ArrowDown" });
		const option = await screen.findByRole("option", { name: "Inbox and email" });
		fireEvent.keyDown(option, { key: "Enter" });
		expect(onValueChange).toHaveBeenCalledWith("both");
	});
});
