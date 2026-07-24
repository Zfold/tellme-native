import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Alert, Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { COLORS, RADIUS, FREE_SCANS_PER_DAY } from "../constants";
import {
  compressImage, extractGPSFromExif, reverseGeocode,
  buildLocationContext, callGoogleVision,
  buildVisionContext, callClaude, extractAndRepairJSON,
} from "../utils/aiUtils";
import {
  checkScanLimit, incrementScanCount, loadSettings,
} from "../utils/storage";

const { width } = Dimensions.get("window");
const PANEL_SIZE = (width - 56) / 3;

const VIEW_GUIDES = {
  default: [
    { label: "1", title: "Front View", hint: "Main subject, straight on" },
    { label: "2", title: "Side / Detail", hint: "Different angle or close-up" },
    { label: "3", title: "Context", hint: "Environment or scale reference" },
  ],
  Mushroom: [
    { label: "1", title: "Cap (Top)", hint: "Looking down at the cap" },
    { label: "2", title: "Gills / Stem", hint: "Underneath — gills, pores, or teeth" },
    { label: "3", title: "Habitat", hint: "Base, soil, what it's growing on" },
  ],
  Plant: [
    { label: "1", title: "Whole Plant", hint: "Overall shape and size" },
    { label: "2", title: "Leaf Close-up", hint: "Leaf shape, edges, texture" },
    { label: "3", title: "Flower / Bark", hint: "Flower, fruit, bark, or stem detail" },
  ],
  Insect: [
    { label: "1", title: "Top View", hint: "Wings and body from above" },
    { label: "2", title: "Side View", hint: "Profile showing legs and antennae" },
    { label: "3", title: "Close-up", hint: "Head, wing pattern, or markings" },
  ],
  Bird: [
    { label: "1", title: "Full Body", hint: "Whole bird, perched or standing" },
    { label: "2", title: "Head / Beak", hint: "Close-up of head and beak shape" },
    { label: "3", title: "Wing / Tail", hint: "Wing pattern or tail markings" },
  ],
};

