"use client";

import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { DragDropContext, Draggable, type DropResult, Droppable } from "@hello-pangea/dnd";
import {
  AlignLeft,
  Contact,
  Eye,
  EyeOff,
  FileText,
  Globe,
  GripVertical,
  Heading,
  LayoutGrid,
  Link2,
  Mail,
  Minus,
  Phone,
  Plus,
  Settings,
  Share2,
  Trash2,
  Type,
  Wallet,
} from "lucide-react";
import { useState } from "react";

type LeftSection = "blocks" | "add" | "social" | "pages" | "settings";

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

type LinkType = "link" | "heading" | "spacer" | "text" | "email" | "phone" | "vcard" | "wallet";

const BLOCK_TYPES: { type: LinkType; label: string; icon: React.ReactNode }[] = [
  { type: "link", label: "Link", icon: <Link2 className="w-5 h-5" /> },
  { type: "heading", label: "Heading", icon: <Heading className="w-5 h-5" /> },
  { type: "text", label: "Text", icon: <Type className="w-5 h-5" /> },
  { type: "email", label: "Email", icon: <Mail className="w-5 h-5" /> },
  { type: "phone", label: "Phone", icon: <Phone className="w-5 h-5" /> },
  { type: "vcard", label: "Contact", icon: <Contact className="w-5 h-5" /> },
  { type: "spacer", label: "Spacer", icon: <Minus className="w-5 h-5" /> },
  { type: "wallet", label: "Wallet", icon: <Wallet className="w-5 h-5" /> },
];

interface LeftPanelProps {
  onNavigate?: (path: string) => void;
}

export function LeftPanel({ onNavigate }: LeftPanelProps) {
  const [activeSection, setActiveSection] = useState<LeftSection>("blocks");

  const navItems = [
    { id: "add" as const, icon: <Plus className="w-5 h-5" />, label: "Add" },
    { id: "blocks" as const, icon: <LayoutGrid className="w-5 h-5" />, label: "Blocks" },
    { id: "social" as const, icon: <Share2 className="w-5 h-5" />, label: "Social" },
    { id: "pages" as const, icon: <FileText className="w-5 h-5" />, label: "Pages" },
  ];

  return (
    <div className="flex h-full">
      {/* Icon Rail */}
      <div className="w-14 bg-gray-50 border-r border-gray-200 flex flex-col items-center py-3 gap-1 shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeSection === item.id
                ? "bg-indigo-100 text-indigo-600"
                : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => {
            if (onNavigate) onNavigate("/admin/settings");
          }}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto bg-white">
        {activeSection === "add" && <AddBlocksSection />}
        {activeSection === "blocks" && <BlockListSection />}
        {activeSection === "social" && <SocialSection />}
        {activeSection === "pages" && <PagesSection onNavigate={onNavigate} />}
      </div>
    </div>
  );
}

