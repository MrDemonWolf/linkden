"use client";

import { Header } from "@/components/admin/header";
import { Sidebar } from "@/components/admin/sidebar";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SignedIn>
        <div className="min-h-screen">
          <Sidebar />
          <div className="lg:ml-[240px] flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </SignedIn>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-brand-cyan border-t-transparent rounded-full animate-spin" />
        </div>
      </SignedOut>
    </AuthGuard>
  );
}
