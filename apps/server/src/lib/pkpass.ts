// ─── .pkpass generator (Cloudflare Workers) ─────────────────────────────────
// Builds a signed Apple Wallet pass bundle entirely in the Workers runtime:
//   - pass.json      the pass definition (generic style)
//   - manifest.json  SHA-1 of every file
//   - signature      detached PKCS#7 signature of manifest.json (node-forge)
//   - icon.png (+ logo/thumbnail/strip)  PNG images
// node-forge is pure JS (no native crypto), fflate is a tiny pure-JS zip, and
// PNG/CRC are hand-rolled — all Workers-compatible. Web Crypto does the SHA-1.

import forge from "node-forge";
import { zipSync, zlibSync } from "fflate";
import type { PassField } from "@linkden/validators/wallet";

export interface PkpassImages {
	icon?: Uint8Array; // 29pt — required; a solid fallback is generated if absent
	logo?: Uint8Array;
	thumbnail?: Uint8Array;
	strip?: Uint8Array;
}

export interface PkpassInput {
	passTypeIdentifier: string;
	teamIdentifier: string;
	serialNumber: string;
	organizationName: string;
	description: string;
	backgroundColor: string; // hex (#RRGGBB)
	foregroundColor: string;
	labelColor: string;
	logoText?: string;
	barcodeMessage?: string | null; // QR content; omit to hide the barcode
	relevantDate?: string | null; // ISO 8601 — Wallet surfaces the pass around then
	locations?: { latitude: number; longitude: number; relevantText?: string }[];
	headerFields: PassField[];
	primaryFields: PassField[];
	secondaryFields: PassField[];
	auxiliaryFields: PassField[];
	backFields: PassField[];
	images: PkpassImages;
}

export interface SigningMaterial {
	signerCertPem: string;
	signerKeyPem: string;
	wwdrCertPem: string;
	signerKeyPassphrase?: string;
}

// #091533 → "rgb(9, 21, 51)". Falls back to the input if it isn't a hex triple.
export function hexToRgb(hex: string): string {
	const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
	if (!m) return hex;
	const n = parseInt(m[1]!, 16);
	return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

function rgbTriple(hex: string): [number, number, number] {
	const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
	if (!m) return [9, 21, 51];
	const n = parseInt(m[1]!, 16);
	return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Drop empty values so Wallet doesn't render blank rows.
const cleanFields = (fields: PassField[]) =>
	fields
		.filter((f) => f.key && f.value.trim() !== "")
		.map((f) => ({ key: f.key, label: f.label, value: f.value }));

export function buildPassJson(input: PkpassInput): string {
	const pass: Record<string, unknown> = {
		formatVersion: 1,
		passTypeIdentifier: input.passTypeIdentifier,
		teamIdentifier: input.teamIdentifier,
		serialNumber: input.serialNumber,
		organizationName: input.organizationName || "LinkDen",
		description: input.description || "Contact card",
		backgroundColor: hexToRgb(input.backgroundColor),
		foregroundColor: hexToRgb(input.foregroundColor),
		labelColor: hexToRgb(input.labelColor),
		generic: {
			headerFields: cleanFields(input.headerFields),
			primaryFields: cleanFields(input.primaryFields),
			secondaryFields: cleanFields(input.secondaryFields),
			auxiliaryFields: cleanFields(input.auxiliaryFields),
			backFields: cleanFields(input.backFields),
		},
	};
	if (input.logoText) pass.logoText = input.logoText;
	if (input.relevantDate) pass.relevantDate = input.relevantDate;
	if (input.locations && input.locations.length > 0) {
		pass.locations = input.locations.map((l) => ({
			latitude: l.latitude,
			longitude: l.longitude,
			...(l.relevantText ? { relevantText: l.relevantText } : {}),
		}));
	}
	if (input.barcodeMessage) {
		const barcode = {
			format: "PKBarcodeFormatQR",
			message: input.barcodeMessage,
			messageEncoding: "iso-8859-1",
		};
		pass.barcodes = [barcode];
		pass.barcode = barcode; // legacy key for older iOS
	}
	return JSON.stringify(pass);
}

// ─── PNG (solid color) — the icon is required, so we always have a valid one ──
const CRC_TABLE = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(buf: Uint8Array): number {
	let c = 0xffffffff;
	for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]!) & 0xff]! ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type: string, data: Uint8Array): Uint8Array {
	const typeBytes = new TextEncoder().encode(type);
	const out = new Uint8Array(12 + data.length);
	const dv = new DataView(out.buffer);
	dv.setUint32(0, data.length);
	out.set(typeBytes, 4);
	out.set(data, 8);
	const crcInput = new Uint8Array(4 + data.length);
	crcInput.set(typeBytes, 0);
	crcInput.set(data, 4);
	dv.setUint32(8 + data.length, crc32(crcInput));
	return out;
}
export function solidPng(size: number, rgb: [number, number, number]): Uint8Array {
	const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
	const ihdr = new Uint8Array(13);
	const dv = new DataView(ihdr.buffer);
	dv.setUint32(0, size);
	dv.setUint32(4, size);
	ihdr[8] = 8; // bit depth
	ihdr[9] = 2; // color type 2 = truecolor RGB
	const stride = 1 + size * 3;
	const raw = new Uint8Array(size * stride);
	for (let y = 0; y < size; y++) {
		const row = y * stride;
		raw[row] = 0; // filter: none
		for (let x = 0; x < size; x++) {
			const p = row + 1 + x * 3;
			raw[p] = rgb[0];
			raw[p + 1] = rgb[1];
			raw[p + 2] = rgb[2];
		}
	}
	const idat = zlibSync(raw);
	const chunks = [
		sig,
		pngChunk("IHDR", ihdr),
		pngChunk("IDAT", idat),
		pngChunk("IEND", new Uint8Array(0)),
	];
	const total = chunks.reduce((n, c) => n + c.length, 0);
	const out = new Uint8Array(total);
	let off = 0;
	for (const c of chunks) {
		out.set(c, off);
		off += c.length;
	}
	return out;
}

