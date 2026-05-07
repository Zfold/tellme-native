import { useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, Modal, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, RADIUS } from "../constants";
import { loadEntries, loadCollections, deleteEntry, deleteCollection } from "../utils/storage";

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
      <TouchableOpacity style={styles.collDeleteBtn} onPress={() => onDelete(collection)}>
        <Text style={styles.collDeleteIcon}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── ENTRY CARD ────────────────────────────────────────────────────────────────
function EntryCard({ entry, onOpen, onDelete }) {
  const date = new Date(entry.savedAt).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
  return (
    <TouchableOpacity style={styles.entryCard} onPress={() => onOpen(entry)} activeOpacity={0.8}>
      <Image source={{ uri: entry.imageUri }} style={styles.entryThumb} resizeMode="cover" />
      <View style={styles.entryContent}>
        <Text style={styles.entrySubject} numberOfLines={1}>{entry.result?.subject}</Text>
        <View style={styles.entryMeta}>
          <Text style={styles.entryDate}>{date}</Text>
          {entry.location && (
            <Text style={styles.entryLocation} numberOfLines={1}>📍 {entry.location}</Text>
          )}
        </View>
        {entry.collections?.length > 0 && (
          <View style={styles.entryTags}>
            {entry.collections.slice(0, 2).map(c => (
              <View key={c} style={styles.entryTag}>
                <Text style={styles.entryTagText}>{c}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.entryDeleteBtn} onPress={() => onDelete(entry)}>
        <Text style={styles.entryDeleteIcon}>🗑</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function JournalScreen({ navigation }) {
  const [entries, setEntries]         = useState([]);
  const [collections, setCollections] = useState([]);
  const [tab, setTab]                 = useState("collections");
  const [confirmDelete, setConfirmDelete] = useState(null);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const e = await loadEntries();
        const c = await loadCollections();
        setEntries(e);
        setCollections(c);
      })();
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Travel Journal</Text>
          <Text style={styles.subtitle}>
            {collections.length} collections · {entries.length} entries
          </Text>
        </View>
        <TouchableOpacity style={styles.newBtn} onPress={() => navigation.navigate("Home")}>
          <Text style={styles.newBtnText}>📷 NEW</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === "collections" && styles.tabActive]}
          onPress={() => setTab("collections")}
        >
          <Text style={[styles.tabText, tab === "collections" && styles.tabTextActive]}>
            📁 Collections
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === "all" && styles.tabActive]}
          onPress={() => setTab("all")}
        >
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>
            🗂 All Entries
          </Text>
        </TouchableOpacity>
      </View>

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
            entries.map(e => (
              <EntryCard
                key={e.id}
                entry={e}
                onOpen={e => navigation.navigate("Entry", { entry: e })}
                onDelete={handleDeleteEntry}
              />
            ))
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
  container:        { flex: 1, backgroundColor: COLORS.bg },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", padding: 20, paddingBottom: 12 },
  title:            { color: COLORS.white, fontSize: 24, fontWeight: "700" },
  subtitle:         { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic", marginTop: 2 },
  newBtn:           { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 16 },
  newBtnText:       { color: COLORS.bg, fontSize: 12, fontWeight: "700", fontFamily: "Courier New", letterSpacing: 1 },
  tabs:             { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: RADIUS.md, margin: 16, marginTop: 0, padding: 3 },
  tab:              { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: RADIUS.sm },
  tabActive:        { backgroundColor: COLORS.surface },
  tabText:          { color: COLORS.textMuted, fontSize: 12, fontFamily: "Courier New" },
  tabTextActive:    { color: COLORS.accent },
  scroll:           { padding: 16, paddingTop: 0 },
  collGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  collCard:         { width: "47%", borderRadius: RADIUS.lg, overflow: "hidden", borderWidth: 1, borderColor: COLORS.border, position: "relative" },
  collCover:        { width: "100%", height: 120 },
  collCoverEmpty:   { backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center" },
  collCoverIcon:    { fontSize: 36 },
  collOverlay:      { position: "absolute", bottom: 0, left: 0, right: 0, padding: 10, backgroundColor: "rgba(15,13,11,0.9)" },
  collName:         { color: COLORS.white, fontSize: 14, fontWeight: "700", lineHeight: 18 },
  collCount:        { color: COLORS.textMuted, fontSize: 9, fontFamily: "Courier New", marginTop: 2 },
  collDeleteBtn:    { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, padding: 5, borderWidth: 1, borderColor: "rgba(235,87,87,0.3)" },
  collDeleteIcon:   { fontSize: 13 },
  entryCard:        { flexDirection: "row", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 10, gap: 12 },
  entryThumb:       { width: 72, height: 72, borderRadius: RADIUS.sm },
  entryContent:     { flex: 1 },
  entrySubject:     { color: COLORS.white, fontSize: 15, fontWeight: "600", marginBottom: 3 },
  entryMeta:        { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 5 },
  entryDate:        { color: COLORS.textMuted, fontSize: 11, fontStyle: "italic" },
  entryLocation:    { color: COLORS.green, fontSize: 10, fontFamily: "Courier New", flex: 1 },
  entryTags:        { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  entryTag:         { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.full, paddingVertical: 2, paddingHorizontal: 7 },
  entryTagText:     { color: "rgba(232,197,71,0.7)", fontSize: 9, fontFamily: "Courier New" },
  entryDeleteBtn:   { alignSelf: "flex-start", padding: 4 },
  entryDeleteIcon:  { fontSize: 16, color: "rgba(255,255,255,0.25)" },
  empty:            { alignItems: "center", paddingVertical: 60 },
  emptyIcon:        { fontSize: 40, marginBottom: 12 },
  emptyTitle:       { color: "rgba(255,255,255,0.4)", fontSize: 20, fontWeight: "700", marginBottom: 8 },
  emptySubtitle:    { color: "rgba(255,255,255,0.25)", fontSize: 13, fontStyle: "italic", textAlign: "center" },
  confirmOverlay:   { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center", padding: 24 },
  confirmBox:       { backgroundColor: "#1A1714", borderRadius: 20, padding: 28, width: "100%", borderWidth: 1, borderColor: "rgba(235,87,87,0.3)", alignItems: "center" },
  confirmIcon:      { fontSize: 32, marginBottom: 12 },
  confirmTitle:     { color: COLORS.white, fontSize: 20, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  confirmMessage:   { color: COLORS.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 19, marginBottom: 8 },
  confirmWarning:   { color: "rgba(235,87,87,0.7)", fontSize: 10, fontFamily: "Courier New", letterSpacing: 1, marginBottom: 20 },
  confirmActions:   { flexDirection: "row", gap: 10, width: "100%" },
  confirmCancelBtn: { flex: 1, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  confirmCancelText:{ color: COLORS.textSecondary, fontSize: 12, fontFamily: "Courier New" },
  confirmDeleteBtn: { flex: 1, backgroundColor: COLORS.redDim, borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.red },
  confirmDeleteText:{ color: COLORS.red, fontSize: 12, fontFamily: "Courier New", fontWeight: "700" },
});