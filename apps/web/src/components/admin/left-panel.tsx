"use client";

import type { AdminDrawer } from "@/app/admin/page";
import { toast } from "@/lib/toast";
import { trpc } from "@/lib/trpc";
import { DragDropContext, Draggable, type DropResult, Droppable } from "@hello-pangea/dnd";
import {
  AlignLeft,
  BarChart3,
  Check,
  ChevronLeft,
  ChevronRight,
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
  Search,
  Share2,
  SplitSquareHorizontal,
  Trash2,
  Type,
  Video,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

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

interface BlockDef {
  type: LinkType;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface BlockCategory {
  label: string;
  blocks: BlockDef[];
}

const BLOCK_CATEGORIES: BlockCategory[] = [
  {
    label: "Basic",
    blocks: [
      { type: "link", label: "Link", description: "Add an external URL", icon: <Link2 className="w-4.5 h-4.5" /> },
      { type: "heading", label: "Heading", description: "Section title text", icon: <Heading className="w-4.5 h-4.5" /> },
      { type: "text", label: "Text", description: "Rich text content block", icon: <Type className="w-4.5 h-4.5" /> },
      { type: "spacer", label: "Spacer", description: "Add vertical spacing", icon: <Minus className="w-4.5 h-4.5" /> },
      { type: "divider", label: "Divider", description: "Horizontal line separator", icon: <SplitSquareHorizontal className="w-4.5 h-4.5" /> },
    ],
  },
  {
    label: "Media",
    blocks: [
      { type: "image", label: "Image", description: "Display an image", icon: <Image className="w-4.5 h-4.5" /> },
      { type: "video", label: "Video", description: "Embed YouTube or Vimeo", icon: <Video className="w-4.5 h-4.5" /> },
      { type: "html", label: "HTML", description: "Custom HTML embed", icon: <Code className="w-4.5 h-4.5" /> },
    ],
  },
  {
    label: "Advanced",
    blocks: [
      { type: "email", label: "Email", description: "Mailto link button", icon: <Mail className="w-4.5 h-4.5" /> },
      { type: "phone", label: "Phone", description: "Click-to-call button", icon: <Phone className="w-4.5 h-4.5" /> },
      { type: "social_button", label: "Social Button", description: "Branded social link", icon: <Share2 className="w-4.5 h-4.5" /> },
      { type: "contact_form", label: "Contact Form", description: "Collect visitor messages", icon: <MessageSquare className="w-4.5 h-4.5" /> },
      { type: "vcard", label: "vCard", description: "Downloadable contact card", icon: <Contact className="w-4.5 h-4.5" /> },
      { type: "wallet", label: "Wallet Pass", description: "Apple Wallet pass", icon: <Wallet className="w-4.5 h-4.5" /> },
    ],
  },
];

const SIDEBAR_COLLAPSED_KEY = "linkden-sidebar-collapsed";

interface LeftPanelProps {
  onOpenDrawer?: (drawer: AdminDrawer) => void;
  settings?: Record<string, string>;
  onSettingsChange?: (key: string, value: string) => void;
  onSettingsClick?: () => void;
}

export function LeftPanel({ onOpenDrawer, settings, onSettingsChange, onSettingsClick }: LeftPanelProps) {
  const [activeSection, setActiveSection] = useState<LeftSection>("blocks");
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    if (stored === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
  }

  const navItems = [
    { id: "add" as const, icon: <Plus className="w-[18px] h-[18px]" />, label: "Add Blocks" },
    { id: "blocks" as const, icon: <LayoutGrid className="w-[18px] h-[18px]" />, label: "Blocks" },
    { id: "social" as const, icon: <Share2 className="w-[18px] h-[18px]" />, label: "Social" },
    { id: "pages" as const, icon: <FileText className="w-[18px] h-[18px]" />, label: "Pages" },
  ];

  return (
    <div className="flex h-full">
      {/* Icon Rail */}
      <div className={`${collapsed ? "w-[52px]" : "w-[140px]"} bg-[var(--admin-bg)] border-r border-[var(--admin-border)] flex flex-col items-center py-2.5 gap-0.5 shrink-0 transition-all duration-200`}>
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveSection(item.id)}
            className={`${collapsed ? "w-9 h-9 justify-center" : "w-full h-9 justify-start px-3 gap-2.5"} rounded-lg flex items-center transition-all duration-200 relative group ${
              activeSection === item.id
                ? "icon-rail-item-active text-white"
                : "text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-accent-subtle)]"
            }`}
            title={collapsed ? item.label : undefined}
            aria-label={item.label}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && (
              <span className="text-[11px] font-semibold truncate">{item.label}</span>
            )}
            {collapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 text-[10px] font-medium bg-[var(--admin-text)] text-[var(--admin-surface)] rounded-md opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50">
                {item.label}
              </span>
            )}
          </button>
        ))}

        <div className="flex-1" />

        {/* Collapse toggle */}
        <button
          type="button"
          onClick={toggleCollapsed}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] hover:bg-[var(--admin-accent-subtle)] transition-all duration-150"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 overflow-y-auto bg-[var(--admin-surface)]">
        {activeSection === "add" && <AddBlocksSection />}
        {activeSection === "blocks" && <BlockListSection onOpenDrawer={onOpenDrawer} />}
        {activeSection === "social" && <SocialSection settings={settings} onSettingsChange={onSettingsChange} />}
        {activeSection === "pages" && <PagesSection onOpenDrawer={onOpenDrawer} />}
      </div>
    </div>
  );
}

