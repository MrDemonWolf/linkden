import type { LucideIcon } from "lucide-react";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
	icon: LucideIcon;
	title: string;
	count?: number;
	variant?: "primary" | "muted";
}

export function SectionHeader({
	icon: Icon,
	title,
	count,
	variant = "muted",
}: SectionHeaderProps) {
	return (
		<CardHeader>
			<h2>
				<CardTitle className="flex items-center gap-2 text-sm text-foreground">
					<span
						className={cn(
							"flex h-7 w-7 items-center justify-center rounded-lg",
							variant === "primary"
								? "bg-primary/10 ring-1 ring-primary/20"
								: "bg-muted/80",
						)}
					>
						<Icon
							className={cn(
								"h-4 w-4",
								variant === "primary"
									? "text-primary"
									: "text-muted-foreground",
							)}
							aria-hidden="true"
						/>
					</span>
					{title}
					{count !== undefined && (
						variant === "primary" ? (
							<Badge variant="outline" className="ml-1 text-[10px] border-primary/30 text-primary">
								{count}
							</Badge>
						) : (
							<span className="text-xs font-normal text-muted-foreground">
								({count})
							</span>
						)
					)}
				</CardTitle>
			</h2>
		</CardHeader>
	);
}