function AddBlocksSection() {
  const utils = trpc.useUtils();
  const createMutation = trpc.links.create.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      toast.success("Block added");
    },
    onError: () => toast.error("Failed to add block"),
  });

  function handleAddBlock(type: LinkType) {
    const defaults: Record<string, { title: string; url?: string }> = {
      link: { title: "New Link", url: "https://example.com" },
      heading: { title: "Section Title" },
      text: { title: "Text Block", url: "Your text content here..." },
      email: { title: "Email Me", url: "hello@example.com" },
      phone: { title: "Call Me", url: "+1234567890" },
      vcard: { title: "Save Contact" },
      spacer: { title: "---" },
      image: { title: "Image", url: "https://example.com/image.jpg" },
      map: { title: "Find Us", url: "https://maps.google.com" },
    };
    const d = defaults[type] || { title: "New Block" };
    createMutation.mutate({
      type,
      title: d.title,
      url: d.url,
      isActive: true,
    });
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Blocks</h3>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_TYPES.map((block) => (
          <button
            key={block.type}
            type="button"
            onClick={() => handleAddBlock(block.type)}
            disabled={createMutation.isPending}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-gray-600 hover:text-indigo-600"
          >
            {block.icon}
            <span className="text-xs font-medium">{block.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function BlockListSection() {
  const utils = trpc.useUtils();
  const linksQuery = trpc.links.listAll.useQuery();

  const reorderMutation = trpc.links.reorder.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
    },
    onError: () => toast.error("Failed to reorder"),
  });

  const toggleMutation = trpc.links.toggleActive.useMutation({
    onSuccess: () => utils.links.listAll.invalidate(),
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = trpc.links.delete.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      toast.success("Block deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);

  function handleDragEnd(result: DropResult) {
    if (!result.destination || !linksQuery.data) return;
    const items = Array.from(linksQuery.data);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const reordered = items.map((item, idx) => ({ id: item.id, sortOrder: idx }));
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
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  const links = linksQuery.data ?? [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Blocks ({links.length})</h3>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No blocks yet. Click the + tab to add one.
        </p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="left-panel-blocks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                {links.map((link, index) => (
                  <Draggable key={link.id} draggableId={link.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                          snapshot.isDragging
                            ? "border-indigo-300 bg-indigo-50 shadow-lg"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        } ${!link.isActive ? "opacity-50" : ""}`}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center shrink-0 text-gray-500">
                          {TYPE_ICONS[link.type] || <Globe className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{link.title}</p>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate({ id: link.id })}
                            className="p-1 rounded hover:bg-gray-100 text-gray-400"
                            title={link.isActive ? "Hide" : "Show"}
                          >
                            {link.isActive ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(link.id)}
                            className={`p-1 rounded transition-colors ${
                              deletingId === link.id
                                ? "bg-red-100 text-red-500"
                                : "hover:bg-gray-100 text-gray-400"
                            }`}
                            title={deletingId === link.id ? "Confirm" : "Delete"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

function SocialSection() {
  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">Social Links</h3>
      <p className="text-xs text-gray-500 mb-4">
        Add your social media profiles. These appear as icons on your page.
      </p>
      <div className="space-y-2">
        {["Facebook", "Instagram", "LinkedIn", "YouTube", "Twitter / X", "GitHub"].map(
          (platform) => (
            <div key={platform} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`${platform} URL`}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-gray-200 focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 outline-none transition-all"
              />
            </div>
          ),
        )}
      </div>
      <p className="text-[10px] text-gray-400 mt-3">
        Social links are stored in settings and will be saved when you publish.
      </p>
    </div>
  );
}

function PagesSection({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const pagesQuery = trpc.pages.list.useQuery();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">Custom Pages</h3>
        <button
          type="button"
          onClick={() => onNavigate?.("/admin/pages/new")}
          className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          + New
        </button>
      </div>

      {pagesQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      ) : pagesQuery.data && pagesQuery.data.length > 0 ? (
        <div className="space-y-1.5">
          {pagesQuery.data.map((page) => (
            <a
              key={page.id}
              href={`/admin/pages/${page.id}`}
              className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-all"
            >
              <FileText className="w-4 h-4 text-gray-400" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{page.title}</p>
                <p className="text-[10px] text-gray-500">/{page.slug}</p>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  page.isPublished ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                }`}
              >
                {page.isPublished ? "Live" : "Draft"}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-6">No custom pages yet.</p>
      )}

      <div className="mt-4 pt-3 border-t border-gray-200 space-y-1.5">
        <a
          href="/admin/contacts"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
        >
          <Mail className="w-4 h-4" />
          Contacts
        </a>
        <a
          href="/admin/vcard"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
        >
          <Contact className="w-4 h-4" />
          vCard Editor
        </a>
        <a
          href="/admin/wallet"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
        >
          <Wallet className="w-4 h-4" />
          Wallet Pass
        </a>
        <a
          href="/admin/analytics"
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 text-sm text-gray-600"
        >
          <Globe className="w-4 h-4" />
          Full Analytics
        </a>
      </div>
    </div>
  );
}
