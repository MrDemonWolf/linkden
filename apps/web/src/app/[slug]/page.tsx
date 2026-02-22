"use client";

import { useParams } from "next/navigation";
import { trpc } from "@/lib/trpc";
import DOMPurify from "dompurify";

export default function DynamicPage() {
  const params = useParams();
  const slug = params.slug as string;

  const pageQuery = trpc.pages.getBySlug.useQuery(
    { slug },
    { enabled: !!slug }
  );

  if (pageQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pageQuery.error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card text-center max-w-md">
          <h1 className="text-3xl font-bold mb-2">404</h1>
          <p className="text-[var(--text-secondary)]">Page not found</p>
          <a
            href="/"
            className="inline-block mt-4 glass-button"
          >
            Go Home
          </a>
        </div>
      </div>
    );
  }

  const page = pageQuery.data;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <a
          href="/"
          className="inline-block mb-6 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors"
        >
          &larr; Back
        </a>
        <article className="glass-card prose prose-invert max-w-none">
          <h1 className="text-3xl font-bold mb-6">{page?.title}</h1>
          <div
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(page?.content ?? ""),
            }}
          />
        </article>
      </div>
    </div>
  );
}
