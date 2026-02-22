"use client";

import type { AdminDrawer } from "@/app/admin/page";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

interface PageEditorDrawerProps {
  /** Pass null for "new page" mode, or a page ID for "edit" mode */
  pageId: string | null;
  onOpenDrawer: (drawer: AdminDrawer) => void;
  onClose: () => void;
}

export function PageEditorDrawer({ pageId, onOpenDrawer, onClose }: PageEditorDrawerProps) {
  const utils = trpc.useUtils();
  const isNew = !pageId;

  const pagesQuery = trpc.pages.list.useQuery();
  const page = pageId ? pagesQuery.data?.find((p) => p.id === pageId) : null;

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setContent(page.content);
      setIsPublished(page.isPublished);
    }
  }, [page]);

  const createMutation = trpc.pages.create.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate();
      toast.success("Page created");
      onOpenDrawer("pages");
    },
    onError: (err) => toast.error(err.message || "Failed to create page"),
  });

  const updateMutation = trpc.pages.update.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate();
      toast.success("Page updated");
      onOpenDrawer("pages");
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  const deleteMutation = trpc.pages.delete.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate();
      toast.success("Page deleted");
      onOpenDrawer("pages");
    },
    onError: () => toast.error("Failed to delete"),
  });

  function generateSlug(text: string) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim();
  }

  function handleTitleChange(value: string) {
    setTitle(value);
    if (isNew && (!slug || slug === generateSlug(title))) {
      setSlug(generateSlug(value));
    }
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required";
    if (!slug.trim()) newErrors.slug = "Slug is required";
    if (!/^[a-z0-9-]+$/.test(slug)) {
      newErrors.slug = "Slug must contain only lowercase letters, numbers, and hyphens";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    if (isNew) {
      createMutation.mutate({
        title: title.trim(),
        slug: slug.trim(),
        content,
        isPublished,
      });
    } else {
      updateMutation.mutate({
        id: pageId!,
        title: title.trim(),
        slug: slug.trim(),
        content,
        isPublished,
      });
    }
  }

  function handleDelete() {
    if (!pageId) return;
    if (confirmDelete) {
      deleteMutation.mutate({ id: pageId });
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && pagesQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded bg-[var(--admin-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!isNew && !page) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2 text-[var(--admin-text)]">Page not found</h2>
        <button
          type="button"
          onClick={() => onOpenDrawer("pages")}
          className="text-sm text-[var(--admin-accent)] hover:underline"
        >
          Back to Pages
        </button>
      </div>
    );
  }

  const inputCls =
    "w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-sm text-[var(--admin-text)] placeholder:text-[var(--admin-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--admin-accent)]/50";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {!isNew && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDelete}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              confirmDelete
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "text-[var(--admin-text-secondary)] hover:text-red-400 border border-[var(--admin-border)]"
            }`}
          >
            <Trash2 className="w-4 h-4" />
            {confirmDelete ? "Confirm" : "Delete"}
          </button>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Privacy Policy"
          className={inputCls}
        />
        {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Slug</label>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[var(--admin-text-secondary)]">/</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase())}
            placeholder="privacy-policy"
            className={inputCls}
          />
        </div>
        {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--admin-text-secondary)] mb-1.5">Content (Markdown)</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={"## Page Title\n\nYour content...\n\n- List item\n- Another item"}
          rows={12}
          className={`${inputCls} resize-y font-mono`}
        />
        <p className="text-xs text-[var(--admin-text-secondary)] mt-1">
          Supports Markdown formatting: headings, bold, links, lists, and more.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsPublished(!isPublished)}
          className={`relative w-10 h-5 rounded-full transition-colors ${
            isPublished ? "bg-[var(--admin-accent)]" : "bg-[var(--admin-border)]"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              isPublished ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm text-[var(--admin-text)]">{isPublished ? "Published" : "Draft"}</span>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isPending ? "Saving..." : isNew ? "Create Page" : "Save Page"}
        </button>
        <button
          type="button"
          onClick={() => (isNew ? onOpenDrawer("pages") : onClose())}
          className="px-6 py-2.5 rounded-lg border border-[var(--admin-border)] text-sm text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
