import { supabase } from "./supabase";

// ── SYNC ENTRY TO CLOUD ──────────────────────────────────────────────────────
export const syncEntryToCloud = async (entry, collections) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const r = entry.result || {};

    // Upsert entry
    const { error: entryError } = await supabase
      .from("entries")
      .upsert({
        id: entry.id,
        user_id: user.id,
        subject: r.subject || null,
        tagline: r.tagline || null,
        confidence: r.confidence || null,
        confidence_note: r.confidenceNote || null,
        subject_category: r.subjectCategory || null,
        result_json: r,
        location: entry.location || null,
        latitude: entry.latitude || null,
        longitude: entry.longitude || null,
        image_path: entry.imageUri || null,
        saved_at: entry.savedAt || new Date().toISOString(),
      }, { onConflict: "id" });

    if (entryError) {
      console.warn("Cloud sync entry failed:", entryError.message);
      return;
    }

    // Sync collections for this entry
    if (collections && collections.length > 0) {
      // Delete existing collection links for this entry
      await supabase
        .from("entry_collections")
        .delete()
        .eq("entry_id", entry.id)
        .eq("user_id", user.id);

      // Insert new collection links
      const links = collections.map(name => ({
        entry_id: entry.id,
        user_id: user.id,
        collection_name: name,
      }));
      await supabase.from("entry_collections").insert(links);

      // Ensure collection records exist
      for (const name of collections) {
        const icon = entry.result?.subjectCategory
          ? getIconForCategory(entry.result.subjectCategory)
          : "📁";
        await supabase
          .from("collections")
          .upsert({
            user_id: user.id,
            name,
            icon,
          }, { onConflict: "user_id,name", ignoreDuplicates: true });
      }
    }

    console.log("Cloud sync: entry saved", entry.id);
  } catch (e) {
    console.warn("Cloud sync failed:", e.message);
    // Fail silently — local save already succeeded
  }
};

// ── DELETE ENTRY FROM CLOUD ──────────────────────────────────────────────────
export const deleteEntryFromCloud = async (entryId) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete entry (cascades to entry_collections)
    await supabase
      .from("entries")
      .delete()
      .eq("id", entryId)
      .eq("user_id", user.id);

    // Clean up orphaned collections
    await cleanOrphanedCollections(user.id);

    console.log("Cloud sync: entry deleted", entryId);
  } catch (e) {
    console.warn("Cloud delete failed:", e.message);
  }
};

// ── UPDATE ENTRY COLLECTIONS IN CLOUD ────────────────────────────────────────
export const updateEntryCollectionsCloud = async (entryId, newCollections) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Delete existing links
    await supabase
      .from("entry_collections")
      .delete()
      .eq("entry_id", entryId)
      .eq("user_id", user.id);

    // Insert new links
    if (newCollections.length > 0) {
      const links = newCollections.map(name => ({
        entry_id: entryId,
        user_id: user.id,
        collection_name: name,
      }));
      await supabase.from("entry_collections").insert(links);

      // Ensure collection records exist
      for (const name of newCollections) {
        await supabase
          .from("collections")
          .upsert({
            user_id: user.id,
            name,
            icon: "📁",
          }, { onConflict: "user_id,name", ignoreDuplicates: true });
      }
    }

    await cleanOrphanedCollections(user.id);
    console.log("Cloud sync: collections updated for entry", entryId);
  } catch (e) {
    console.warn("Cloud collection update failed:", e.message);
  }
};

// ── DELETE COLLECTION FROM CLOUD ─────────────────────────────────────────────
export const deleteCollectionFromCloud = async (collectionName) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Remove collection links
    await supabase
      .from("entry_collections")
      .delete()
      .eq("collection_name", collectionName)
      .eq("user_id", user.id);

    // Delete collection record
    await supabase
      .from("collections")
      .delete()
      .eq("name", collectionName)
      .eq("user_id", user.id);

    console.log("Cloud sync: collection deleted", collectionName);
  } catch (e) {
    console.warn("Cloud collection delete failed:", e.message);
  }
};

