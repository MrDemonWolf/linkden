"use client";

import { useMemo } from "react";

interface HtmlBlockProps {
  html: string;
}

/**
 * Sanitize HTML to prevent XSS attacks.
 * Strips dangerous elements and attributes while preserving safe formatting.
 */
function sanitizeHtml(html: string): string {
  // Remove <script> tags (including multiline)
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
  // Remove <style> tags that could be used for data exfiltration
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "");
  // Remove <iframe> tags
  clean = clean.replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi, "");
  clean = clean.replace(/<iframe\b[^>]*\/?\s*>/gi, "");
  // Remove <object>, <embed>, <applet> tags
  clean = clean.replace(/<(object|embed|applet)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  clean = clean.replace(/<(object|embed|applet)\b[^>]*\/?\s*>/gi, "");
  // Remove <form> tags
  clean = clean.replace(/<form\b[^>]*>[\s\S]*?<\/form>/gi, "");
  // Remove <base> and <meta> tags
  clean = clean.replace(/<(base|meta|link)\b[^>]*\/?\s*>/gi, "");
  // Remove on* event handler attributes (onclick, onerror, onload, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // Remove javascript: URLs in href/src/action attributes
  clean = clean.replace(/(href|src|action)\s*=\s*["']?\s*javascript\s*:/gi, "$1=\"#\"");
  // Remove data: URLs (except safe image types)
  clean = clean.replace(/(src)\s*=\s*["']?\s*data\s*:(?!image\/(png|jpg|jpeg|gif|svg\+xml|webp))/gi, "$1=\"\"");
  // Remove vbscript: URLs
  clean = clean.replace(/(href|src|action)\s*=\s*["']?\s*vbscript\s*:/gi, "$1=\"#\"");
  // Remove style attributes containing expressions/url() that could exfiltrate data
  clean = clean.replace(/style\s*=\s*["'][^"']*(?:expression|url\s*\(|javascript:)[^"']*["']/gi, "");

  return clean;
}

export function HtmlBlock({ html }: HtmlBlockProps) {
  const sanitized = useMemo(() => sanitizeHtml(html), [html]);

  return (
    <div
      style={{
        borderRadius: "var(--border-radius, 1rem)",
        padding: "1rem",
        backgroundColor: "var(--surface, rgba(255,255,255,0.08))",
        border: "1px solid var(--surface-border, rgba(255,255,255,0.12))",
        color: "var(--text-primary, #fff)",
        fontSize: "0.875rem",
        lineHeight: 1.6,
        overflowWrap: "break-word",
      }}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  );
}
