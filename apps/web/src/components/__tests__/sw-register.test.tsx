import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SwRegister } from "../sw-register";

const retire = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("../public/retire-service-worker", () => ({ retireLegacyPublicWorker: retire }));

afterEach(() => {
	cleanup();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe("service worker registration", () => {
	it("retires an old production worker when development starts", async () => {
		vi.stubEnv("NODE_ENV", "development");
		const register = vi.fn();
		vi.stubGlobal("navigator", { serviceWorker: { register } });
		render(<SwRegister />);
		await waitFor(() => expect(retire).toHaveBeenCalledOnce());
		expect(register).not.toHaveBeenCalled();
	});
	it("keeps production registration and versioning", async () => {
		vi.stubEnv("NODE_ENV", "production");
		vi.stubEnv("NEXT_PUBLIC_APP_VERSION", "0.5.0");
		const register = vi.fn(async () => ({}));
		vi.stubGlobal("navigator", { serviceWorker: { register, getRegistrations: async () => [] } });
		render(<SwRegister />);
		await waitFor(() => expect(register).toHaveBeenCalledWith("/sw.js?v=0.5.0", { scope: "/" }));
		expect(retire).not.toHaveBeenCalled();
	});
});
