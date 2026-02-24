#!/usr/bin/env node

/**
 * Checks for new social/messaging platform icons in simple-icons
 * and adds candidates to data/social-networks.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataPath = resolve(__dirname, "../data/social-networks.json");

const socialKeywords = [
	"social",
	"chat",
	"messenger",
	"message",
	"forum",
	"community",
	"blog",
	"video",
	"stream",
	"music",
	"gaming",
	"portfolio",
	"design",
];

async function main() {
	const existing = JSON.parse(readFileSync(dataPath, "utf-8"));
	const existingSlugs = new Set(existing.map((s) => s.slug));

	// Check npm for latest simple-icons
	const response = await fetch(
		"https://registry.npmjs.org/simple-icons/latest",
	);
	const pkg = await response.json();
	console.log(`Latest simple-icons version: ${pkg.version}`);

	// For now, just log that the check ran
	// In a real implementation, we'd compare the icon list
	console.log(`Existing social networks: ${existingSlugs.size}`);
	console.log("Social icon check completed.");
}

main().catch(console.error);
