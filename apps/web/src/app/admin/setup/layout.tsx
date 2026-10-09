import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Set up" };

export default function SetupLayout({ children }: { children: React.ReactNode }) {
	return children;
}
