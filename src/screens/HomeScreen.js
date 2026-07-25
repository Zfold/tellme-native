import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { COLORS, RADIUS, FREE_SCANS_PER_DAY } from '../constants';
import { checkScanLimit, loadEntries } from '../utils/storage';

export default function HomeScreen({ navigation }) {
  const [scansRemaining, setScansRemaining] = useState(FREE_SCANS_PER_DAY);
  const [useLocation, setUseLocation] = useState(true);
  const [recentEntries, setRecentEntries] = useState([]);

  const refreshState = useCallback(async () => {
    try {
      const savedPref = await AsyncStorage.getItem('tellme_use_location');
      if (savedPref !== null) setUseLocation(savedPref === 'true');

      const scanInfo = await checkScanLimit(false, FREE_SCANS_PER_DAY);
      setScansRemaining(Math.max(0, FREE_SCANS_PER_DAY - (scanInfo?.count ?? 0)));

      const entries = await loadEntries();
      setRecentEntries((entries || []).slice(0, 3));
    } catch (err) {
      console.log('HomeScreen refresh error:', err);
    }
  }, []);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  useFocusEffect(
    useCallback(() => {
      refreshState();
    }, [refreshState])
  );

  const toggleLocation = async (value) => {
    setUseLocation(value);
    await AsyncStorage.setItem('tellme_use_location', value ? 'true' : 'false');
    if (value) {
      await Location.requestForegroundPermissionsAsync();
    }
  };

  const goCamera = () => navigation.navigate('Camera', { useLocation });
  const goMultiView = () => navigation.navigate('MultiView', { useLocation });
  const goJournal = () => navigation.navigate('Journal');
  const goEntry = (entry) => navigation.navigate('Entry', { entryId: entry.id });
  const replayTutorial = () => navigation.navigate('Onboarding', { fromHome: true });

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: wordmark + Journal card */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.wordmark}>
              Tell<Text style={styles.wordmarkAccent}>ME</Text>
            </Text>
            <Text style={styles.tagline}>Your world, explained.</Text>
          </View>

          <TouchableOpacity
            style={styles.journalCard}
            onPress={goJournal}
            activeOpacity={0.7}
          >
            <Text style={styles.journalIcon}>📓</Text>
            <Text style={styles.journalLabel}>JOURNAL</Text>
          </TouchableOpacity>
        </View>

        {/* Location toggle card */}
        <View style={styles.locationCard}>
          <View style={styles.locationLeft}>
            <Text style={styles.locationPin}>📍</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.locationLabel}>USE PHOTO LOCATION</Text>
              <Text style={styles.locationSub}>
                Improves species and landmark accuracy
              </Text>
            </View>
          </View>
          <Switch
            value={useLocation}
            onValueChange={toggleLocation}
            trackColor={{ false: '#3A342A', true: COLORS.gold }}
            thumbColor={useLocation ? '#0F0D0B' : '#8A8578'}
            ios_backgroundColor="#3A342A"
          />
        </View>

        {/* Scans remaining */}
        <Text style={styles.scansText}>
          {scansRemaining} free scans remaining today
        </Text>

        {/* PRIMARY: Take Photo */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={goCamera}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryIcon}>📷</Text>
          <Text style={styles.primaryLabel}>Take Photo</Text>
        </TouchableOpacity>

        {/* SECONDARY: Take Multi-View Images */}
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={goMultiView}
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryIcon}>🖼️</Text>
          <View style={styles.secondaryTextWrap}>
            <Text style={styles.secondaryLabel}>Take Multi-View Images</Text>
            <Text style={styles.secondarySub}>3 angles · better accuracy</Text>
          </View>
        </TouchableOpacity>

        {/* Category chips */}
        <Text style={styles.categoryLine}>
          Landmarks · Wildlife · Plants · Art · Food · Culture
        </Text>

        {/* Recent Saves */}
        <View style={styles.recentHeader}>
          <Text style={styles.recentTitle}>RECENT SAVES</Text>
          <TouchableOpacity onPress={goJournal}>
            <Text style={styles.seeAll}>SEE ALL →</Text>
          </TouchableOpacity>
        </View>

        {recentEntries.length === 0 ? (
          <Text style={styles.emptyHint}>Your saves will appear here.</Text>
        ) : (
          recentEntries.map((entry) => (
            <TouchableOpacity
              key={entry.id}
              style={styles.recentCard}
              onPress={() => goEntry(entry)}
              activeOpacity={0.7}
            >
              <Text style={styles.recentSubject} numberOfLines={1}>
                {entry.subject || 'Untitled'}
              </Text>
              <Text style={styles.recentDate}>{formatDate(entry.saved_at)}</Text>
            </TouchableOpacity>
          ))
        )}

        {/* Tutorial replay chip */}
        <TouchableOpacity
          style={styles.tutorialChip}
          onPress={replayTutorial}
          activeOpacity={0.7}
        >
          <Text style={styles.tutorialIcon}>▶</Text>
          <Text style={styles.tutorialLabel}>Watch Tutorial Again</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const CARD_INSET = 20;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingHorizontal: CARD_INSET, paddingTop: 8, paddingBottom: 32 },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  wordmark: {
    fontSize: 44,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  wordmarkAccent: { color: COLORS.gold },
  tagline: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
    marginTop: 2,
  },
  journalCard: {
    width: 78,
    height: 78,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalIcon: { fontSize: 26, marginBottom: 4 },
  journalLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.8,
  },

  // Location card
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.35)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  locationPin: { fontSize: 18 },
  locationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 1,
  },
  locationSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontStyle: 'italic',
    marginTop: 2,
  },

  scansText: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 14,
  },

  // Primary action (unchanged from your current style)
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.gold,
    borderRadius: RADIUS,
    paddingVertical: 22,
    marginBottom: 12,
  },
  primaryIcon: { fontSize: 22 },
  primaryLabel: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F0D0B',
  },

  // Secondary action — filled dark surface, reads as a real button
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#1E1A14',
    borderWidth: 1,
    borderColor: 'rgba(245, 200, 66, 0.35)',
    borderRadius: RADIUS,
    paddingVertical: 14,
    marginHorizontal: 24, // slight inset visually subordinates it to Take Photo
    marginBottom: 20,
  },
  secondaryIcon: { fontSize: 20 },
  secondaryTextWrap: { alignItems: 'flex-start' },
  secondaryLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gold,
  },
  secondarySub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 2,
  },

  categoryLine: {
    textAlign: 'center',
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    marginBottom: 22,
  },

  // Recent Saves
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
    letterSpacing: 1.2,
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    letterSpacing: 0.6,
  },
  recentCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
  },
  recentSubject: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  recentDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  emptyHint: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 13,
    fontStyle: 'italic',
    marginBottom: 12,
  },

  // Tutorial chip — visible without shouting
  tutorialChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingVertical: 9,
    paddingHorizontal: 18,
    marginTop: 24,
  },
  tutorialIcon: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
  },
  tutorialLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
  },
});
