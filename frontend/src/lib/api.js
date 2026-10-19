/**
 * api.js
 * Network communications module for the Food And Drink in Ancient Pompeii field client.
 * Automatically fails over to offline cache and local outbox when Rails is offline.
 */

import {
  getCachedFeatures,
  setCachedFeatures,
  addToOutbox,
  getOutbox,
  removeFromOutbox,
} from "./storage";
import { RECORDER_NAMES, RECORDER_OFFLINE_CHECK, usernameFor } from "../data/people";

// Empty string = same site as the app (the fdpompeii.org build).
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

/**
 * Checks whether the Rails backend is reachable via its health check route.
 */
export async function checkBackendStatus() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${BACKEND_URL}/up`, { signal: controller.signal });
    clearTimeout(timeoutId);

    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Authenticates user credentials.
 * Checks online against Rails API /api/v1/auth/login.
 * If Rails is offline, accepts anyone who has signed in on this device before
 * (see rememberOfflineLogin), and any recorder via the hashed shared password.
 */
export async function loginClient(username, password) {
  const cleanUser = username.trim();
  const cleanPass = password.trim();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: cleanUser, password: cleanPass }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      await rememberOfflineLogin(cleanUser, cleanPass, data.user);
      return { success: true, user: data.user, isOnline: true };
    } else if (res.status === 401) {
      return { success: false, error: "Invalid username or password." };
    }
  } catch (err) {
    console.info("Server login unavailable, checking authorized field researcher credentials:", err.message);
  }

  const offlineUser =
    (await checkOfflineLogin(cleanUser, cleanPass)) || (await checkRecorderOfflineLogin(cleanUser, cleanPass));
  if (offlineUser) {
    return { success: true, user: offlineUser, isOnline: false };
  }

  return { success: false, error: "Invalid username or password." };
}

// Offline sign-in: after a successful online login we keep a salted hash of
// the password (never the password itself) so the same person can sign in
// again in the field without a connection.
const OFFLINE_LOGINS_KEY = "offlineLogins";

async function hashCredentials(username, password, salt) {
  if (!globalThis.crypto?.subtle) return null; // only available over HTTPS/localhost
  const data = new TextEncoder().encode(`${salt}:${username.toLowerCase()}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function readOfflineLogins() {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_LOGINS_KEY)) || {};
  } catch {
    return {};
  }
}

async function rememberOfflineLogin(username, password, user) {
  try {
    const salt = crypto.randomUUID();
    const hash = await hashCredentials(username, password, salt);
    if (!hash) return;
    const logins = readOfflineLogins();
    logins[username.toLowerCase()] = { salt, hash, user };
    localStorage.setItem(OFFLINE_LOGINS_KEY, JSON.stringify(logins));
  } catch (err) {
    console.info("Could not remember login for offline use:", err.message);
  }
}

// Any recorder can also sign in offline on a device they haven't used before,
// checked against the hashed shared recorder password.
async function checkRecorderOfflineLogin(username, password) {
  const fullName = RECORDER_NAMES.find((name) => usernameFor(name) === username.toLowerCase());
  if (!fullName || !globalThis.crypto?.subtle) return null;
  const { salt, iterations, hash } = RECORDER_OFFLINE_CHECK;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: new TextEncoder().encode(salt), iterations, hash: "SHA-256" },
    key,
    256
  );
  const hex = Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, "0")).join("");
  return hex === hash ? { username: usernameFor(fullName), full_name: fullName, role: "recorder" } : null;
}

async function checkOfflineLogin(username, password) {
  const saved = readOfflineLogins()[username.toLowerCase()];
  if (!saved) return null;
  const hash = await hashCredentials(username, password, saved.salt);
  return hash && hash === saved.hash ? saved.user : null;
}

/**
 * Specifically pulls down all verified rooms from the Rails backend on demand.
 * Throws an error if Rails is unreachable.
 */
