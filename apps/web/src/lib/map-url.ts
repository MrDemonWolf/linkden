/**
 * Generate a map URL based on provider type, address, and optional coordinates.
 */
export function getMapUrl(
	linkType: string,
	address: string,
	coordinates?: { lat: number; lng: number },
	customLinkUrl?: string,
): string | null {
	if (!address && linkType !== "custom") return null;

	switch (linkType) {
		case "google":
			if (coordinates) {
				return `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`;
			}
			return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
		case "apple":
			if (coordinates) {
				return `https://maps.apple.com/?q=${encodeURIComponent(address)}&ll=${coordinates.lat},${coordinates.lng}`;
			}
			return `https://maps.apple.com/?q=${encodeURIComponent(address)}`;
		case "custom":
			return customLinkUrl || null;
		default:
			return null;
	}
}
