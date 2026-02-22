import Link from "next/link";

const features = [
  {
    title: "Cloudflare-Powered",
    description:
      "Deploy on Cloudflare Workers and Pages for sub-second load times. Your links are served from the edge, close to every visitor worldwide.",
    icon: "⚡",
  },
  {
    title: "Full Admin Panel",
    description:
      "Manage links, appearance, analytics, vCard, and Apple Wallet passes from a polished macOS-inspired dashboard protected by Clerk authentication.",
    icon: "🖥",
  },
  {
    title: "Apple Wallet",
    description:
      "Generate signed .pkpass files so visitors can save your contact info directly to their iPhone wallet. Seamless digital business cards.",
    icon: "📱",
  },
  {
    title: "Whitelabel",
    description:
      "Toggle off all LinkDen branding with a single setting. Zero attribution required under the MIT license. Make it completely yours.",
    icon: "🏷",
  },
  {
    title: "8 Built-in Themes",
    description:
      "Each theme ships with dark and light variants (16 total) plus auto mode that follows system preference. Customize colors, fonts, and more.",
    icon: "🎨",
  },
  {
    title: "Contact Form",
    description:
      "Built-in contact form with CAPTCHA protection and Resend email integration. Let visitors reach you without exposing your email address.",
    icon: "✉",
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

const reasons = [
  {
    title: "Performance",
    description:
      "Static pages served from Cloudflare's global edge network with API on Workers and D1 SQLite. Sub-second page loads from anywhere in the world.",
  },
  {
    title: "Privacy",
    description:
      "Self-hosted means your data stays on your infrastructure. No third-party tracking, no vendor lock-in, and full control over analytics.",
  },
  {
    title: "Customizable",
    description:
      "From themes and color pickers to custom CSS and Google Fonts, every aspect of your link page is configurable through the admin panel.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#091533] text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-[#091533] via-[#091533]/95 to-[#0a1e4a]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Your Links, Your Brand,{" "}
            <span className="bg-gradient-to-r from-[#0FACED] to-[#38bdf8] bg-clip-text text-transparent">
              Your Rules
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-300">
            LinkDen is a self-hosted Linktree alternative built on the
            Cloudflare stack. A single-user link-in-bio platform with a full
            admin panel, blazing-fast edge performance, and complete
            whitelabel support.
          </p>
          <div className="mt-10 flex items-center justify-center gap-x-6">
            <Link
              href="/docs"
              className="rounded-lg bg-[#0FACED] px-6 py-3 text-sm font-semibold text-[#091533] shadow-lg shadow-[#0FACED]/25 transition hover:bg-[#38bdf8] hover:shadow-[#0FACED]/40"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/mrdemonwolf/linkden"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-gray-600 px-6 py-3 text-sm font-semibold text-gray-300 transition hover:border-gray-400 hover:text-white"
            >
              View on GitHub
            </a>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need for your{" "}
            <span className="text-[#0FACED]">link page</span>
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-gray-400">
            Built with modern tooling and designed for performance, privacy,
            and full customization.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-gray-700/50 bg-[#0a1e4a]/40 p-6 backdrop-blur transition hover:border-[#0FACED]/30 hover:bg-[#0a1e4a]/60"
              >
                <div className="mb-4 text-3xl">{feature.icon}</div>
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Get Started in 3 Steps */}
      <section className="border-t border-gray-800 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Get Started in{" "}
            <span className="text-[#0FACED]">3 Steps</span>
          </h2>
          <div className="mt-16 space-y-12">
            {steps.map((step) => (
              <div key={step.step} className="flex gap-6">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0FACED] text-lg font-bold text-[#091533]">
                  {step.step}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="mt-1 text-gray-400">{step.description}</p>
                  <pre className="mt-4 overflow-x-auto rounded-lg bg-[#0a1e4a]/60 p-4 text-sm text-gray-300">
                    <code>{step.code}</code>
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why LinkDen? */}
      <section className="border-t border-gray-800 px-6 py-20 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Why <span className="text-[#0FACED]">LinkDen</span>?
          </h2>
          <div className="mt-16 grid gap-8 sm:grid-cols-3">
            {reasons.map((reason) => (
              <div key={reason.title} className="text-center">
                <h3 className="text-lg font-semibold text-[#0FACED]">
                  {reason.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {reason.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 px-6 py-8 lg:px-8">
        <p className="text-center text-sm text-gray-500">
          Made with love by{" "}
          <a
            href="https://www.mrdemonwolf.com"
            className="text-gray-400 transition hover:text-[#0FACED]"
          >
            MrDemonWolf, Inc.
          </a>
        </p>
      </footer>
    </main>
  );
}
