import type { Metadata } from "next";
import { SettingsShell } from "./settings-shell";

// Sub-page layouts set "Email"/"Integrations"/…; the Account root keeps the
// default. Metadata needs a server layout, so the client shell lives beside it.
export const metadata: Metadata = {
	title: { template: "%s · Settings · LinkDen Admin", default: "Settings" },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
	return <SettingsShell>{children}</SettingsShell>;
}
