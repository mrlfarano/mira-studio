import { describe, it, expect } from "vitest";
import { setApiKey, getApiKey, deleteApiKey } from "../keychain.js";

const skipOnCi = process.env.CI ? it.skip : it;

describe("keychain", () => {
  // This touches the real OS keychain. Headless CI environments typically
  // lack a credential store, so we skip there.
  skipOnCi("round-trips a value through the OS credential store", async () => {
    const provider = "test-provider-mira-ci";
    try {
      // Pre-clean in case a previous failed run left a residue
      await deleteApiKey(provider);
    } catch {
      // ignore
    }
    await setApiKey(provider, "secret-value");
    expect(await getApiKey(provider)).toBe("secret-value");
    expect(await deleteApiKey(provider)).toBe(true);
    expect(await getApiKey(provider)).toBeNull();
  });
});
