import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Image, Alert, Modal, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../constants";
import { deleteEntry } from "../utils/storage";
import { exportCollectionPDF } from "../utils/pdfExport";

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

export default function CollectionScreen({ navigation, route }) {
  const { collection } = route.params;
  const [entries, setEntries] = useState(
    (route.params.entries || []).filter(e => e.collections?.includes(collection.name))
  );
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      await exportCollectionPDF(collection, route.params.entries || []);
    } catch (e) {
      Alert.alert("Export Error", e.message || "Could not generate PDF.");
    }
    setSharing(false);
  };

  const handleDeleteEntry = (entry) => {
    setConfirmDelete({
      item: entry,
      title: "Delete Entry?",
      message: `"${entry.result?.subject}" will be permanently deleted.`,
      confirmLabel: "Delete Entry",
    });
  };

  const executeDelete = async () => {
    if (!confirmDelete) return;
    try {
      await deleteEntry(confirmDelete.item.id);
      setEntries(prev => prev.filter(e => e.id !== confirmDelete.item.id));
    } catch {
      Alert.alert("Error", "Could not delete entry.");
    }
    setConfirmDelete(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← JOURNAL</Text>
        </TouchableOpacity>
        <View style={styles.headerRow}>
          <View style={styles.headerRight}>
            <Text style={styles.collIcon}>{collection.icon || "📁"}</Text>
            <View>
              <Text style={styles.title}>{collection.name}</Text>
              <Text style={styles.subtitle}>{entries.length} {entries.length === 1 ? "entry" : "entries"}</Text>
            </View>
          </View>
          {entries.length > 0 && (
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare} disabled={sharing}>
              {sharing ? (
                <ActivityIndicator color={COLORS.accent} size="small" />
              ) : (
                <Text style={styles.shareBtnText}>📤 SHARE</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyTitle}>No entries in this collection</Text>
          </View>
        ) : (
          entries.map(entry => (
            <TouchableOpacity
              key={entry.id}
              style={styles.entryCard}
              onPress={() => navigation.navigate("Entry", { entry })}
              activeOpacity={0.8}
            >
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
              </View>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteEntry(entry)}>
                <Text style={styles.deleteIcon}>🗑</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))
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
  header:           { padding: 20, paddingBottom: 12 },
  backBtn:          { marginBottom: 12 },
  backText:         { color: COLORS.accent, fontSize: 10, fontFamily: "Courier New", letterSpacing: 1 },
  headerRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerRight:      { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  collIcon:         { fontSize: 32 },
  title:            { color: COLORS.white, fontSize: 22, fontWeight: "700" },
  subtitle:         { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic", marginTop: 2 },
  shareBtn:         { backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, paddingVertical: 10, paddingHorizontal: 16 },
  shareBtnText:     { color: COLORS.accent, fontSize: 11, fontFamily: "Courier New", letterSpacing: 1, fontWeight: "700" },
  scroll:           { padding: 16, paddingTop: 0 },
  entryCard:        { flexDirection: "row", backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 10, gap: 12 },
  entryThumb:       { width: 72, height: 72, borderRadius: RADIUS.sm },
  entryContent:     { flex: 1 },
  entrySubject:     { color: COLORS.white, fontSize: 15, fontWeight: "600", marginBottom: 3 },
  entryTagline:     { color: COLORS.textMuted, fontSize: 11, fontStyle: "italic", lineHeight: 15, marginBottom: 5 },
  entryMeta:        { flexDirection: "row", gap: 8, alignItems: "center" },
  entryDate:        { color: COLORS.textMuted, fontSize: 11, fontStyle: "italic" },
  entryLocation:    { color: COLORS.green, fontSize: 10, fontFamily: "Courier New", flex: 1 },
  deleteBtn:        { alignSelf: "flex-start", padding: 4 },
  deleteIcon:       { fontSize: 16, color: "rgba(255,255,255,0.25)" },
  empty:            { alignItems: "center", paddingVertical: 60 },
  emptyIcon:        { fontSize: 40, marginBottom: 12 },
  emptyTitle:       { color: "rgba(255,255,255,0.4)", fontSize: 18, fontWeight: "700" },
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
