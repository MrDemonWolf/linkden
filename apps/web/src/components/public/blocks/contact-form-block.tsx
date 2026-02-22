"use client";

import { ContactForm } from "@/components/public/contact-form";

interface ContactFormBlockProps {
  captchaSiteKey?: string;
  heading?: string;
  buttonText?: string;
}

export function ContactFormBlock({
  captchaSiteKey,
  heading,
  buttonText,
}: ContactFormBlockProps) {
  return (
    <div
      style={{
        borderRadius: "var(--border-radius, 1rem)",
      }}
    >
      {heading && (
        <h3
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            color: "var(--text-primary, #fff)",
            marginBottom: "0.75rem",
          }}
        >
          {heading}
        </h3>
      )}
      <ContactForm captchaSiteKey={captchaSiteKey} />
    </div>
  );
}
