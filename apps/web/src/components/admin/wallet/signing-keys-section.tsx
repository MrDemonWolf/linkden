"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { QueryError } from "@/components/admin/dashboard/query-error";
import { FieldGroup } from "@/components/admin/settings/field-group";
import { mutationErrorMessage } from "@/components/admin/settings/mutation-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { trpc } from "@/utils/trpc";
import {
	acceptSigningMaterial,
	type SigningMaterialKind,
	signingMaterialFromBytes,
} from "./signing-material";

/** `undefined` = unchanged, `""` = clear the saved value on save, else new material. */
type Pending = string | undefined;

function CertFileInput({
	label,
	kind,
	stored,
	pending,
	onChange,
	accept,
}: {
	label: string;
	kind: SigningMaterialKind;
	/** A value is saved in settings (it overrides the env variable). */
	stored: boolean;
	pending: Pending;
	onChange: (value: Pending) => void;
	accept: string;
}) {
	const id = useId();
	const pasteId = `${id}-paste`;
	const statusId = `${id}-status`;
	const fileRef = useRef<HTMLInputElement>(null);
	const [showPaste, setShowPaste] = useState(false);
	const [pasteValue, setPasteValue] = useState("");
	const [error, setError] = useState<string | null>(null);

	const hasValue = pending === undefined ? stored : pending !== "";

	// Same checks the server runs on save, so bad material is refused here with
	// the reason instead of saving and reporting green.
	const take = (raw: string) => {
		const result = acceptSigningMaterial(raw, kind);
		if (!result.ok) {
			setError(result.error);
			return false;
		}
		setError(null);
		onChange(result.value);
		return true;
	};

	const status =
		error ??
		(pending === ""
			? "Cleared on save. The matching environment variable is used if set."
			: pending !== undefined
				? "Ready to save"
				: null);

	return (
		<div className="space-y-1.5">
			<div className="flex items-center gap-2">
				<Label htmlFor={showPaste ? pasteId : undefined}>{label}</Label>
				{hasValue ? (
					<CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
				) : (
					<CircleAlert className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
				)}
			</div>
			<div className="flex flex-wrap gap-2">
				<input
					ref={fileRef}
					type="file"
					accept={accept}
					className="hidden"
					tabIndex={-1}
					aria-hidden="true"
					onChange={async (e) => {
						const file = e.target.files?.[0];
						e.target.value = "";
						if (!file) return;
						take(signingMaterialFromBytes(new Uint8Array(await file.arrayBuffer())));
					}}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="flex-1"
					aria-label={`${hasValue ? "Replace" : "Upload"} ${label} file`}
					onClick={() => fileRef.current?.click()}
				>
					<Upload className="mr-1.5 h-3.5 w-3.5" />
					{hasValue ? "Replace file" : "Upload file"}
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					aria-label={`Paste ${label}`}
					aria-expanded={showPaste}
					aria-controls={showPaste ? pasteId : undefined}
					onClick={() => setShowPaste(!showPaste)}
				>
					Paste
				</Button>
				{pending !== undefined ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						aria-label={`Undo ${label} change`}
						onClick={() => {
							setError(null);
							onChange(undefined);
						}}
					>
						Undo
					</Button>
				) : (
					stored && (
						<Button
							type="button"
							variant="ghost"
							size="sm"
							aria-label={`Clear saved ${label}`}
							onClick={() => {
								setError(null);
								onChange("");
							}}
						>
							Clear saved
						</Button>
					)
				)}
			</div>
			{showPaste && (
				<div className="space-y-1.5">
					<textarea
						id={pasteId}
						value={pasteValue}
						onChange={(e) => setPasteValue(e.target.value)}
						placeholder="-----BEGIN …-----"
						rows={4}
						spellCheck={false}
						aria-describedby={status ? statusId : undefined}
						className="w-full rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
					/>
					<Button
						type="button"
						size="sm"
						variant="outline"
						aria-label={`Apply pasted ${label}`}
						disabled={!pasteValue.trim()}
						onClick={() => {
							if (!take(pasteValue)) return;
							setShowPaste(false);
							setPasteValue("");
						}}
					>
						Apply
					</Button>
				</div>
			)}
			{status && (
				<p
					id={statusId}
					role={error ? "alert" : undefined}
					className={`text-micro ${error ? "text-destructive" : "text-muted-foreground"}`}
				>
					{status}
				</p>
			)}
		</div>
	);
}

