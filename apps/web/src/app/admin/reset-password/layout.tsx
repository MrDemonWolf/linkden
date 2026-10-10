import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
	return children;
}
