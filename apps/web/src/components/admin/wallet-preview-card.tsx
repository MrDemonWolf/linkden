"use client";

import { QrCode } from "lucide-react";

interface PassField {
  key: string;
  label: string;
  value: string;
}

interface WalletPreviewCardProps {
  logoText?: string;
  organizationName?: string;
  headerFields?: PassField[];
  primaryFields?: PassField[];
  secondaryFields?: PassField[];
  auxiliaryFields?: PassField[];
  backgroundColor?: string;
  foregroundColor?: string;
  labelColor?: string;
  logoUrl?: string;
  barcodeFormat?: string;
}

export function WalletPreviewCard({
  logoText,
  organizationName,
  headerFields = [],
  primaryFields = [],
  secondaryFields = [],
  auxiliaryFields = [],
  backgroundColor = "#091533",
  foregroundColor = "#ffffff",
  labelColor = "#0FACED",
  logoUrl,
  barcodeFormat,
}: WalletPreviewCardProps) {
  return (
    <div
      className="rounded-2xl overflow-hidden shadow-xl max-w-[320px] mx-auto"
      style={{ backgroundColor }}
    >
      {/* Top row: logo + logoText + header fields */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="w-8 h-8 rounded object-contain" />
          ) : (
            <div className="w-8 h-8 rounded bg-white/10 flex items-center justify-center">
              <span className="text-[10px] font-bold" style={{ color: foregroundColor }}>
                {(logoText || organizationName || "L").charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          {logoText && (
            <span className="text-sm font-semibold" style={{ color: foregroundColor }}>
              {logoText}
            </span>
          )}
        </div>
        {headerFields.length > 0 && (
          <div className="text-right">
            {headerFields.map((f) => (
              <div key={f.key}>
                <p className="text-[8px] uppercase tracking-wider" style={{ color: labelColor }}>{f.label}</p>
                <p className="text-xs font-semibold" style={{ color: foregroundColor }}>{f.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Primary fields */}
      {primaryFields.length > 0 && (
        <div className="px-4 py-3">
          {primaryFields.map((f) => (
            <div key={f.key} className="mb-1">
              <p className="text-[8px] uppercase tracking-wider" style={{ color: labelColor }}>{f.label}</p>
              <p className="text-2xl font-bold leading-tight" style={{ color: foregroundColor }}>{f.value || "\u00A0"}</p>
            </div>
          ))}
        </div>
      )}

      {/* Secondary + Auxiliary fields */}
      {(secondaryFields.length > 0 || auxiliaryFields.length > 0) && (
        <div className="px-4 py-2 flex gap-4 flex-wrap">
          {[...secondaryFields, ...auxiliaryFields].map((f) => (
            <div key={f.key} className="min-w-0">
              <p className="text-[8px] uppercase tracking-wider" style={{ color: labelColor }}>{f.label}</p>
              <p className="text-xs font-medium" style={{ color: foregroundColor }}>{f.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty state if no fields */}
      {primaryFields.length === 0 && secondaryFields.length === 0 && auxiliaryFields.length === 0 && (
        <div className="px-4 py-6 text-center">
          <p className="text-xs opacity-50" style={{ color: foregroundColor }}>
            Add fields to see them here
          </p>
        </div>
      )}

      {/* Barcode area */}
      <div className="mx-4 mb-4 mt-2 rounded-lg bg-white p-3 flex flex-col items-center gap-1">
        <QrCode className="w-16 h-16 text-black/70" />
        {barcodeFormat && barcodeFormat !== "PKBarcodeFormatQR" && (
          <p className="text-[9px] text-black/40">{barcodeFormat.replace("PKBarcodeFormat", "")}</p>
        )}
      </div>
    </div>
  );
}
