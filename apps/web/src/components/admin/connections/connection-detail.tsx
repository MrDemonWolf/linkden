"use client";

import {
	Building2,
	CalendarCheck,
	Mail,
	MailOpen,
	MapPin,
	Phone,
	Reply,
	Star,
	Trash2,
	Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Connection {
	id: string;
	name: string;
	email: string;
	message: string;
	phone: string | null;
	subject: string | null;
	company: string | null;
	whereMet: string | null;
	rating: number | null;
	attending: string | null;
	guests: number | null;
	blockTitle: string | null;
	isRead: boolean;
	createdAt: string | Date;
}

interface ConnectionDetailProps {
	connection: Connection;
	onMarkRead: () => void;
	onMarkUnread: () => void;
	onDelete: () => void;
	isMarkingRead?: boolean;
	isMarkingUnread?: boolean;
}

function StarRating({ rating }: { rating: number }) {
	return (
		<div className="flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
			{Array.from({ length: 5 }, (_, i) => (
				<Star
					key={i}
					className={`h-3.5 w-3.5 ${
						i < rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
					}`}
				/>
			))}
		</div>
	);
}

function AttendingBadge({ attending }: { attending: string }) {
	const variants: Record<string, string> = {
		yes: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		no: "bg-red-500/10 text-red-600 dark:text-red-400",
		maybe: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
	};
	const cls = variants[attending.toLowerCase()] ?? "bg-muted text-muted-foreground";
	return (
		<span
			className={`inline-flex items-center rounded-full px-2 py-0.5 text-micro font-medium ${cls}`}
		>
			{attending.charAt(0).toUpperCase() + attending.slice(1)}
		</span>
	);
}

export function ConnectionDetail({
	connection,
	onMarkRead,
	onMarkUnread,
	onDelete,
	isMarkingRead,
	isMarkingUnread,
}: ConnectionDetailProps) {
	const hasExtraFields =
		connection.subject ||
		connection.rating !== null ||
		connection.attending ||
		connection.guests !== null;

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="space-y-1 border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
						{connection.name
							? connection.name
									.split(/\s+/)
									.slice(0, 2)
									.map((p) => p[0])
									.join("")
									.toUpperCase()
							: "?"}
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-semibold truncate">{connection.name || "Anonymous"}</p>
						<p className="text-micro text-muted-foreground truncate">{connection.email}</p>
					</div>
					{connection.isRead ? (
						<Badge variant="secondary" className="shrink-0 text-micro">
							Read
						</Badge>
					) : (
						<Badge variant="outline" className="shrink-0 gap-1 text-micro">
							<span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
							Unread
						</Badge>
					)}
				</div>
				<div className="flex items-center gap-2">
					<p className="text-micro text-muted-foreground">
						{new Date(connection.createdAt).toLocaleString()}
					</p>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto space-y-4 px-4 py-3">
				{/* Where Met - prominent placement for connections */}
				{connection.whereMet && (
					<div className="space-y-1">
						<h3 className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
							Where You Met
						</h3>
						<div className="flex items-center gap-2 text-xs">
							<MapPin className="h-3.5 w-3.5 text-primary" />
							<span className="font-medium">{connection.whereMet}</span>
						</div>
					</div>
				)}

				{/* Contact info */}
				<div className="space-y-2">
					<h3 className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
						Contact Info
					</h3>
					<div className="space-y-1.5">
						<div className="flex items-center gap-2 text-xs">
							<Mail className="h-3.5 w-3.5 text-muted-foreground" />
							<a href={`mailto:${connection.email}`} className="text-primary hover:underline">
								{connection.email}
							</a>
						</div>
						{connection.phone && (
							<div className="flex items-center gap-2 text-xs">
								<Phone className="h-3.5 w-3.5 text-muted-foreground" />
								<a href={`tel:${connection.phone}`} className="text-primary hover:underline">
									{connection.phone}
								</a>
							</div>
						)}
						{connection.company && (
							<div className="flex items-center gap-2 text-xs">
								<Building2 className="h-3.5 w-3.5 text-muted-foreground" />
								<span>{connection.company}</span>
							</div>
						)}
					</div>
				</div>

				{/* Subject */}
				{connection.subject && (
					<div className="space-y-1">
						<h3 className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
							Subject
						</h3>
						<p className="text-xs font-medium">{connection.subject}</p>
					</div>
				)}

				{/* Message */}
				<div className="space-y-1">
					<h3 className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
						Message
					</h3>
					<p className="whitespace-pre-wrap text-xs leading-relaxed">
						{connection.message || "No message provided"}
					</p>
				</div>

				{/* Extra fields */}
				{hasExtraFields && (
					<div className="space-y-2">
						<h3 className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
							Additional Info
						</h3>
						<div className="space-y-2">
							{connection.rating !== null && (
								<div className="flex items-center gap-2 text-xs">
									<span className="text-muted-foreground">Rating:</span>
									<StarRating rating={connection.rating} />
								</div>
							)}
							{connection.attending && (
								<div className="flex items-center gap-2 text-xs">
									<CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
									<AttendingBadge attending={connection.attending} />
								</div>
							)}
							{connection.guests !== null && (
								<div className="flex items-center gap-2 text-xs">
									<Users className="h-3.5 w-3.5 text-muted-foreground" />
									<span>
										{connection.guests} guest{connection.guests !== 1 ? "s" : ""}
									</span>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="flex flex-wrap gap-2 border-t px-4 py-3">
				{connection.isRead ? (
					<Button variant="outline" size="xs" onClick={onMarkUnread} disabled={isMarkingUnread}>
						<Mail className="mr-1 h-3 w-3" />
						Mark Unread
					</Button>
				) : (
					<Button variant="outline" size="xs" onClick={onMarkRead} disabled={isMarkingRead}>
						<MailOpen className="mr-1 h-3 w-3" />
						Mark Read
					</Button>
				)}
				<a
					href={`mailto:${connection.email}`}
					className={cn(buttonVariants({ variant: "outline", size: "xs" }))}
				>
					<Reply className="mr-1 h-3 w-3" />
					Reply
				</a>
				<Button variant="destructive" size="xs" onClick={onDelete}>
					<Trash2 className="mr-1 h-3 w-3" />
					Delete
				</Button>
			</div>
		</div>
	);
}
