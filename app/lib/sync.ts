import { AppState, parseState } from "./data";

export type SyncStatus = "local" | "syncing" | "synced" | "error" | "off";

/** Try the API once on mount. If it returns 503 (kv-not-configured),
 *  remember that and never call it again this session. */
let kvAvailable: boolean | null = null;

export async function tryRemoteLoad(): Promise<AppState | null> {
  if (kvAvailable === false) return null;
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.status === 503) {
      kvAvailable = false;
      return null;
    }
    if (!res.ok) {
      kvAvailable = false;
      return null;
    }
    const body = (await res.json()) as { ok: boolean; state: unknown };
    kvAvailable = true;
    if (!body.state) return null;
    return parseState(body.state);
  } catch {
    kvAvailable = false;
    return null;
  }
}

export async function tryRemoteSave(state: AppState): Promise<SyncStatus> {
  if (kvAvailable === false) return "local";
  try {
    const res = await fetch("/api/state", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(state),
    });
    if (res.status === 503) {
      kvAvailable = false;
      return "local";
    }
    if (!res.ok) return "error";
    kvAvailable = true;
    return "synced";
  } catch {
    return "error";
  }
}

export function remoteAvailable(): boolean | null {
  return kvAvailable;
}

/** Force a fresh fetch ignoring the cached availability flag. Used by the
 *  manual 'Pull from cloud' button to recover from a transient failure
 *  that left the session stuck on local storage. */
export async function forceRemoteLoad(): Promise<AppState | null> {
  kvAvailable = null;
  try {
    const res = await fetch("/api/state", { cache: "no-store" });
    if (res.status === 503) {
      kvAvailable = false;
      return null;
    }
    if (!res.ok) {
      kvAvailable = false;
      return null;
    }
    const body = (await res.json()) as { ok: boolean; state: unknown };
    kvAvailable = true;
    if (!body.state) return null;
    return parseState(body.state);
  } catch {
    kvAvailable = false;
    return null;
  }
}
