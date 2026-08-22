"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RetryButton() {
	return (
		<Button onClick={() => window.location.reload()} className="w-full">
			<RefreshCw className="mr-1.5 h-4 w-4" />
			Try again
		</Button>
	);
}
