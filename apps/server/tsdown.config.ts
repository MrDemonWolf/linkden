import { defineConfig } from "tsdown";

export default defineConfig({
	entry: "./src/index.ts",
	format: "esm",
	outDir: "./dist",
	clean: true,
	// Bundle the workspace packages into the Worker output (they ship as source).
	deps: {
		alwaysBundle: [/@linkden\/.*/],
	},
});
