import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";
import { EmailPreview } from "@/components/email-preview";

export function getMDXComponents(components?: MDXComponents): MDXComponents {
	return { ...defaultMdxComponents, EmailPreview, ...components };
}
