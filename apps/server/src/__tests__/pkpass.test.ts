// @vitest-environment node
import { createHash } from "node:crypto";
import { unzipSync, zipSync } from "fflate";
import forge from "node-forge";
import { beforeAll, describe, expect, it } from "vitest";
import {
	buildPassJson,
	generatePkpass,
	hexToRgb,
	type PkpassInput,
	type SigningMaterial,
	solidPng,
} from "../lib/pkpass";

const baseInput: PkpassInput = {
	passTypeIdentifier: "pass.com.example",
	teamIdentifier: "ABCDE12345",
	serialNumber: "sn-1",
	organizationName: "Acme",
	description: "Card",
	backgroundColor: "#091533",
	foregroundColor: "#FFFFFF",
	labelColor: "#0FACED",
	barcodeMessage: "https://example.com",
	headerFields: [],
	primaryFields: [{ key: "name", label: "Name", value: "Jane" }],
	secondaryFields: [{ key: "empty", label: "Empty", value: "  " }],
	auxiliaryFields: [],
	backFields: [],
	images: {},
};

describe("hexToRgb", () => {
	it("converts hex to a CSS rgb() triple (Apple pass.json format)", () => {
		expect(hexToRgb("#091533")).toBe("rgb(9, 21, 51)");
		expect(hexToRgb("FFFFFF")).toBe("rgb(255, 255, 255)");
	});
	it("passes non-hex through untouched", () => {
		expect(hexToRgb("rgb(1, 2, 3)")).toBe("rgb(1, 2, 3)");
	});
});

describe("buildPassJson", () => {
	const pass = JSON.parse(buildPassJson(baseInput));

	it("uses rgb() colors and formatVersion 1", () => {
		expect(pass.formatVersion).toBe(1);
		expect(pass.backgroundColor).toBe("rgb(9, 21, 51)");
	});
	it("emits a QR barcode when a message is present", () => {
		expect(pass.barcodes[0].format).toBe("PKBarcodeFormatQR");
		expect(pass.barcodes[0].message).toBe("https://example.com");
	});
	it("drops empty-value fields so Wallet renders no blank rows", () => {
		expect(pass.generic.primaryFields).toHaveLength(1);
		expect(pass.generic.secondaryFields).toHaveLength(0);
	});
	it("omits the barcode when there is no message", () => {
		const p = JSON.parse(buildPassJson({ ...baseInput, barcodeMessage: null }));
		expect(p.barcodes).toBeUndefined();
	});
	it("includes relevantDate + locations when provided (context-aware)", () => {
		const p = JSON.parse(
			buildPassJson({
				...baseInput,
				relevantDate: "2026-07-20T00:00:00.000Z",
				locations: [{ latitude: 37.7749, longitude: -122.4194, relevantText: "Save my contact" }],
			}),
		);
		expect(p.relevantDate).toBe("2026-07-20T00:00:00.000Z");
		expect(p.locations[0].latitude).toBe(37.7749);
		expect(p.locations[0].relevantText).toBe("Save my contact");
	});
	it("omits relevance keys when absent", () => {
		expect(pass.relevantDate).toBeUndefined();
		expect(pass.locations).toBeUndefined();
	});
});

