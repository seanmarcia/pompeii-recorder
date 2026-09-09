/**
 * storage.js
 * Offline-first persistent storage for the Pompeii Field Client.
 * Handles master feature caching and the offline outbox queue.
 */

const STORAGE_KEYS = {
  CACHED_FEATURES: "pompeii_cached_features_v1",
  CACHED_TIMESTAMP: "pompeii_cached_time_v1",
  OFFLINE_OUTBOX: "pompeii_offline_outbox_v1",
  DRAFT_PREFIX: "pompeii_draft_v1_",
  LAST_SUBMITTER_NAME: "pompeii_last_submitter_name_v1",
};

/** Get the researcher's name from their last submission, if any. */
export function getLastSubmitterName() {
  try {
    return localStorage.getItem(STORAGE_KEYS.LAST_SUBMITTER_NAME) || "";
  } catch (err) {
    console.warn("Error loading last submitter name:", err);
    return "";
  }
}

/** Remember the researcher's name so they don't have to retype it every sheet. */
export function setLastSubmitterName(name) {
  try {
    localStorage.setItem(STORAGE_KEYS.LAST_SUBMITTER_NAME, name || "");
  } catch (err) {
    console.warn("Error saving last submitter name:", err);
  }
}

/** Load cached master features */
export function getCachedFeatures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_FEATURES);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Error loading cached features from localStorage:", err);
    return null;
  }
}

/** Save master features to cache */
export function setCachedFeatures(features) {
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_FEATURES, JSON.stringify(features));
    localStorage.setItem(STORAGE_KEYS.CACHED_TIMESTAMP, new Date().toISOString());
  } catch (err) {
    console.warn("Storage quota exceeded or error saving features cache:", err);
  }
}

/** Get all submissions waiting in offline outbox */
export function getOutbox() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.OFFLINE_OUTBOX);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.warn("Error loading outbox:", err);
    return [];
  }
}

/** Add a new submission to the offline outbox */
export function addToOutbox(item) {
  const outbox = getOutbox();
  const entry = {
    clientId: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    createdAt: new Date().toISOString(),
    actionType: item.actionType || "create_new",
    targetSheet: item.targetSheet || item.payload?.SHEET,
    submitterName: item.submitterName || "Field Archaeologist",
    submitterNotes: item.submitterNotes || "",
    payload: item.payload,
    // photos array holds { name, dataUrl, size, sizeFormatted }
    photos: item.photos || [],
  };

  outbox.push(entry);
  try {
    localStorage.setItem(STORAGE_KEYS.OFFLINE_OUTBOX, JSON.stringify(outbox));
  } catch (err) {
    console.warn("Failed to store full payload in localStorage, trying reduced photos:", err);
    // If photos are too large for localStorage, save photo names and notify
    entry.photos = entry.photos.map((p) => ({ ...p, dataUrl: undefined }));
    localStorage.setItem(STORAGE_KEYS.OFFLINE_OUTBOX, JSON.stringify(outbox));
  }

  // Dispatch custom event for reactive UI updates
  window.dispatchEvent(new CustomEvent("pompeii_outbox_change", { detail: { count: outbox.length } }));
  return entry;
}

/** Remove single item from outbox by clientId */
export function removeFromOutbox(clientId) {
  const outbox = getOutbox().filter((i) => i.clientId !== clientId);
  localStorage.setItem(STORAGE_KEYS.OFFLINE_OUTBOX, JSON.stringify(outbox));
  window.dispatchEvent(new CustomEvent("pompeii_outbox_change", { detail: { count: outbox.length } }));
  return outbox;
}

/** Clear entire outbox */
export function clearOutbox() {
  localStorage.removeItem(STORAGE_KEYS.OFFLINE_OUTBOX);
  window.dispatchEvent(new CustomEvent("pompeii_outbox_change", { detail: { count: 0 } }));
}

/**
 * In-progress form drafts, so a researcher's unsaved work survives closing the
 * browser, a page reload, or the device sleeping mid-entry in the field.
 * Keyed by draftId: "new" for a not-yet-submitted sheet, "edit_<SHEET>" while
 * editing an existing one.
 */
function draftStorageKey(draftId) {
  return `${STORAGE_KEYS.DRAFT_PREFIX}${draftId}`;
}

/** Load a saved in-progress form draft, or null if none exists. */
export function getDraft(draftId) {
  try {
    const raw = localStorage.getItem(draftStorageKey(draftId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.warn("Error loading draft from localStorage:", err);
    return null;
  }
}

/** Save an in-progress form draft. Drops photo data URLs if storage is full. */
export function saveDraft(draftId, draft) {
  try {
    localStorage.setItem(draftStorageKey(draftId), JSON.stringify(draft));
  } catch (err) {
    console.warn("Storage quota exceeded saving draft, retrying without photo previews:", err);
    try {
      const reduced = {
        ...draft,
        photos: (draft.photos || []).map((p) => ({ ...p, dataUrl: undefined })),
      };
      localStorage.setItem(draftStorageKey(draftId), JSON.stringify(reduced));
    } catch (err2) {
      console.warn("Failed to save draft even without photo previews:", err2);
    }
  }
}

/** Discard a saved draft, e.g. after its submission succeeds. */
export function clearDraft(draftId) {
  try {
    localStorage.removeItem(draftStorageKey(draftId));
  } catch (err) {
    console.warn("Error clearing draft:", err);
  }
}
