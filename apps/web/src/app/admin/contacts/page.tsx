"use client";

import { useState } from "react";
import {
  Mail,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";

export default function ContactsPage() {
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
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Contact Submissions</h1>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const data = contactsQuery.data;
  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;
  const unreadCount = data?.unreadCount ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Contact Submissions</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {data?.total ?? 0} total &middot; {unreadCount} unread
        </p>
      </div>

      {items.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Mail className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">No messages yet</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Contact form submissions will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {items.map((sub) => (
              <div
                key={sub.id}
                className={`glass-panel flex items-start gap-3 p-4 transition-all ${
                  !sub.isRead ? "border-brand-cyan/20" : ""
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
                    <CheckCircle2 className="w-4 h-4 text-[var(--text-secondary)]" />
                  ) : (
                    <Circle className="w-4 h-4 text-brand-cyan fill-brand-cyan" />
                  )}
                </button>

                <a
                  href={`/admin/contacts/${sub.id}`}
                  className="flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${!sub.isRead ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                      {sub.name}
                    </span>
                    <span className="text-xs text-[var(--text-secondary)]">
                      &lt;{sub.email}&gt;
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                    {sub.message}
                  </p>
                  <span className="text-xs text-[var(--text-secondary)] mt-1 block">
                    {new Date(sub.createdAt).toLocaleString()}
                  </span>
                </a>

                <button
                  onClick={() => handleDelete(sub.id)}
                  className={`p-2 rounded-lg transition-colors shrink-0 ${
                    deletingId === sub.id
                      ? "bg-red-500/20 text-red-400"
                      : "text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.08)] hover:text-red-400"
                  }`}
                  title={deletingId === sub.id ? "Click again to confirm" : "Delete"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="glass-button p-2 disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-[var(--text-secondary)] px-3">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="glass-button p-2 disabled:opacity-30"
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
