import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  syncEntryToCloud, deleteEntryFromCloud,
  updateEntryCollectionsCloud, deleteCollectionFromCloud,
  pullFromCloud, syncScanCount,
} from "./cloudSync";

const KEYS = {
  entries:     "tellme_entries",
  collections: "tellme_collections",
  settings:    "tellme_settings",
  scanCount:   "tellme_scan_count",
};

// Image base64 stored separately to avoid AsyncStorage size limits
const IMAGE_KEY_PREFIX = "tellme_img_";

// ── IMAGE STORAGE (separate from entries) ─────────────────────────────────────
export const saveImageBase64 = async (entryId, base64) => {
  try {
    if (!base64) return;
    await AsyncStorage.setItem(`${IMAGE_KEY_PREFIX}${entryId}`, base64);
  } catch (e) {
    console.warn("Failed to save image base64:", e.message);
  }
};

export const loadImageBase64 = async (entryId) => {
  try {
    return await AsyncStorage.getItem(`${IMAGE_KEY_PREFIX}${entryId}`);
  } catch {
    return null;
  }
};

export const deleteImageBase64 = async (entryId) => {
  try {
    await AsyncStorage.removeItem(`${IMAGE_KEY_PREFIX}${entryId}`);
  } catch {
    // ignore
  }
};

// ── JOURNAL ENTRIES ───────────────────────────────────────────────────────────
export const loadEntries = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.entries);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveEntries = async (entries) => {
  try {
    // Strip imageBase64 from entries before saving — stored separately
    const cleaned = entries.map(e => {
      const { imageBase64, ...rest } = e;
      return rest;
    });
    await AsyncStorage.setItem(KEYS.entries, JSON.stringify(cleaned));
  } catch (e) {
    console.error("Failed to save entries:", e);
  }
};

export const addEntry = async (entry) => {
  // Save image separately if present
  if (entry.imageBase64) {
    await saveImageBase64(entry.id, entry.imageBase64);
  }
  const entries = await loadEntries();
  const { imageBase64, ...entryWithoutImage } = entry;
  const updated = [entryWithoutImage, ...entries];
  await saveEntries(updated);
  return updated;
};

export const deleteEntry = async (id) => {
  const entries = await loadEntries();
  const updated = entries.filter(e => e.id !== id);
  await saveEntries(updated);
  // Delete the associated image
  await deleteImageBase64(id);
  // Clean up orphaned collections
  const collections = await loadCollections();
  const usedNames = new Set(updated.flatMap(e => e.collections || []));
  const updatedCollections = collections.filter(c => usedNames.has(c.name));
  await saveCollections(updatedCollections);
  // Cloud sync (background)
  deleteEntryFromCloud(id).catch(() => {});
  return { entries: updated, collections: updatedCollections };
};

// ── COLLECTIONS ───────────────────────────────────────────────────────────────
export const loadCollections = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.collections);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveCollections = async (collections) => {
  try {
    await AsyncStorage.setItem(KEYS.collections, JSON.stringify(collections));
  } catch (e) {
    console.error("Failed to save collections:", e);
  }
};

export const deleteCollection = async (name) => {
  const entries = await loadEntries();
  const updatedEntries = entries.map(e => ({
    ...e,
    collections: (e.collections || []).filter(c => c !== name),
  }));
  await saveEntries(updatedEntries);
  const collections = await loadCollections();
  const updatedCollections = collections.filter(c => c.name !== name);
  await saveCollections(updatedCollections);
  // Cloud sync (background)
  deleteCollectionFromCloud(name).catch(() => {});
  return { entries: updatedEntries, collections: updatedCollections };
};

// ── SAVE TO JOURNAL WITH COLLECTIONS ─────────────────────────────────────────
export const saveToJournal = async (entry, selectedCollections, existingCollections) => {
  // Save image separately
  if (entry.imageBase64) {
    await saveImageBase64(entry.id, entry.imageBase64);
  }
  // Save entry without image data
  const { imageBase64, ...entryWithoutImage } = entry;
  const newEntry = { ...entryWithoutImage, collections: selectedCollections };
  const entries = await loadEntries();
  const updatedEntries = [newEntry, ...entries];
  await saveEntries(updatedEntries);

  // Update collections
  let collections = [...existingCollections];
  for (const name of selectedCollections) {
    if (!collections.find(c => c.name === name)) {
      const { CATEGORY_ICONS } = await import("../constants");
      const icon = CATEGORY_ICONS[entry.result?.subjectCategory] || "📁";
      collections.unshift({
        name,
        icon,
        coverImageUri: entry.imageUri,
        createdAt: new Date().toISOString(),
      });
    }
  }
  await saveCollections(collections);
  // Cloud sync (background)
  syncEntryToCloud(entry, selectedCollections).catch(() => {});
  return { entries: updatedEntries, collections };
};

