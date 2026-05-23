import { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, RADIUS } from "../constants";

const { width } = Dimensions.get("window");

const CATEGORIES = [
  { icon: "🏛", label: "Landmarks & Architecture", desc: "History, architects, visitor tips" },
  { icon: "🌿", label: "Plants, Flowers & Trees", desc: "Species, growing seasons, lookalikes" },
  { icon: "🦋", label: "Insects, Birds & Wildlife", desc: "Species, behavior, conservation" },
  { icon: "🍄", label: "Mushrooms & Fungi", desc: "Edibility warnings, ecological role" },
  { icon: "🎨", label: "Art & Cultural Objects", desc: "Artist, style, significance" },
  { icon: "🍽", label: "Food & Regional Cuisine", desc: "Origins, ingredients, how to eat" },
  { icon: "🏥", label: "Skin Conditions & Medical", desc: "What it may be, when to see a doctor" },
  { icon: "📦", label: "Products & Brands", desc: "Brand story, how it's used" },
];

export default function WelcomeScreen({ onComplete }) {
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.logo}>
            <Text style={styles.logoWhite}>Tell</Text>
            <Text style={styles.logoGold}>ME</Text>
          </Text>
          <View style={styles.divider} />
          <Text style={styles.tagline}>Your world, explained.</Text>
        </View>

        {/* Intro */}
        <Text style={styles.intro}>
          Point your camera at the world's most fascinating subjects and discover the stories behind them.
        </Text>

        {/* Categories */}
        <View style={styles.categories}>
          {CATEGORIES.map((cat, i) => (
            <View key={i} style={styles.catRow}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <View style={styles.catText}>
                <Text style={styles.catLabel}>{cat.label}</Text>
                <Text style={styles.catDesc}>{cat.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Value prop */}
        <View style={styles.valueSection}>
          <Text style={styles.valueTitle}>More than identification</Text>
          <Text style={styles.valueText}>
            Tell ME doesn't just label what you see — it tells you the story, the science, the history, and the fascinating details that make every discovery worth remembering.
          </Text>
        </View>

        {/* Features */}
        <View style={styles.features}>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📷</Text>
            <Text style={styles.featureText}>Snap a photo and get expert-level information instantly</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>💬</Text>
            <Text style={styles.featureText}>Ask follow-up questions — like having an expert beside you</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📓</Text>
            <Text style={styles.featureText}>Save discoveries to your travel journal and share collections</Text>
          </View>
          <View style={styles.featureRow}>
            <Text style={styles.featureIcon}>📍</Text>
            <Text style={styles.featureText}>Location-aware — knows where you are for better accuracy</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.startBtn} onPress={onComplete} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>Start Exploring</Text>
        </TouchableOpacity>

        <Text style={styles.freeNote}>10 free scans per day · No account required</Text>
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
    padding: 24,
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: "center",
    marginTop: 20,
    marginBottom: 24,
  },
  logo: {
    fontSize: 52,
    fontWeight: "700",
  },
  logoWhite: {
    color: COLORS.white,
  },
  logoGold: {
    color: COLORS.accent,
  },
  divider: {
    width: 80,
    height: 2,
    backgroundColor: COLORS.accent,
    marginVertical: 10,
    borderRadius: 1,
  },
  tagline: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontStyle: "italic",
  },
  intro: {
    color: COLORS.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 28,
  },
  categories: {
    gap: 10,
    marginBottom: 28,
  },
  catRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  catIcon: {
    fontSize: 26,
    width: 36,
    textAlign: "center",
  },
  catText: {
    flex: 1,
  },
  catLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 2,
  },
  catDesc: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontStyle: "italic",
  },
  valueSection: {
    backgroundColor: COLORS.accentDim,
    borderWidth: 1,
    borderColor: COLORS.accentBorder,
    borderRadius: RADIUS.lg,
    padding: 18,
    marginBottom: 24,
  },
  valueTitle: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  valueText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
  },
  features: {
    gap: 12,
    marginBottom: 32,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  featureIcon: {
    fontSize: 20,
    width: 28,
    textAlign: "center",
    marginTop: 1,
  },
  featureText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    flex: 1,
  },
  startBtn: {
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.lg,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  startBtnText: {
    color: COLORS.bg,
    fontSize: 18,
    fontWeight: "700",
  },
  freeNote: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: "center",
    fontStyle: "italic",
  },
});