export default function MultiViewScreen({ navigation }) {
  const [images, setImages] = useState([null, null, null]);
  const [activeSlot, setActiveSlot] = useState(0);
  const [subjectHint, setSubjectHint] = useState("default");
  const [analyzing, setAnalyzing] = useState(false);
  const [statusText, setStatusText] = useState("");

  const guides = VIEW_GUIDES[subjectHint] || VIEW_GUIDES.default;

  const captureImage = async (slot) => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Camera Required", "Tell ME needs camera access to capture photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: false,
      exif: true,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const compressed = await compressImage(asset.uri);

    const updated = [...images];
    updated[slot] = {
      uri: asset.uri,
      base64: compressed.base64,
      mime: compressed.mime,
      exif: asset.exif,
    };
    setImages(updated);

    // Auto-advance to next empty slot
    const nextEmpty = updated.findIndex((img, i) => i > slot && img === null);
    if (nextEmpty !== -1) setActiveSlot(nextEmpty);
  };

  const retakeImage = (slot) => {
    const updated = [...images];
    updated[slot] = null;
    setImages(updated);
    setActiveSlot(slot);
  };

  const filledCount = images.filter(Boolean).length;

  const analyzeAll = async () => {
    if (filledCount < 2) {
      Alert.alert("Need More Views", "Please capture at least 2 different views for better identification.");
      return;
    }

    setAnalyzing(true);

    try {
      // Check scan limit
      const settings = await loadSettings();
      const limit = await checkScanLimit(settings.isPremium, FREE_SCANS_PER_DAY);
      if (!limit.allowed) {
        Alert.alert("Scan Limit", `You have used all ${FREE_SCANS_PER_DAY} free scans for today.`);
        setAnalyzing(false);
        return;
      }

      // Get location from first image's EXIF or device GPS
      setStatusText("Getting location...");
      let coords = null;
      let locData = null;
      let locationContext = null;

      if (settings.useLocation) {
        // Try EXIF from first image
        const firstImage = images.find(Boolean);
        if (firstImage?.exif) {
          const { extractGPSFromExif } = await import("../utils/aiUtils");
          coords = extractGPSFromExif(firstImage.exif);
        }

        // Fallback to device GPS
        if (!coords) {
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 5000,
              });
              coords = { lat: position.coords.latitude, lng: position.coords.longitude };
            }
          } catch {}
        }

        if (coords) {
          locData = await reverseGeocode(coords.lat, coords.lng);
          if (locData) locationContext = buildLocationContext(locData);
        }
      }

      // Run Vision on the primary (first) image
      setStatusText("Analyzing with Google Vision...");
      const primaryImage = images.find(Boolean);
      const visionResult = await callGoogleVision(primaryImage.base64);
      const visionContext = visionResult ? buildVisionContext(visionResult) : null;

      // Build multi-image message for Claude
      setStatusText("Your guide is researching all views...");
      const imageContents = images
        .filter(Boolean)
        .map((img, i) => ({
          type: "image",
          source: { type: "base64", media_type: img.mime, data: img.base64 },
        }));

      const viewLabels = images
        .map((img, i) => img ? `View ${i + 1}: ${guides[i].title}` : null)
        .filter(Boolean)
        .join(", ");

      const messages = [{
        role: "user",
        content: [
          ...imageContents,
          {
            type: "text",
            text: `MULTI-VIEW IDENTIFICATION: ${filledCount} different views of the SAME subject have been provided (${viewLabels}). Analyze ALL views together for the most accurate identification. Details visible in one view may confirm or clarify what's seen in others. Respond with the JSON.`,
          },
        ],
      }];

      const raw = await callClaude(messages, null, locationContext, visionContext);

      // Parse response
      setStatusText("Processing results...");
      const cleaned = extractAndRepairJSON(raw);
      const result = JSON.parse(cleaned);

      await incrementScanCount();

      // Navigate to result screen with primary image
      const location = locData?.full || null;
      navigation.replace("Result", {
        result,
        imageUri: primaryImage.uri,
        compressedBase64: primaryImage.base64,
        imageMime: primaryImage.mime,
        location,
        locationData: locData,
        triageRoute: "multiview",
      });
    } catch (e) {
      Alert.alert("Could not analyze", e.message || "Something went wrong. Please try again.");
    }

    setAnalyzing(false);
    setStatusText("");
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← BACK</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Multi-View Capture</Text>
          <Text style={styles.subtitle}>
            Multiple angles help identify subjects more accurately
          </Text>
        </View>

        {/* Subject type selector */}
        <View style={styles.hintRow}>
          {Object.keys(VIEW_GUIDES).filter(k => k !== "default").map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.hintChip, subjectHint === key && styles.hintChipActive]}
              onPress={() => setSubjectHint(subjectHint === key ? "default" : key)}
            >
              <Text style={[styles.hintChipText, subjectHint === key && styles.hintChipTextActive]}>
                {key === "Mushroom" ? "🍄" : key === "Plant" ? "🌿" : key === "Insect" ? "🦋" : "🐦"} {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Three capture panels */}
        <View style={styles.panels}>
          {[0, 1, 2].map(slot => (
            <View key={slot} style={styles.panelWrap}>
              <TouchableOpacity
                style={[
                  styles.panel,
                  images[slot] && styles.panelFilled,
                  activeSlot === slot && !images[slot] && styles.panelActive,
                ]}
                onPress={() => images[slot] ? null : captureImage(slot)}
                activeOpacity={0.8}
                disabled={analyzing}
              >
                {images[slot] ? (
                  <Image source={{ uri: images[slot].uri }} style={styles.panelImage} resizeMode="cover" />
                ) : (
                  <View style={styles.panelEmpty}>
                    <Text style={styles.panelNumber}>{slot + 1}</Text>
                    <Text style={styles.panelIcon}>📷</Text>
                  </View>
                )}
              </TouchableOpacity>

              {/* Guide label */}
              <Text style={styles.guideTitle}>{guides[slot].title}</Text>
              <Text style={styles.guideHint}>{guides[slot].hint}</Text>

              {/* Retake button */}
              {images[slot] && !analyzing && (
                <TouchableOpacity style={styles.retakeBtn} onPress={() => retakeImage(slot)}>
                  <Text style={styles.retakeText}>Retake</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Capture button for active slot */}
        {filledCount < 3 && !analyzing && (
          <TouchableOpacity
            style={styles.captureBtn}
            onPress={() => captureImage(activeSlot)}
            activeOpacity={0.85}
          >
            <Text style={styles.captureBtnIcon}>📷</Text>
            <Text style={styles.captureBtnText}>
              Capture {guides[activeSlot].title}
            </Text>
          </TouchableOpacity>
        )}

        {/* Analyze button */}
        {filledCount >= 2 && !analyzing && (
          <TouchableOpacity
            style={styles.analyzeBtn}
            onPress={analyzeAll}
            activeOpacity={0.85}
          >
            <Text style={styles.analyzeBtnText}>
              Analyze {filledCount} Views Together
            </Text>
          </TouchableOpacity>
        )}

        {/* Analyzing state */}
        {analyzing && (
          <View style={styles.analyzingBox}>
            <ActivityIndicator color={COLORS.accent} size="large" />
            <Text style={styles.analyzingText}>{statusText}</Text>
            <Text style={styles.analyzingNote}>
              Comparing all views for best identification...
            </Text>
          </View>
        )}

        {/* Tips */}
        {!analyzing && filledCount === 0 && (
          <View style={styles.tipsBox}>
            <Text style={styles.tipsTitle}>📐 Tips for better identification</Text>
            <Text style={styles.tipsText}>
              • Each view should show a DIFFERENT angle or detail{"\n"}
              • Get close for texture, patterns, and markings{"\n"}
              • Include scale reference (hand, coin) when possible{"\n"}
              • Capture the environment the subject is in{"\n"}
              • Good lighting makes a big difference
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: COLORS.bg },
  scroll:          { padding: 20, paddingBottom: 40 },
  header:          { marginBottom: 16 },
  backText:        { color: COLORS.accent, fontSize: 10, fontFamily: "Courier New", letterSpacing: 1, marginBottom: 12 },
  title:           { color: COLORS.white, fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle:        { color: COLORS.textMuted, fontSize: 13, fontStyle: "italic" },

  hintRow:         { flexDirection: "row", gap: 8, marginBottom: 20, flexWrap: "wrap" },
  hintChip:        { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 12 },
  hintChipActive:  { backgroundColor: COLORS.accentDim, borderColor: COLORS.accentBorder },
  hintChipText:    { color: COLORS.textMuted, fontSize: 12 },
  hintChipTextActive: { color: COLORS.accent },

  panels:          { flexDirection: "row", gap: 10, marginBottom: 20 },
  panelWrap:       { flex: 1, alignItems: "center" },
  panel:           { width: PANEL_SIZE, height: PANEL_SIZE, borderRadius: RADIUS.md, borderWidth: 2, borderColor: COLORS.border, borderStyle: "dashed", overflow: "hidden", justifyContent: "center", alignItems: "center" },
  panelActive:     { borderColor: COLORS.accent, borderStyle: "solid" },
  panelFilled:     { borderColor: COLORS.green, borderStyle: "solid" },
  panelImage:      { width: "100%", height: "100%" },
  panelEmpty:      { alignItems: "center", gap: 4 },
  panelNumber:     { color: "rgba(255,255,255,0.15)", fontSize: 28, fontWeight: "700" },
  panelIcon:       { fontSize: 20 },

  guideTitle:      { color: COLORS.textPrimary, fontSize: 11, fontWeight: "600", marginTop: 6, textAlign: "center" },
  guideHint:       { color: COLORS.textMuted, fontSize: 9, textAlign: "center", fontStyle: "italic", marginTop: 2, paddingHorizontal: 4 },

  retakeBtn:       { marginTop: 4 },
  retakeText:      { color: COLORS.accent, fontSize: 10, fontFamily: "Courier New" },

  captureBtn:      { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.lg, paddingVertical: 14, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8, marginBottom: 10 },
  captureBtnIcon:  { fontSize: 18 },
  captureBtnText:  { color: COLORS.accent, fontSize: 15, fontWeight: "600" },

  analyzeBtn:      { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: "center", marginBottom: 16 },
  analyzeBtnText:  { color: COLORS.bg, fontSize: 16, fontWeight: "700" },

  analyzingBox:    { alignItems: "center", paddingVertical: 30, gap: 12 },
  analyzingText:   { color: COLORS.accent, fontSize: 14, fontWeight: "600" },
  analyzingNote:   { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic" },

  tipsBox:         { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16, marginTop: 10 },
  tipsTitle:       { color: COLORS.accent, fontSize: 14, fontWeight: "700", marginBottom: 8 },
  tipsText:        { color: COLORS.textSecondary, fontSize: 12, lineHeight: 20 },
});
