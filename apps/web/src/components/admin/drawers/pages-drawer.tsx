"use client";

import type { AdminDrawer } from "@/app/admin/page";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { ExternalLink, Eye, EyeOff, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface PagesDrawerProps {
  onOpenDrawer: (drawer: AdminDrawer) => void;
}

export function PagesDrawer({ onOpenDrawer }: PagesDrawerProps) {
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
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-[var(--admin-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  const pages = pagesQuery.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--admin-text-secondary)]">
          {pages.length} page{pages.length !== 1 ? "s" : ""}
        </p>
        <button
          type="button"
          onClick={() => onOpenDrawer("pages-new")}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          New Page
        </button>
      </div>

      {pages.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-[var(--admin-text-secondary)] mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1 text-[var(--admin-text)]">No pages yet</h2>
          <p className="text-sm text-[var(--admin-text-secondary)] mb-4">
            Create custom pages for privacy policy, terms, or any other content.
          </p>
          <button
            type="button"
            onClick={() => onOpenDrawer("pages-new")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create First Page
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {pages.map((pg) => (
            <div
              key={pg.id}
              className={`flex items-center gap-3 p-4 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-bg)] ${
                !pg.isPublished ? "opacity-60" : ""
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--admin-accent)]/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-[var(--admin-accent)]" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-[var(--admin-text)]">{pg.title}</p>
                <p className="text-xs text-[var(--admin-text-secondary)]">/{pg.slug}</p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <span
                  className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                    pg.isPublished
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-[var(--admin-border)] text-[var(--admin-text-secondary)]"
                  }`}
                >
                  {pg.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  {pg.isPublished ? "Published" : "Draft"}
                </span>

                {pg.isPublished && (
                  <a
                    href={`/p/${pg.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-[var(--admin-border)] transition-colors text-[var(--admin-text-secondary)]"
                    title="View page"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => onOpenDrawer({ type: "page-edit", id: pg.id })}
                  className="p-2 rounded-lg hover:bg-[var(--admin-border)] transition-colors text-[var(--admin-text-secondary)]"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                <button
                  onClick={() => handleDelete(pg.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    deletingId === pg.id
                      ? "bg-red-500/20 text-red-400"
                      : "hover:bg-[var(--admin-border)] text-[var(--admin-text-secondary)]"
                  }`}
                  title={deletingId === pg.id ? "Click again to confirm" : "Delete"}
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
