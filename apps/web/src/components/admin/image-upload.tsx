"use client";

import { ImageIcon, X } from "lucide-react";

interface ImageUploadProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function ImageUpload({
  label,
  value,
  onChange,
  placeholder = "https://example.com/image.png",
}: ImageUploadProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[var(--surface-border)] flex items-center justify-center overflow-hidden shrink-0">
          {value ? (
            <img
              src={value}
              alt={label}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-[var(--text-secondary)]" />
          )}
        </div>
        <div className="relative flex-1">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="glass-input text-sm pr-8"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
