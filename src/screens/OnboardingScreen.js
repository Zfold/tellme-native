import { useState, useEffect, useRef } from "react";
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../constants";

const { width, height } = Dimensions.get("window");
const SCENE_DURATION = 6000;
const FADE_DURATION = 800;

// ── STORY BEATS ───────────────────────────────────────────────────────────────
const SCENES = [
  {
    bg: ["#0a1628", "#162a1f"],
    emoji: "🦋",
    emojiSize: 120,
    title: "You see something.",
    subtitle: "A butterfly. A wildflower. An old building.\nWhat is it?",
    accent: "#6FCF97",
  },
  {
    bg: ["#1a1520", "#261a18"],
    emoji: "😩",
    emojiSize: 80,
    title: "The old way.",
    subtitle: "Open Google. Take a photo. Upload it.\nScroll. Read. Still not sure.",
    accent: "#EB5757",
    showFrustration: true,
  },
  {
    bg: ["#1a1408", "#0F0D0B"],
    emoji: "📷",
    emojiSize: 100,
    title: "Point. Snap. Know.",
    subtitle: "One photo. Expert-level answers.\nHistory, science, safety — instantly.",
    accent: "#E8C547",
    showHeroPreview: true,
  },
  {
    bg: ["#12160F", "#0F0D0B"],
    emoji: "📐",
    emojiSize: 90,
    title: "Need more detail?",
    subtitle: "Multi-View captures 3 angles.\nCap, gills, habitat — one definitive answer.",
    accent: "#6FCF97",
    showMultiViewPreview: true,
  },
  {
    bg: ["#0F0D0B", "#1a1714"],
    emoji: "📓",
    emojiSize: 90,
    title: "Your discovery journal.",
    subtitle: "Save everything. Organize by trip or subject.\nShare beautiful PDFs with anyone.",
    accent: "#E8C547",
    showJournalPreview: true,
  },
  {
    bg: ["#0F0D0B", "#0F0D0B"],
    emoji: null,
    title: null,
    subtitle: null,
    isEndCard: true,
  },
];

// ── SCENE ILLUSTRATIONS ──────────────────────────────────────────────────────

function FrustrationScene() {
  return (
    <View style={sceneStyles.frustration}>
      <View style={sceneStyles.searchBar}>
        <Text style={sceneStyles.searchIcon}>🔍</Text>
        <Text style={sceneStyles.searchText}>what kind of butterfly is this...</Text>
      </View>
      <View style={sceneStyles.resultsList}>
        {["10 blue things...", "Wikipedia: Lepidoptera...", "Buy butterfly posters...", "Reddit: help identify..."].map((t, i) => (
          <View key={i} style={sceneStyles.resultItem}>
            <View style={[sceneStyles.resultDot, { backgroundColor: i === 0 ? "#4285f4" : "#888" }]} />
            <Text style={sceneStyles.resultText}>{t}</Text>
          </View>
        ))}
      </View>
      <Text style={sceneStyles.frustrationTime}>12 minutes later...</Text>
    </View>
  );
}

