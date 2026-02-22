"use client";

import { useState } from "react";
import {
  Link2,
  Type,
  AlignLeft,
  Mail,
  Phone,
  Contact,
  Wallet,
  ChevronDown,
  Minus,
} from "lucide-react";
import { IconPicker } from "./icon-picker";

const LINK_TYPES = [
  { value: "link", label: "Link", icon: <Link2 className="w-4 h-4" /> },
  { value: "heading", label: "Heading", icon: <Type className="w-4 h-4" /> },
  { value: "spacer", label: "Spacer", icon: <Minus className="w-4 h-4" /> },
  { value: "text", label: "Text Block", icon: <AlignLeft className="w-4 h-4" /> },
  { value: "email", label: "Email", icon: <Mail className="w-4 h-4" /> },
  { value: "phone", label: "Phone", icon: <Phone className="w-4 h-4" /> },
  { value: "vcard", label: "vCard Download", icon: <Contact className="w-4 h-4" /> },
  { value: "wallet", label: "Wallet Pass", icon: <Wallet className="w-4 h-4" /> },
] as const;

export type LinkType = (typeof LINK_TYPES)[number]["value"];

export interface LinkFormData {
  type: LinkType;
  title: string;
  url: string;
  icon: string;
  iconType: "brand" | "lucide" | "custom";
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

interface LinkEditorProps {
  initialData?: Partial<LinkFormData>;
  onSubmit: (data: LinkFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function LinkEditor({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: LinkEditorProps) {
  const [type, setType] = useState<LinkType>(initialData?.type ?? "link");
  const [title, setTitle] = useState(initialData?.title ?? "");
  const [url, setUrl] = useState(initialData?.url ?? "");
  const [icon, setIcon] = useState(initialData?.icon ?? "");
  const [iconType, setIconType] = useState<"brand" | "lucide" | "custom">(
    initialData?.iconType ?? "brand"
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (type !== "spacer" && !title.trim()) {
      newErrors.title = "Title is required";
    }

    if (type === "link" && !url.trim()) {
      newErrors.url = "URL is required";
    }

    if (type === "email" && !url.trim()) {
      newErrors.url = "Email address is required";
    }

    if (type === "phone" && !url.trim()) {
      newErrors.url = "Phone number is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    let finalUrl = url;
    if (type === "email" && url && !url.startsWith("mailto:")) {
      finalUrl = `mailto:${url}`;
    }
    if (type === "phone" && url && !url.startsWith("tel:")) {
      finalUrl = `tel:${url}`;
    }

    onSubmit({
      type,
      title: type === "spacer" ? "---" : title,
      url: finalUrl,
      icon,
      iconType,
      isActive,
    });
  }

  const showUrlField = ["link"].includes(type);
  const showEmailField = type === "email";
  const showPhoneField = type === "phone";
  const showTitleField = type !== "spacer";
  const showIconField = ["link", "email", "phone", "vcard", "wallet"].includes(type);
  const showTextArea = type === "text";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Block Type Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
          Block Type
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {LINK_TYPES.map((lt) => (
            <button
              key={lt.value}
              type="button"
              onClick={() => setType(lt.value)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                type === lt.value
                  ? "bg-brand-cyan text-white"
                  : "glass-panel text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {lt.icon}
              {lt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      {showTitleField && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            {type === "heading" ? "Heading Text" : "Title"}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "heading"
                ? "Section heading..."
                : type === "text"
                ? "Text block title..."
                : "My awesome link"
            }
            className="glass-input"
          />
          {errors.title && (
            <p className="text-red-400 text-xs mt-1">{errors.title}</p>
          )}
        </div>
      )}

      {/* URL */}
      {showUrlField && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="glass-input"
          />
          {errors.url && (
            <p className="text-red-400 text-xs mt-1">{errors.url}</p>
          )}
        </div>
      )}

      {/* Email */}
      {showEmailField && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={url.replace("mailto:", "")}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="hello@example.com"
            className="glass-input"
          />
          {errors.url && (
            <p className="text-red-400 text-xs mt-1">{errors.url}</p>
          )}
        </div>
      )}

      {/* Phone */}
      {showPhoneField && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Phone Number
          </label>
          <input
            type="tel"
            value={url.replace("tel:", "")}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="glass-input"
          />
          {errors.url && (
            <p className="text-red-400 text-xs mt-1">{errors.url}</p>
          )}
        </div>
      )}

      {/* Text area for text blocks */}
      {showTextArea && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Content
          </label>
          <textarea
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Enter your text content..."
            rows={4}
            className="glass-input resize-y"
          />
        </div>
      )}

      {/* Icon selector */}
      {showIconField && (
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Icon
          </label>
          <div className="flex items-center gap-2">
            <select
              value={iconType}
              onChange={(e) =>
                setIconType(e.target.value as "brand" | "lucide" | "custom")
              }
              className="glass-select w-28"
            >
              <option value="brand">Brand</option>
              <option value="lucide">Lucide</option>
              <option value="custom">Custom</option>
            </select>

            {iconType === "custom" ? (
              <input
                type="text"
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="Custom icon URL or SVG"
                className="glass-input flex-1"
              />
            ) : (
              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setShowIconPicker(!showIconPicker)}
                  className="glass-input flex items-center justify-between w-full text-left"
                >
                  <span className={icon ? "" : "text-[var(--text-secondary)]"}>
                    {icon || "Select icon..."}
                  </span>
                  <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                </button>

                {showIconPicker && (
                  <div className="absolute top-full left-0 mt-2 z-50">
                    <IconPicker
                      value={icon}
                      onChange={setIcon}
                      onClose={() => setShowIconPicker(false)}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsActive(!isActive)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            isActive ? "bg-brand-cyan" : "bg-[rgba(255,255,255,0.15)]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              isActive ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-[var(--text-secondary)]">
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="glass-button-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="glass-button px-6 py-2.5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
