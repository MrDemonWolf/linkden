"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { SettingKey } from "@linkden/validators/settings";
import { trpc } from "@/utils/trpc";
import { useUnsavedChanges } from "./use-unsaved-changes";

interface Options<T> {
	/** Map server settings (string key-value) into the local form shape. */
	parse: (data: Record<string, string>) => T;
	/** Map local form shape back to the [{key, value}] payload for updateBulk. */
	serialize: (state: T) => Array<{ key: SettingKey; value: string }>;
	successMessage?: string;
	errorMessage?: string;
	/** Called after a successful save. */
	onSaved?: (state: T) => void;
}

/**
 * Encapsulates the admin "settings dirty-save" pattern: load via
 * trpc.settings.getAll, mirror current + saved snapshots, expose isDirty,
 * persist via updateBulk, invalidate the query, and toast.
 */
export function useSettingsForm<T>(opts: Options<T>) {
	const { parse, serialize, successMessage, errorMessage, onSaved } = opts;
	const qc = useQueryClient();
	const query = useQuery(trpc.settings.getAll.queryOptions());
	const mutation = useMutation(trpc.settings.updateBulk.mutationOptions());

	const [state, setState] = useState<T | null>(null);
	const [saved, setSaved] = useState<T | null>(null);

	useEffect(() => {
		if (!query.data) return;
		const parsed = parse(query.data);
		setState(parsed);
		setSaved(parsed);
	}, [query.data, parse]);

	const isDirty = state !== null && saved !== null && !shallowEqual(state, saved);
	useUnsavedChanges(isDirty);

	const save = useCallback(async () => {
		if (!state) return;
		try {
			await mutation.mutateAsync(serialize(state));
			setSaved(state);
			qc.invalidateQueries({ queryKey: trpc.settings.getAll.queryOptions().queryKey });
			if (successMessage) toast.success(successMessage);
			onSaved?.(state);
		} catch {
			toast.error(errorMessage ?? "Failed to save settings");
		}
	}, [state, mutation, serialize, qc, successMessage, errorMessage, onSaved]);

	const reset = useCallback(() => {
		if (saved) setState(saved);
	}, [saved]);

	return {
		state,
		setState,
		isDirty,
		isLoading: query.isLoading,
		isSaving: mutation.isPending,
		save,
		reset,
	};
}

function shallowEqual<T>(a: T, b: T): boolean {
	if (Object.is(a, b)) return true;
	if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
	const ak = Object.keys(a as object);
	const bk = Object.keys(b as object);
	if (ak.length !== bk.length) return false;
	for (const k of ak) {
		if (!Object.is((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) {
			return false;
		}
	}
	return true;
}
