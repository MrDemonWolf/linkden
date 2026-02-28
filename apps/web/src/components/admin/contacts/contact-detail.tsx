"use client";

import {
	Mail,
	MailOpen,
	Trash2,
	Reply,
	Phone,
	Building2,
	Star,
	CalendarCheck,
	Users,
	MessageSquare,
	MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Contact {
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
	isRead: boolean;
	createdAt: string | Date;
}

interface ContactDetailProps {
	contact: Contact;
	onMarkRead: () => void;
	onMarkUnread: () => void;
	onDelete: () => void;
	isMarkingRead?: boolean;
	isMarkingUnread?: boolean;
}

function StarRating({ rating }: { rating: number }) {
	return (
		<div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
			{Array.from({ length: 5 }, (_, i) => (
				<Star
					key={i}
					className={`h-3.5 w-3.5 ${
						i < rating
							? "fill-amber-400 text-amber-400"
							: "text-muted-foreground/30"
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
		<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>
			{attending.charAt(0).toUpperCase() + attending.slice(1)}
		</span>
	);
}

export function ContactDetail({
	contact,
	onMarkRead,
	onMarkUnread,
	onDelete,
	isMarkingRead,
	isMarkingUnread,
}: ContactDetailProps) {
	const hasExtraFields =
		contact.subject ||
		contact.whereMet ||
		contact.rating !== null ||
		contact.attending ||
		contact.guests !== null;

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="space-y-1 border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
						{contact.name
							? contact.name
									.split(/\s+/)
									.slice(0, 2)
									.map((p) => p[0])
									.join("")
									.toUpperCase()
							: "?"}
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-semibold truncate">
							{contact.name || "Anonymous"}
						</p>
						<p className="text-[11px] text-muted-foreground truncate">
							{contact.email}
						</p>
					</div>
					<Badge variant={contact.isRead ? "secondary" : "default"} className="shrink-0 text-[10px]">
						{contact.isRead ? "Read" : "Unread"}
					</Badge>
				</div>
				<p className="text-[11px] text-muted-foreground">
					{new Date(contact.createdAt).toLocaleString()}
				</p>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-y-auto space-y-4 px-4 py-3">
				{/* Contact info */}
				<div className="space-y-2">
					<h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Contact Info
					</h3>
					<div className="space-y-1.5">
						<div className="flex items-center gap-2 text-xs">
							<Mail className="h-3.5 w-3.5 text-muted-foreground" />
							<a
								href={`mailto:${contact.email}`}
								className="text-primary hover:underline"
							>
								{contact.email}
							</a>
						</div>
						{contact.phone && (
							<div className="flex items-center gap-2 text-xs">
								<Phone className="h-3.5 w-3.5 text-muted-foreground" />
								<a
									href={`tel:${contact.phone}`}
									className="text-primary hover:underline"
								>
									{contact.phone}
								</a>
							</div>
						)}
						{contact.company && (
							<div className="flex items-center gap-2 text-xs">
								<Building2 className="h-3.5 w-3.5 text-muted-foreground" />
								<span>{contact.company}</span>
							</div>
						)}
					</div>
				</div>

				{/* Subject */}
				{contact.subject && (
					<div className="space-y-1">
						<h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							Subject
						</h3>
						<p className="text-xs font-medium">{contact.subject}</p>
					</div>
				)}

				{/* Message */}
				<div className="space-y-1">
					<h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
						Message
					</h3>
					<p className="whitespace-pre-wrap text-xs leading-relaxed">
						{contact.message || "No message provided"}
					</p>
				</div>

				{/* Extra fields */}
				{hasExtraFields && (
					<div className="space-y-2">
						<h3 className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
							Additional Info
						</h3>
						<div className="space-y-2">
							{contact.whereMet && (
								<div className="flex items-center gap-2 text-xs">
									<MapPin className="h-3.5 w-3.5 text-muted-foreground" />
									<span>{contact.whereMet}</span>
								</div>
							)}
							{contact.rating !== null && (
								<div className="flex items-center gap-2 text-xs">
									<span className="text-muted-foreground">Rating:</span>
									<StarRating rating={contact.rating} />
								</div>
							)}
							{contact.attending && (
								<div className="flex items-center gap-2 text-xs">
									<CalendarCheck className="h-3.5 w-3.5 text-muted-foreground" />
									<AttendingBadge attending={contact.attending} />
								</div>
							)}
							{contact.guests !== null && (
								<div className="flex items-center gap-2 text-xs">
									<Users className="h-3.5 w-3.5 text-muted-foreground" />
									<span>
										{contact.guests} guest{contact.guests !== 1 ? "s" : ""}
									</span>
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Actions */}
			<div className="flex flex-wrap gap-2 border-t px-4 py-3">
				{contact.isRead ? (
					<Button
						variant="outline"
						size="xs"
						onClick={onMarkUnread}
						disabled={isMarkingUnread}
					>
						<Mail className="mr-1 h-3 w-3" />
						Mark Unread
					</Button>
				) : (
					<Button
						variant="outline"
						size="xs"
						onClick={onMarkRead}
						disabled={isMarkingRead}
					>
						<MailOpen className="mr-1 h-3 w-3" />
						Mark Read
					</Button>
				)}
				<a href={`mailto:${contact.email}`}>
					<Button variant="outline" size="xs">
						<Reply className="mr-1 h-3 w-3" />
						Reply
					</Button>
				</a>
				<Button
					variant="destructive"
					size="xs"
					onClick={onDelete}
				>
					<Trash2 className="mr-1 h-3 w-3" />
					Delete
				</Button>
			</div>
		</div>
	);
}
