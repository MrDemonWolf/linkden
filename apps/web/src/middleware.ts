// Middleware for Clerk authentication
//
// IMPORTANT: This file only works with Next.js SSR mode. Since this app uses
// static export (output: "export"), this middleware will NOT run at build time
// or on Cloudflare Pages.
//
// For the static export deployment, authentication is handled entirely
// client-side using Clerk's <SignedIn> and <SignedOut> components in the
// admin layout (src/app/admin/layout.tsx). The tRPC server also validates
// the Bearer token for all protected procedures, providing a second layer
// of security regardless of the frontend deployment mode.
//
// If you switch to SSR (e.g., deploying on Vercel), uncomment the code below
// to enable server-side auth protection:
//
// import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
//
// const isProtectedRoute = createRouteMatcher(["/admin(.*)"]);
//
// export default clerkMiddleware(async (auth, req) => {
//   if (isProtectedRoute(req)) {
//     await auth.protect();
//   }
// });
//
// export const config = {
//   matcher: [
//     "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
//     "/(api|trpc)(.*)",
//   ],
// };

export {};
