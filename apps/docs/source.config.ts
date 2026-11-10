import { defineConfig, defineDocs, frontmatterSchema, metaSchema } from "fumadocs-mdx/config";

export const docs = defineDocs({
	dir: "content/docs",
	docs: {
		schema: frontmatterSchema,
		postprocess: {
			includeProcessedMarkdown: true,
		},
	},
	meta: {
		schema: metaSchema,
		// Only navigation files. The design-system screenshot folders keep a
		// manifest.json each (scripts/design-screenshots), which is not page meta.
		files: ["**/meta.json"],
	},
});

export default defineConfig({
	mdxOptions: {},
});
