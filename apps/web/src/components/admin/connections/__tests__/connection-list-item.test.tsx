import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConnectionListItem } from "../connection-list-item";

vi.mock("@/components/admin/analytics/admin-time-zone", () => ({
	useAdminTimeZone: () => "UTC",
	formatInTimeZone: () => "11/5/2026",
}));

afterEach(cleanup);

const connection = {
	id: "message-1",
	name: "Ada Lovelace",
	email: "ada@example.com",
	message: "Hello from the conference.",
	whereMet: null,
	isRead: false,
	blockTitle: "Contact",
	createdAt: "2026-01-01T00:00:00.000Z",
};

function renderItem() {
	const onSelect = vi.fn();
	const onCheck = vi.fn();
	render(
		<ul>
			<ConnectionListItem
				connection={connection}
				isSelected={false}
				isChecked={false}
				onSelect={onSelect}
				onCheck={onCheck}
				showCheckbox
			/>
		</ul>,
	);
	return { onSelect, onCheck };
}

describe("Inbox message selection", () => {
	it("selects through the checkbox label without opening the message", () => {
		const { onSelect, onCheck } = renderItem();
		const checkbox = screen.getByRole("checkbox", { name: "Select Ada Lovelace" });
		const label = checkbox.closest("label");
		expect(label).not.toBeNull();
		if (!label) throw new Error("The checkbox needs a clickable label.");
		fireEvent.click(label);
		expect(onCheck).toHaveBeenCalledExactlyOnceWith(true);
		expect(onSelect).not.toHaveBeenCalled();
	});

	it("opens the message independently of bulk selection", () => {
		const { onSelect, onCheck } = renderItem();
		fireEvent.click(screen.getByRole("button", { name: /Ada Lovelace/ }));
		expect(onSelect).toHaveBeenCalledOnce();
		expect(onCheck).not.toHaveBeenCalled();
	});
});
