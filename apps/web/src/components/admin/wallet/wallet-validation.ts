import {
	type PassField,
	type PassLocation,
	parsePassFieldsJson,
	passFieldSchema,
	passLocationSchema,
} from "@linkden/validators/wallet";

// Client-side mirror of what wallet.updateConfig accepts, built from the same
// shared schemas: one bad row makes the server reject the whole save, so the
// builder names the row instead of showing a generic failure.

export const PASS_FIELD_LABEL_MAX = passFieldSchema.shape.label.maxLength ?? 40;
export const PASS_FIELD_VALUE_MAX = passFieldSchema.shape.value.maxLength ?? 200;

const ZONES = [
	["headerFields", "Header"],
	["primaryFields", "Primary"],
	["secondaryFields", "Secondary"],
	["auxiliaryFields", "Auxiliary"],
	["backFields", "Back of pass"],
] as const;

type ZoneKey = (typeof ZONES)[number][0];
export type WalletFieldsState = Record<ZoneKey, PassField[]> & { locations: PassLocation[] };

/**
 * Stored pass fields, shape-checked by the shared lenient parser (a corrupt or
 * hand-edited backup must not crash the editor). A blank key, which no input
 * can fix and the server rejects, gets a placeholder.
 */
export function parseStoredFields(raw: string | undefined, max: number, zone: string): PassField[] {
	return parsePassFieldsJson(raw, max).map((f, i) =>
		f.key ? f : { ...f, key: `${zone}${i + 1}` },
	);
}

/** Field → message for one location row; `{}` when the server would accept it. */
export function locationErrors(
	loc: PassLocation,
): Partial<Record<"latitude" | "longitude" | "relevantText", string>> {
	const result = passLocationSchema.safeParse(loc);
	if (result.success) return {};
	const errors: Partial<Record<"latitude" | "longitude" | "relevantText", string>> = {};
	for (const issue of result.error.issues) {
		const key = issue.path[0];
		if (key === "latitude") errors.latitude ??= "Enter a latitude from -90 to 90";
		else if (key === "longitude") errors.longitude ??= "Enter a longitude from -180 to 180";
		else if (key === "relevantText") errors.relevantText ??= "Too long (max 100 characters)";
	}
	return errors;
}

/** The first row the server would reject, as a message naming it; null when all valid. */
export function walletFieldsError(state: WalletFieldsState): string | null {
	for (const [key, name] of ZONES) {
		const fields = state[key];
		for (let i = 0; i < fields.length; i++) {
			const result = passFieldSchema.safeParse(fields[i]);
			if (result.success) continue;
			const path = result.error.issues[0]?.path[0];
			const problem =
				path === "label"
					? `label is longer than ${PASS_FIELD_LABEL_MAX} characters`
					: path === "value"
						? `value is longer than ${PASS_FIELD_VALUE_MAX} characters`
						: "is invalid";
			return `${name} field ${i + 1}: ${problem}`;
		}
	}
	for (let i = 0; i < state.locations.length; i++) {
		const errors = locationErrors(state.locations[i] as PassLocation);
		const first = errors.latitude ?? errors.longitude ?? errors.relevantText;
		if (first) return `Location ${i + 1}: ${first.charAt(0).toLowerCase()}${first.slice(1)}`;
	}
	return null;
}
