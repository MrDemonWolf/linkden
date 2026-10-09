import { describe, expect, it } from "vitest";
import { acceptSigningMaterial, signingMaterialFromBytes } from "../signing-material";

const CERT_BODY = "MIIBszCCAVmgAwIBAgIUQ2VydGlmaWNhdGVGaXh0dXJlMAoGCCqGSM49BAMCMBQx";
const CERT_PEM = `-----BEGIN CERTIFICATE-----\n${CERT_BODY}\n-----END CERTIFICATE-----`;
const KEY_PEM =
	"-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASC\n-----END PRIVATE KEY-----";
const RSA_KEY_PEM =
	"-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEAu1SU1LfVLPHCozMxH2Mo\n-----END RSA PRIVATE KEY-----";
const EC_KEY_PEM = "-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIBkg\n-----END EC PRIVATE KEY-----";

/** A DER blob: ASN.1 SEQUENCE tag followed by enough bytes to look like a certificate. */
const DER = new Uint8Array([0x30, 0x82, ...Array.from({ length: 80 }, (_, i) => i)]);

const bytes = (text: string) => new TextEncoder().encode(text);

describe("signingMaterialFromBytes", () => {
	it("keeps PEM text as text (never base64-wraps it)", () => {
		expect(signingMaterialFromBytes(bytes(`\n${CERT_PEM}\n`))).toBe(CERT_PEM);
		expect(signingMaterialFromBytes(bytes(KEY_PEM))).toBe(KEY_PEM);
	});

	it("base64-encodes a binary DER certificate", () => {
		const out = signingMaterialFromBytes(DER);
		expect(out).not.toContain("-----BEGIN");
		expect(Uint8Array.from(atob(out), (c) => c.charCodeAt(0))).toEqual(DER);
	});
});

describe("acceptSigningMaterial", () => {
	it("accepts PEM and DER certificates", () => {
		expect(acceptSigningMaterial(CERT_PEM, "certificate")).toEqual({ ok: true, value: CERT_PEM });
		const der = signingMaterialFromBytes(DER);
		expect(acceptSigningMaterial(der, "certificate")).toEqual({ ok: true, value: der });
	});

	it("unwraps base64-wrapped PEM (what the old form stored) to raw PEM", () => {
		expect(acceptSigningMaterial(btoa(KEY_PEM), "privateKey")).toEqual({
			ok: true,
			value: KEY_PEM,
		});
	});

	it("accepts PKCS#8 and PKCS#1 RSA keys", () => {
		expect(acceptSigningMaterial(KEY_PEM, "privateKey").ok).toBe(true);
		expect(acceptSigningMaterial(RSA_KEY_PEM, "privateKey").ok).toBe(true);
	});

	it("rejects material the signer cannot load, with a reason", () => {
		const ec = acceptSigningMaterial(EC_KEY_PEM, "privateKey");
		expect(ec.ok).toBe(false);
		expect(!ec.ok && ec.error).toMatch(/RSA private key/);
		// A certificate pasted into the key slot, and vice versa.
		expect(acceptSigningMaterial(CERT_PEM, "privateKey").ok).toBe(false);
		expect(acceptSigningMaterial(KEY_PEM, "certificate").ok).toBe(false);
		// Random bytes, as from a .p12 bundle.
		expect(acceptSigningMaterial(btoa("\u0001\u0002not a cert"), "certificate").ok).toBe(false);
	});

	it("rejects empty and oversized input", () => {
		expect(acceptSigningMaterial("   ", "certificate").ok).toBe(false);
		const huge = `-----BEGIN CERTIFICATE-----\n${"A".repeat(30_000)}\n-----END CERTIFICATE-----`;
		const result = acceptSigningMaterial(huge, "certificate");
		expect(!result.ok && result.error).toMatch(/Too large/);
	});
});
