import { type BlockType, blockConfigSchemaFor } from "@linkden/validators/blocks";
import type { z } from "zod";

/**
 * Rewrite zod's default issue text into something a non-developer can act on.
 * Custom messages set on a schema pass through untouched.
 */
export function friendlyMessage(message: string): string {
	if (message === "Invalid URL") return "Enter a full URL starting with https://";
	if (message === "Invalid email address") return "Enter a valid email address";
	const tooLong = message.match(/^Too big: expected string to have <=(\d+) characters/);
	if (tooLong) return `Too long (max ${tooLong[1]} characters)`;
	const tooShort = message.match(/^Too small: expected string to have >=(\d+) characters/);
	if (tooShort) return tooShort[1] === "1" ? "Required" : `At least ${tooShort[1]} characters`;
	if (/received undefined$/.test(message)) return "Required";
	return message;
}

/**
 * Run a zod schema against one field's value and return the first issue
 * message, or null when valid. Thin enough that no form library is needed —
 * callers wire it straight into `aria-invalid` + an inline `<p role="alert">`.
 */
export function fieldError(schema: z.ZodType, value: unknown): string | null {
	const result = schema.safeParse(value);
	if (result.success) return null;
	const first = result.error.issues[0];
	return first ? friendlyMessage(first.message) : "Invalid value";
}

/**
 * Validate a parsed block config against the schema for its type. Returns a
 * map of config key → first error message, so an editor can show each issue
 * beside the field that caused it. Nested paths (e.g. `urls.2.url`) are keyed
 * by their full dotted path. Unknown keys are stripped by the schema, never
 * reported.
 */
export function configErrors(type: BlockType, config: object): Record<string, string> {
	const result = blockConfigSchemaFor(type).safeParse(config);
	if (result.success) return {};
	const errors: Record<string, string> = {};
	for (const issue of result.error.issues) {
		const key = issue.path.map(String).join(".") || "(root)";
		if (!(key in errors)) errors[key] = friendlyMessage(issue.message);
	}
	return errors;
}
