"use client";

import { useQuery, useMutation } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { PublicPage } from "@/components/public/public-page";

export default function Home() {
	const pageData = useQuery(trpc.public.getPage.queryOptions());
	const trackView = useMutation(trpc.public.trackView.mutationOptions());
	const { data: session } = authClient.useSession();

	useEffect(() => {
		trackView.mutate({
			referrer: document.referrer || undefined,
			userAgent: navigator.userAgent || undefined,
		});
	}, []);

	if (pageData.isLoading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
			</div>
		);
	}

	if (!pageData.data?.profile) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<h1 className="text-2xl font-bold">Welcome to LinkDen</h1>
					<p className="mt-2 text-muted-foreground">
						Set up your page by visiting{" "}
						<a href="/admin/setup" className="text-primary underline">
							the setup wizard
						</a>
					</p>
				</div>
			</div>
		);
	}

	return (
		<PublicPage
			data={pageData.data as Parameters<typeof PublicPage>[0]["data"]}
			isAdmin={!!session?.user}
		/>
	);
}
