"use client";

import { LinkEditor, type LinkFormData } from "@/components/admin/link-editor";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";

interface LinkEditDrawerProps {
  id: string;
  onClose: () => void;
}

export function LinkEditDrawer({ id, onClose }: LinkEditDrawerProps) {
  const utils = trpc.useUtils();

  const linksQuery = trpc.links.listAll.useQuery();
  const link = linksQuery.data?.find((l) => l.id === id);

  const updateMutation = trpc.links.update.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      utils.links.draftCount.invalidate();
      toast.success("Block updated");
      onClose();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update block");
    },
  });

  if (linksQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-10 rounded bg-[var(--admin-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (!link) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2 text-[var(--admin-text)]">Block not found</h2>
        <p className="text-sm text-[var(--admin-text-secondary)] mb-4">
          The block you are looking for does not exist.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-[var(--admin-accent)] hover:underline"
        >
          Close
        </button>
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
    <div>
      <p className="text-sm text-[var(--admin-text-secondary)] mb-4">
        Update your {link.type} block
      </p>
      <LinkEditor
        initialData={{
          type: link.type as LinkFormData["type"],
          title: link.title,
          url: link.url ?? undefined,
          icon: link.icon ?? undefined,
          iconType: (link.iconType ?? undefined) as LinkFormData["iconType"],
          isActive: link.isActive,
        }}
        onSubmit={handleSubmit}
        onCancel={onClose}
        isSubmitting={updateMutation.isPending}
      />
    </div>
  );
}