function HeroPreview() {
  return (
    <View style={sceneStyles.phoneFrame}>
      <View style={sceneStyles.phoneScreen}>
        <View style={sceneStyles.heroImage}>
          <Text style={{ fontSize: 50 }}>🦋</Text>
        </View>
        <View style={sceneStyles.heroOverlay}>
          <Text style={sceneStyles.heroSubject}>Eastern Tiger Swallowtail</Text>
          <Text style={sceneStyles.heroTagline}>A striking yellow butterfly...</Text>
          <View style={sceneStyles.heroPill}>
            <Text style={sceneStyles.heroPillText}>94% match</Text>
          </View>
        </View>
        <View style={sceneStyles.heroFacts}>
          <View style={sceneStyles.factChip}>
            <Text style={sceneStyles.factLabel}>WINGSPAN</Text>
            <Text style={sceneStyles.factValue}>3.5-5.5 in</Text>
          </View>
          <View style={sceneStyles.factChip}>
            <Text style={sceneStyles.factLabel}>RANGE</Text>
            <Text style={sceneStyles.factValue}>Eastern US</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function JournalPreview() {
  return (
    <View style={sceneStyles.journalFrame}>
      <Text style={sceneStyles.journalTitle}>Travel Journal</Text>
      <View style={sceneStyles.collGrid}>
        {[
          { icon: "🌿", name: "Plants", count: "12" },
          { icon: "🏛", name: "Paris Trip", count: "8" },
          { icon: "🦋", name: "Insects", count: "5" },
          { icon: "🍄", name: "Mushrooms", count: "3" },
        ].map((c, i) => (
          <View key={i} style={sceneStyles.collCard}>
            <Text style={{ fontSize: 24 }}>{c.icon}</Text>
            <Text style={sceneStyles.collName}>{c.name}</Text>
            <Text style={sceneStyles.collCount}>{c.count} entries</Text>
          </View>
        ))}
      </View>
      <View style={sceneStyles.shareBar}>
        <Text style={sceneStyles.shareText}>📤 Share as PDF</Text>
      </View>
    </View>
  );
}

function MultiViewPreview() {
  return (
    <View style={sceneStyles.mvFrame}>
      <View style={sceneStyles.mvPanels}>
        {[
          { emoji: "🍄", label: "Cap", sublabel: "Top view" },
          { emoji: "🔍", label: "Gills", sublabel: "Underneath" },
          { emoji: "🌿", label: "Habitat", sublabel: "Growing on..." },
        ].map((p, i) => (
          <View key={i} style={sceneStyles.mvPanel}>
            <View style={sceneStyles.mvPanelInner}>
              <Text style={{ fontSize: 28 }}>{p.emoji}</Text>
            </View>
            <Text style={sceneStyles.mvPanelLabel}>{p.label}</Text>
            <Text style={sceneStyles.mvPanelSub}>{p.sublabel}</Text>
          </View>
        ))}
      </View>
      <View style={sceneStyles.mvArrow}>
        <Text style={sceneStyles.mvArrowText}>↓</Text>
      </View>
      <View style={sceneStyles.mvResult}>
        <Text style={sceneStyles.mvResultSubject}>Chanterelle Mushroom</Text>
        <View style={sceneStyles.mvResultPill}>
          <Text style={sceneStyles.mvResultPillText}>94% match</Text>
        </View>
        <Text style={sceneStyles.mvResultNote}>3 views analyzed together</Text>
      </View>
    </View>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────

export default function OnboardingScreen({ onComplete }) {
  const [current, setCurrent] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timer = useRef(null);

  const isLast = current === SCENES.length - 1;

  useEffect(() => {
    // Ken Burns subtle zoom on each scene
    scaleAnim.setValue(1);
    Animated.timing(scaleAnim, {
      toValue: 1.08,
      duration: SCENE_DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start();

    // Auto-advance (except end card)
    if (!isLast) {
      timer.current = setTimeout(() => {
        goToScene(current + 1);
      }, SCENE_DURATION);
    }

    return () => clearTimeout(timer.current);
  }, [current]);

  const goToScene = (index) => {
    clearTimeout(timer.current);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: FADE_DURATION / 2,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrent(index);
      slideAnim.setValue(20);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: FADE_DURATION,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const skip = () => {
    clearTimeout(timer.current);
    onComplete();
  };

  const scene = SCENES[current];

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <View style={[styles.bgLayer, { backgroundColor: scene.bg[0] }]} />

      <Animated.View style={[styles.sceneWrap, {
        opacity: fadeAnim,
        transform: [
          { translateY: slideAnim },
          { scale: scene.isEndCard ? 1 : scaleAnim },
        ],
      }]}>

        {/* End Card */}
        {scene.isEndCard ? (
          <View style={styles.endCard}>
            <Text style={styles.endLogo}>
              <Text style={styles.endLogoWhite}>Tell</Text>
              <Text style={styles.endLogoGold}>ME</Text>
            </Text>
            <View style={styles.endDivider} />
            <Text style={styles.endTagline}>Your world, explained.</Text>

            <View style={styles.endCategories}>
              {["🏛 Landmarks", "🌿 Plants", "🦋 Insects", "🍄 Mushrooms", "🎨 Art", "🍽 Food"].map((c, i) => (
                <View key={i} style={styles.endCatChip}>
                  <Text style={styles.endCatText}>{c}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.startBtn} onPress={onComplete} activeOpacity={0.85}>
              <Text style={styles.startBtnText}>Start Exploring</Text>
            </TouchableOpacity>

            <Text style={styles.endNote}>100 free scans per day</Text>
          </View>
        ) : (
          /* Scene Content */
          <View style={styles.sceneContent}>
            {/* Illustration area */}
            <View style={styles.illustrationArea}>
              {scene.showFrustration && <FrustrationScene />}
              {scene.showHeroPreview && <HeroPreview />}
              {scene.showJournalPreview && <JournalPreview />}
              {scene.showMultiViewPreview && <MultiViewPreview />}
              {!scene.showFrustration && !scene.showHeroPreview && !scene.showJournalPreview && !scene.showMultiViewPreview && scene.emoji && (
                <Text style={{ fontSize: scene.emojiSize }}>{scene.emoji}</Text>
              )}
            </View>

            {/* Caption */}
            <View style={styles.captionArea}>
              <Text style={[styles.sceneTitle, { color: scene.accent }]}>
                {scene.title}
              </Text>
              <Text style={styles.sceneSubtitle}>{scene.subtitle}</Text>
            </View>
          </View>
        )}
      </Animated.View>

      {/* Skip button */}
      {!scene.isEndCard && (
        <TouchableOpacity style={styles.skipBtn} onPress={skip} activeOpacity={0.7}>
          <Text style={styles.skipText}>Skip →</Text>
        </TouchableOpacity>
      )}

      {/* Progress dots */}
      <View style={styles.dots}>
        {SCENES.map((_, i) => (
          <TouchableOpacity
            key={i}
            style={[styles.dot, i === current && styles.dotActive]}
            onPress={() => goToScene(i)}
          />
        ))}
      </View>
    </View>
  );
}

// ── SCENE ILLUSTRATION STYLES ─────────────────────────────────────────────────
const sceneStyles = StyleSheet.create({
  // Frustration scene
  frustration: { width: width * 0.75, alignItems: "center", gap: 12 },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, width: "100%", gap: 8 },
  searchIcon: { fontSize: 14 },
  searchText: { color: "#666", fontSize: 13, fontFamily: "Courier New" },
  resultsList: { width: "100%", gap: 6 },
  resultItem: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 8, padding: 10 },
  resultDot: { width: 8, height: 8, borderRadius: 4 },
  resultText: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  frustrationTime: { color: "#EB5757", fontSize: 14, fontStyle: "italic", marginTop: 8 },

  // Hero preview
  phoneFrame: { width: width * 0.55, aspectRatio: 0.52, backgroundColor: "#1a1a1a", borderRadius: 20, padding: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20 },
  phoneScreen: { flex: 1, backgroundColor: "#0F0D0B", borderRadius: 16, overflow: "hidden" },
  heroImage: { height: "40%", backgroundColor: "#1a2a15", justifyContent: "center", alignItems: "center" },
  heroOverlay: { paddingHorizontal: 12, paddingTop: 8 },
  heroSubject: { color: "#fff", fontSize: 14, fontWeight: "700" },
  heroTagline: { color: "rgba(255,255,255,0.5)", fontSize: 9, fontStyle: "italic", marginTop: 2 },
  heroPill: { borderWidth: 1, borderColor: "#6FCF97", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2, alignSelf: "flex-start", marginTop: 4 },
  heroPillText: { color: "#6FCF97", fontSize: 8 },
  heroFacts: { flexDirection: "row", gap: 6, paddingHorizontal: 10, paddingTop: 8 },
  factChip: { flex: 1, backgroundColor: "rgba(232,197,71,0.1)", borderWidth: 1, borderColor: "rgba(232,197,71,0.2)", borderRadius: 8, padding: 6 },
  factLabel: { color: "rgba(232,197,71,0.5)", fontSize: 6, fontFamily: "Courier New", letterSpacing: 1 },
  factValue: { color: "#fff", fontSize: 10, marginTop: 2 },

  // Journal preview
  journalFrame: { width: width * 0.7, backgroundColor: "#0F0D0B", borderRadius: 16, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  journalTitle: { color: "#fff", fontSize: 16, fontWeight: "700", marginBottom: 10 },
  collGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  collCard: { width: "47%", backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 10, alignItems: "center", gap: 4 },
  collName: { color: "#fff", fontSize: 11, fontWeight: "600" },
  collCount: { color: "rgba(255,255,255,0.3)", fontSize: 9 },
  shareBar: { marginTop: 10, backgroundColor: "rgba(232,197,71,0.1)", borderWidth: 1, borderColor: "rgba(232,197,71,0.2)", borderRadius: 8, padding: 8, alignItems: "center" },
  shareText: { color: "#E8C547", fontSize: 11, fontFamily: "Courier New" },

  // Multi-View preview
  mvFrame: { width: width * 0.8, alignItems: "center" },
  mvPanels: { flexDirection: "row", gap: 8, marginBottom: 8 },
  mvPanel: { alignItems: "center" },
  mvPanelInner: { width: (width * 0.8 - 32) / 3, aspectRatio: 1, backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 2, borderColor: "#6FCF97", borderRadius: 12, justifyContent: "center", alignItems: "center" },
  mvPanelLabel: { color: "#fff", fontSize: 11, fontWeight: "600", marginTop: 4 },
  mvPanelSub: { color: "rgba(255,255,255,0.35)", fontSize: 8, fontStyle: "italic" },
  mvArrow: { marginVertical: 6 },
  mvArrowText: { color: "#6FCF97", fontSize: 24 },
  mvResult: { backgroundColor: "rgba(111,207,151,0.08)", borderWidth: 1, borderColor: "rgba(111,207,151,0.3)", borderRadius: 12, padding: 12, alignItems: "center", width: "100%" },
  mvResultSubject: { color: "#fff", fontSize: 16, fontWeight: "700" },
  mvResultPill: { borderWidth: 1, borderColor: "#6FCF97", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginTop: 4 },
  mvResultPillText: { color: "#6FCF97", fontSize: 10 },
  mvResultNote: { color: "rgba(255,255,255,0.3)", fontSize: 10, fontStyle: "italic", marginTop: 4 },
});

// ── MAIN STYLES ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0D0B" },
  bgLayer: { ...StyleSheet.absoluteFillObject },
  sceneWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24 },

  sceneContent: { alignItems: "center", gap: 32 },
  illustrationArea: { alignItems: "center", justifyContent: "center", minHeight: height * 0.4 },
  captionArea: { alignItems: "center", paddingHorizontal: 16 },
  sceneTitle: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  sceneSubtitle: { fontSize: 15, color: "rgba(255,255,255,0.6)", textAlign: "center", lineHeight: 22 },

  // End card
  endCard: { alignItems: "center", gap: 12 },
  endLogo: { fontSize: 56, fontWeight: "700" },
  endLogoWhite: { color: "#fff" },
  endLogoGold: { color: "#E8C547" },
  endDivider: { width: 80, height: 2, backgroundColor: "#E8C547", marginVertical: 4 },
  endTagline: { color: "rgba(255,255,255,0.5)", fontSize: 16, fontStyle: "italic" },
  endCategories: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 16, paddingHorizontal: 20 },
  endCatChip: { backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14 },
  endCatText: { color: "rgba(255,255,255,0.6)", fontSize: 13 },
  startBtn: { backgroundColor: "#E8C547", borderRadius: RADIUS.lg, paddingVertical: 16, paddingHorizontal: 48, marginTop: 20 },
  startBtnText: { color: "#0F0D0B", fontSize: 18, fontWeight: "700" },
  endNote: { color: "rgba(255,255,255,0.25)", fontSize: 12, fontStyle: "italic", marginTop: 8 },

  // Controls
  skipBtn: { position: "absolute", top: 54, right: 20, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 16 },
  skipText: { color: "rgba(255,255,255,0.4)", fontSize: 13 },
  dots: { position: "absolute", bottom: 40, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 8 },
  dot: { width: 32, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.15)" },
  dotActive: { backgroundColor: "#E8C547" },
});
