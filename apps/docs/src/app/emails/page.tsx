"use client";

import { useState, useEffect, createElement } from "react";
import { render } from "@react-email/render";
import { ContactNotification, ContactConfirmation } from "@linkden/email";

type Template = "notification" | "confirmation";

const defaultData = {
  name: "Jane Smith",
  email: "jane@example.com",
  message:
    "Hi! I love your work and would like to discuss a potential collaboration. Let me know if you're available for a quick chat this week.",
  subject: "Collaboration Opportunity",
  phone: "+1 (555) 123-4567",
  company: "Acme Corp",
};

export default function EmailTemplatesPage() {
  const [activeTemplate, setActiveTemplate] =
    useState<Template>("notification");
  const [data, setData] = useState(defaultData);
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function renderTemplate() {
      try {
        let element: React.ReactElement;
        if (activeTemplate === "notification") {
          element = createElement(ContactNotification, {
            name: data.name,
            email: data.email,
            message: data.message,
            subject: data.subject || undefined,
            phone: data.phone || undefined,
            company: data.company || undefined,
          });
        } else {
          element = createElement(ContactConfirmation, {
            name: data.name,
          });
        }
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
  }, [activeTemplate, data]);

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-2">Email Templates</h1>
      <p className="text-fd-muted-foreground mb-8">
        Preview the email templates used by LinkDen. Edit the fields below to
        see how they render.
      </p>

      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTemplate("notification")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTemplate === "notification"
              ? "bg-fd-primary text-fd-primary-foreground"
              : "bg-fd-muted text-fd-muted-foreground hover:bg-fd-accent"
          }`}
        >
          Contact Notification
        </button>
        <button
          type="button"
          onClick={() => setActiveTemplate("confirmation")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTemplate === "confirmation"
              ? "bg-fd-primary text-fd-primary-foreground"
              : "bg-fd-muted text-fd-muted-foreground hover:bg-fd-accent"
          }`}
        >
          Contact Confirmation
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Fields Panel */}
        <div className="space-y-4 rounded-lg border border-fd-border bg-fd-card p-5">
          <h2 className="font-semibold text-sm uppercase tracking-wide text-fd-muted-foreground">
            Template Data
          </h2>

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

          {activeTemplate === "notification" && (
            <>
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
                <label className="block text-sm font-medium text-fd-foreground mb-1">
                  Message
                </label>
                <textarea
                  value={data.message}
                  onChange={(e) =>
                    setData({ ...data, message: e.target.value })
                  }
                  rows={4}
                  className="w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
                />
              </div>
            </>
          )}
        </div>

        {/* Preview Panel */}
        <div className="rounded-lg border border-fd-border bg-fd-card overflow-hidden">
          <div className="border-b border-fd-border px-4 py-2 text-xs font-medium text-fd-muted-foreground uppercase tracking-wide">
            Preview
          </div>
          {html ? (
            <iframe
              srcDoc={html}
              title="Email preview"
              className="w-full border-0"
              style={{ height: "700px" }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div
              className="flex items-center justify-center text-fd-muted-foreground text-sm"
              style={{ height: "700px" }}
            >
              Loading preview...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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
      <label className="block text-sm font-medium text-fd-foreground mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-fd-border bg-fd-background px-3 py-2 text-sm text-fd-foreground focus:outline-none focus:ring-2 focus:ring-fd-ring"
      />
    </div>
  );
}