const SINGLE_INSTANCE_TYPES = new Set<LinkType>(["contact_form", "vcard", "wallet"]);

function AddBlocksSection() {
  const utils = trpc.useUtils();
  const linksQuery = trpc.links.listAll.useQuery();
  const existingTypes = new Set((linksQuery.data ?? []).map((l) => l.type));
  const [searchQuery, setSearchQuery] = useState("");

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

  const lowerSearch = searchQuery.toLowerCase();

  return (
    <div className="p-4">
      <h3 className="text-[13px] font-semibold text-[var(--admin-text)] mb-3 tracking-tight">Add Blocks</h3>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--admin-text-tertiary)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search blocks..."
          className="admin-input pl-8 text-[11px]"
          aria-label="Search blocks"
        />
      </div>

      {BLOCK_CATEGORIES.map((category) => {
        const filtered = category.blocks.filter(
          (b) =>
            !lowerSearch ||
            b.label.toLowerCase().includes(lowerSearch) ||
            b.description.toLowerCase().includes(lowerSearch)
        );
        if (filtered.length === 0) return null;

        return (
          <div key={category.label} className="mb-5">
            <p className="admin-section-label">{category.label}</p>
            <div className="grid grid-cols-2 gap-1.5">
              {filtered.map((block) => {
                const isSingle = SINGLE_INSTANCE_TYPES.has(block.type);
                const alreadyExists = isSingle && existingTypes.has(block.type);
                return (
                  <button
                    key={block.type}
                    type="button"
                    onClick={() => handleAddBlock(block.type)}
                    disabled={createMutation.isPending || alreadyExists}
                    className={`block-card flex flex-col items-start gap-1 px-3 py-2.5 rounded-lg border transition-all duration-200 group relative ${
                      alreadyExists
                        ? "border-[var(--admin-border)] bg-[var(--admin-bg)] text-[var(--admin-text-tertiary)] cursor-not-allowed opacity-50"
                        : "border-[var(--admin-border)] bg-[var(--admin-surface)] hover:border-[var(--admin-accent)] hover:bg-[var(--admin-accent-subtle)] text-[var(--admin-text-secondary)] hover:text-[var(--admin-accent)]"
                    }`}
                    title={alreadyExists ? "Already added" : `Add ${block.label}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="shrink-0 transition-transform duration-150 group-hover:scale-110">{block.icon}</span>
                      <span className="text-[11px] font-medium truncate">
                        {block.label}
                      </span>
                      {alreadyExists && (
                        <Check className="w-3.5 h-3.5 text-emerald-500 ml-auto shrink-0" />
                      )}
                    </div>
                    <span className="text-[9px] text-[var(--admin-text-tertiary)] leading-tight line-clamp-1">
                      {block.description}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
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

  const links = linksQuery.data ?? [];
  const isInitialLoading = linksQuery.isLoading && links.length === 0;

  if (isInitialLoading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-11 rounded-lg bg-[var(--admin-bg)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-semibold text-[var(--admin-text)] tracking-tight">
          Blocks
          {links.length > 0 && (
            <span className="ml-1.5 text-[10px] font-medium text-[var(--admin-text-tertiary)] bg-[var(--admin-bg)] px-1.5 py-0.5 rounded-full">
              {links.length}
            </span>
          )}
        </h3>
        {linksQuery.isFetching && !isInitialLoading && (
          <div className="w-3 h-3 border-2 border-[var(--admin-accent)]/30 border-t-[var(--admin-accent)] rounded-full animate-spin" />
        )}
      </div>

      {links.length === 0 ? (
        <div className="text-center py-10 px-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--admin-accent-subtle)] flex items-center justify-center mx-auto mb-3">
            <Plus className="w-5 h-5 text-[var(--admin-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--admin-text-secondary)] mb-1">No blocks yet</p>
          <p className="text-[11px] text-[var(--admin-text-tertiary)]">
            Click the + tab to add your first block.
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="left-panel-blocks">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                {links.map((link, index) => (
                  <Draggable key={link.id} draggableId={link.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-center gap-2 px-2 py-2 rounded-lg border transition-all duration-150 cursor-pointer group ${
                          snapshot.isDragging
                            ? "border-[var(--admin-accent)] bg-[var(--admin-accent-subtle)] shadow-md"
                            : "border-transparent bg-[var(--admin-surface)] hover:bg-[var(--admin-bg)] hover:border-[var(--admin-border)]"
                        } ${!link.isActive ? "opacity-40" : ""}`}
                        onClick={() => {
                          if (!snapshot.isDragging) {
                            onOpenDrawer?.({ type: "link-edit", id: link.id });
                          }
                        }}
                      >
                        <div
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <GripVertical className="w-3.5 h-3.5" />
                        </div>

                        <div className="w-7 h-7 rounded-md bg-[var(--admin-accent-subtle)] flex items-center justify-center shrink-0 text-[var(--admin-accent)]">
                          {TYPE_ICONS[link.type] || <Globe className="w-3.5 h-3.5" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[var(--admin-text)] truncate leading-tight">{link.title}</p>
                          <p className="text-[10px] text-[var(--admin-text-tertiary)] capitalize">{link.type.replace("_", " ")}</p>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleMutation.mutate({ id: link.id });
                            }}
                            className="p-1.5 rounded-md hover:bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-text-secondary)] transition-colors"
                            title={link.isActive ? "Hide" : "Show"}
                            aria-label={link.isActive ? "Hide block" : "Show block"}
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
                            className={`p-1.5 rounded-md transition-all duration-150 ${
                              deletingId === link.id
                                ? "bg-red-50 text-[var(--admin-danger)]"
                                : "hover:bg-[var(--admin-surface)] text-[var(--admin-text-tertiary)] hover:text-[var(--admin-danger)]"
                            }`}
                            title={deletingId === link.id ? "Click again to confirm" : "Delete"}
                            aria-label={deletingId === link.id ? "Confirm delete" : "Delete block"}
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

const SOCIAL_PLATFORMS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" },
  { key: "twitter", label: "Twitter / X" },
  { key: "github", label: "GitHub" },
];

function SocialSection({
  settings,
  onSettingsChange,
}: {
  settings?: Record<string, string>;
  onSettingsChange?: (key: string, value: string) => void;
}) {
  // Parse existing social links from settings JSON
  let socialLinks: { platform: string; url: string }[] = [];
  try {
    const raw = settings?.socialLinks;
    if (raw) socialLinks = JSON.parse(raw);
  } catch {}

  // Build a map for quick lookup
  const linkMap: Record<string, string> = {};
  for (const link of socialLinks) {
    linkMap[link.platform] = link.url;
  }

  function handleChange(platform: string, url: string) {
    const updated = { ...linkMap, [platform]: url };
    // Build array, filtering out empty URLs
    const arr = Object.entries(updated)
      .filter(([, v]) => v.trim() !== "")
      .map(([p, u]) => ({ platform: p, url: u }));
    onSettingsChange?.("socialLinks", JSON.stringify(arr));
  }

  return (
    <div className="p-4">
      <h3 className="text-[13px] font-semibold text-[var(--admin-text)] mb-1 tracking-tight">Social Links</h3>
      <p className="text-[11px] text-[var(--admin-text-tertiary)] mb-4 leading-relaxed">
        Add your social media profiles. These appear as icons on your page.
      </p>
      <div className="space-y-2">
        {SOCIAL_PLATFORMS.map((platform) => (
          <div key={platform.key} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={`${platform.label} URL`}
              value={linkMap[platform.key] || ""}
              onChange={(e) => handleChange(platform.key, e.target.value)}
              className="admin-input text-[11px]"
              aria-label={`${platform.label} URL`}
            />
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--admin-text-tertiary)] mt-3 leading-relaxed">
        Social links are stored in settings and will be saved when you publish.
      </p>
    </div>
  );
}

function PagesSection({ onOpenDrawer }: { onOpenDrawer?: (drawer: AdminDrawer) => void }) {
  const pagesQuery = trpc.pages.list.useQuery();

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h3 className="text-[13px] font-semibold text-[var(--admin-text)] tracking-tight shrink-0">Custom Pages</h3>
        <button
          type="button"
          onClick={() => onOpenDrawer?.("pages-new")}
          className="text-[11px] text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] font-semibold flex items-center gap-0.5 transition-colors shrink-0"
          aria-label="Create new page"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">New</span>
        </button>
      </div>

      {pagesQuery.isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-11 rounded-lg bg-[var(--admin-bg)] animate-pulse" />
          ))}
        </div>
      ) : pagesQuery.data && pagesQuery.data.length > 0 ? (
        <div className="space-y-1">
          {pagesQuery.data.map((page) => (
            <button
              key={page.id}
              type="button"
              onClick={() => onOpenDrawer?.({ type: "page-edit", id: page.id })}
              className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--admin-bg)] transition-all duration-150 w-full text-left group"
            >
              <div className="w-7 h-7 rounded-md bg-[var(--admin-accent-subtle)] flex items-center justify-center shrink-0">
                <FileText className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-medium text-[var(--admin-text)] truncate leading-tight">{page.title}</p>
                <p className="text-[10px] text-[var(--admin-text-tertiary)]">/{page.slug}</p>
              </div>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${
                  page.isPublished
                    ? "bg-emerald-50 text-emerald-600"
                    : "bg-[var(--admin-bg)] text-[var(--admin-text-tertiary)]"
                }`}
              >
                {page.isPublished ? "Live" : "Draft"}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-center py-10 px-4">
          <div className="w-10 h-10 rounded-xl bg-[var(--admin-accent-subtle)] flex items-center justify-center mx-auto mb-3">
            <FileText className="w-5 h-5 text-[var(--admin-accent)]" />
          </div>
          <p className="text-xs font-medium text-[var(--admin-text-secondary)] mb-1">No custom pages yet</p>
          <p className="text-[11px] text-[var(--admin-text-tertiary)] mb-3">
            Create custom pages for your about, portfolio, or more.
          </p>
          <button
            type="button"
            onClick={() => onOpenDrawer?.("pages-new")}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:text-[var(--admin-accent-hover)] transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Create your first page
          </button>
        </div>
      )}

      <div className="mt-5 pt-4 border-t border-[var(--admin-border)] space-y-0.5">
        <p className="admin-section-label mb-2">Tools</p>
        {[
          { id: "contacts" as const, icon: Mail, label: "Contacts" },
          { id: "vcard" as const, icon: Contact, label: "vCard Editor" },
          { id: "wallet" as const, icon: Wallet, label: "Wallet Pass" },
          { id: "analytics" as const, icon: BarChart3, label: "Full Analytics" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenDrawer?.(item.id)}
            className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-[var(--admin-bg)] text-[12px] font-medium text-[var(--admin-text-secondary)] hover:text-[var(--admin-text)] w-full text-left transition-all duration-150 group"
          >
            <item.icon className="w-4 h-4 text-[var(--admin-text-tertiary)] group-hover:text-[var(--admin-text-secondary)] transition-colors" />
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