describe("solidPng", () => {
	it("produces a valid PNG (signature + non-empty body)", () => {
		const png = solidPng(29, [9, 21, 51]);
		expect([...png.slice(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
		expect(png.length).toBeGreaterThan(50);
	});
});

describe("bundle assembly (unsigned parts)", () => {
	it("zips pass.json + icon so the archive is a real pkpass shell", () => {
		// Mirror the file set generatePkpass builds, minus the forge signature.
		const enc = new TextEncoder();
		const files: Record<string, Uint8Array> = {
			"pass.json": enc.encode(buildPassJson(baseInput)),
			"icon.png": solidPng(87, [9, 21, 51]),
		};
		const zipped = zipSync(files);
		const back = unzipSync(zipped);
		expect(Object.keys(back)).toContain("pass.json");
		expect(Object.keys(back)).toContain("icon.png");
		expect(JSON.parse(new TextDecoder().decode(back["pass.json"])).formatVersion).toBe(1);
	});
});

// ─── Signing (manifest hashes + detached PKCS#7) ─────────────────────────────
// Wallet rejects a bad signature silently on the device, so pin the bundle a
// throwaway self-signed signer + "WWDR" pair produces.
type Asn1 = forge.asn1.Asn1;
const { Class, Type } = forge.asn1;

function selfSigned(commonName: string, keys: forge.pki.rsa.KeyPair): forge.pki.Certificate {
	const cert = forge.pki.createCertificate();
	cert.publicKey = keys.publicKey;
	cert.serialNumber = "01";
	cert.validity.notBefore = new Date(Date.now() - 86_400_000);
	cert.validity.notAfter = new Date(Date.now() + 365 * 86_400_000);
	const attrs = [{ name: "commonName", value: commonName }];
	cert.setSubject(attrs);
	cert.setIssuer(attrs);
	cert.sign(keys.privateKey, forge.md.sha256.create());
	return cert;
}

const toBinary = (bytes: Uint8Array) => String.fromCharCode(...bytes);
const sha1Hex = (bytes: Uint8Array) => createHash("sha1").update(bytes).digest("hex");

/** Child nodes of a constructed ASN.1 node, or the `i`th one (throws if absent). */
function kids(node: Asn1 | undefined): Asn1[] {
	if (!node || !Array.isArray(node.value)) throw new Error("expected a constructed ASN.1 node");
	return node.value;
}
function kid(node: Asn1 | undefined, i: number): Asn1 {
	const list = kids(node);
	const child = list[i < 0 ? list.length + i : i];
	if (!child) throw new Error(`missing ASN.1 child ${i}`);
	return child;
}
const bytesOf = (node: Asn1): string => {
	if (typeof node.value !== "string") throw new Error("expected a primitive ASN.1 node");
	return node.value;
};

/** The SignerInfo's authenticated attributes + encrypted digest (forge drops them on parse). */
function signerInfoOf(signature: Uint8Array): { attrs: Asn1[]; encryptedDigest: string } {
	const contentInfo = forge.asn1.fromDer(forge.util.createBuffer(toBinary(signature)));
	const signedData = kid(kid(contentInfo, 1), 0);
	const signerInfo = kid(kid(signedData, -1), 0);
	const fields = kids(signerInfo);
	const authAttrs = fields.find((f) => f.tagClass === Class.CONTEXT_SPECIFIC && f.type === 0);
	return { attrs: kids(authAttrs), encryptedDigest: bytesOf(kid(signerInfo, -1)) };
}

function messageDigestOf(attrs: Asn1[]): string | undefined {
	for (const attr of attrs) {
		if (forge.asn1.derToOid(bytesOf(kid(attr, 0))) === forge.pki.oids.messageDigest) {
			return bytesOf(kid(kid(attr, 1), 0));
		}
	}
	return undefined;
}

describe("generatePkpass (signed)", () => {
	let keys: forge.pki.rsa.KeyPair;
	let signer: forge.pki.Certificate;
	let material: SigningMaterial;

	beforeAll(() => {
		keys = forge.pki.rsa.generateKeyPair({ bits: 1024, e: 0x10001 });
		signer = selfSigned("Pass Type ID: pass.com.example", keys);
		const wwdr = selfSigned("Apple WWDR (test)", forge.pki.rsa.generateKeyPair({ bits: 1024 }));
		material = {
			signerCertPem: forge.pki.certificateToPem(signer),
			signerKeyPem: forge.pki.privateKeyToPem(keys.privateKey),
			wwdrCertPem: forge.pki.certificateToPem(wwdr),
		};
	});

	it("bundles pass.json, icons, manifest.json and a signature", async () => {
		const files = unzipSync(await generatePkpass(baseInput, material));
		expect(Object.keys(files).sort()).toEqual(
			["icon.png", "icon@2x.png", "manifest.json", "pass.json", "signature"].sort(),
		);
	});

	it("lists the SHA-1 of every other file in manifest.json", async () => {
		const files = unzipSync(await generatePkpass(baseInput, material));
		const manifest = JSON.parse(new TextDecoder().decode(files["manifest.json"]));
		const hashed = Object.entries(files).filter(
			([n]) => n !== "manifest.json" && n !== "signature",
		);
		expect(Object.keys(manifest).sort()).toEqual(hashed.map(([n]) => n).sort());
		for (const [name, bytes] of hashed) expect(manifest[name]).toBe(sha1Hex(bytes));
	});

	it("signs manifest.json with a detached PKCS#7 that carries both certificates", async () => {
		const files = unzipSync(await generatePkpass(baseInput, material));
		const signature = files.signature as Uint8Array;
		const manifestBytes = files["manifest.json"] as Uint8Array;

		const p7 = forge.pkcs7.messageFromAsn1(
			forge.asn1.fromDer(forge.util.createBuffer(toBinary(signature))),
		) as forge.pkcs7.PkcsSignedData;
		expect(p7.certificates).toHaveLength(2);

		const { attrs, encryptedDigest } = signerInfoOf(signature);
		const manifestSha256 = createHash("sha256").update(manifestBytes).digest("binary");
		expect(messageDigestOf(attrs)).toBe(manifestSha256);

		// The RSA signature covers the DER SET of authenticated attributes.
		const md = forge.md.sha256.create();
		md.update(
			forge.asn1.toDer(forge.asn1.create(Class.UNIVERSAL, Type.SET, true, attrs)).getBytes(),
		);
		expect(keys.publicKey.verify(md.digest().bytes(), encryptedDigest)).toBe(true);
	});

	it("accepts a base64 DER signer certificate (.cer export)", async () => {
		const der = forge.asn1.toDer(forge.pki.certificateToAsn1(signer)).getBytes();
		const bundle = await generatePkpass(baseInput, {
			...material,
			signerCertPem: forge.util.encode64(der),
		});
		expect(Object.keys(unzipSync(bundle))).toContain("signature");
	});

	it("unwraps base64-encoded PEM for all three materials (env-var style)", async () => {
		const wrap = (pem: string) => forge.util.encode64(pem);
		const bundle = await generatePkpass(baseInput, {
			signerCertPem: wrap(material.signerCertPem),
			signerKeyPem: wrap(material.signerKeyPem),
			wwdrCertPem: wrap(material.wwdrCertPem),
		});
		expect(Object.keys(unzipSync(bundle))).toContain("signature");
	});

	it("decrypts a passphrase-protected key, and fails loudly on the wrong passphrase", async () => {
		const encrypted = forge.pki.encryptRsaPrivateKey(keys.privateKey, "correct horse");
		const ok = await generatePkpass(baseInput, {
			...material,
			signerKeyPem: encrypted,
			signerKeyPassphrase: "correct horse",
		});
		expect(Object.keys(unzipSync(ok))).toContain("signature");
		await expect(
			generatePkpass(baseInput, {
				...material,
				signerKeyPem: encrypted,
				signerKeyPassphrase: "wrong",
			}),
		).rejects.toThrow("Unable to load wallet signer key");
	});
});
