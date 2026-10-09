import { getContrastRatio } from "@linkden/ui/color-contrast";
import { CONTACT_FIELD_LIMITS, whereMetOptions } from "@linkden/validators/blocks";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
	CONTACT_LIMITS,
	type ContactFormValues,
	contactSubmitErrorMessage,
	isValidEmail,
	pickContrasting,
	shouldAskWhereMet,
	validateContactForm,
	WHERE_MET_OPTIONS,
} from "../contact-form";

const VALID: ContactFormValues = {
	firstName: "Ada",
	lastName: "Lovelace",
	email: "ada@example.com",
	whereMet: "",
	message: "",
	consent: true,
};
const OPTS = { askWhereMet: false, captchaRequired: false, captchaToken: null };

describe("contact form parity with the API", () => {
	it("uses the same field limits as public.submitContact's schema", () => {
		for (const [field, max] of Object.entries(CONTACT_LIMITS)) {
			expect(CONTACT_FIELD_LIMITS[field as keyof typeof CONTACT_FIELD_LIMITS], field).toBe(max);
		}
	});

	it("offers exactly the where-met options the validators define", () => {
		expect([...WHERE_MET_OPTIONS]).toEqual([...whereMetOptions]);
	});

	// `public.submitContact` validates with z.string().email(); the form must
	// never accept an address the server then rejects (or the reverse).
	it.each([
		"ada@example.com",
		"first.last+tag@sub.example.co",
		"o'brien@example.ie",
		"me@site.c",
		"a@b.c",
		"no-at-sign.example.com",
		"two@@example.com",
		"trailing.@example.com",
		"spaces in@example.com",
		"x@-example.com",
	])("agrees with zod on %s", (email) => {
		expect(isValidEmail(email)).toBe(z.string().email().safeParse(email).success);
	});

	it("caps fields at the server's maxima", () => {
		const long = (n: number) => "x".repeat(n + 1);
		const errs = validateContactForm(
			{
				...VALID,
				firstName: long(CONTACT_LIMITS.firstName),
				lastName: long(CONTACT_LIMITS.lastName),
				whereMet: long(CONTACT_LIMITS.whereMet),
				message: long(CONTACT_LIMITS.message),
			},
			{ ...OPTS, askWhereMet: true },
		);
		expect(Object.keys(errs).sort()).toEqual(["firstName", "lastName", "message", "whereMet"]);
	});
});

describe("validateContactForm", () => {
	it("accepts a complete submission", () => {
		expect(validateContactForm(VALID, OPTS)).toEqual({});
	});

	it("requires names, a valid email and consent", () => {
		const errs = validateContactForm(
			{ ...VALID, firstName: " ", lastName: "", email: "nope", consent: false },
			OPTS,
		);
		expect(Object.keys(errs).sort()).toEqual(["consent", "email", "firstName", "lastName"]);
	});

	it("only requires where-met when the block asks for it", () => {
		expect(validateContactForm(VALID, OPTS).whereMet).toBeUndefined();
		expect(validateContactForm(VALID, { ...OPTS, askWhereMet: true }).whereMet).toBeDefined();
	});

	it("blocks submit until the CAPTCHA is solved when one is required", () => {
		const opts = { ...OPTS, captchaRequired: true };
		expect(validateContactForm(VALID, opts).captcha).toBeDefined();
		expect(validateContactForm(VALID, { ...opts, captchaToken: "tok" }).captcha).toBeUndefined();
	});
});

describe("shouldAskWhereMet", () => {
	it("is off by default (data minimisation)", () => {
		expect(shouldAskWhereMet({})).toBe(false);
		expect(shouldAskWhereMet({ preset: "contact" })).toBe(false);
	});

	it("follows the connect preset unless the toggle says otherwise", () => {
		expect(shouldAskWhereMet({ preset: "connect" })).toBe(true);
		expect(shouldAskWhereMet({ preset: "connect", showWhereMet: false })).toBe(false);
		expect(shouldAskWhereMet({ preset: "feedback", showWhereMet: true })).toBe(true);
	});
});

describe("contactSubmitErrorMessage", () => {
	const err = (code: string, message = "") => ({ message, data: { code } });

	it("maps known server failures to actionable copy", () => {
		expect(contactSubmitErrorMessage(err("TOO_MANY_REQUESTS"))).toMatch(/too many/i);
		expect(contactSubmitErrorMessage(err("BAD_REQUEST", "CAPTCHA verification failed"))).toMatch(
			/spam check/i,
		);
		expect(contactSubmitErrorMessage(err("BAD_REQUEST", "Invalid input"))).toMatch(/fields/i);
		expect(contactSubmitErrorMessage(err("FORBIDDEN"))).toMatch(/isn't accepting/i);
	});

	it("falls back to a generic retry message", () => {
		expect(contactSubmitErrorMessage(new Error("network"))).toBe(
			"Failed to send. Please try again.",
		);
		expect(contactSubmitErrorMessage(null)).toBe("Failed to send. Please try again.");
	});

	it("never echoes the raw server message", () => {
		expect(contactSubmitErrorMessage(err("BAD_REQUEST", "<b>secret</b>"))).not.toContain("secret");
	});
});

describe("pickContrasting", () => {
	it("returns the first candidate that reaches the ratio", () => {
		// #E2E8F0 on white is ~1.2:1 (fails); #64748B passes 3:1.
		expect(pickContrasting("#FFFFFF", ["#E2E8F0", "#64748B", "#000000"], 3)).toBe("#64748B");
	});

	it("falls back to the last candidate", () => {
		const picked = pickContrasting("#FFFFFF", ["#FEFEFE", "#FDFDFD"], 3);
		expect(picked).toBe("#FDFDFD");
		expect(getContrastRatio(picked, "#FFFFFF")).toBeLessThan(3);
	});
});
