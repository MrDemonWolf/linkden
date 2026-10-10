import { CONTACT_DELIVERY_MODES } from "@linkden/validators/settings-registry";
import { describe, expect, it } from "vitest";
import { DELIVERY_ITEMS, parse, serialize, validate } from "../email-form";

describe("Settings → Email form", () => {
	it("offers every registry delivery mode, Inbox-only first", () => {
		expect(DELIVERY_ITEMS.map((i) => i.value).sort()).toEqual([...CONTACT_DELIVERY_MODES].sort());
		expect(DELIVERY_ITEMS[0]?.value).toBe("database");
	});

	it("reads an unset or unknown contact_delivery as database-only and writes it back", () => {
		expect(parse({}).contactDelivery).toBe("database");
		expect(parse({ contact_delivery: "carrier-pigeon" }).contactDelivery).toBe("database");
		const form = parse({ contact_delivery: "both" });
		expect(serialize(form)).toContainEqual({ key: "contact_delivery", value: "both" });
	});

	it("blocks an email delivery mode until a key and sender are set", () => {
		expect(validate(parse({ contact_delivery: "email" })).contactDelivery).toBeTruthy();
		expect(
			validate(parse({ contact_delivery: "both", email_api_key: "re_••••" })).contactDelivery,
		).toBeTruthy();
		expect(
			validate(
				parse({
					contact_delivery: "email",
					email_api_key: "re_••••",
					email_from: "LinkDen <hi@example.com>",
				}),
			),
		).toEqual({});
		expect(validate(parse({ contact_delivery: "database" }))).toEqual({});
	});
});
