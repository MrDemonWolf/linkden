"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { mutationErrorMessage } from "@/components/admin/settings/mutation-error";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { useAnyUnsaved } from "@/hooks/use-unsaved-changes";
import {
	pendingPublication,
	publicationPollInterval,
	publicationView,
} from "@/lib/publication-state";
import { cn } from "@/lib/utils";
import { trpc } from "@/utils/trpc";

/** Explicit publication in the existing header slot; status reads never start work. */
export function StatePill({ className }: { className?: string }) {
	const unsaved = useAnyUnsaved();
	const qc = useQueryClient();
	const [pollingSince, setPollingSince] = useState(() => Date.now());
	const requesting = useRef(false);
	const status = useQuery({
		...trpc.publication.status.queryOptions(),
		meta: { skipErrorToast: true },
		retry: false,
		staleTime: 30_000,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
		refetchInterval: (query) => {
			const current = query.state.data;
			const revision = pendingPublication(current);
			if (
				!revision ||
				!current?.available ||
				current.recoveryRequired ||
				query.state.status === "error"
			)
				return false;
			return publicationPollInterval(current, pollingSince, Date.now());
		},
	});
	const request = useMutation({
		...trpc.publication.request.mutationOptions(),
		onSettled: () => {
			requesting.current = false;
		},
		onSuccess: async (result) => {
			setPollingSince(Date.now());
			toast.success(
				result.deduplicated ? "No new publication was needed" : "Publication requested",
			);
			await qc.invalidateQueries({ queryKey: trpc.publication.status.queryOptions().queryKey });
		},
		onError: async (error) => {
			toast.error(
				mutationErrorMessage(
					error,
					"Publication could not be requested. Refresh status before retrying.",
				),
			);
			await qc.invalidateQueries({ queryKey: trpc.publication.status.queryOptions().queryKey });
		},
	});
	const data = status.data;
	const {
		pending,
		disabled: publishDisabled,
		label,
		description,
	} = publicationView(data, {
		unsaved,
		isError: status.isError,
		isFetching: status.isFetching,
		requesting: request.isPending,
		dataUpdatedAt: status.dataUpdatedAt,
		now: Math.max(pollingSince, status.dataUpdatedAt),
	});
	const refresh = () => {
		setPollingSince(Date.now());
		void status.refetch();
	};

	return (
		<Popover>
			<PopoverTrigger
				aria-label={`Publishing: ${label}`}
				render={
					<Button
						variant="outline"
						size="xs"
						className={cn(
							"rounded-full px-2.5 text-micro",
							unsaved && "border-warning/40 text-warning",
							label === "Failed" && "border-destructive/40 text-destructive",
							label === "Published" && "border-success/30 text-success",
							className,
						)}
					/>
				}
			>
				<span role="status" aria-live="polite">
					{label}
				</span>
			</PopoverTrigger>
			<PopoverContent
				align="end"
				sideOffset={8}
				className="w-80 max-h-[var(--available-height)] max-w-[calc(100vw-2rem)] gap-4 overflow-y-auto p-4"
			>
				<div className="space-y-1">
					<PopoverTitle>Publish changes</PopoverTitle>
					<PopoverDescription>{description}</PopoverDescription>
				</div>
				{data?.lastGood && (
					<div className="space-y-1 text-xs">
						<p className="text-muted-foreground">
							{data.liveVerified
								? "Last verified publication"
								: "Historical successful revision · live state unverified"}
						</p>
						<code className="block truncate">{data.lastGood.revision}</code>
						{data.liveVerified && (
							<a
								href={`${data.lastGood.publicOrigin}/`}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex min-h-11 items-center text-primary hover:underline md:pointer-fine:min-h-0"
							>
								Open verified page
							</a>
						)}
					</div>
				)}
				{data?.available && (
					<p className="text-xs text-muted-foreground">
						Publishing approves saved scheduled content too. Later edits need a new publication.{" "}
						{data.scheduler.configured
							? `Scheduled checks are configured every ${data.scheduler.cadenceMinutes} minutes; changes can be delayed.`
							: "Automatic scheduling is not configured."}
					</p>
				)}
				{data?.nextVisibilityBoundary && (
					<p className="text-xs text-muted-foreground">
						{data.scheduler.configured && data.scheduler.approvalAvailable
							? "Next scheduled content change: "
							: "Scheduled content needs a new publication after "}
						{new Date(data.nextVisibilityBoundary).toISOString().slice(0, 19).replace("T", " ")}{" "}
						UTC.
					</p>
				)}
				{data?.scheduler.overdue && (
					<p role="status" className="text-xs text-warning">
						A scheduled content change is overdue. Refresh status or publish manually.
					</p>
				)}
				{data?.scheduler.failureCode && (
					<p className="text-xs text-warning">
						Scheduled publishing needs attention. Refresh status for the latest result.
					</p>
				)}
				{pending && data?.available && !data.recoveryRequired && !status.isError && (
					<p className="text-xs text-muted-foreground">
						Automatic checks run for up to two minutes. Use Refresh status for later updates.
					</p>
				)}
				<Link
					href="/admin/links?filter=drafts"
					className="inline-flex min-h-11 items-center text-xs text-primary hover:underline md:pointer-fine:min-h-0"
				>
					Review block drafts
				</Link>
				<div className="flex flex-wrap justify-end gap-2">
					<Button variant="ghost" size="sm" onClick={refresh} disabled={status.isFetching}>
						<RefreshCw className="size-3.5" aria-hidden="true" />
						{status.isFetching ? "Checking…" : "Refresh status"}
					</Button>
					<Button
						size="sm"
						disabled={publishDisabled}
						onClick={() => {
							if (
								!publishDisabled &&
								!requesting.current &&
								data?.sourceDigest &&
								data.approvalDigest
							) {
								requesting.current = true;
								request.mutate({
									expectedSourceDigest: data.sourceDigest,
									expectedApprovalDigest: data.approvalDigest,
								});
							}
						}}
					>
						<Upload className="size-3.5" aria-hidden="true" />
						{request.isPending ? "Requesting…" : "Publish"}
					</Button>
				</div>
				{data && (
					<p className="text-micro text-muted-foreground">
						At least {Math.ceil(data.limits.minIntervalMs / 1000)} seconds between new revisions ·
						up to {data.limits.dailyRequests} per UTC day.
					</p>
				)}
			</PopoverContent>
		</Popover>
	);
}
