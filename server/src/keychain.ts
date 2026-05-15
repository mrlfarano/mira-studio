/**
 * Keychain — OS-level secret storage for API keys.
 *
 * Per the PRD: API keys never touch `.mira/`. They live in the operating
 * system's credential store (macOS Keychain, Windows Credential Vault,
 * libsecret on Linux) via `keytar`.
 *
 * Service name is fixed at `mira-studio`; the `provider` parameter is the
 * account identifier (e.g. `anthropic`, `openai`).
 */

import keytar from "keytar";

const SERVICE = "mira-studio";

export async function setApiKey(
  provider: string,
  value: string,
): Promise<void> {
  await keytar.setPassword(SERVICE, provider, value);
}

export async function getApiKey(provider: string): Promise<string | null> {
  return await keytar.getPassword(SERVICE, provider);
}

export async function deleteApiKey(provider: string): Promise<boolean> {
  return await keytar.deletePassword(SERVICE, provider);
}