export async function pullMasterFeatures() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${BACKEND_URL}/api/v1/features`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`The server responded with an error (HTTP ${res.status})`);
    }

    const features = await res.json();
    setCachedFeatures(features);
    return { success: true, count: features.length, features };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Sync timed out. The server took too long to respond.");
    }
    throw new Error(`Cannot reach the server: ${err.message}`);
  }
}

/**
 * Loads the master features list.
 * 1. Tries Rails API (GET /api/v1/features).
 * 2. If Rails is offline, uses cached features in localStorage.
 * 3. If cache is empty, uses bundled public/features.json fallback.
 */
export async function loadMasterFeatures() {
  let isOnline = false;
  let features = [];
  let source = "cache";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(`${BACKEND_URL}/api/v1/features`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      features = await res.json();
      isOnline = true;
      source = "backend";
      setCachedFeatures(features);
      return { features, isOnline, source };
    }
  } catch (err) {
    console.info("Server unreachable, falling back to local/cached data:", err.message);
  }

  // Fallback 1: Local cache
  const cached = getCachedFeatures();
  if (cached && cached.length > 0) {
    return { features: cached, isOnline: false, source: "localStorage" };
  }

  // Fallback 2: Bundled public/features.json
  try {
    const localRes = await fetch(`${import.meta.env.BASE_URL}features.json`);
    if (localRes.ok) {
      features = await localRes.json();
      setCachedFeatures(features);
      return { features, isOnline: false, source: "bundled_fallback" };
    }
  } catch (err) {
    console.error("Failed to load bundled features.json fallback:", err);
  }

  return { features: [], isOnline: false, source: "none" };
}

/**
 * Submits a new room or room update to the Rails review queue.
 * If Rails is offline, automatically saves into the local offline outbox.
 */
export async function submitFeature({
  actionType,
  targetSheet,
  submitterName,
  submitterNotes,
  payload,
  photoFiles = [],
  photoMeta = [],
}) {
  const isOnline = await checkBackendStatus();

  if (isOnline) {
    try {
      const formData = new FormData();
      formData.append("action_type", actionType);
      formData.append("target_sheet", targetSheet || payload.SHEET || "");
      formData.append("submitter_name", submitterName || "Field Archaeologist");
      formData.append("submitter_notes", submitterNotes || "");
      formData.append("payload", JSON.stringify(payload));

      // Append attached compressed photo files. A photo restored from a saved
      // draft has no live File object, only its dataUrl, so reconstruct a Blob.
      for (const photo of photoFiles) {
        if (photo.file) {
          formData.append("photos[]", photo.file, photo.file.name);
        } else if (photo.dataUrl) {
          const blob = await fetch(photo.dataUrl).then((r) => r.blob());
          formData.append("photos[]", blob, photo.name || "field_photo.jpg");
        }
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/submissions`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      return {
        success: true,
        isOffline: false,
        submissionId: data.submission_id,
        message: "Submission sent to review queue!",
      };
    } catch (err) {
      console.warn("Online submission failed, falling back to outbox:", err);
      // Fallback to outbox below
    }
  }

  // Save to offline outbox
  const outboxEntry = addToOutbox({
    actionType,
    targetSheet: targetSheet || payload.SHEET,
    submitterName,
    submitterNotes,
    payload,
    photos: photoMeta,
  });

  return {
    success: true,
    isOffline: true,
    clientId: outboxEntry.clientId,
    message: "Saved to Offline Outbox. Will sync when the server is reachable.",
  };
}

/**
 * Sync all items in the offline outbox to the Rails backend review queue.
 */
export async function syncOutbox(onProgress) {
  const isOnline = await checkBackendStatus();
  if (!isOnline) {
    throw new Error("The server is currently unreachable. Connect to the internet to sync.");
  }

  const outbox = getOutbox();
  if (outbox.length === 0) {
    return { syncedCount: 0, message: "No items in outbox to sync." };
  }

  let syncedCount = 0;
  const errors = [];

  for (let i = 0; i < outbox.length; i++) {
    const item = outbox[i];
    try {
      const formData = new FormData();
      formData.append("action_type", item.actionType);
      formData.append("target_sheet", item.targetSheet || item.payload?.SHEET || "");
      formData.append("submitter_name", item.submitterName || "Field Archaeologist (Offline Sync)");
      formData.append("submitter_notes", item.submitterNotes || "");
      formData.append("payload", JSON.stringify(item.payload));

      // Reconstruct file from base64 dataUrl if present
      if (Array.isArray(item.photos)) {
        for (const p of item.photos) {
          if (p.dataUrl) {
            const blob = await fetch(p.dataUrl).then((r) => r.blob());
            formData.append("photos[]", blob, p.name || "field_photo.jpg");
          }
        }
      }

      const res = await fetch(`${BACKEND_URL}/api/v1/submissions`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        removeFromOutbox(item.clientId);
        syncedCount++;
        if (onProgress) onProgress({ current: i + 1, total: outbox.length, item });
      } else {
        errors.push(`Item ${item.clientId}: HTTP ${res.status}`);
      }
    } catch (err) {
      errors.push(`Item ${item.clientId}: ${err.message}`);
    }
  }

  return {
    syncedCount,
    failedCount: errors.length,
    errors,
    message: `Successfully synced ${syncedCount} item(s) to the admin review queue.`,
  };
}
