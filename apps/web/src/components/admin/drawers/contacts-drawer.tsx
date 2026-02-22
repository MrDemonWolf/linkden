"use client";

import type { AdminDrawer } from "@/app/admin/page";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, ChevronLeft, ChevronRight, Circle, Mail, Trash2 } from "lucide-react";
import { useState } from "react";

interface ContactsDrawerProps {
  onOpenDrawer: (drawer: AdminDrawer) => void;
}

export function ContactsDrawer({ onOpenDrawer }: ContactsDrawerProps) {
  const [page, setPage] = useState(1);
  const limit = 20;
  const utils = trpc.useUtils();

  const contactsQuery = trpc.contact.list.useQuery({ page, limit });

  const markReadMutation = trpc.contact.markRead.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      toast.success("Marked as read");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = trpc.contact.delete.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      toast.success("Message deleted");
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

  if (contactsQuery.isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--admin-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  const data = contactsQuery.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--admin-text-secondary)]">
        {data?.total ?? 0} total &middot; {unreadCount} unread
      </p>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Mail className="w-12 h-12 text-[var(--admin-text-secondary)] mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1 text-[var(--admin-text)]">No messages yet</h2>
          <p className="text-sm text-[var(--admin-text-secondary)]">
            Contact form submissions will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((sub) => (
              <div
                key={sub.id}
                className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                  !sub.isRead
                    ? "border-[var(--admin-accent)]/20 bg-[var(--admin-accent)]/5"
                    : "border-[var(--admin-border)] bg-[var(--admin-bg)]"
                }`}
              >
                <button
                  onClick={() => {
                    if (!sub.isRead) markReadMutation.mutate({ id: sub.id });
                  }}
                  className="mt-0.5 shrink-0"
                  title={sub.isRead ? "Read" : "Mark as read"}
                >
                  {sub.isRead ? (
                    <CheckCircle2 className="w-4 h-4 text-[var(--admin-text-secondary)]" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--admin-accent)] fill-[var(--admin-accent)]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onOpenDrawer({ type: "contact-detail", id: sub.id })}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-sm font-medium ${!sub.isRead ? "text-[var(--admin-text)]" : "text-[var(--admin-text-secondary)]"}`}
                    >
                      {sub.name}
                    </span>
                    <span className="text-xs text-[var(--admin-text-secondary)]">
                      &lt;{sub.email}&gt;
                    </span>
                  </div>
                  <p className="text-sm text-[var(--admin-text-secondary)] line-clamp-2">
                    {sub.message}
                  </p>
                  <span className="text-xs text-[var(--admin-text-secondary)] mt-1 block">
                    {new Date(sub.createdAt).toLocaleString()}
                  </span>
                </button>

                <button
                  onClick={() => handleDelete(sub.id)}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    deletingId === sub.id
                      ? "bg-red-500/20 text-red-400"
                      : "text-[var(--admin-text-secondary)] hover:text-red-400"
                  }`}
                  title={deletingId === sub.id ? "Click again to confirm" : "Delete"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-[var(--admin-border)] disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--admin-text-secondary)] px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-[var(--admin-border)] disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
