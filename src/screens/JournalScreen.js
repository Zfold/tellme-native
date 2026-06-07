import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Modal, Pressable, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, RADIUS } from "../constants";
import { loadEntries, loadCollections, deleteEntry, deleteCollection } from "../utils/storage";
import { exportCollectionPDF } from "../utils/pdfExport";

// ── CONFIRM DELETE MODAL ──────────────────────────────────────────────────────
function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmIcon}>🗑️</Text>
          <Text style={styles.confirmTitle}>{title}</Text>
          <Text style={styles.confirmMessage}>{message}</Text>
          <Text style={styles.confirmWarning}>THIS ACTION CANNOT BE UNDONE</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onCancel}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmDeleteBtn} onPress={onConfirm}>
              <Text style={styles.confirmDeleteText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── COLLECTION CARD ───────────────────────────────────────────────────────────
function CollectionCard({ collection, entries, onOpen, onDelete }) {
  const collEntries = entries.filter(e => e.collections?.includes(collection.name));
  const cover = collEntries[0]?.imageUri;
  return (
    <TouchableOpacity style={styles.collCard} onPress={() => onOpen(collection)} activeOpacity={0.8}>
      {cover ? (
        <Image source={{ uri: cover }} style={styles.collCover} resizeMode="cover" />
      ) : (
        <View style={[styles.collCover, styles.collCoverEmpty]}>
          <Text style={styles.collCoverIcon}>{collection.icon || "📁"}</Text>
        </View>
      )}
      <View style={styles.collOverlay}>
        <Text style={styles.collName} numberOfLines={2}>{collection.name}</Text>
        <Text style={styles.collCount}>{collEntries.length} {collEntries.length === 1 ? "entry" : "entries"}</Text>
      </View>
      <TouchableOpacity style={styles.collDeleteBtn} onPress={() => onDelete(collection)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.collDeleteIcon}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── ENTRY CARD ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onOpen, onDelete, selectMode, selected, onToggle }) {
  return (
    <TouchableOpacity
      style={[styles.entryCard, selectMode && selected && styles.entryCardSelected]}
      onPress={() => selectMode ? onToggle(entry.id) : onOpen(entry)}
      activeOpacity={0.8}
    >
      {selectMode && (
        <View style={[styles.entryCheckbox, selected && styles.entryCheckboxSelected]}>
          {selected && <Text style={styles.entryCheckmark}>✓</Text>}
        </View>
      )}
      <Image source={{ uri: entry.imageUri }} style={styles.entryThumb} resizeMode="cover" />
      <View style={styles.entryContent}>
        <Text style={styles.entrySubject} numberOfLines={1}>{entry.result?.subject}</Text>
        <Text style={styles.entryTagline} numberOfLines={2}>{entry.result?.tagline}</Text>
        <View style={styles.entryMeta}>
          <Text style={styles.entryDate}>
            {new Date(entry.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </Text>
          {entry.location && (
            <Text style={styles.entryLocation} numberOfLines={1}>📍 {entry.location}</Text>
          )}
        </View>
        {entry.collections?.length > 0 && !selectMode && (
          <View style={styles.entryTags}>
            {entry.collections.slice(0, 2).map(c => (
              <View key={c} style={styles.entryTag}>
                <Text style={styles.entryTagText}>{c}</Text>
              </View>
            ))}
            {entry.collections.length > 2 && (
              <Text style={styles.entryTagMore}>+{entry.collections.length - 2}</Text>
            )}
          </View>
        )}
      </View>
      {!selectMode && (
        <TouchableOpacity style={styles.entryDeleteBtn} onPress={() => onDelete(entry)}>
          <Text style={styles.entryDeleteIcon}>🗑</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function JournalScreen({ navigation }) {
  const [entries, setEntries]         = useState([]);
  const [collections, setCollections] = useState([]);
  const [tab, setTab]                 = useState("collections");
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectMode, setSelectMode]   = useState(false);
  const [selected, setSelected]       = useState(new Set());
  const [sharing, setSharing]         = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const e = await loadEntries();
        const c = await loadCollections();
        setEntries(e);
        setCollections(c);
      })();
      // Exit select mode when screen regains focus
      setSelectMode(false);
      setSelected(new Set());
    }, [])
  );

  const handleDeleteEntry = (entry) => {
    setConfirmDelete({
      type: "entry",
      item: entry,
      title: "Delete Entry?",
      message: `"${entry.result?.subject}" and all its information will be permanently deleted.`,
      confirmLabel: "Delete Entry",
    });
  };

  const handleDeleteCollection = (collection) => {
    setConfirmDelete({
      type: "collection",
      item: collection,
      title: "Delete Collection?",
      message: `The collection "${collection.name}" will be deleted. Your entries will not be deleted.`,
      confirmLabel: "Delete Collection",
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "entry") {
        const result = await deleteEntry(confirmDelete.item.id);
        setEntries(result.entries);
        setCollections(result.collections);
      } else {
        const result = await deleteCollection(confirmDelete.item.name);
        setEntries(result.entries);
        setCollections(result.collections);
      }
    } catch (e) {
      Alert.alert("Error", "Could not delete. Please try again.");
    }
    setConfirmDelete(null);
  };

  // ── Share selection handlers ──
  const handleShareStart = () => {
    setSelectMode(true);
    setSelected(new Set());
  };

  const handleShareCancel = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === entries.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(entries.map(e => e.id)));
    }
  };

  const handleShareSelected = async () => {
    if (selected.size === 0) {
      Alert.alert("No entries selected", "Select at least one entry to share.");
      return;
    }
    setSharing(true);
    try {
      const selectedEntries = entries.filter(e => selected.has(e.id));
      const collection = { name: "My Discoveries", icon: "📓" };
      await exportCollectionPDF(collection, selectedEntries.map(e => ({
        ...e,
        collections: ["My Discoveries"],
      })));
    } catch (e) {
      Alert.alert("Export Error", e.message || "Could not generate PDF.");
    }
    setSharing(false);
    setSelectMode(false);
    setSelected(new Set());
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Travel Journal</Text>
          <Text style={styles.subtitle}>
            {selectMode
              ? `${selected.size} of ${entries.length} selected`
              : `${collections.length} collections · ${entries.length} entries`
            }
          </Text>
        </View>
        {!selectMode ? (
          <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate("Home")}>
            <Text style={styles.newBtnText}>📷 NEW</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleShareCancel}>
            <Text style={styles.cancelBtnText}>CANCEL</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "collections" && styles.tabActive]}
          onPress={() => { setTab("collections"); handleShareCancel(); }}
        >
          <Text style={[styles.tabText, tab === "collections" && styles.tabTextActive]}>
            📁 Collections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "all" && styles.tabActive]}
          onPress={() => { setTab("all"); handleShareCancel(); }}
        >
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>
            🗂 All Entries
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selection toolbar — shown in All Entries select mode */}
      {tab === "all" && selectMode && (
        <View style={styles.selectToolbar}>
          <TouchableOpacity style={styles.selectAllBtn} onPress={selectAll}>
            <View style={[styles.checkbox, selected.size === entries.length && styles.checkboxSelected]}>
              {selected.size === entries.length && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.selectAllText}>
              {selected.size === entries.length ? "Deselect All" : "Select All"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.shareSelectedBtn, selected.size === 0 && styles.shareSelectedBtnDisabled]}
            onPress={handleShareSelected}
            disabled={sharing || selected.size === 0}
          >
            {sharing ? (
              <ActivityIndicator color={COLORS.bg} size="small" />
            ) : (
              <Text style={styles.shareSelectedText}>
                Share {selected.size > 0 ? `(${selected.size})` : ""}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Collections tab */}
        {tab === "collections" && (
          collections.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📁</Text>
              <Text style={styles.emptyTitle}>No collections yet</Text>
              <Text style={styles.emptySubtitle}>Scan something and save it to create your first collection</Text>
            </View>
          ) : (
            <View style={styles.collGrid}>
              {collections.map(c => (
                <CollectionCard
                  key={c.name}
                  collection={c}
                  entries={entries}
                  onOpen={c => navigation.navigate("Collection", { collection: c, entries })}
                  onDelete={handleDeleteCollection}
                />
              ))}
            </View>
          )
        )}

        {/* All entries tab */}
        {tab === "all" && (
          entries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📓</Text>
              <Text style={styles.emptyTitle}>No entries yet</Text>
              <Text style={styles.emptySubtitle}>Scan something and tap Save to begin</Text>
            </View>
          ) : (
            <>
              {/* Share button — only in non-select mode */}
              {!selectMode && entries.length > 0 && (
                <TouchableOpacity style={styles.shareAllBtn} onPress={handleShareStart}>
                  <Text style={styles.shareAllBtnText}>📤 SHARE ENTRIES</Text>
                </TouchableOpacity>
              )}
              {entries.map(e => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onOpen={e => navigation.navigate("Entry", { entry: e })}
                  onDelete={handleDeleteEntry}
                  selectMode={selectMode}
                  selected={selected.has(e.id)}
                  onToggle={toggleSelect}
                />
              ))}
            </>
          )
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.title}
          message={confirmDelete.message}
          confirmLabel={confirmDelete.confirmLabel}
          onConfirm={executeDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.bg },
  header:             { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", padding: 20, paddingBottom: 12 },
  title:              { color: COLORS.white, fontSize: 28, fontWeight: "700" },
  subtitle:           { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic", marginTop: 2 },
  newBtn:             { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  newBtnText:         { color: COLORS.bg, fontSize: 13, fontWeight: "700" },
  cancelBtn:          { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 16, marginTop: 4 },
  cancelBtnText:      { color: COLORS.textMuted, fontSize: 13, fontFamily: "Courier New" },
  tabs:               { flexDirection: "row", marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.surface, borderRadius: RADIUS.md, overflow: "hidden" },
  tab:                { flex: 1, paddingVertical: 10, alignItems: "center" },
  tabActive:          { backgroundColor: COLORS.accentDim },
  tabText:            { color: COLORS.textMuted, fontSize: 13 },
  tabTextActive:      { color: COLORS.accent, fontWeight: "600" },
  selectToolbar:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  selectAllBtn:       { flexDirection: "row", alignItems: "center", gap: 8 },
  selectAllText:      { color: COLORS.textSecondary, fontSize: 13 },
  checkbox:           { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  checkboxSelected:   { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkmark:          { color: COLORS.bg, fontSize: 13, fontWeight: "700" },
  shareSelectedBtn:   { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 16, minWidth: 90, alignItems: "center" },
  shareSelectedBtnDisabled: { backgroundColor: "rgba(232,197,71,0.3)" },
  shareSelectedText:  { color: COLORS.bg, fontSize: 13, fontWeight: "700" },
  shareAllBtn:        { backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, paddingVertical: 12, alignItems: "center", marginBottom: 12 },
  shareAllBtnText:    { color: COLORS.accent, fontSize: 12, fontFamily: "Courier New", letterSpacing: 1, fontWeight: "700" },
  scroll:             { padding: 16, paddingTop: 0 },
  collGrid:           { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  collCard:           { width: "48%", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, overflow: "hidden", marginBottom: 4, position: "relative" },
  collCover:          { width: "100%", height: 100 },
  collCoverEmpty:     { backgroundColor: COLORS.surface, justifyContent: "center", alignItems: "center" },
  collCoverIcon:      { fontSize: 32 },
  collOverlay:        { padding: 10 },
  collName:           { color: COLORS.white, fontSize: 15, fontWeight: "600", marginBottom: 2 },
  collCount:          { color: COLORS.textMuted, fontSize: 11, fontStyle: "italic" },
  collDeleteBtn:      { position: "absolute", top: 6, right: 6, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12, padding: 4 },
  collDeleteIcon:     { fontSize: 14 },
  entryCard:          { flexDirection: "row", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 10, gap: 12, alignItems: "center" },
  entryCardSelected:  { borderColor: COLORS.accent, backgroundColor: COLORS.accentDim },
  entryCheckbox:      { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  entryCheckboxSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  entryCheckmark:     { color: COLORS.bg, fontSize: 14, fontWeight: "700" },
  entryThumb:         { width: 72, height: 72, borderRadius: RADIUS.sm },
  entryContent:       { flex: 1 },
  entrySubject:       { color: COLORS.white, fontSize: 15, fontWeight: "600", marginBottom: 3 },
  entryTagline:       { color: COLORS.textMuted, fontSize: 11, fontStyle: "italic", lineHeight: 15, marginBottom: 5 },
  entryMeta:          { flexDirection: "row", gap: 8, alignItems: "center" },
  entryDate:          { color: COLORS.textMuted, fontSize: 11, fontStyle: "italic" },
  entryLocation:      { color: COLORS.green, fontSize: 10, fontFamily: "Courier New", flex: 1 },
  entryTags:          { flexDirection: "row", gap: 4, marginTop: 4, flexWrap: "wrap" },
  entryTag:           { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.full, paddingVertical: 1, paddingHorizontal: 6 },
  entryTagText:       { color: "rgba(232,197,71,0.6)", fontSize: 9, fontFamily: "Courier New" },
  entryTagMore:       { color: COLORS.textMuted, fontSize: 9, alignSelf: "center" },
  entryDeleteBtn:     { alignSelf: "flex-start", padding: 4 },
  entryDeleteIcon:    { fontSize: 16, color: "rgba(255,255,255,0.25)" },
  empty:              { alignItems: "center", paddingVertical: 60 },
  emptyIcon:          { fontSize: 40, marginBottom: 12 },
  emptyTitle:         { color: "rgba(255,255,255,0.4)", fontSize: 18, fontWeight: "700", marginBottom: 4 },
  emptySubtitle:      { color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center" },
  confirmOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmBox:         { backgroundColor: "#1A1714", borderRadius: 20, padding: 28, width: "100%", borderWidth: 1, borderColor: "rgba(235,87,87,0.3)", alignItems: "center" },
  confirmIcon:        { fontSize: 32, marginBottom: 12 },
  confirmTitle:       { color: COLORS.white, fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  confirmMessage:     { color: COLORS.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 8 },
  confirmWarning:     { color: "rgba(235,87,87,0.7)", fontSize: 10, fontFamily: "Courier New", letterSpacing: 1, marginBottom: 20 },
  confirmActions:     { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancelBtn:   { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  confirmCancelText:  { color: COLORS.textSecondary, fontSize: 12, fontFamily: "Courier New" },
  confirmDeleteBtn:   { flex: 1, backgroundColor: COLORS.redDim, borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.red },
  confirmDeleteText:  { color: COLORS.red, fontSize: 12, fontFamily: "Courier New", fontWeight: "700" },
});
