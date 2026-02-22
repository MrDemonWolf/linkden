"use client";

import { useState } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Type,
  Minus,
  AlignLeft,
  Mail,
  Phone,
  Contact,
  Wallet,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "@/lib/toast";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  link: <Link2 className="w-4 h-4" />,
  heading: <Type className="w-4 h-4" />,
  spacer: <Minus className="w-4 h-4" />,
  text: <AlignLeft className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  vcard: <Contact className="w-4 h-4" />,
  wallet: <Wallet className="w-4 h-4" />,
};

export default function LinksPage() {
  const utils = trpc.useUtils();
  const linksQuery = trpc.links.listAll.useQuery();

  const reorderMutation = trpc.links.reorder.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      toast.success("Order saved");
    },
    onError: () => toast.error("Failed to reorder"),
  });

  const toggleMutation = trpc.links.toggleActive.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      toast.success("Link updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = trpc.links.delete.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      toast.success("Link deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDragEnd(result: DropResult) {
    if (!result.destination || !linksQuery.data) return;

    const items = Array.from(linksQuery.data);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    const reordered = items.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    reorderMutation.mutate({ items: reordered });
  }

  function handleDelete(id: string) {
    if (deletingId === id) {
      deleteMutation.mutate({ id });
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  }

  if (linksQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Links</h1>
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-16 rounded-xl bg-[rgba(255,255,255,0.04)] animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  const links = linksQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Links</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {links.length} block{links.length !== 1 ? "s" : ""} &middot; Drag to
            reorder
          </p>
        </div>
        <a href="/admin/links/new" className="glass-button-primary flex items-center gap-2 px-4 py-2.5">
          <Plus className="w-4 h-4" />
          Add Block
        </a>
      </div>

      {links.length === 0 ? (
        <div className="glass-card text-center py-12">
          <Link2 className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-3" />
          <h2 className="text-lg font-semibold mb-1">No blocks yet</h2>
          <p className="text-sm text-[var(--text-secondary)] mb-4">
            Add your first link, heading, or content block.
          </p>
          <a href="/admin/links/new" className="glass-button-primary inline-flex items-center gap-2 px-4 py-2.5">
            <Plus className="w-4 h-4" />
            Add Block
          </a>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="links-list">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="space-y-2"
              >
                {links.map((link, index) => (
                  <Draggable key={link.id} draggableId={link.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`glass-panel flex items-center gap-3 p-3 ${
                          snapshot.isDragging
                            ? "shadow-lg border-brand-cyan/30"
                            : ""
                        } ${!link.isActive ? "opacity-50" : ""}`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <div className="w-8 h-8 rounded-lg bg-[var(--button-bg)] flex items-center justify-center shrink-0">
                          {TYPE_ICONS[link.type] || (
                            <Link2 className="w-4 h-4 text-brand-cyan" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {link.title}
                          </p>
                          <p className="text-xs text-[var(--text-secondary)] truncate">
                            {link.type}
                            {link.url && ` \u00B7 ${link.url}`}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleMutation.mutate({ id: link.id })}
                            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
                            title={link.isActive ? "Deactivate" : "Activate"}
                          >
                            {link.isActive ? (
                              <Eye className="w-4 h-4" />
                            ) : (
                              <EyeOff className="w-4 h-4" />
                            )}
                          </button>
                          <a
                            href={`/admin/links/${link.id}`}
                            className="p-2 rounded-lg hover:bg-[rgba(255,255,255,0.08)] transition-colors text-[var(--text-secondary)]"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </a>
                          <button
                            onClick={() => handleDelete(link.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              deletingId === link.id
                                ? "bg-red-500/20 text-red-400"
                                : "hover:bg-[rgba(255,255,255,0.08)] text-[var(--text-secondary)]"
                            }`}
                            title={
                              deletingId === link.id
                                ? "Click again to confirm"
                                : "Delete"
                            }
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
}
