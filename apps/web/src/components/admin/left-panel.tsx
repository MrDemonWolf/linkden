"use client";

import type { AdminDrawer } from "@/app/admin/page";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { DragDropContext, Draggable, type DropResult, Droppable } from "@hello-pangea/dnd";
import {
  AlignLeft,
  BarChart3,
  BookOpen,
  Code,
  Contact,
  Eye,
  EyeOff,
  FileText,
  Globe,
  GripVertical,
  Heading,
  Image,
  LayoutGrid,
  Link2,
  Mail,
  MessageSquare,
  Minus,
  Phone,
  Plus,
  Settings,
  Share2,
  SplitSquareHorizontal,
  Trash2,
  Type,
  Video,
  Wallet,
} from "lucide-react";
import { useState } from "react";

type LeftSection = "blocks" | "add" | "social" | "pages";

type LinkType =
  | "link"
  | "heading"
  | "spacer"
  | "text"
  | "email"
  | "phone"
  | "vcard"
  | "wallet"
  | "divider"
  | "image"
  | "video"
  | "html"
  | "contact_form"
  | "social_button";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  link: <Link2 className="w-4 h-4" />,
  heading: <Type className="w-4 h-4" />,
  spacer: <Minus className="w-4 h-4" />,
  text: <AlignLeft className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  phone: <Phone className="w-4 h-4" />,
  vcard: <Contact className="w-4 h-4" />,
  wallet: <Wallet className="w-4 h-4" />,
  divider: <SplitSquareHorizontal className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
  video: <Video className="w-4 h-4" />,
  html: <Code className="w-4 h-4" />,
  contact_form: <MessageSquare className="w-4 h-4" />,
  social_button: <Share2 className="w-4 h-4" />,
};

interface BlockCategory {
  label: string;
  blocks: { type: LinkType; label: string; icon: React.ReactNode }[];
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    label: "Content",
    blocks: [
      { type: "link", label: "Link", icon: <Link2 className="w-5 h-5" /> },
      { type: "heading", label: "Heading", icon: <Heading className="w-5 h-5" /> },
      { type: "text", label: "Text", icon: <Type className="w-5 h-5" /> },
      { type: "spacer", label: "Spacer", icon: <Minus className="w-5 h-5" /> },
      { type: "divider", label: "Divider", icon: <SplitSquareHorizontal className="w-5 h-5" /> },
      { type: "html", label: "HTML", icon: <Code className="w-5 h-5" /> },
    ],
  },
  {
    label: "Social",
    blocks: [
      { type: "social_button", label: "Social Button", icon: <Share2 className="w-5 h-5" /> },
    ],
  },
  {
    label: "Media",
    blocks: [
      { type: "image", label: "Image", icon: <Image className="w-5 h-5" /> },
      { type: "video", label: "Video", icon: <Video className="w-5 h-5" /> },
    ],
  },
  {
    label: "Contact",
    blocks: [
      { type: "email", label: "Email", icon: <Mail className="w-5 h-5" /> },
      { type: "phone", label: "Phone", icon: <Phone className="w-5 h-5" /> },
      { type: "contact_form", label: "Contact Form", icon: <MessageSquare className="w-5 h-5" /> },
      { type: "vcard", label: "vCard", icon: <Contact className="w-5 h-5" /> },
      { type: "wallet", label: "Wallet Pass", icon: <Wallet className="w-5 h-5" /> },
    ],
  },
];

interface LeftPanelProps {
  onOpenDrawer?: (drawer: AdminDrawer) => void;
}

