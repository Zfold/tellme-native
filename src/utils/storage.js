import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  entries:     "tellme_entries",
  collections: "tellme_collections",
  settings:    "tellme_settings",
  scanCount:   "tellme_scan_count",
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
    await AsyncStorage.setItem(KEYS.entries, JSON.stringify(entries));
  } catch (e) {
    console.error("Failed to save entries:", e);
  }
};

export const addEntry = async (entry) => {
  const entries = await loadEntries();
  const updated = [entry, ...entries];
  await saveEntries(updated);
  return updated;
};

export const deleteEntry = async (id) => {
  const entries = await loadEntries();
  const updated = entries.filter(e => e.id !== id);
  await saveEntries(updated);
  // Clean up orphaned collections
  const collections = await loadCollections();
  const usedNames = new Set(updated.flatMap(e => e.collections || []));
  const updatedCollections = collections.filter(c => usedNames.has(c.name));
  await saveCollections(updatedCollections);
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
  // Remove collection but keep entries — just strip the collection tag
  const entries = await loadEntries();
  const updatedEntries = entries.map(e => ({
    ...e,
    collections: (e.collections || []).filter(c => c !== name),
  }));
  await saveEntries(updatedEntries);
  const collections = await loadCollections();
  const updatedCollections = collections.filter(c => c.name !== name);
  await saveCollections(updatedCollections);
  return { entries: updatedEntries, collections: updatedCollections };
};

// ── SAVE TO JOURNAL WITH COLLECTIONS ─────────────────────────────────────────
export const saveToJournal = async (entry, selectedCollections, existingCollections) => {
  // Add entry
  const newEntry = { ...entry, collections: selectedCollections };
  const entries = await loadEntries();
  const updatedEntries = [newEntry, ...entries];
  await saveEntries(updatedEntries);

  // Update collections — create any new ones
  let collections = [...existingCollections];
  for (const name of selectedCollections) {
    if (!collections.find(c => c.name === name)) {
      // Determine icon from entry subject category
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
    // Reset if it's a new day
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

// ── CLEAR ALL DATA ────────────────────────────────────────────────────────────
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove(Object.values(KEYS));
  } catch (e) {
    console.error("Failed to clear data:", e);
  }
};