// ── PULL FROM CLOUD (on launch / manual refresh) ─────────────────────────────
export const pullFromCloud = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Fetch entries
    const { data: cloudEntries, error: entriesError } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("saved_at", { ascending: false });

    if (entriesError) {
      console.warn("Cloud pull entries failed:", entriesError.message);
      return null;
    }

    // Fetch entry-collection links
    const { data: cloudLinks, error: linksError } = await supabase
      .from("entry_collections")
      .select("entry_id, collection_name")
      .eq("user_id", user.id);

    if (linksError) {
      console.warn("Cloud pull links failed:", linksError.message);
      return null;
    }

    // Fetch collections
    const { data: cloudCollections, error: collError } = await supabase
      .from("collections")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (collError) {
      console.warn("Cloud pull collections failed:", collError.message);
      return null;
    }

    // Build a map of entry_id → collection names
    const collMap = {};
    for (const link of (cloudLinks || [])) {
      if (!collMap[link.entry_id]) collMap[link.entry_id] = [];
      collMap[link.entry_id].push(link.collection_name);
    }

    // Convert cloud entries to local format
    const entries = (cloudEntries || []).map(e => ({
      id: e.id,
      savedAt: e.saved_at,
      imageUri: e.image_path,
      location: e.location,
      latitude: e.latitude,
      longitude: e.longitude,
      result: e.result_json || {
        subject: e.subject,
        tagline: e.tagline,
        confidence: e.confidence,
        confidenceNote: e.confidence_note,
        subjectCategory: e.subject_category,
      },
      collections: collMap[e.id] || [],
    }));

    const collections = (cloudCollections || []).map(c => ({
      name: c.name,
      icon: c.icon || "📁",
      createdAt: c.created_at,
    }));

    console.log(`Cloud pull: ${entries.length} entries, ${collections.length} collections`);
    return { entries, collections };
  } catch (e) {
    console.warn("Cloud pull failed:", e.message);
    return null;
  }
};

// ── SYNC SCAN COUNT ──────────────────────────────────────────────────────────
export const syncScanCount = async (count, date) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from("profiles")
      .update({ scan_count: count, scan_date: date })
      .eq("id", user.id);
  } catch (e) {
    console.warn("Scan count sync failed:", e.message);
  }
};

export const getScanCountFromCloud = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("scan_count, scan_date, is_premium, premium_expires")
      .eq("id", user.id)
      .single();

    if (error || !data) return null;

    return {
      count: data.scan_count || 0,
      date: data.scan_date || new Date().toISOString().split("T")[0],
      isPremium: data.is_premium || false,
      premiumExpires: data.premium_expires,
    };
  } catch {
    return null;
  }
};

// ── HELPERS ──────────────────────────────────────────────────────────────────

const cleanOrphanedCollections = async (userId) => {
  try {
    // Get all collection names that still have entries
    const { data: usedLinks } = await supabase
      .from("entry_collections")
      .select("collection_name")
      .eq("user_id", userId);

    const usedNames = new Set((usedLinks || []).map(l => l.collection_name));

    // Get all collections
    const { data: allCollections } = await supabase
      .from("collections")
      .select("name")
      .eq("user_id", userId);

    // Delete orphaned ones
    for (const c of (allCollections || [])) {
      if (!usedNames.has(c.name)) {
        await supabase
          .from("collections")
          .delete()
          .eq("user_id", userId)
          .eq("name", c.name);
      }
    }
  } catch (e) {
    console.warn("Orphan cleanup failed:", e.message);
  }
};

const getIconForCategory = (category) => {
  const icons = {
    Spider: "🕷️", Insect: "🦋", Bird: "🐦", Mammal: "🦊",
    Reptile: "🦎", Mushroom: "🍄", Plant: "🌿", Flower: "🌸",
    Tree: "🌳", Landmark: "🏛", Architecture: "🏗", Artwork: "🎨",
    Food: "🍽", Product: "📦", Medical: "🏥", Animal: "🐾",
  };
  return icons[category] || "📁";
};
