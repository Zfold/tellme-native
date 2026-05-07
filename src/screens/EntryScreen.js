import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Modal, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../constants";
import { deleteEntry } from "../utils/storage";

function ConfirmModal({ onConfirm, onCancel, subject }) {
  return (
    <Modal transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.confirmOverlay}>
        <View style={styles.confirmBox}>
          <Text style={styles.confirmIcon}>🗑️</Text>
          <Text style={styles.confirmTitle}>Delete Entry?</Text>
          <Text style={styles.confirmMessage}>"{subject}" and all its information will be permanently deleted.</Text>
          <Text style={styles.confirmWarning}>THIS ACTION CANNOT BE UNDONE</Text>
          <View style={styles.confirmActions}>
            <TouchableOpacity style={styles.confirmCancelBtn} onPress={onCancel}>
              <Text style={styles.confirmCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmDeleteBtn} onPress={onConfirm}>
              <Text style={styles.confirmDeleteText}>Delete Entry</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function EntryScreen({ navigation, route }) {
  const { entry } = route.params;
  const { result, imageUri, location, savedAt } = entry;
  const [showConfirm, setShowConfirm] = useState(false);
  const [viewingImage, setViewingImage] = useState(false);

  const handleDelete = async () => {
    try {
      await deleteEntry(entry.id);
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Could not delete entry.");
    }
    setShowConfirm(false);
  };

  const date = new Date(savedAt).toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Hero image - tappable for full screen */}
        <TouchableOpacity activeOpacity={0.95} onPress={() => setViewingImage(true)}>
          <View style={styles.heroContainer}>
            <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroOverlay}>
              <Text style={styles.heroSubject}>{result.subject}</Text>
              <Text style={styles.heroTagline}>{result.tagline}</Text>
            </View>
            <View style={styles.tapHint}>
              <Text style={styles.tapHintText}>TAP TO VIEW FULL</Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.content}>
          {/* Action bar */}
          <View style={styles.actionBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>← BACK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => setShowConfirm(true)}>
              <Text style={styles.deleteBtnText}>🗑  DELETE</Text>
            </TouchableOpacity>
          </View>

          {/* Date and location */}
          <Text style={styles.date}>{date}</Text>
          {location && (
            <View style={styles.locationBadge}>
              <Text style={styles.locationText}>📍 {location}</Text>
            </View>
          )}

          {/* Collections */}
          {entry.collections?.length > 0 && (
            <View style={styles.tags}>
              {entry.collections.map(c => (
                <View key={c} style={styles.tag}>
                  <Text style={styles.tagText}>{c}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Safety banner */}
          {result.safetyFlag && result.safetyNote && (
            <View style={styles.safetyBanner}>
              <Text style={styles.safetyIcon}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.safetyLabel}>SAFETY NOTICE</Text>
                <Text style={styles.safetyText}>{result.safetyNote}</Text>
              </View>
            </View>
          )}

          {/* Quick facts */}
          {result.quickFacts?.length > 0 && (
            <View style={styles.factsGrid}>
              {result.quickFacts.map((f, i) => (
                <View key={i} style={styles.factCard}>
                  <Text style={styles.factLabel}>{f.label.toUpperCase()}</Text>
                  <Text style={styles.factValue}>{f.value}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Sections */}
          {result.sections?.map((s, i) => (
            <View key={i} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{s.icon}</Text>
                <Text style={styles.sectionTitle}>{s.title}</Text>
              </View>
              <Text style={styles.sectionBody}>{s.body}</Text>
            </View>
          ))}

          {/* Did you know */}
          {result.didYouKnow && (
            <View style={styles.dyk}>
              <Text style={styles.dykLabel}>✦ DID YOU KNOW?</Text>
              <Text style={styles.dykText}>{result.didYouKnow}</Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* Full screen image viewer */}
      <Modal visible={viewingImage} transparent animationType="fade" onRequestClose={() => setViewingImage(false)}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setViewingImage(false)}>
            <Text style={styles.imageViewerCloseText}>×</Text>
          </TouchableOpacity>
          <Image source={{ uri: imageUri }} style={styles.imageViewerImg} resizeMode="contain" />
          <View style={styles.imageViewerFooter}>
            <Text style={styles.imageViewerSubject}>{result.subject}</Text>
          </View>
        </View>
      </Modal>

      {showConfirm && (
        <ConfirmModal
          subject={result.subject}
          onConfirm={handleDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:          { flex: 1, backgroundColor: COLORS.bg },
  heroContainer:      { height: 280, position: "relative" },
  heroImage:          { width: "100%", height: "100%" },
  heroOverlay:        { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 60, backgroundColor: "rgba(15,13,11,0.7)" },
  heroSubject:        { color: COLORS.white, fontSize: 22, fontWeight: "700", marginBottom: 4 },
  heroTagline:        { color: "rgba(255,255,255,0.55)", fontSize: 12, fontStyle: "italic" },
  tapHint:            { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 8, paddingVertical: 3, paddingHorizontal: 8 },
  tapHintText:        { color: "rgba(255,255,255,0.5)", fontSize: 8, fontFamily: "Courier New", letterSpacing: 1 },
  content:            { padding: 16 },
  actionBar:          { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  backBtn:            { paddingVertical: 8 },
  backBtnText:        { color: COLORS.accent, fontSize: 10, fontFamily: "Courier New", letterSpacing: 1 },
  deleteBtn:          { backgroundColor: COLORS.redDim, borderWidth: 1, borderColor: COLORS.red, borderRadius: RADIUS.md, paddingVertical: 8, paddingHorizontal: 14 },
  deleteBtnText:      { color: COLORS.red, fontSize: 11, fontFamily: "Courier New", letterSpacing: 1 },
  date:               { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic", marginBottom: 10 },
  locationBadge:      { backgroundColor: COLORS.greenDim, borderRadius: RADIUS.full, paddingVertical: 4, paddingHorizontal: 12, alignSelf: "flex-start", marginBottom: 10 },
  locationText:       { color: COLORS.green, fontSize: 10, fontFamily: "Courier New" },
  tags:               { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag:                { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.full, paddingVertical: 3, paddingHorizontal: 10 },
  tagText:            { color: "rgba(232,197,71,0.7)", fontSize: 10, fontFamily: "Courier New" },
  safetyBanner:       { flexDirection: "row", gap: 10, backgroundColor: COLORS.redDim, borderWidth: 1, borderColor: COLORS.red, borderRadius: RADIUS.md, padding: 12, marginBottom: 12 },
  safetyIcon:         { fontSize: 20 },
  safetyLabel:        { color: COLORS.red, fontSize: 9, fontFamily: "Courier New", letterSpacing: 2, marginBottom: 3 },
  safetyText:         { color: COLORS.textPrimary, fontSize: 12, lineHeight: 17 },
  factsGrid:          { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  factCard:           { backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, padding: 10, width: "48%" },
  factLabel:          { color: "rgba(232,197,71,0.5)", fontSize: 8, fontFamily: "Courier New", letterSpacing: 1.5, marginBottom: 3 },
  factValue:          { color: COLORS.textPrimary, fontSize: 13, lineHeight: 17 },
  section:            { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16, marginBottom: 10 },
  sectionHeader:      { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionIcon:        { fontSize: 18 },
  sectionTitle:       { color: COLORS.accent, fontSize: 14, fontWeight: "700" },
  sectionBody:        { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  dyk:                { backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: "rgba(232,197,71,0.3)", borderRadius: RADIUS.md, padding: 14, marginBottom: 14 },
  dykLabel:           { color: COLORS.accent, fontSize: 9, fontFamily: "Courier New", letterSpacing: 2, marginBottom: 6 },
  dykText:            { color: COLORS.textPrimary, fontSize: 13, fontStyle: "italic", lineHeight: 19 },
  imageViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.97)", justifyContent: "center", alignItems: "center" },
  imageViewerClose:   { position: "absolute", top: 50, right: 20, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center", zIndex: 10 },
  imageViewerCloseText: { color: COLORS.white, fontSize: 20 },
  imageViewerImg:     { width: "100%", height: "80%" },
  imageViewerFooter:  { position: "absolute", bottom: 40, left: 20, right: 20 },
  imageViewerSubject: { color: COLORS.white, fontSize: 16, fontWeight: "700", textAlign: "center" },
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
