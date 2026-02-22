export interface PlaceholderLink {
  id: string;
  type: string;
  title: string;
  url: string | null;
  icon: string | null;
  iconType: string | null;
  isActive: boolean;
  clickCount: number;
  metadata: Record<string, unknown> | null;
}

export const placeholderSettings: Record<string, string> = {
  profileName: "John Doe",
  profileBio: "Digital creator & full-stack developer. Building cool things on the internet.",
  profileImage: "",
  contactEmail: "john@example.com",
  theme: "midnight-glass",
  contactEnabled: "false",
  accentColor: "#0FACED",
  backgroundColor: "#091533",
  textColor: "rgba(255,255,255,0.95)",
};

export const placeholderLinks: PlaceholderLink[] = [
  {
    id: "placeholder-1",
    type: "link",
    title: "Visit our website",
    url: "https://example.com",
    icon: "globe",
    iconType: "lucide",
    isActive: true,
    clickCount: 0,
    metadata: null,
  },
  {
    id: "placeholder-2",
    type: "heading",
    title: "Social Links",
    url: null,
    icon: null,
    iconType: null,
    isActive: true,
    clickCount: 0,
    metadata: null,
  },
  {
    id: "placeholder-3",
    type: "link",
    title: "GitHub",
    url: "https://github.com",
    icon: "github",
    iconType: "brand",
    isActive: true,
    clickCount: 0,
    metadata: null,
  },
  {
    id: "placeholder-4",
    type: "link",
    title: "Twitter / X",
    url: "https://x.com",
    icon: "twitter",
    iconType: "brand",
    isActive: true,
    clickCount: 0,
    metadata: null,
  },
  {
    id: "placeholder-5",
    type: "email",
    title: "Email Me",
    url: "hello@example.com",
    icon: "mail",
    iconType: "lucide",
    isActive: true,
    clickCount: 0,
    metadata: null,
  },
  {
    id: "placeholder-6",
    type: "vcard",
    title: "Save Contact",
    url: null,
    icon: null,
    iconType: null,
    isActive: true,
    clickCount: 0,
    metadata: null,
  },
];

export const placeholderSocialLinks = [
  { platform: "facebook", url: "https://facebook.com" },
  { platform: "instagram", url: "https://instagram.com" },
  { platform: "linkedin", url: "https://linkedin.com" },
  { platform: "youtube", url: "https://youtube.com" },
];
