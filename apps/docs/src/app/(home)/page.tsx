import Link from "next/link";
import {
  ArrowRight,
  Cloud,
  Code2,
  Github,
  LayoutDashboard,
  Lock,
  Mail,
  Paintbrush,
  Palette,
  Shield,
  Smartphone,
  Terminal,
  Wallet,
  Zap,
} from "lucide-react";

const features = [
  {
    title: "Edge-First Performance",
    description:
      "Built on Cloudflare Workers and D1. Your links load in milliseconds from the nearest edge node, worldwide.",
    icon: Zap,
  },
  {
    title: "Full Admin Panel",
    description:
      "A polished 3-panel editor with live phone preview, drag-and-drop blocks, and one-click publishing.",
    icon: LayoutDashboard,
  },
  {
    title: "Apple Wallet Passes",
    description:
      "Generate signed .pkpass files so visitors can save your contact directly to their iPhone wallet.",
    icon: Wallet,
  },
  {
    title: "100% Whitelabel",
    description:
      "Remove all LinkDen branding with a single toggle. MIT licensed — no attribution required. Fully yours.",
    icon: Paintbrush,
  },
  {
    title: "Themes & Dark Mode",
    description:
      "7 built-in themes, each with dark and light variants. Custom colors, auto-mode that follows system preference.",
    icon: Palette,
  },
  {
    title: "Contact Form & CAPTCHA",
    description:
      "Built-in contact form with Cloudflare Turnstile protection and email notifications via Resend.",
    icon: Mail,
  },
  {
    title: "Draft / Publish Flow",
    description:
      "Edit freely without affecting your live page. Preview changes, then publish them all at once.",
    icon: Shield,
  },
  {
    title: "35+ Social Brands",
    description:
      "Branded buttons for YouTube, Instagram, TikTok, GitHub, Discord, and 30+ more — auto-updated via CI.",
    icon: Smartphone,
  },
  {
    title: "Type-Safe API",
    description:
      "End-to-end TypeScript with tRPC. Frontend and backend share types — no codegen, no schema drift.",
    icon: Code2,
  },
];

const steps = [
  {
    step: "1",
    title: "Clone & Install",
    description: "Clone the repository and install dependencies.",
    code: "git clone https://github.com/mrdemonwolf/linkden.git\ncd linkden && pnpm install",
  },
  {
    step: "2",
    title: "Configure",
    description:
      "Set up your environment variables, authentication, and database.",
    code: "cp .env.example .env\ncp apps/web/.env.example apps/web/.env.local",
  },
  {
    step: "3",
    title: "Deploy",
    description:
      "Push your database schema and deploy to Cloudflare in one command.",
    code: "pnpm db:push && pnpm cf:deploy",
  },
];

const techStack = [
  { name: "Next.js 15", role: "Frontend" },
  { name: "Hono", role: "API Framework" },
  { name: "tRPC", role: "Type-Safe RPC" },
  { name: "Cloudflare Workers", role: "Runtime" },
  { name: "D1 (SQLite)", role: "Database" },
  { name: "Drizzle ORM", role: "ORM" },
  { name: "Tailwind CSS", role: "Styling" },
  { name: "Turborepo", role: "Monorepo" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-glow absolute inset-0 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-6 pt-24 pb-20 sm:pt-32 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-fd-border bg-fd-card px-4 py-1.5 text-xs font-medium text-fd-muted-foreground mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ backgroundColor: "var(--color-fd-primary)" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: "var(--color-fd-primary)" }} />
            </span>
            Open Source &middot; MIT Licensed &middot; v0.1.0
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-fd-foreground sm:text-6xl lg:text-7xl leading-[1.1]">
            Your links, your brand,
            <br />
            <span style={{ color: "var(--color-fd-primary)" }}>your rules.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-fd-muted-foreground">
            LinkDen is a self-hosted link-in-bio platform built on the Cloudflare
            stack. Full admin panel, edge performance, complete whitelabel support.
            No subscriptions. No vendor lock-in.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/docs"
              className="group flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-fd-primary-foreground shadow-lg transition-all hover:shadow-xl"
              style={{ backgroundColor: "var(--color-fd-primary)" }}
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="https://github.com/mrdemonwolf/linkden"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-fd-border bg-fd-card px-6 py-3 text-sm font-semibold text-fd-foreground transition hover:border-fd-ring hover:bg-fd-accent"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Tech Stack Ribbon */}
      <section className="border-y border-fd-border bg-fd-card/50">
        <div className="mx-auto max-w-6xl px-6 py-5">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {techStack.map((tech) => (
              <div key={tech.name} className="flex items-center gap-2 text-sm text-fd-muted-foreground">
                <span className="font-semibold text-fd-foreground">{tech.name}</span>
                <span className="text-fd-border">/</span>
                <span className="text-xs">{tech.role}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-fd-foreground sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-4 max-w-xl mx-auto text-fd-muted-foreground">
              Built for developers who want full control over their link-in-bio page
              without compromising on features or performance.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="feature-card rounded-xl border border-fd-border bg-fd-card p-6"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--ld-glow)" }}>
                    <Icon
                      className="h-5 w-5"
                      style={{ color: "var(--color-fd-primary)" }}
                    />
                  </div>
                  <h3 className="text-[15px] font-semibold text-fd-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-fd-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Get Started in 3 Steps */}
      <section className="border-t border-fd-border bg-fd-card/30 px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-fd-foreground sm:text-4xl">
              Deploy in minutes
            </h2>
            <p className="mt-4 text-fd-muted-foreground">
              Three commands. That's all it takes.
            </p>
          </div>
          <div className="space-y-10">
            {steps.map((step) => (
              <div key={step.step} className="flex gap-5">
                <div
                  className="step-number flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-fd-primary-foreground"
                  style={{ backgroundColor: "var(--color-fd-primary)" }}
                >
                  {step.step}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-fd-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-fd-muted-foreground">
                    {step.description}
                  </p>
                  <pre className="mt-3 overflow-x-auto rounded-lg border border-fd-border bg-fd-secondary p-4 text-sm text-fd-secondary-foreground">
                    <code>{step.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/docs/getting-started/installation"
              className="inline-flex items-center gap-2 text-sm font-semibold transition-colors hover:underline"
              style={{ color: "var(--color-fd-primary)" }}
            >
              Read the full installation guide
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <Lock className="mx-auto h-8 w-8 text-fd-muted-foreground mb-6" />
          <h2 className="text-2xl font-bold tracking-tight text-fd-foreground sm:text-3xl">
            Own your data. Own your page.
          </h2>
          <p className="mt-4 text-fd-muted-foreground leading-relaxed">
            No monthly fees. No tracking. No vendor lock-in. Deploy on your own
            Cloudflare account and keep full control of your links, analytics, and
            visitor data.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/docs"
              className="group flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-fd-primary-foreground shadow-lg transition-all hover:shadow-xl"
              style={{ backgroundColor: "var(--color-fd-primary)" }}
            >
              <Terminal className="h-4 w-4" />
              Start Building
            </Link>
            <a
              href="https://github.com/mrdemonwolf/linkden"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg border border-fd-border px-6 py-3 text-sm font-semibold text-fd-foreground transition hover:border-fd-ring hover:bg-fd-accent"
            >
              <Github className="h-4 w-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
