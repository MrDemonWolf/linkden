import {
	isCertificateMaterial,
	isPrivateKeyMaterial,
	normalizeSigningMaterial,
	PEM_MAX_LENGTH,
} from "@linkden/validators/wallet";

export type SigningMaterialKind = "certificate" | "privateKey";

const PEM_BEGIN = "-----BEGIN";

/** base64 of raw bytes, chunked so a large file can't overflow the argument list. */
function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (let i = 0; i < bytes.length; i += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	}
	return btoa(binary);
}

/**
 * What the .pkpass signer reads from an uploaded file: PEM text as is
 * (.pem/.key/.crt, or a .cer that is really PEM), base64 of the bytes for a
 * binary DER certificate (.cer). Never base64-wrapped PEM, which the signer
 * cannot parse.
 */
export function signingMaterialFromBytes(bytes: Uint8Array): string {
	const text = new TextDecoder().decode(bytes);
	if (text.includes(PEM_BEGIN)) return text.trim();
	return bytesToBase64(bytes);
}

export type SigningMaterialResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Normalize uploaded or pasted material and check the signer can load it as
 * `kind`, using the same checks the server applies on save. Rejecting it here
 * gives the admin the reason next to the field instead of a failed save.
 */
export function acceptSigningMaterial(
	raw: string,
	kind: SigningMaterialKind,
): SigningMaterialResult {
	const value = normalizeSigningMaterial(raw);
	if (!value) return { ok: false, error: "Nothing to apply — the file or text is empty" };
	if (value.length > PEM_MAX_LENGTH) {
		return { ok: false, error: "Too large for a single certificate or key" };
	}
	if (kind === "privateKey") {
		return isPrivateKeyMaterial(value)
			? { ok: true, value }
			: {
					ok: false,
					error:
						"Not an RSA private key in PEM format. Export the key from a .p12 as PEM (.key / .pem) first.",
				};
	}
	return isCertificateMaterial(value)
		? { ok: true, value }
		: { ok: false, error: "Not a PEM or DER X.509 certificate" };
}
