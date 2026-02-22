import Link from "next/link";
import {
  Cloud,
  LayoutDashboard,
  Wallet,
  Paintbrush,
  Palette,
  Mail,
} from "lucide-react";

const features = [
  {
    title: "Cloudflare-Powered",
    description:
      "Deploy on Cloudflare Workers and Pages for sub-second load times. Your links are served from the edge, close to every visitor worldwide.",
    icon: Cloud,
  },
  {
    title: "Full Admin Panel",
    description:
      "Manage links, appearance, analytics, vCard, and Apple Wallet passes from a polished macOS-inspired dashboard protected by Clerk authentication.",
    icon: LayoutDashboard,
  },
  {
    title: "Apple Wallet",
    description:
      "Generate signed .pkpass files so visitors can save your contact info directly to their iPhone wallet. Seamless digital business cards.",
    icon: Wallet,
  },
  {
    title: "100% Whitelabel",
    description:
      "Toggle off all LinkDen branding with a single setting. Zero attribution required under the MIT license. Make it completely yours.",
    icon: Paintbrush,
  },
  {
    title: "7 Built-in Themes",
    description:
      "Each theme ships with dark and light variants plus auto mode that follows system preference. Customize colors, fonts, and more.",
    icon: Palette,
  },
  {
    title: "Contact Form",
    description:
      "Built-in contact form with CAPTCHA protection and Resend email integration. Let visitors reach you without exposing your email address.",
    icon: Mail,
  },
];

const steps = [
  {
    step: "1",
    title: "Clone",
    description: "Clone the repository and install dependencies with pnpm.",
    code: "git clone https://github.com/mrdemonwolf/linkden.git\ncd linkden && pnpm install",
  },
  {
    step: "2",
    title: "Configure",
    description:
      "Set up Clerk authentication, Cloudflare credentials, and your environment variables.",
    code: "cp .env.example .env\ncp apps/web/.env.example apps/web/.env",
  },
  {
    step: "3",
    title: "Deploy",
    description:
      "Push your database migrations and deploy to Cloudflare with a single command.",
    code: "pnpm db:push\npnpm cf:deploy",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-fd-foreground sm:text-6xl lg:text-7xl">
            Your Links, Your Brand,{" "}
            <span style={{ color: "var(--color-fd-primary)" }}>
              Your Rules
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-fd-muted-foreground">
            LinkDen is a self-hosted Linktree alternative built on the
            Cloudflare stack. A single-user link-in-bio platform with a full
            admin panel, blazing-fast edge performance, and complete whitelabel
            support.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/docs"
              className="rounded-lg px-6 py-3 text-sm font-semibold text-fd-primary-foreground shadow-lg transition"
              style={{ backgroundColor: "var(--color-fd-primary)" }}
            >
              Get Started
            </Link>
            <a
              href="https://github.com/mrdemonwolf/linkden"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-fd-border px-6 py-3 text-sm font-semibold text-fd-muted-foreground transition hover:border-fd-ring hover:text-fd-foreground"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-fd-foreground sm:text-4xl">
            Everything you need for your{" "}
            <span style={{ color: "var(--color-fd-primary)" }}>link page</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-fd-muted-foreground">
            Built with modern tooling and designed for performance, privacy, and
            full customization.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="rounded-xl border border-fd-border bg-fd-card p-6 transition hover:border-fd-ring"
                >
                  <div className="mb-4">
                    <Icon
                      className="h-8 w-8"
                      style={{ color: "var(--color-fd-primary)" }}
                    />
                  </div>
                  <h3 className="text-lg font-semibold text-fd-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-fd-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Get Started in 3 Steps */}
      <section className="border-t border-fd-border px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight text-fd-foreground sm:text-4xl">
            Get Started in{" "}
            <span style={{ color: "var(--color-fd-primary)" }}>3 Steps</span>
          </h2>
          <div className="mt-16 space-y-12">
            {steps.map((step) => (
              <div key={step.step} className="flex gap-6">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-fd-primary-foreground"
                  style={{ backgroundColor: "var(--color-fd-primary)" }}
                >
                  {step.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-fd-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-fd-muted-foreground">
                    {step.description}
                  </p>
                  <pre className="mt-4 overflow-x-auto rounded-lg bg-fd-secondary p-4 text-sm text-fd-secondary-foreground">
                    <code>{step.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
