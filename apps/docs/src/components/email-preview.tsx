"use client";

import { useState, useEffect, createElement } from "react";
import { render } from "@react-email/render";
import { ContactNotification } from "@linkden/email";

const defaultData = {
  name: "Jane Smith",
  email: "jane@example.com",
  message:
    "Hi! I love your work and would like to discuss a potential collaboration. Let me know if you're available for a quick chat this week.",
  subject: "Collaboration Opportunity",
  phone: "+1 (555) 123-4567",
  company: "Acme Corp",
};

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-fd-foreground mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm text-fd-foreground placeholder:text-fd-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-fd-ring transition-colors"
      />
    </div>
  );
}

export function EmailPreview() {
  const [data, setData] = useState(defaultData);
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderTemplate() {
      try {
        const element = createElement(ContactNotification, {
          name: data.name,
          email: data.email,
          message: data.message,
          subject: data.subject || undefined,
          phone: data.phone || undefined,
          company: data.company || undefined,
        });
        const result = await render(element, { pretty: true });
        if (!cancelled) setHtml(result);
      } catch {
        if (!cancelled) setHtml("<p>Error rendering template</p>");
      }
    }

    renderTemplate();
    return () => {
      cancelled = true;
    };
  }, [data]);

  return (
    <div className="not-prose mt-6">
      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-5">
        {/* Fields Panel */}
        <div className="space-y-4 rounded-xl border border-fd-border bg-fd-card p-5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fd-muted-foreground">
            Template Data
          </h3>

          <Field
            label="Name"
            value={data.name}
            onChange={(v) => setData({ ...data, name: v })}
          />
          <Field
            label="Email"
            value={data.email}
            onChange={(v) => setData({ ...data, email: v })}
          />
          <Field
            label="Subject"
            value={data.subject}
            onChange={(v) => setData({ ...data, subject: v })}
            placeholder="Optional"
          />
          <Field
            label="Phone"
            value={data.phone}
            onChange={(v) => setData({ ...data, phone: v })}
            placeholder="Optional"
          />
          <Field
            label="Company"
            value={data.company}
            onChange={(v) => setData({ ...data, company: v })}
            placeholder="Optional"
          />
          <div>
            <label className="block text-sm font-medium text-fd-foreground mb-1.5">
              Message
            </label>
            <textarea
              value={data.message}
              onChange={(e) => setData({ ...data, message: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-fd-border bg-fd-background px-3 py-2 text-sm text-fd-foreground placeholder:text-fd-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-fd-ring transition-colors resize-none"
            />
          </div>
        </div>

        {/* Preview Panel */}
        <div className="rounded-xl border border-fd-border bg-fd-card overflow-hidden">
          <div className="border-b border-fd-border px-4 py-2.5 text-xs font-semibold text-fd-muted-foreground uppercase tracking-wider">
            Preview
          </div>
          {html ? (
            <iframe
              srcDoc={html}
              title="Email preview"
              className="w-full border-0"
              style={{ height: "650px" }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div
              className="flex items-center justify-center text-fd-muted-foreground text-sm"
              style={{ height: "650px" }}
            >
              Loading preview…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