// ── SETTINGS ──────────────────────────────────────────────────────────────────
export const loadSettings = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.settings);
    return raw ? JSON.parse(raw) : {
      useLocation: true,
      isPremium: false,
    };
  } catch {
    return { useLocation: true, isPremium: false };
  }
};

export const saveSettings = async (settings) => {
  try {
    await AsyncStorage.setItem(KEYS.settings, JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
};

// ── SCAN COUNT (FREE TIER) ────────────────────────────────────────────────────
export const getScanCount = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.scanCount);
    if (!raw) return { count: 0, date: new Date().toDateString() };
    const data = JSON.parse(raw);
    if (data.date !== new Date().toDateString()) {
      return { count: 0, date: new Date().toDateString() };
    }
    return data;
  } catch {
    return { count: 0, date: new Date().toDateString() };
  }
};

export const incrementScanCount = async () => {
  const current = await getScanCount();
  const updated = {
    count: current.count + 1,
    date: new Date().toDateString(),
  };
  await AsyncStorage.setItem(KEYS.scanCount, JSON.stringify(updated));
  // Cloud sync (background)
  syncScanCount(updated.count, updated.date).catch(() => {});
  return updated;
};

export const checkScanLimit = async (isPremium, freeLimit = 100) => {
  if (isPremium) return { allowed: true, remaining: Infinity };
  const { count } = await getScanCount();
  return {
    allowed: count < freeLimit,
    remaining: Math.max(0, freeLimit - count),
    used: count,
  };
};

// ── SYNC FROM CLOUD (call on app launch) ──────────────────────────────────────
export const syncFromCloud = async () => {
  try {
    const cloudData = await pullFromCloud();
    if (!cloudData) return null;

    const localEntries = await loadEntries();
    const localCollections = await loadCollections();

    // Build sets of local and cloud entry IDs
    const localIds = new Set(localEntries.map(e => e.id));
    const cloudIds = new Set(cloudData.entries.map(e => e.id));

    // Merge: cloud is source of truth, but keep local-only entries (unssynced)
    const merged = [...cloudData.entries];
    for (const local of localEntries) {
      if (!cloudIds.has(local.id)) {
        // Local entry not in cloud — sync it up
        merged.push(local);
        syncEntryToCloud(local, local.collections || []).catch(() => {});
      }
    }

    // Merge collections
    const collMap = new Map();
    for (const c of cloudData.collections) collMap.set(c.name, c);
    for (const c of localCollections) {
      if (!collMap.has(c.name)) collMap.set(c.name, c);
    }
    const mergedCollections = Array.from(collMap.values());

    // Save merged data locally
    await saveEntries(merged);
    await saveCollections(mergedCollections);

    console.log(`Sync complete: ${merged.length} entries, ${mergedCollections.length} collections`);
    return { entries: merged, collections: mergedCollections };
  } catch (e) {
    console.warn("Sync from cloud failed:", e.message);
    return null;
  }
};

// ── UPDATE ENTRY COLLECTIONS ──────────────────────────────────────────────────
export const updateEntryCollections = async (entryId, newCollections) => {
  const entries = await loadEntries();
  const updatedEntries = entries.map(e =>
    e.id === entryId ? { ...e, collections: newCollections } : e
  );
  await saveEntries(updatedEntries);

  // Ensure all new collection names exist
  const collections = await loadCollections();
  let updatedCollections = [...collections];
  for (const name of newCollections) {
    if (!updatedCollections.find(c => c.name === name)) {
      updatedCollections.unshift({
        name,
        icon: "📁",
        createdAt: new Date().toISOString(),
      });
    }
  }
  // Clean up orphaned collections
  const allUsedNames = new Set(updatedEntries.flatMap(e => e.collections || []));
  updatedCollections = updatedCollections.filter(c => allUsedNames.has(c.name));
  await saveCollections(updatedCollections);
  // Cloud sync (background)
  updateEntryCollectionsCloud(entryId, newCollections).catch(() => {});
  return { entries: updatedEntries, collections: updatedCollections };
};

// ── CLEAR ALL DATA ────────────────────────────────────────────────────────────
export const clearAllData = async () => {
  try {
    // Clear main keys
    await AsyncStorage.multiRemove(Object.values(KEYS));
    // Clear all image keys
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter(k => k.startsWith(IMAGE_KEY_PREFIX));
    if (imageKeys.length > 0) {
      await AsyncStorage.multiRemove(imageKeys);
    }
  } catch (e) {
    console.error("Failed to clear data:", e);
  }
};