export function LeftPanel({ onOpenDrawer }: LeftPanelProps) {
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
      <div className="w-14 bg-[var(--admin-bg)] border-r border-[var(--admin-border)] flex flex-col items-center py-3 gap-1 shrink-0">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              activeSection === item.id
                ? "bg-[var(--admin-accent)]/10 text-[var(--admin-accent)]"
                : "text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg)]"
            }`}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}

        <div className="flex-1" />

        <a
          href="https://linkden-docs.pages.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg)] transition-all"
          title="Documentation"
        >
          <BookOpen className="w-5 h-5" />
        </a>

        <button
          type="button"
          onClick={() => onOpenDrawer?.("wallet")}
          className="w-10 h-10 rounded-xl flex items-center justify-center text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] hover:bg-[var(--admin-bg)] transition-all"
          title="Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto bg-[var(--admin-surface)]">
        {activeSection === "add" && <AddBlocksSection />}
        {activeSection === "blocks" && <BlockListSection onOpenDrawer={onOpenDrawer} />}
        {activeSection === "social" && <SocialSection />}
        {activeSection === "pages" && <PagesSection onOpenDrawer={onOpenDrawer} />}
      </div>
    </div>
  );
}

function AddBlocksSection() {
  const utils = trpc.useUtils();
  const createMutation = trpc.links.create.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      utils.links.draftCount.invalidate();
      toast.success("Block added");
    },
    onError: () => toast.error("Failed to add block"),
  });

  function handleAddBlock(type: LinkType) {
    const defaults: Record<string, { title: string; url?: string; metadata?: Record<string, unknown> }> = {
      link: { title: "New Link", url: "https://example.com" },
      heading: { title: "Section Title" },
      text: { title: "Text Block", url: "Your text content here..." },
      email: { title: "Email Me", url: "hello@example.com" },
      phone: { title: "Call Me", url: "+1234567890" },
      vcard: { title: "Save Contact" },
      spacer: { title: "---" },
      wallet: { title: "Add to Wallet" },
      divider: { title: "---", metadata: { style: "solid" } },
      image: { title: "Image", url: "https://example.com/image.jpg", metadata: { alt: "", caption: "" } },
      video: { title: "Video", url: "https://youtube.com/watch?v=dQw4w9WgXcQ", metadata: { provider: "youtube" } },
      html: { title: "HTML Block", metadata: { html: "<p>Custom HTML</p>" } },
      contact_form: { title: "Get in Touch", metadata: { buttonText: "Send Message" } },
      social_button: { title: "Follow me", metadata: { platform: "twitter" } },
    };
    const d = defaults[type] || { title: "New Block" };
    createMutation.mutate({
      type,
      title: d.title,
      url: d.url,
      isActive: true,
      metadata: d.metadata,
    });
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-3">Add Blocks</h3>
      {BLOCK_CATEGORIES.map((category) => (
        <div key={category.label} className="mb-4">
          <p className="text-[10px] font-medium text-[var(--admin-text-secondary)] uppercase tracking-wider mb-2">
            {category.label}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {category.blocks.map((block) => (
              <button
                key={block.type}
                type="button"
                onClick={() => handleAddBlock(block.type)}
                disabled={createMutation.isPending}
                className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[var(--admin-border)] hover:border-[var(--admin-accent)]/30 hover:bg-[var(--admin-accent)]/5 transition-all text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent)]"
              >
                {block.icon}
                <span className="text-xs font-medium">{block.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockListSection({ onOpenDrawer }: { onOpenDrawer?: (drawer: AdminDrawer) => void }) {
  const utils = trpc.useUtils();
  const linksQuery = trpc.links.listAll.useQuery();

  const reorderMutation = trpc.links.reorder.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
    },
    onError: () => toast.error("Failed to reorder"),
  });

  const toggleMutation = trpc.links.toggleActive.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      utils.links.draftCount.invalidate();
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteMutation = trpc.links.delete.useMutation({
    onSuccess: () => {
      utils.links.listAll.invalidate();
      utils.links.draftCount.invalidate();
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
          <div key={i} className="h-12 rounded-lg bg-[var(--admin-bg)] animate-pulse" />
        ))}
      </div>
    );
  }

  const links = linksQuery.data ?? [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--admin-text)]">Blocks ({links.length})</h3>
      </div>

      {links.length === 0 ? (
        <p className="text-sm text-[var(--admin-text-secondary)] text-center py-8">
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
                        className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                          snapshot.isDragging
                            ? "border-[var(--admin-accent)]/30 bg-[var(--admin-accent)]/5 shadow-lg"
                            : "border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-border)]"
                        } ${!link.isActive ? "opacity-50" : ""}`}
                        onClick={() => {
                          if (!snapshot.isDragging) {
                            onOpenDrawer?.({ type: "link-edit", id: link.id });
                          }
                        }}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        <div className="w-6 h-6 rounded-md bg-[var(--admin-bg)] flex items-center justify-center shrink-0 text-[var(--admin-text-secondary)]">
                          {TYPE_ICONS[link.type] || <Globe className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--admin-text)] truncate">{link.title}</p>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMutation.mutate({ id: link.id });
                            }}
                            className="p-1 rounded hover:bg-[var(--admin-bg)] text-[var(--admin-text-secondary)]"
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(link.id);
                            }}
                            className={`p-1 rounded transition-colors ${
                              deletingId === link.id
                                ? "bg-red-100 text-red-500"
                                : "hover:bg-[var(--admin-bg)] text-[var(--admin-text-secondary)]"
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
      <h3 className="text-sm font-semibold text-[var(--admin-text)] mb-3">Social Links</h3>
      <p className="text-xs text-[var(--admin-text-secondary)] mb-4">
        Add your social media profiles. These appear as icons on your page.
      </p>
      <div className="space-y-2">
        {["Facebook", "Instagram", "LinkedIn", "YouTube", "Twitter / X", "GitHub"].map(
          (platform) => (
            <div key={platform} className="flex items-center gap-2">
              <input
                type="text"
                placeholder={`${platform} URL`}
                className="flex-1 text-xs px-3 py-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)] focus:border-[var(--admin-accent)]/30 focus:ring-1 focus:ring-[var(--admin-accent)]/20 outline-none transition-all"
              />
            </div>
          ),
        )}
      </div>
      <p className="text-[10px] text-[var(--admin-text-secondary)] mt-3">
        Social links are stored in settings and will be saved when you publish.
      </p>
    </div>
  );
}

function PagesSection({ onOpenDrawer }: { onOpenDrawer?: (drawer: AdminDrawer) => void }) {
  const pagesQuery = trpc.pages.list.useQuery();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[var(--admin-text)]">Custom Pages</h3>
        <button
          type="button"
          onClick={() => onOpenDrawer?.("pages-new")}
          className="text-xs text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] font-medium"
        >
          + New
        </button>
      </div>

      {pagesQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-[var(--admin-bg)] animate-pulse" />
          ))}
        </div>
      ) : pagesQuery.data && pagesQuery.data.length > 0 ? (
        <div className="space-y-1.5">
          {pagesQuery.data.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onOpenDrawer?.({ type: "page-edit", id: page.id })}
              className="flex items-center gap-2 p-2 rounded-lg border border-[var(--admin-border)] hover:border-[var(--admin-border)] transition-all w-full text-left"
            >
              <FileText className="w-4 h-4 text-[var(--admin-text-secondary)]" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-[var(--admin-text)] truncate">{page.title}</p>
                <p className="text-[10px] text-[var(--admin-text-secondary)]">/{page.slug}</p>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  page.isPublished
                    ? "bg-green-100 text-green-700"
                    : "bg-[var(--admin-bg)] text-[var(--admin-text-secondary)]"
                }`}
              >
                {page.isPublished ? "Live" : "Draft"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--admin-text-secondary)] text-center py-6">No custom pages yet.</p>
      )}

      <div className="mt-4 pt-3 border-t border-[var(--admin-border)] space-y-1.5">
        <button
          type="button"
          onClick={() => onOpenDrawer?.("contacts")}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--admin-bg)] text-sm text-[var(--admin-text-secondary)] w-full text-left transition-colors"
        >
          <Mail className="w-4 h-4" />
          Contacts
        </button>
        <button
          type="button"
          onClick={() => onOpenDrawer?.("vcard")}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--admin-bg)] text-sm text-[var(--admin-text-secondary)] w-full text-left transition-colors"
        >
          <Contact className="w-4 h-4" />
          vCard Editor
        </button>
        <button
          type="button"
          onClick={() => onOpenDrawer?.("wallet")}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--admin-bg)] text-sm text-[var(--admin-text-secondary)] w-full text-left transition-colors"
        >
          <Wallet className="w-4 h-4" />
          Wallet Pass
        </button>
        <button
          type="button"
          onClick={() => onOpenDrawer?.("analytics")}
          className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--admin-bg)] text-sm text-[var(--admin-text-secondary)] w-full text-left transition-colors"
        >
          <BarChart3 className="w-4 h-4" />
          Full Analytics
        </button>
      </div>
    </div>
  );
}
