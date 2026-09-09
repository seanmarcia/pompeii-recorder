/**
 * api.js
 * Network communications module for Pompeii Field Client.
 * Automatically fails over to offline cache and local outbox when Rails is offline.
 */

import {
  getCachedFeatures,
  setCachedFeatures,
  addToOutbox,
  getOutbox,
  removeFromOutbox,
} from "./storage";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

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
 * If Rails is offline, verifies against authorized field credentials.
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
      return { success: true, user: data.user, isOnline: true };
    } else if (res.status === 401) {
      return { success: false, error: "Invalid username or password." };
    }
  } catch (err) {
    console.info("Rails login offline, checking authorized field researcher credentials:", err.message);
  }

  // Offline fallback credentials
  const validOffline =
    (cleanUser.toLowerCase() === "admin" && (cleanPass === "pompeii2025" || cleanPass === "pompeii2026")) ||
    (cleanUser.toLowerCase() === "researcher" && cleanPass === "pompeii2025");

  if (validOffline) {
    return {
      success: true,
      user: { username: cleanUser, role: cleanUser.toLowerCase() === "admin" ? "admin" : "researcher" },
      isOnline: false,
    };
  }

  return { success: false, error: "Invalid credentials (offline check failed)." };
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
      throw new Error(`Rails server responded with HTTP ${res.status}`);
    }

    const features = await res.json();
    setCachedFeatures(features);
    return { success: true, count: features.length, features };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Sync timed out. Rails server took too long to respond.");
    }
    throw new Error(`Cannot reach Rails backend at ${BACKEND_URL}: ${err.message}`);
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
    console.info("Rails backend unreachable, falling back to local/cached data:", err.message);
  }

  // Fallback 1: Local cache
  const cached = getCachedFeatures();
  if (cached && cached.length > 0) {
    return { features: cached, isOnline: false, source: "localStorage" };
  }

  // Fallback 2: Bundled public/features.json
  try {
    const localRes = await fetch("/features.json");
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
    message: "Saved to Offline Outbox. Will sync when Rails backend is online.",
  };
}

/**
 * Sync all items in the offline outbox to the Rails backend review queue.
 */
export async function syncOutbox(onProgress) {
  const isOnline = await checkBackendStatus();
  if (!isOnline) {
    throw new Error("Rails backend is currently unreachable. Connect to server to sync.");
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
    message: `Successfully synced ${syncedCount} item(s) to Rails review queue.`,
  };
}
