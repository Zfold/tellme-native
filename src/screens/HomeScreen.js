import { useState, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { useFocusEffect } from "@react-navigation/native";
import { COLORS, RADIUS, FREE_SCANS_PER_DAY } from "../constants";
import {
  compressImage, extractGPSFromExif, reverseGeocode,
  buildLocationContext, triageImage, callGoogleVision,
  buildVisionContext, buildPrompt, callClaude, extractAndRepairJSON,
} from "../utils/aiUtils";
import {
  loadSettings, saveSettings, loadEntries,
  loadCollections, checkScanLimit, incrementScanCount,
} from "../utils/storage";

export default function HomeScreen({ navigation }) {
  const [settings, setSettings]           = useState({ useLocation: true, isPremium: false });
  const [analyzing, setAnalyzing]         = useState(false);
  const [statusText, setStatusText]       = useState("");
  const [recentEntries, setRecentEntries] = useState([]);
  const [scanInfo, setScanInfo]           = useState({ remaining: FREE_SCANS_PER_DAY });

  // Load settings and recent entries whenever screen is focused
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await loadSettings();
        setSettings(s);
        const entries = await loadEntries();
        setRecentEntries(entries.slice(0, 3));
        const limit = await checkScanLimit(s.isPremium, FREE_SCANS_PER_DAY);
        setScanInfo(limit);
      })();
    }, [])
  );

  const toggleLocation = async (val) => {
    const updated = { ...settings, useLocation: val };
    setSettings(updated);
    await saveSettings(updated);
  };

  const pickImage = async (useCamera) => {
    try {
      // Check scan limit
      const limit = await checkScanLimit(settings.isPremium, FREE_SCANS_PER_DAY);
      if (!limit.allowed) {
        Alert.alert(
          "Daily Limit Reached",
          `You have used all ${FREE_SCANS_PER_DAY} free scans for today. Upgrade to premium for unlimited scans.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Request permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Camera access is required to take photos.");
          return;
        }
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert("Permission needed", "Photo library access is required.");
          return;
        }
      }

      // Launch camera or picker
      const pickerResult = useCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 1,
            exif: true,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 1,
            exif: true,
          });

      if (pickerResult.canceled) return;

      const asset = pickerResult.assets[0];
      await analyzeImage(asset);
    } catch (e) {
      Alert.alert("Error", e.message);
    }
  };

  const analyzeImage = async (asset) => {
    setAnalyzing(true);
    try {
      // Step 1 — Compress image
      setStatusText("Preparing image...");
      const compressed = await compressImage(asset.uri);

      // Step 2 — Extract location (EXIF first, device GPS fallback)
      let coords = null;
      let locData = null;
      let locationContext = null;
      let exifPresent = false;

      if (settings.useLocation) {
        // Try EXIF GPS first
        if (asset.exif) {
          setStatusText("Reading photo location...");
          coords = extractGPSFromExif(asset.exif);
          exifPresent = !!coords;
        }

        // Fallback to device GPS if EXIF has no coordinates
        if (!coords) {
          setStatusText("Getting device location...");
          try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === "granted") {
              const position = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
                timeout: 5000,
              });
              coords = { lat: position.coords.latitude, lng: position.coords.longitude };
              exifPresent = true; // treat device GPS same as EXIF for triage purposes
            }
          } catch (e) {
            console.warn("Device GPS fallback failed:", e.message);
          }
        }

        // Reverse geocode whatever coordinates we have
        if (coords) {
          setStatusText("Resolving location...");
          locData = await reverseGeocode(coords.lat, coords.lng);
          if (locData) locationContext = buildLocationContext(locData);
        }
      }

      // Step 3 — Triage
      setStatusText("Evaluating image...");
      const triage = await triageImage(compressed.base64, compressed.mime, coords, exifPresent);

      // Step 4 — Google Vision (if needed)
      let visionContext = null;
      if (triage.useVision) {
        setStatusText("Running visual identification...");
        const visionResult = await callGoogleVision(compressed.base64);
        visionContext = buildVisionContext(visionResult);
      } else if (triage.nearbyLandmark) {
        visionContext = `LANDMARK CONFIRMED BY GPS: ${triage.nearbyLandmark.name}\nDistance: ${triage.nearbyLandmark.distKm.toFixed(2)}km\nWrite rich landmark tour guide content.\nCONFIDENCE: VERY HIGH`;
      }

      // Step 5 — Claude analysis
      setStatusText("Your guide is researching...");
      const messages = [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: compressed.mime, data: compressed.base64 } },
          { type: "text", text: "Analyze this image and respond with the JSON." },
        ],
      }];
      const raw = await callClaude(messages, buildPrompt(locationContext, visionContext));
      const parsed = JSON.parse(extractAndRepairJSON(raw));

      // Step 6 — Increment scan count
      await incrementScanCount();

      // Step 7 — Navigate to results
      navigation.navigate("Result", {
        result: parsed,
        imageUri: asset.uri,
        compressedBase64: compressed.base64,
        imageMime: compressed.mime,
        location: locData?.full || null,
        locationData: locData,
        triageRoute: triage.route,
      });
    } catch (e) {
      console.error("Analysis error:", e);
      Alert.alert("Could not analyze image", e.message || "Please try again.");
    } finally {
      setAnalyzing(false);
      setStatusText("");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.logo}>
              <Text style={styles.logoWhite}>Tell</Text>
              <Text style={styles.logoAccent}>ME</Text>
            </Text>
            <Text style={styles.tagline}>Your world, explained.</Text>
          </View>
          <TouchableOpacity
            style={styles.journalBtn}
            onPress={() => navigation.navigate("Journal")}
          >
            <Text style={styles.journalBtnIcon}>📓</Text>
            <Text style={styles.journalBtnLabel}>JOURNAL</Text>
          </TouchableOpacity>
        </View>

        {/* Location toggle */}
        <View style={styles.toggleRow}>
          <View style={styles.toggleLeft}>
            <Text style={styles.toggleIcon}>📍</Text>
            <View>
              <Text style={[styles.toggleTitle, { color: settings.useLocation ? COLORS.accent : COLORS.textMuted }]}>
                USE PHOTO LOCATION
              </Text>
              <Text style={styles.toggleSub}>Improves species and landmark accuracy</Text>
            </View>
          </View>
          <Switch
            value={settings.useLocation}
            onValueChange={toggleLocation}
            trackColor={{ false: COLORS.border, true: COLORS.accent }}
            thumbColor={settings.useLocation ? COLORS.bg : COLORS.textMuted}
          />
        </View>

        {/* Scan count */}
        {!settings.isPremium && (
          <View style={styles.scanCount}>
            <Text style={styles.scanCountText}>
              {scanInfo.remaining ?? FREE_SCANS_PER_DAY} free scans remaining today
            </Text>
          </View>
        )}

        {/* Camera buttons */}
        {analyzing ? (
          <View style={styles.analyzingBox}>
            <ActivityIndicator size="large" color={COLORS.accent} />
            <Text style={styles.analyzingText}>{statusText}</Text>
          </View>
        ) : (
          <View style={styles.captureArea}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => pickImage(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnIcon}>📷</Text>
              <Text style={styles.primaryBtnText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => pickImage(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>
              Landmarks · Wildlife · Plants · Art · Food · Culture
            </Text>
          </View>
        )}

        {/* Recent entries */}
        {recentEntries.length > 0 && !analyzing && (
          <View style={styles.recentSection}>
            <View style={styles.recentHeader}>
              <Text style={styles.recentLabel}>RECENT SAVES</Text>
              <TouchableOpacity onPress={() => navigation.navigate("Journal")}>
                <Text style={styles.seeAll}>SEE ALL →</Text>
              </TouchableOpacity>
            </View>
            {recentEntries.map(entry => (
              <TouchableOpacity
                key={entry.id}
                style={styles.recentCard}
                onPress={() => navigation.navigate("Entry", { entry })}
                activeOpacity={0.8}
              >
                <Text style={styles.recentSubject} numberOfLines={1}>
                  {entry.result?.subject}
                </Text>
                <View style={styles.recentMeta}>
                  <Text style={styles.recentDate}>
                    {new Date(entry.savedAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric",
                    })}
                  </Text>
                  {entry.location && (
                    <Text style={styles.recentLocation} numberOfLines={1}>
                      📍 {entry.location}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 24,
    marginTop: 8,
  },
  logo: {
    fontSize: 42,
    lineHeight: 46,
    fontWeight: "700",
  },
  logoWhite: {
    color: COLORS.white,
  },
  logoAccent: {
    color: COLORS.accent,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontStyle: "italic",
    marginTop: 2,
  },
  journalBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  journalBtnIcon: {
    fontSize: 18,
  },
  journalBtnLabel: {
    color: COLORS.textMuted,
    fontSize: 8,
    letterSpacing: 1,
    marginTop: 2,
    fontFamily: "Courier New",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  toggleIcon: {
    fontSize: 18,
  },
  toggleTitle: {
    fontSize: 10,
    fontFamily: "Courier New",
    letterSpacing: 1,
    fontWeight: "700",
  },
  toggleSub: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 2,
  },
  scanCount: {
    alignItems: "center",
    marginBottom: 16,
  },
  scanCountText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontFamily: "Courier New",
    letterSpacing: 0.5,
  },
  captureArea: {
    alignItems: "center",
    gap: 12,
    marginBottom: 32,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    paddingHorizontal: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  primaryBtnIcon: {
    fontSize: 22,
  },
  primaryBtnText: {
    color: COLORS.bg,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  secondaryBtn: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.lg,
    paddingVertical: 14,
    width: "100%",
    alignItems: "center",
  },
  secondaryBtnText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  hint: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  analyzingBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 16,
  },
  analyzingText: {
    color: COLORS.accent,
    fontSize: 12,
    fontFamily: "Courier New",
    letterSpacing: 1,
  },
  recentSection: {
    gap: 8,
  },
  recentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  recentLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontFamily: "Courier New",
    letterSpacing: 2,
  },
  seeAll: {
    color: COLORS.accent,
    fontSize: 9,
    fontFamily: "Courier New",
    letterSpacing: 1,
  },
  recentCard: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  recentSubject: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  recentMeta: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  recentDate: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  recentLocation: {
    color: COLORS.green,
    fontSize: 10,
    fontFamily: "Courier New",
    flex: 1,
  },
});
