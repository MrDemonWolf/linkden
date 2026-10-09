// Gravatar URLs for the admin shell. Deliberately NOT `node:crypto`: imported
// from client code, it made the bundler ship the whole crypto-browserify
// polyfill (bn.js, elliptic, readable-stream…, ~170 KB gzip). Gravatar keys on
// an MD5 of the trimmed, lower-cased address, so a ~1 KB MD5 keeps this
// synchronous with no dependency.

const SHIFTS = [
	7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14,
	20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6,
	10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
];
const K = Array.from(
	{ length: 64 },
	(_, i) => Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0,
);

/** RFC 1321 MD5 of a UTF-8 string, as lowercase hex. */
export function md5Hex(input: string): string {
	const bytes = new TextEncoder().encode(input);
	const bitLength = bytes.length * 8;
	// Pad: 0x80, zeros to 56 mod 64, then the 64-bit little-endian bit length.
	const padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) * 64);
	padded.set(bytes);
	padded[bytes.length] = 0x80;
	const view = new DataView(padded.buffer);
	view.setUint32(padded.length - 8, bitLength >>> 0, true);
	view.setUint32(padded.length - 4, Math.floor(bitLength / 2 ** 32), true);

	let a0 = 0x67452301;
	let b0 = 0xefcdab89;
	let c0 = 0x98badcfe;
	let d0 = 0x10325476;
	const m = new Uint32Array(16);
	for (let offset = 0; offset < padded.length; offset += 64) {
		for (let i = 0; i < 16; i++) m[i] = view.getUint32(offset + i * 4, true);
		let a = a0;
		let b = b0;
		let c = c0;
		let d = d0;
		for (let i = 0; i < 64; i++) {
			let f: number;
			let g: number;
			if (i < 16) {
				f = (b & c) | (~b & d);
				g = i;
			} else if (i < 32) {
				f = (d & b) | (~d & c);
				g = (5 * i + 1) % 16;
			} else if (i < 48) {
				f = b ^ c ^ d;
				g = (3 * i + 5) % 16;
			} else {
				f = c ^ (b | ~d);
				g = (7 * i) % 16;
			}
			const sum = (a + f + (K[i] as number) + (m[g] as number)) >>> 0;
			const shift = SHIFTS[i] as number;
			a = d;
			d = c;
			c = b;
			b = (b + ((sum << shift) | (sum >>> (32 - shift)))) >>> 0;
		}
		a0 = (a0 + a) >>> 0;
		b0 = (b0 + b) >>> 0;
		c0 = (c0 + c) >>> 0;
		d0 = (d0 + d) >>> 0;
	}

	let hex = "";
	for (const word of [a0, b0, c0, d0]) {
		for (let i = 0; i < 4; i++) hex += ((word >>> (i * 8)) & 0xff).toString(16).padStart(2, "0");
	}
	return hex;
}

export function getGravatarUrl(email: string, size = 200): string {
	const hash = md5Hex(email.trim().toLowerCase());
	return `https://www.gravatar.com/avatar/${hash}?s=${size}&d=404`;
}
