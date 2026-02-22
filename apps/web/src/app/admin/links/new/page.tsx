"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";
import { LinkEditor, type LinkFormData } from "@/components/admin/link-editor";

export default function NewLinkPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const linksQuery = trpc.links.listAll.useQuery();
  const createMutation = trpc.links.create.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      toast.success("Block created");
      router.push("/admin/links");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create block");
    },
  });

  function handleSubmit(data: LinkFormData) {
    const nextOrder = linksQuery.data
      ? Math.max(0, ...linksQuery.data.map((l) => l.sortOrder)) + 1
      : 0;

    createMutation.mutate({
      ...data,
      sortOrder: nextOrder,
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <a
          href="/admin/links"
          className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
        >
          <ArrowLeft className="w-5 h-5" />
        </a>
        <div>
          <h1 className="text-2xl font-bold">Add Block</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Choose a block type and configure it
          </p>
        </div>
      </div>

      <div className="glass-card">
        <LinkEditor
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/links")}
          isSubmitting={createMutation.isPending}
        />
      </div>
    </div>
  );
}