export function SigningKeysSection() {
	const qc = useQueryClient();
	const keysQuery = useQuery(trpc.wallet.getSigningKeys.queryOptions());
	const statusQuery = useQuery(trpc.wallet.getSigningStatus.queryOptions());
	const updateKeys = useMutation(trpc.wallet.updateSigningKeys.mutationOptions());

	const [teamId, setTeamId] = useState("");
	const [passTypeId, setPassTypeId] = useState("");
	const [signerCert, setSignerCert] = useState<Pending>();
	const [signerKey, setSignerKey] = useState<Pending>();
	const [wwdrCert, setWwdrCert] = useState<Pending>();
	const [savedTeamId, setSavedTeamId] = useState("");
	const [savedPassTypeId, setSavedPassTypeId] = useState("");

	useEffect(() => {
		if (keysQuery.data) {
			setTeamId(keysQuery.data.teamId);
			setPassTypeId(keysQuery.data.passTypeId);
			setSavedTeamId(keysQuery.data.teamId);
			setSavedPassTypeId(keysQuery.data.passTypeId);
		}
	}, [keysQuery.data]);

	const teamIdChanged = teamId.trim() !== savedTeamId;
	const passTypeIdChanged = passTypeId.trim() !== savedPassTypeId;
	const isDirty =
		teamIdChanged ||
		passTypeIdChanged ||
		signerCert !== undefined ||
		signerKey !== undefined ||
		wwdrCert !== undefined;

	// Its own Save button, but the shell's Unsaved pill and nav guard still apply.
	useUnsavedChanges(isDirty);

	const handleSaveKeys = async () => {
		if (!keysQuery.data) return;
		const nextTeamId = teamId.trim();
		const nextPassTypeId = passTypeId.trim();
		try {
			await updateKeys.mutateAsync({
				// Only what changed: saving a certificate never resends (or blanks) the IDs.
				teamId: teamIdChanged ? nextTeamId : undefined,
				passTypeId: passTypeIdChanged ? nextPassTypeId : undefined,
				signerCert,
				signerKey,
				wwdrCert,
			});
			setTeamId(nextTeamId);
			setPassTypeId(nextPassTypeId);
			setSavedTeamId(nextTeamId);
			setSavedPassTypeId(nextPassTypeId);
			setSignerCert(undefined);
			setSignerKey(undefined);
			setWwdrCert(undefined);
			qc.invalidateQueries({ queryKey: trpc.wallet.getSigningKeys.queryOptions().queryKey });
			qc.invalidateQueries({ queryKey: trpc.wallet.getSigningStatus.queryOptions().queryKey });
			toast.success("Signing keys saved");
		} catch (err) {
			toast.error(mutationErrorMessage(err, "Failed to save signing keys"));
		}
	};

	if (keysQuery.isLoading) {
		return <Skeleton className="h-24 w-full" />;
	}

	// Never offer a form over keys that didn't load: saving from blank state
	// would send blank IDs.
	if (!keysQuery.data) {
		return (
			<QueryError
				message="Couldn't load your signing keys"
				onRetry={() => keysQuery.refetch()}
				className="rounded-lg border border-border"
			/>
		);
	}

	const status = statusQuery.data;
	const allSet =
		status?.signerCert &&
		status?.signerKey &&
		status?.wwdrCert &&
		status?.teamId &&
		status?.passTypeId;

	return (
		<div className="space-y-3">
			<div className="relative overflow-hidden rounded-lg border border-border bg-muted px-3.5 py-2.5 text-xs">
				<div
					className={`absolute inset-y-0 left-0 w-0.5 ${allSet ? "bg-success" : "bg-warning"}`}
				/>
				<div className="flex flex-wrap gap-x-4 gap-y-1 pl-1.5">
					{[
						{
							label: "Signer Certificate",
							ok: status?.signerCert,
							src: status?.source?.signerCert,
						},
						{ label: "Signer Key", ok: status?.signerKey, src: status?.source?.signerKey },
						{ label: "WWDR Certificate", ok: status?.wwdrCert, src: status?.source?.wwdrCert },
						{ label: "Team ID", ok: status?.teamId, src: status?.source?.teamId },
						{ label: "Pass Type ID", ok: status?.passTypeId, src: status?.source?.passTypeId },
					].map((item) => (
						<span key={item.label} className="inline-flex items-center gap-1">
							{item.ok ? (
								<CheckCircle2 className="h-3 w-3 text-success" aria-hidden="true" />
							) : (
								<CircleAlert className="h-3 w-3 text-warning" aria-hidden="true" />
							)}
							<span className="text-muted-foreground">
								{item.label}
								<span className="sr-only">{item.ok ? ": ready" : ": missing or unusable"}</span>
								{item.src && item.src !== "missing" && (
									<span className="ml-0.5 text-micro">({item.src})</span>
								)}
							</span>
						</span>
					))}
				</div>
				{!allSet && (
					<p className="mt-1.5 pl-1.5 text-micro leading-relaxed text-muted-foreground">
						Upload signing keys below or set them as environment variables. Saved keys override the
						environment.
					</p>
				)}
			</div>

			<FieldGroup columns={2}>
				<div className="space-y-1.5">
					<Label htmlFor="s-wallet-team-id">Team ID</Label>
					<Input
						id="s-wallet-team-id"
						value={teamId}
						onChange={(e) => setTeamId(e.target.value)}
						placeholder="ABC123DEF4"
						maxLength={20}
					/>
				</div>
				<div className="space-y-1.5">
					<Label htmlFor="s-wallet-pass-type-id">Pass Type ID</Label>
					<Input
						id="s-wallet-pass-type-id"
						value={passTypeId}
						onChange={(e) => setPassTypeId(e.target.value)}
						placeholder="pass.com.example.linkden"
						maxLength={100}
					/>
				</div>
			</FieldGroup>

			<CertFileInput
				label="Signer Certificate"
				kind="certificate"
				stored={keysQuery.data.hasSignerCert}
				pending={signerCert}
				onChange={setSignerCert}
				accept=".pem,.cer,.crt"
			/>
			<CertFileInput
				label="Signer Key"
				kind="privateKey"
				stored={keysQuery.data.hasSignerKey}
				pending={signerKey}
				onChange={setSignerKey}
				accept=".pem,.key"
			/>
			<CertFileInput
				label="WWDR Certificate"
				kind="certificate"
				stored={keysQuery.data.hasWwdrCert}
				pending={wwdrCert}
				onChange={setWwdrCert}
				accept=".pem,.cer,.crt"
			/>
			<p className="text-micro leading-relaxed text-muted-foreground">
				PEM (.pem, .crt, .key) or DER (.cer). The key must be RSA; an encrypted key also needs the{" "}
				<code className="rounded bg-muted px-1">WALLET_SIGNER_KEY_PASSPHRASE</code> environment
				variable.
			</p>

			{isDirty && (
				<Button onClick={handleSaveKeys} disabled={updateKeys.isPending} className="w-full">
					{updateKeys.isPending ? "Saving..." : "Save Signing Keys"}
				</Button>
			)}
		</div>
	);
}
