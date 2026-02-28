"use client";

import { createContext, useContext } from "react";

interface PreviewContextValue {
	isPreview: boolean;
}

const PreviewContext = createContext<PreviewContextValue>({ isPreview: false });

export function PreviewProvider({ children }: { children: React.ReactNode }) {
	return (
		<PreviewContext.Provider value={{ isPreview: true }}>
			{children}
		</PreviewContext.Provider>
	);
}

export function usePreview() {
	return useContext(PreviewContext);
}
