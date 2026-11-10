/** Retire only LinkDen's former root worker and caches. */
export async function retireLegacyPublicWorker(): Promise<void> {
	const operations: Promise<unknown>[] = [];
	if ("serviceWorker" in navigator) {
		operations.push(
			Promise.resolve()
				.then(() => navigator.serviceWorker.getRegistrations())
				.then((registrations) =>
					Promise.allSettled(
						registrations
							.filter((registration) => {
								try {
									const scope = new URL(registration.scope);
									if (scope.origin !== location.origin || scope.pathname !== "/") return false;
									const workers = [
										registration.active,
										registration.waiting,
										registration.installing,
									];
									return (
										workers.some(Boolean) &&
										workers.every((worker) => {
											if (!worker) return true;
											const script = new URL(worker.scriptURL);
											return script.origin === location.origin && script.pathname === "/sw.js";
										})
									);
								} catch {
									return false;
								}
							})
							.map((registration) => registration.unregister()),
					),
				),
		);
	}
	if ("caches" in globalThis) {
		operations.push(
			Promise.resolve()
				.then(() => caches.keys())
				.then((keys) =>
					Promise.allSettled(
						keys.filter((key) => key.startsWith("linkden-")).map((key) => caches.delete(key)),
					),
				),
		);
	}
	// Privacy/storage restrictions must not prevent the published page hydrating.
	await Promise.allSettled(operations);
}
