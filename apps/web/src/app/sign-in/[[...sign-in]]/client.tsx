"use client";

const clerkEnabled = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export default function SignInClient() {
  if (!clerkEnabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-card text-center max-w-md">
          <h2 className="text-xl font-semibold mb-2">Authentication Not Configured</h2>
          <p className="text-[var(--text-secondary)]">
            This instance uses Cloudflare Access (or similar) for admin authentication. No sign-in
            page is needed.
          </p>
        </div>
      </div>
    );
  }

  const { SignIn } = require("@clerk/nextjs");
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "glass-panel shadow-2xl",
          },
        }}
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        afterSignInUrl="/admin"
      />
    </div>
  );
}
