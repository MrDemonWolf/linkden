"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";

export default function NewPagePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = trpc.pages.create.useMutation({
    onSuccess: () => {
      utils.pages.list.invalidate();
      toast.success("Page created");
      router.push("/admin/pages");
    },
    onError: (err) => toast.error(err.message || "Failed to create page"),
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
    if (!slug || slug === generateSlug(title)) {
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

    createMutation.mutate({
      title: title.trim(),
      slug: slug.trim(),
      content,
      isPublished,
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a
          href="/admin/pages"
          className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold">Create Page</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Add a new custom page
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="glass-card space-y-5">
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Privacy Policy"
            className="glass-input"
          />
          {errors.title && (
            <p className="text-red-400 text-xs mt-1">{errors.title}</p>
          )}
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
              placeholder="privacy-policy"
              className="glass-input"
            />
          </div>
          {errors.slug && (
            <p className="text-red-400 text-xs mt-1">{errors.slug}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Content (HTML)
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="<h2>Privacy Policy</h2><p>Your content here...</p>"
            rows={12}
            className="glass-input resize-y font-mono text-sm"
          />
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
          <span className="text-sm">
            {isPublished ? "Published" : "Draft"}
          </span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="glass-button-primary flex items-center gap-2 px-6 py-2.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {createMutation.isPending ? "Creating..." : "Create Page"}
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
