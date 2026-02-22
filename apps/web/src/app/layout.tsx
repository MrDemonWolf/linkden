import { TrpcProvider } from "@/providers/trpc-provider";
import { ClerkProvider } from "@clerk/nextjs";
import "@/styles/globals.css";

export const metadata = {
  title: "LinkDen",
  description: "Your personal link-in-bio page",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <TrpcProvider>{children}</TrpcProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
