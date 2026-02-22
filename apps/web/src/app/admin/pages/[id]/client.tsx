"use client";

import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditPageClient() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const utils = trpc.useUtils();

  const pagesQuery = trpc.pages.list.useQuery();
  const page = pagesQuery.data?.find((p) => p.id === id);

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setSlug(page.slug);
      setContent(page.content);
      setIsPublished(page.isPublished);
    }
  }, [page]);

  const updateMutation = trpc.pages.update.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate();
      toast.success("Page updated");
      router.push("/admin/pages");
    },
    onError: (err) => toast.error(err.message || "Failed to update"),
  });

  const deleteMutation = trpc.pages.delete.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate();
      toast.success("Page deleted");
      router.push("/admin/pages");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

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

    updateMutation.mutate({
      id,
      title: title.trim(),
      slug: slug.trim(),
      content,
      isPublished,
    });
  }

  function handleDelete() {
    if (confirmDelete) {
      deleteMutation.mutate({ id });
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  if (pagesQuery.isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
        <div className="glass-card space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="glass-card text-center py-12 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">Page not found</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The page you are looking for does not exist.
        </p>
        <a href="/admin/pages" className="glass-button">
          Back to Pages
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin/pages"
            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <div>
            <h1 className="text-2xl font-bold">Edit Page</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">/{page.slug}</p>
          </div>
        </div>
        <button
          onClick={handleDelete}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            confirmDelete
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-[var(--text-secondary)] hover:text-red-400"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {confirmDelete ? "Confirm" : "Delete"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="glass-card space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Page Title"
            className="glass-input"
          />
          {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Slug
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)]">/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="page-slug"
              className="glass-input"
            />
          </div>
          {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Content (Markdown)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={"## Page Title\n\nYour content...\n\n- List item\n- Another item"}
            rows={12}
            className="glass-input resize-y font-mono text-sm"
          />
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            Supports Markdown formatting: headings, bold, links, lists, and more.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsPublished(!isPublished)}
            className={`relative w-10 h-5 rounded-full transition-colors ${
              isPublished ? "bg-brand-cyan" : "bg-[rgba(255,255,255,0.15)]"
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                isPublished ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm">{isPublished ? "Published" : "Draft"}</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="glass-button-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? "Saving..." : "Save Page"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/pages")}
            className="glass-button px-6 py-2.5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
