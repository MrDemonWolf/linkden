import { DocsLayout } from "fumadocs-ui/layouts/notebook";
import { baseOptions } from "@/lib/layout.shared";
import { source } from "@/lib/source";

export default function Layout({ children }: LayoutProps<"/docs">) {
	const options = baseOptions();
	return (
		<DocsLayout
			tree={source.getPageTree()}
			{...options}
			nav={{ ...options.nav, mode: "top", transparentMode: "none" }}
			sidebar={{ collapsible: false, tabs: false }}
			containerProps={{ className: "ld-docs" }}
		>
			{children}
		</DocsLayout>
	);
}
