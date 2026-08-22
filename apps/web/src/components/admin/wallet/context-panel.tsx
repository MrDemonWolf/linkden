"use client";

import { PASS_LOCATION_LIMIT, type PassLocation } from "@linkden/validators/wallet";
import { CalendarPlus, MapPin, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ContextPanelProps {
	relevantDate: string; // datetime-local string ("" when unset)
	locations: PassLocation[];
	onRelevantDateChange: (value: string) => void;
	onLocationsChange: (locations: PassLocation[]) => void;
}

const pillButtonClass =
	"flex w-full min-h-11 items-center justify-center gap-2 rounded-full border border-border bg-card/60 px-4 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/**
 * Context-Aware Presentation panel — iOS-Wallet-style pill-reveal editors for
 * the pass relevant date and locations.
 */
export function ContextPanel({
	relevantDate,
	locations,
	onRelevantDateChange,
	onLocationsChange,
}: ContextPanelProps) {
	const [showDate, setShowDate] = useState(false);
	const dateVisible = showDate || relevantDate !== "";

	// Reveal/remove actions unmount the focused control — restore focus to the
	// pill that takes its place instead of letting it fall to <body>.
	const datePillRef = useRef<HTMLButtonElement>(null);
	const locationPillRef = useRef<HTMLButtonElement>(null);

	const updateLocation = (i: number, patch: Partial<PassLocation>) =>
		onLocationsChange(locations.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
	const addLocation = () =>
		onLocationsChange([...locations, { latitude: 0, longitude: 0, relevantText: "" }]);
	const removeLocation = (i: number) => {
		onLocationsChange(locations.filter((_, idx) => idx !== i));
		requestAnimationFrame(() => locationPillRef.current?.focus());
	};

	return (
		<div className="space-y-5">
			{/* Locations */}
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<Label className="text-micro">Locations</Label>
					{locations.length > 0 && (
						<span className="text-micro text-muted-foreground/60">
							{locations.length}/{PASS_LOCATION_LIMIT}
						</span>
					)}
				</div>
				{locations.map((loc, i) => (
					<div key={i} className="space-y-2 rounded-lg border border-border/60 bg-card/40 p-2.5">
						<div className="grid grid-cols-2 gap-2">
							<div className="space-y-1">
								<Label className="text-micro">Latitude</Label>
								<Input
									type="number"
									step="any"
									value={Number.isFinite(loc.latitude) ? loc.latitude : ""}
									placeholder="37.7749"
									onChange={(e) => updateLocation(i, { latitude: parseFloat(e.target.value) })}
									className="text-micro"
								/>
							</div>
							<div className="space-y-1">
								<Label className="text-micro">Longitude</Label>
								<Input
									type="number"
									step="any"
									value={Number.isFinite(loc.longitude) ? loc.longitude : ""}
									placeholder="-122.4194"
									onChange={(e) => updateLocation(i, { longitude: parseFloat(e.target.value) })}
									className="text-micro"
								/>
							</div>
						</div>
						<div className="space-y-1">
							<Label className="text-micro">Lock Screen text</Label>
							<Input
								value={loc.relevantText ?? ""}
								maxLength={100}
								placeholder="Save my contact"
								onChange={(e) => updateLocation(i, { relevantText: e.target.value })}
								className="text-micro"
							/>
						</div>
						<button
							type="button"
							onClick={() => removeLocation(i)}
							className="inline-flex min-h-11 items-center gap-1 rounded text-micro text-destructive hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:min-h-8"
						>
							<Trash2 className="h-3 w-3" /> Remove
						</button>
					</div>
				))}
				{locations.length < PASS_LOCATION_LIMIT && (
					<button
						ref={locationPillRef}
						type="button"
						onClick={addLocation}
						className={pillButtonClass}
					>
						<MapPin className="h-4 w-4" aria-hidden="true" />
						Add Location…
					</button>
				)}
			</div>

			{/* Relevant date */}
			<div className="space-y-2">
				<Label className="text-micro" htmlFor={dateVisible ? "w-reldate" : undefined}>
					Relevant Date
				</Label>
				{dateVisible ? (
					<div className="flex items-center gap-2">
						<Input
							id="w-reldate"
							type="datetime-local"
							value={relevantDate}
							onChange={(e) => onRelevantDateChange(e.target.value)}
							className="flex-1"
							autoFocus={showDate}
						/>
						<button
							type="button"
							onClick={() => {
								onRelevantDateChange("");
								setShowDate(false);
								requestAnimationFrame(() => datePillRef.current?.focus());
							}}
							aria-label="Clear relevant date"
							className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
						>
							<X className="h-4 w-4" />
						</button>
					</div>
				) : (
					<button
						ref={datePillRef}
						type="button"
						onClick={() => setShowDate(true)}
						className={pillButtonClass}
					>
						<CalendarPlus className="h-4 w-4" aria-hidden="true" />
						Add Relevant Date
					</button>
				)}
			</div>

			<p className="text-micro leading-relaxed text-muted-foreground/70">
				Add places and timing so Wallet can surface this card when it is most useful.
			</p>
		</div>
	);
}
