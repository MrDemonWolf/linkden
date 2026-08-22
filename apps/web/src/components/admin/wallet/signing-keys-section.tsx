"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FieldGroup } from "@/components/admin/settings/field-group";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/utils/trpc";

function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const result = reader.result as string;
			const base64 = result.includes(",") ? result.split(",")[1] : result;
			resolve(base64);
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}

function CertFileInput({
	label,
	hasValue,
	onFileSelect,
	onPaste,
	accept,
}: {
	label: string;
	hasValue: boolean;
	onFileSelect: (base64: string) => void;
	onPaste: (value: string) => void;
	accept: string;
}) {
	const fileRef = useRef<HTMLInputElement>(null);
	const [showPaste, setShowPaste] = useState(false);
	const [pasteValue, setPasteValue] = useState("");

	return (
		<div className="space-y-1.5">
			<div className="flex items-center gap-2">
				<Label>{label}</Label>
				{hasValue ? (
					<CheckCircle2 className="h-3.5 w-3.5 text-success" />
				) : (
					<CircleAlert className="h-3.5 w-3.5 text-warning" />
				)}
			</div>
			<div className="flex gap-2">
				<input
					ref={fileRef}
					type="file"
					accept={accept}
					className="hidden"
					onChange={async (e) => {
						const file = e.target.files?.[0];
						if (!file) return;
						const base64 = await fileToBase64(file);
						onFileSelect(base64);
					}}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="flex-1"
					onClick={() => fileRef.current?.click()}
				>
					<Upload className="mr-1.5 h-3.5 w-3.5" />
					{hasValue ? "Replace file" : "Upload file"}
				</Button>
				<Button type="button" variant="ghost" size="sm" onClick={() => setShowPaste(!showPaste)}>
					Paste
				</Button>
			</div>
			{showPaste && (
				<div className="space-y-1.5">
					<textarea
						value={pasteValue}
						onChange={(e) => setPasteValue(e.target.value)}
						placeholder="Paste PEM content here..."
						rows={4}
						className="w-full rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-ring dark:bg-input/30"
					/>
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => {
							const base64 = btoa(pasteValue);
							onPaste(base64);
							setShowPaste(false);
							setPasteValue("");
						}}
					>
						Apply
					</Button>
				</div>
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
	const [signerCert, setSignerCert] = useState<string | undefined>();
	const [signerKey, setSignerKey] = useState<string | undefined>();
	const [wwdrCert, setWwdrCert] = useState<string | undefined>();
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

	const isDirty =
		teamId !== savedTeamId ||
		passTypeId !== savedPassTypeId ||
		signerCert !== undefined ||
		signerKey !== undefined ||
		wwdrCert !== undefined;

	const handleSaveKeys = async () => {
		try {
			await updateKeys.mutateAsync({
				teamId,
				passTypeId,
				signerCert,
				signerKey,
				wwdrCert,
			});
			setSavedTeamId(teamId);
			setSavedPassTypeId(passTypeId);
			setSignerCert(undefined);
			setSignerKey(undefined);
			setWwdrCert(undefined);
			qc.invalidateQueries({ queryKey: trpc.wallet.getSigningKeys.queryOptions().queryKey });
			qc.invalidateQueries({ queryKey: trpc.wallet.getSigningStatus.queryOptions().queryKey });
			toast.success("Signing keys saved");
		} catch {
			toast.error("Failed to save signing keys");
		}
	};

	if (keysQuery.isLoading) {
		return <Skeleton className="h-24 w-full" />;
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
								<CheckCircle2 className="h-3 w-3 text-success" />
							) : (
								<CircleAlert className="h-3 w-3 text-warning" />
							)}
							<span className="text-muted-foreground">
								{item.label}
								{item.src && item.src !== "missing" && (
									<span className="ml-0.5 text-micro opacity-60">({item.src})</span>
								)}
							</span>
						</span>
					))}
				</div>
				{!allSet && (
					<p className="mt-1.5 pl-1.5 text-micro leading-relaxed text-muted-foreground">
						Upload signing keys below or set them as environment variables.
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
				hasValue={!!keysQuery.data?.hasSignerCert || signerCert !== undefined}
				onFileSelect={setSignerCert}
				onPaste={setSignerCert}
				accept=".pem,.cer,.crt"
			/>
			<CertFileInput
				label="Signer Key"
				hasValue={!!keysQuery.data?.hasSignerKey || signerKey !== undefined}
				onFileSelect={setSignerKey}
				onPaste={setSignerKey}
				accept=".pem,.key,.p12"
			/>
			<CertFileInput
				label="WWDR Certificate"
				hasValue={!!keysQuery.data?.hasWwdrCert || wwdrCert !== undefined}
				onFileSelect={setWwdrCert}
				onPaste={setWwdrCert}
				accept=".pem,.cer,.crt"
			/>

			{isDirty && (
				<Button onClick={handleSaveKeys} disabled={updateKeys.isPending} className="w-full">
					{updateKeys.isPending ? "Saving..." : "Save Signing Keys"}
				</Button>
			)}
		</div>
	);
}
