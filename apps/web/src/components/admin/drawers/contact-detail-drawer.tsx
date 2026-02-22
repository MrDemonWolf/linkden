"use client";

import type { AdminDrawer } from "@/app/admin/page";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { Calendar, ExternalLink, Mail, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";

interface ContactDetailDrawerProps {
  id: string;
  onClose: () => void;
  onOpenDrawer: (drawer: AdminDrawer) => void;
}

export function ContactDetailDrawer({ id, onClose, onOpenDrawer }: ContactDetailDrawerProps) {
  const utils = trpc.useUtils();

  const contactQuery = trpc.contact.getById.useQuery({ id }, { enabled: !!id });

  const markReadMutation = trpc.contact.markRead.useMutation({
    onSuccess: () => {
      utils.contact.getById.invalidate({ id });
      utils.contact.list.invalidate();
    },
  });

  const deleteMutation = trpc.contact.delete.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      toast.success("Message deleted");
      onOpenDrawer("contacts");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (contactQuery.data && !contactQuery.data.isRead) {
      markReadMutation.mutate({ id });
    }
  }, [contactQuery.data]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleDelete() {
    if (confirmDelete) {
      deleteMutation.mutate({ id });
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  if (contactQuery.isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-6 rounded bg-[var(--admin-border)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (contactQuery.error || !contactQuery.data) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2 text-[var(--admin-text)]">Message not found</h2>
        <p className="text-sm text-[var(--admin-text-secondary)] mb-4">
          This contact submission may have been deleted.
        </p>
        <button
          type="button"
          onClick={() => onOpenDrawer("contacts")}
          className="text-sm text-[var(--admin-accent)] hover:underline"
        >
          Back to Contacts
        </button>
      </div>
    );
  }

  const sub = contactQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <button
          onClick={handleDelete}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            confirmDelete
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "text-[var(--admin-text-secondary)] hover:text-red-400 border border-[var(--admin-border)]"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {confirmDelete ? "Confirm Delete" : "Delete"}
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-[var(--admin-text)]">
          <User className="w-4 h-4 text-[var(--admin-accent)]" />
          <span className="font-medium">{sub.name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Mail className="w-4 h-4 text-[var(--admin-accent)]" />
          <a
            href={`mailto:${sub.email}`}
            className="text-[var(--admin-accent)] hover:underline flex items-center gap-1"
          >
            {sub.email}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-2 text-sm text-[var(--admin-text-secondary)]">
          <Calendar className="w-4 h-4" />
          <span>{new Date(sub.createdAt).toLocaleString()}</span>
        </div>
      </div>

      <div className="border-t border-[var(--admin-border)]" />

      <div>
        <h3 className="text-sm font-semibold text-[var(--admin-text-secondary)] mb-2">Message</h3>
        <div className="p-4 rounded-lg bg-[var(--admin-bg)] text-sm leading-relaxed whitespace-pre-wrap text-[var(--admin-text)]">
          {sub.message}
        </div>
      </div>

      <a
        href={`mailto:${sub.email}?subject=Re: Your message`}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--admin-accent)] text-white text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Mail className="w-4 h-4" />
        Reply via Email
      </a>
    </div>
  );
}
