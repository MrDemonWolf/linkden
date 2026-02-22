"use client";

import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Eye, EyeOff, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

export default function PagesListPage() {
  const utils = trpc.useUtils();
  const pagesQuery = trpc.pages.list.useQuery();

  const deleteMutation = trpc.pages.delete.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate();
      toast.success("Page deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDelete(id: string) {
    if (deletingId === id) {
      deleteMutation.mutate({ id });
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  }

  if (pagesQuery.isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Pages</h1>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const pages = pagesQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pages</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </p>
        </div>
        <a
          href="/admin/pages/new"
          className="glass-button-primary flex items-center gap-2 px-4 py-2.5"
        >
          <Plus className="w-4 h-4" />
          New Page
        </a>
      </div>

      {pages.length === 0 ? (
        <div className="glass-card text-center py-12">
          <FileText className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">No pages yet</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Create custom pages for privacy policy, terms, or any other content.
          </p>
          <a
            href="/admin/pages/new"
            className="glass-button-primary inline-flex items-center gap-2 px-4 py-2.5"
          >
            <Plus className="w-4 h-4" />
            Create First Page
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((page) => (
            <div
              key={page.id}
              className={`glass-panel flex items-center gap-3 p-4 ${
                !page.isPublished ? "opacity-60" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--button-bg)] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-brand-cyan" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{page.title}</p>
                <p className="text-xs text-[var(--text-secondary)]">/{page.slug}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    page.isPublished
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-[rgba(255,255,255,0.05)] text-[var(--text-secondary)]"
                  }`}
                >
                  {page.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {page.isPublished ? "Published" : "Draft"}
                </span>

                {page.isPublished && (
                  <a
                    href={`/p/${page.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
                    title="View page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <a
                  href={`/admin/pages/${page.id}`}
                  className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </a>

                <button
                  onClick={() => handleDelete(page.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    deletingId === page.id
                      ? "bg-red-500/20 text-red-400"
                      : "hover:bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]"
                  }`}
                  title={deletingId === page.id ? "Click again to confirm" : "Delete"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
