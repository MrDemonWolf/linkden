"use client";

import type { SettingKey } from "@linkden/validators/settings";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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
	/**
	 * Field-level validation: return `{ fieldName: message }` for every invalid
	 * field (empty object = valid). While non-empty, `save()` is a no-op and
	 * `hasErrors` is true so callers can disable the button.
	 */
	validate?: (state: T) => Record<string, string>;
}

/**
 * Encapsulates the admin "settings dirty-save" pattern: load via
 * trpc.settings.getAll, mirror current + saved snapshots, expose isDirty,
 * persist via updateBulk, invalidate the query, and toast.
 *
 * Fresh server data (the refetch after a save, a window-focus refetch) moves
 * the saved baseline and every field the admin hasn't edited; edited fields
 * keep their unsaved values. Save sends only the keys that differ from the
 * baseline, so a stale tab can't write back fields it never touched.
 */
export function useSettingsForm<T>(opts: Options<T>) {
	const { parse, serialize, successMessage, errorMessage, onSaved, validate } = opts;
	const qc = useQueryClient();
	const query = useQuery(trpc.settings.getAll.queryOptions());
	const mutation = useMutation(trpc.settings.updateBulk.mutationOptions());

	const [state, setState] = useState<T | null>(null);
	const [saved, setSaved] = useState<T | null>(null);
	// Latest committed baseline for the hydration effect below (declared first,
	// so it's synced before that effect runs).
	const savedRef = useRef(saved);
	useEffect(() => {
		savedRef.current = saved;
	});

	useEffect(() => {
		if (!query.data) return;
		const parsed = parse(query.data);
		const base = savedRef.current;
		setState((current) =>
			current === null || base === null ? parsed : rebase(current, base, parsed),
		);
		setSaved(parsed);
	}, [query.data, parse]);

	const isDirty = state !== null && saved !== null && !shallowEqual(state, saved);
	useUnsavedChanges(isDirty);

	const errors = state && validate ? validate(state) : {};
	const hasErrors = Object.keys(errors).length > 0;

	const save = useCallback(async () => {
		if (!state || (validate && Object.keys(validate(state)).length > 0)) return;
		const baseline = saved ? new Map(serialize(saved).map((e) => [e.key, e.value])) : null;
		const changes = serialize(state).filter((e) => !baseline || baseline.get(e.key) !== e.value);
		if (changes.length === 0) {
			// Different in form, identical on the wire: nothing to write.
			setSaved(state);
			return;
		}
		try {
			await mutation.mutateAsync(changes);
			setSaved(state);
			qc.invalidateQueries({ queryKey: trpc.settings.getAll.queryOptions().queryKey });
			if (successMessage) toast.success(successMessage);
			onSaved?.(state);
		} catch {
			toast.error(errorMessage ?? "Failed to save settings");
		}
	}, [state, saved, mutation, serialize, qc, successMessage, errorMessage, onSaved, validate]);

	const reset = useCallback(() => {
		if (saved) setState(saved);
	}, [saved]);

	return {
		state,
		setState,
		isDirty,
		errors,
		hasErrors,
		isLoading: query.isLoading,
		/** settings.getAll failed with nothing to show: render an error + retry, not a skeleton. */
		isError: query.isError && state === null,
		error: query.error,
		refetch: query.refetch,
		isSaving: mutation.isPending,
		save,
		reset,
	};
}

/**
 * Re-seed from fresh server data without losing unsaved edits: each field the
 * admin changed (differs from the old baseline) keeps its value, every other
 * field takes the server's. A clean form simply becomes `next`.
 */
function rebase<T>(current: T, base: T, next: T): T {
	if (
		typeof current !== "object" ||
		current === null ||
		typeof next !== "object" ||
		next === null
	) {
		return shallowEqual(current, base) ? next : current;
	}
	const cur = current as Record<string, unknown>;
	const old = base as Record<string, unknown>;
	const out: Record<string, unknown> = { ...(next as Record<string, unknown>) };
	for (const key of Object.keys(cur)) {
		if (!Object.is(cur[key], old[key])) out[key] = cur[key];
	}
	return shallowEqual(out, cur) ? current : (out as T);
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
