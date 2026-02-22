"use client";

import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Calendar, ExternalLink, Mail, Trash2, User } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useState } from "react";

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
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
      router.push("/admin/contacts");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const [confirmDelete, setConfirmDelete] = useState(false);

  // Auto-mark as read
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
      <div className="space-y-6 max-w-2xl">
        <div className="h-8 w-48 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
        <div className="glass-card space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 rounded bg-[rgba(255,255,255,0.04)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (contactQuery.error || !contactQuery.data) {
    return (
      <div className="glass-card text-center py-12 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-2">Message not found</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          This contact submission may have been deleted.
        </p>
        <a href="/admin/contacts" className="glass-button">
          Back to Contacts
        </a>
      </div>
    );
  }

  const sub = contactQuery.data;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin/contacts"
            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </a>
          <h1 className="text-2xl font-bold">Message Detail</h1>
        </div>
        <button
          onClick={handleDelete}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
            confirmDelete
              ? "bg-red-500/20 text-red-400 border border-red-500/30"
              : "glass-button text-[var(--text-secondary)]"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          {confirmDelete ? "Confirm Delete" : "Delete"}
        </button>
      </div>

      <div className="glass-card space-y-6">
        {/* Header info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <User className="w-4 h-4 text-brand-cyan" />
            <span className="font-medium">{sub.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Mail className="w-4 h-4 text-brand-cyan" />
            <a
              href={`mailto:${sub.email}`}
              className="text-brand-cyan hover:underline flex items-center gap-1"
            >
              {sub.email}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
            <Calendar className="w-4 h-4" />
            <span>{new Date(sub.createdAt).toLocaleString()}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--surface-border)]" />

        {/* Message body */}
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-2">Message</h3>
          <div className="p-4 rounded-lg bg-[rgba(255,255,255,0.03)] text-sm leading-relaxed whitespace-pre-wrap">
            {sub.message}
          </div>
        </div>

        {/* Reply CTA */}
        <a
          href={`mailto:${sub.email}?subject=Re: Your message`}
          className="glass-button-primary inline-flex items-center gap-2 px-6 py-2.5"
        >
          <Mail className="w-4 h-4" />
          Reply via Email
        </a>
      </div>
    </div>
  );
}
