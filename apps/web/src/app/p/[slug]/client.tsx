"use client";

import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";
import { useParams } from "next/navigation";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function PageClient() {
  const params = useParams();
  const slug = params.slug as string;

  const pageQuery = trpc.pages.getBySlug.useQuery(
    { slug },
    {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  );

  if (pageQuery.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (pageQuery.error || !pageQuery.data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-4xl font-bold mb-3">404</h1>
          <p className="text-[var(--text-secondary)] mb-6">This page does not exist.</p>
          <a
            href="/"
            className="inline-flex items-center gap-2 text-sm text-[var(--primary)] hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </a>
        </div>
      </div>
    );
  }

  const page = pageQuery.data;

  return (
    <div className="min-h-screen py-12 px-4">
      <article className="max-w-2xl mx-auto">
        <header className="mb-8">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--primary)] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </a>
          <h1 className="text-3xl font-bold tracking-tight">{page.title}</h1>
        </header>

        <div className="prose prose-invert prose-sm max-w-none">
          <Markdown remarkPlugins={[remarkGfm]}>{page.content}</Markdown>
        </div>
      </article>
    </div>
  );
}
