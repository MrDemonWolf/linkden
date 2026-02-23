"use client";

import { ColorPicker } from "@/components/admin/color-picker";
import { ImageUpload } from "@/components/admin/image-upload";
import { WalletPreviewCard } from "@/components/admin/wallet-preview-card";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle, Info, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PassField {
  key: string;
  label: string;
  value: string;
}

function FieldList({
  title,
  max,
  fields,
  onChange,
}: {
  title: string;
  max: number;
  fields: PassField[];
  onChange: (fields: PassField[]) => void;
}) {
  function addField() {
    if (fields.length >= max) return;
    onChange([...fields, { key: `field_${Date.now()}`, label: "", value: "" }]);
  }

  function removeField(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  function updateField(index: number, partial: Partial<PassField>) {
    const updated = [...fields];
    updated[index] = { ...updated[index], ...partial };
    onChange(updated);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-[var(--admin-text-secondary)]">
          {title} ({fields.length}/{max})
        </label>
        {fields.length < max && (
          <button
            type="button"
            onClick={addField}
            className="text-xs text-[var(--admin-accent)] hover:underline flex items-center gap-1"
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        )}
      </div>
      <div className="space-y-2">
        {fields.map((field, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={field.key}
              onChange={(e) => updateField(i, { key: e.target.value })}
              placeholder="key"
              aria-label={`${title} field ${i + 1} key`}
              className="w-24 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
            />
            <input
              type="text"
              value={field.label}
              onChange={(e) => updateField(i, { label: e.target.value })}
              placeholder="Label"
              aria-label={`${title} field ${i + 1} label`}
              className="flex-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
            />
            <input
              type="text"
              value={field.value}
              onChange={(e) => updateField(i, { value: e.target.value })}
              placeholder="Value"
              aria-label={`${title} field ${i + 1} value`}
              className="flex-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-2 py-1.5 text-sm text-[var(--admin-text)]"
            />
            <button
              type="button"
              onClick={() => removeField(i)}
              className="p-2 rounded-lg hover:bg-red-500/20 text-[var(--admin-text-secondary)] hover:text-red-400 transition-colors"
              aria-label={`Remove ${title} field ${i + 1}`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBanner({ configured, signingReady }: { configured: boolean; signingReady: boolean }) {
  if (configured && signingReady) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
        <p className="text-xs text-emerald-400 leading-relaxed">
          Wallet pass is fully configured and ready to generate.
        </p>
      </div>
    );
  }

  if (configured && !signingReady) {
    return (
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
        <p className="text-xs text-orange-400 leading-relaxed">
          Apple signing certificates not configured on the server. The wallet pass cannot be generated until <code className="font-mono text-[10px] bg-orange-500/10 px-1 rounded">APPLE_PASS_SIGNER_CERT</code> and <code className="font-mono text-[10px] bg-orange-500/10 px-1 rounded">APPLE_PASS_SIGNER_KEY</code> are set.
        </p>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
      <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />
      <p className="text-xs text-yellow-400 leading-relaxed">
        Wallet pass not configured. Fill in the Pass Type ID and Team ID to enable Apple Wallet.
      </p>
    </div>
  );
}

export function WalletDrawer() {
  const utils = trpc.useUtils();
  const walletQuery = trpc.wallet.get.useQuery();
  const statusQuery = trpc.wallet.status.useQuery();

  const [passTypeId, setPassTypeId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [description, setDescription] = useState("");
  const [logoText, setLogoText] = useState("");
  const [headerFields, setHeaderFields] = useState<PassField[]>([]);
  const [primaryFields, setPrimaryFields] = useState<PassField[]>([]);
  const [secondaryFields, setSecondaryFields] = useState<PassField[]>([]);
  const [auxiliaryFields, setAuxiliaryFields] = useState<PassField[]>([]);
  const [backFields, setBackFields] = useState<PassField[]>([]);
  const [barcodeFormat, setBarcodeFormat] = useState("PKBarcodeFormatQR");
  const [barcodeMessage, setBarcodeMessage] = useState("");
  const [barcodeAltText, setBarcodeAltText] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#091533");
  const [foregroundColor, setForegroundColor] = useState("#ffffff");
  const [labelColor, setLabelColor] = useState("#0FACED");
  const [logoUrl, setLogoUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [stripUrl, setStripUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  useEffect(() => {
    const w = walletQuery.data;
    if (!w) return;
    setPassTypeId(w.passTypeId || "");
    setTeamId(w.teamId || "");
    setOrganizationName(w.organizationName || "");
    setDescription(w.description || "");
    setLogoText(w.logoText || "");
    setHeaderFields((w.headerFields as PassField[]) || []);
    setPrimaryFields((w.primaryFields as PassField[]) || []);
    setSecondaryFields((w.secondaryFields as PassField[]) || []);
    setAuxiliaryFields((w.auxiliaryFields as PassField[]) || []);
    setBackFields((w.backFields as PassField[]) || []);
    setBarcodeFormat(w.barcodeFormat || "PKBarcodeFormatQR");
    setBarcodeMessage(w.barcodeMessage || "");
    setBarcodeAltText(w.barcodeAltText || "");
    setBackgroundColor(w.backgroundColor || "#091533");
    setForegroundColor(w.foregroundColor || "#ffffff");
    setLabelColor(w.labelColor || "#0FACED");
    setLogoUrl(w.logoUrl || "");
    setIconUrl(w.iconUrl || "");
    setStripUrl(w.stripUrl || "");
    setThumbnailUrl(w.thumbnailUrl || "");
  }, [walletQuery.data]);

  const updateMutation = trpc.wallet.update.useMutation({
    onSuccess: () => {
      utils.wallet.get.invalidate();
      utils.wallet.status.invalidate();
      toast.success("Wallet pass saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save"),
  });

  function handleSave() {
    updateMutation.mutate({
      passTypeId: passTypeId || undefined,
      teamId: teamId || undefined,
      organizationName: organizationName || undefined,
      description: description || undefined,
      logoText: logoText || undefined,
      headerFields: headerFields.length ? headerFields : undefined,
      primaryFields: primaryFields.length ? primaryFields : undefined,
      secondaryFields: secondaryFields.length ? secondaryFields : undefined,
      auxiliaryFields: auxiliaryFields.length ? auxiliaryFields : undefined,
      backFields: backFields.length ? backFields : undefined,
      barcodeFormat: (barcodeFormat as any) || undefined,
      barcodeMessage: barcodeMessage || undefined,
      barcodeAltText: barcodeAltText || undefined,
      backgroundColor: backgroundColor || undefined,
      foregroundColor: foregroundColor || undefined,
      labelColor: labelColor || undefined,
      logoUrl: logoUrl || undefined,
      iconUrl: iconUrl || undefined,
      stripUrl: stripUrl || undefined,
      thumbnailUrl: thumbnailUrl || undefined,
    });
  }

  if (walletQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--admin-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/50";

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {statusQuery.data && (
        <StatusBanner
          configured={statusQuery.data.configured}
          signingReady={statusQuery.data.signingReady}
        />
      )}

      {/* Dev mode info */}
      {isDev && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-400 leading-relaxed">
            Development mode: Wallet pass generation requires Apple Developer certificates. See docs for setup.
          </p>
        </div>
      )}

      {/* Live Preview Card */}
      <section>
        <p className="admin-section-label mb-3">Preview</p>
        <WalletPreviewCard
          logoText={logoText}
          organizationName={organizationName}
          headerFields={headerFields}
          primaryFields={primaryFields}
          secondaryFields={secondaryFields}
          auxiliaryFields={auxiliaryFields}
          backgroundColor={backgroundColor}
          foregroundColor={foregroundColor}
          labelColor={labelColor}
          logoUrl={logoUrl}
          barcodeFormat={barcodeFormat}
        />
      </section>

      {/* Pass Identity */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--admin-text)]">Pass Identity</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Pass Type ID</label>
            <input type="text" value={passTypeId} onChange={(e) => setPassTypeId(e.target.value)} placeholder="pass.com.example.app" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Team ID</label>
            <input type="text" value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="ABCDE12345" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Organization Name</label>
            <input type="text" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="My Company" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Description</label>
            <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contact card" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Logo Text</label>
            <input type="text" value={logoText} onChange={(e) => setLogoText(e.target.value)} placeholder="Company Name" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Fields */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--admin-text)]">Pass Fields</h2>
        <FieldList title="Header Fields" max={3} fields={headerFields} onChange={setHeaderFields} />
        <FieldList title="Primary Fields" max={2} fields={primaryFields} onChange={setPrimaryFields} />
        <FieldList title="Secondary Fields" max={4} fields={secondaryFields} onChange={setSecondaryFields} />
        <FieldList title="Auxiliary Fields" max={5} fields={auxiliaryFields} onChange={setAuxiliaryFields} />
        <FieldList title="Back Fields" max={20} fields={backFields} onChange={setBackFields} />
      </section>

      {/* Barcode */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--admin-text)]">Barcode</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Format</label>
            <select value={barcodeFormat} onChange={(e) => setBarcodeFormat(e.target.value)} className={inputCls} aria-label="Barcode format">
              <option value="PKBarcodeFormatQR">QR Code</option>
              <option value="PKBarcodeFormatPDF417">PDF417</option>
              <option value="PKBarcodeFormatAztec">Aztec</option>
              <option value="PKBarcodeFormatCode128">Code 128</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Alt Text</label>
            <input type="text" value={barcodeAltText} onChange={(e) => setBarcodeAltText(e.target.value)} placeholder="Scan to contact" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Barcode Message</label>
            <input type="text" value={barcodeMessage} onChange={(e) => setBarcodeMessage(e.target.value)} placeholder="https://your-page.com" className={inputCls} />
          </div>
        </div>
      </section>

      {/* Colors */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--admin-text)]">Colors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ColorPicker label="Background" value={backgroundColor} onChange={setBackgroundColor} />
          <ColorPicker label="Foreground" value={foregroundColor} onChange={setForegroundColor} />
          <ColorPicker label="Label" value={labelColor} onChange={setLabelColor} />
        </div>
      </section>

      {/* Images */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-[var(--admin-text)]">Images</h2>
        <ImageUpload label="Logo" value={logoUrl} onChange={setLogoUrl} />
        <ImageUpload label="Icon" value={iconUrl} onChange={setIconUrl} />
        <ImageUpload label="Strip Image" value={stripUrl} onChange={setStripUrl} />
        <ImageUpload label="Thumbnail" value={thumbnailUrl} onChange={setThumbnailUrl} />
      </section>

      <div className="flex justify-end pb-4">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-8 py-2.5 rounded-lg bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Saving..." : "Save Wallet Pass"}
        </button>
      </div>
    </div>
  );
}
