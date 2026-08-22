import type { Route } from "next";
import { redirect } from "next/navigation";
import { legacyAdminPath } from "@/lib/admin-redirects";

// Wallet pass moved to Settings → Wallet.
export default function WalletPage() {
	redirect(legacyAdminPath("/admin/wallet") as Route);
}
