"use client";

import { LinkEditor, type LinkFormData } from "@/components/admin/link-editor";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function EditLinkPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const utils = trpc.useUtils();

  const linksQuery = trpc.links.listAll.useQuery();
  const link = linksQuery.data?.find((l) => l.id === id);

  const updateMutation = trpc.links.update.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      toast.success("Block updated");
      router.push("/admin/links");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update block");
    },
  });

  if (linksQuery.isLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
        <div className="glass-card">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!link) {
    return (
      <div className="glass-card text-center py-12 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">Block not found</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          The block you are looking for does not exist.
        </p>
        <a href="/admin/links" className="glass-button">
          Back to Links
        </a>
      </div>
    );
  }

  function handleSubmit(data: LinkFormData) {
    updateMutation.mutate({
      id,
      ...data,
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
          <h1 className="text-2xl font-bold">Edit Block</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Update your {link.type} block
          </p>
        </div>
      </div>

      <div className="glass-card">
        <LinkEditor
          initialData={{
            type: link.type as LinkFormData["type"],
            title: link.title,
            url: link.url,
            icon: link.icon,
            iconType: link.iconType as LinkFormData["iconType"],
            isActive: link.isActive,
          }}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/admin/links")}
          isSubmitting={updateMutation.isPending}
        />
      </div>
    </div>
  );
}