// ─── Manifest + signature ────────────────────────────────────────────────────
async function sha1Hex(bytes: Uint8Array): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-1", bytes as unknown as ArrayBuffer);
	return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function buildManifest(files: Record<string, Uint8Array>): Promise<string> {
	const manifest: Record<string, string> = {};
	for (const [name, bytes] of Object.entries(files)) {
		manifest[name] = await sha1Hex(bytes);
	}
	return JSON.stringify(manifest);
}

function certFromPemOrDer(value: string): forge.pki.Certificate {
	const s = value.trim();
	if (s.includes("BEGIN CERTIFICATE")) return forge.pki.certificateFromPem(s);
	// Assume base64-encoded DER (.cer files are distributed this way)
	const der = forge.util.decode64(s.replace(/-----[^-]+-----/g, "").replace(/\s+/g, ""));
	return forge.pki.certificateFromAsn1(forge.asn1.fromDer(der));
}

function binaryStringToUint8(bin: string): Uint8Array {
	const out = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i) & 0xff;
	return out;
}

export function signManifest(manifest: string, material: SigningMaterial): Uint8Array {
	const cert = certFromPemOrDer(material.signerCertPem);
	const wwdr = certFromPemOrDer(material.wwdrCertPem);
	const key = material.signerKeyPassphrase
		? forge.pki.decryptRsaPrivateKey(material.signerKeyPem, material.signerKeyPassphrase)
		: forge.pki.privateKeyFromPem(material.signerKeyPem);
	if (!key) throw new Error("Unable to load wallet signer key (wrong passphrase?)");

	const p7 = forge.pkcs7.createSignedData();
	p7.content = forge.util.createBuffer(manifest, "utf8");
	p7.addCertificate(cert);
	p7.addCertificate(wwdr);
	p7.addSigner({
		key,
		certificate: cert,
		digestAlgorithm: forge.pki.oids.sha256!,
		authenticatedAttributes: [
			{ type: forge.pki.oids.contentType!, value: forge.pki.oids.data! },
			{ type: forge.pki.oids.messageDigest! },
			{ type: forge.pki.oids.signingTime!, value: new Date().toISOString() },
		],
	});
	p7.sign({ detached: true });
	const der = forge.asn1.toDer(p7.toAsn1()).getBytes();
	return binaryStringToUint8(der);
}

// ─── Top-level: build the whole signed bundle ────────────────────────────────
export async function generatePkpass(
	input: PkpassInput,
	material: SigningMaterial,
): Promise<Uint8Array> {
	const files: Record<string, Uint8Array> = {};
	const enc = new TextEncoder();

	files["pass.json"] = enc.encode(buildPassJson(input));

	// icon.png is mandatory. Use the uploaded PNG icon, else fall back to logo,
	// else a solid tile in the pass background color so the pass stays valid.
	const icon =
		input.images.icon ?? input.images.logo ?? solidPng(87, rgbTriple(input.backgroundColor));
	files["icon.png"] = icon;
	files["icon@2x.png"] = icon;
	if (input.images.logo) {
		files["logo.png"] = input.images.logo;
		files["logo@2x.png"] = input.images.logo;
	}
	if (input.images.thumbnail) {
		files["thumbnail.png"] = input.images.thumbnail;
		files["thumbnail@2x.png"] = input.images.thumbnail;
	}
	if (input.images.strip) {
		files["strip.png"] = input.images.strip;
		files["strip@2x.png"] = input.images.strip;
	}

	const manifest = await buildManifest(files);
	files["manifest.json"] = enc.encode(manifest);
	files.signature = signManifest(manifest, material);

	return zipSync(files);
}
