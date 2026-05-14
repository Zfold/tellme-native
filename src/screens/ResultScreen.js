import { useState, useRef } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, TextInput, ActivityIndicator, Alert, Modal,
  Pressable, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, FREE_FOLLOWUPS_PER_SCAN } from "../constants";
import { callClaude, extractAndRepairJSON } from "../utils/aiUtils";
import { saveToJournal, loadCollections } from "../utils/storage";
import { suggestCollections } from "../utils/aiUtils";

// ── SMALL COMPONENTS ──────────────────────────────────────────────────────────
function ConfidencePill({ value }) {
  const color = value > 85 ? COLORS.green : value > 60 ? COLORS.accent : COLORS.red;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{value}% match</Text>
    </View>
  );
}

function SafetyBanner({ note }) {
  return (
    <View style={styles.safetyBanner}>
      <Text style={styles.safetyIcon}>⚠️</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.safetyLabel}>SAFETY NOTICE</Text>
        <Text style={styles.safetyText}>{note}</Text>
      </View>
    </View>
  );
}

function ConfidenceNote({ note }) {
  return (
    <View style={styles.confidenceNote}>
      <Text style={styles.confidenceLabel}>IDENTIFICATION NOTE</Text>
      <Text style={styles.confidenceText}>{note}</Text>
    </View>
  );
}

function QuickFacts({ facts }) {
  return (
    <View style={styles.factsGrid}>
      {facts.map((f, i) => (
        <View key={i} style={styles.factCard}>
          <Text style={styles.factLabel}>{f.label.toUpperCase()}</Text>
          <Text style={styles.factValue}>{f.value}</Text>
        </View>
      ))}
    </View>
  );
}

function Section({ icon, title, body }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{icon}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

function DidYouKnow({ text }) {
  return (
    <View style={styles.dyk}>
      <Text style={styles.dykLabel}>✦ DID YOU KNOW?</Text>
      <Text style={styles.dykText}>{text}</Text>
    </View>
  );
}

function ChatMessage({ role, text }) {
  return (
    <View style={[styles.chatMsg, { alignSelf: role === "user" ? "flex-end" : "flex-start" }]}>
      <Text style={[styles.chatMsgText, {
        backgroundColor: role === "user" ? COLORS.accentDim : COLORS.surface,
        borderColor: role === "user" ? COLORS.accentBorder : COLORS.border,
      }]}>{text}</Text>
    </View>
  );
}

// ── SAVE MODAL ────────────────────────────────────────────────────────────────
function SaveModal({ result, locationData, onSave, onClose }) {
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState([]);
  const [customName, setCustomName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const suggested = suggestCollections(result, locationData);

  useState(() => {
    loadCollections().then(c => {
      setCollections(c);
      setSelected(suggested.map(s => s.name));
    });
  });

  const toggle = (name) => {
    setSelected(s => s.includes(name) ? s.filter(n => n !== name) : [...s, name]);
  };

  const handleSave = () => {
    const final = [...selected];
    if (customName.trim() && !final.includes(customName.trim())) {
      final.push(customName.trim());
    }
    onSave(final);
  };

  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Pressable style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Save to Journal</Text>
          <Text style={styles.modalSubject}>{result.subject}</Text>

          {suggested.length > 0 && (
            <>
              <Text style={styles.modalSectionLabel}>SUGGESTED</Text>
              {suggested.map(s => (
                <TouchableOpacity key={s.name} style={[styles.collectionRow, selected.includes(s.name) && styles.collectionRowSelected]}
                  onPress={() => toggle(s.name)}>
                  <Text style={styles.collectionIcon}>{s.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.collectionName}>{s.name}</Text>
                    <Text style={styles.collectionType}>{s.type === "location" ? "Location" : "Subject"} collection</Text>
                  </View>
                  <View style={[styles.checkbox, selected.includes(s.name) && styles.checkboxSelected]}>
                    {selected.includes(s.name) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </>
          )}

          {collections.filter(c => !suggested.find(s => s.name === c.name)).length > 0 && (
            <>
              <Text style={styles.modalSectionLabel}>YOUR COLLECTIONS</Text>
              <View style={styles.chipRow}>
                {collections.filter(c => !suggested.find(s => s.name === c.name)).map(c => (
                  <TouchableOpacity key={c.name} style={[styles.chip, selected.includes(c.name) && styles.chipSelected]}
                    onPress={() => toggle(c.name)}>
                    <Text style={styles.chipText}>{c.icon} {c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {!showCustom ? (
            <TouchableOpacity style={styles.newCollBtn} onPress={() => setShowCustom(true)}>
              <Text style={styles.newCollBtnText}>+ Create new collection</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.customRow}>
              <TextInput value={customName} onChangeText={setCustomName}
                placeholder="Collection name..." placeholderTextColor={COLORS.textMuted}
                style={styles.customInput} autoFocus />
              <TouchableOpacity onPress={() => { setShowCustom(false); setCustomName(""); }}>
                <Text style={styles.customCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save to Journal ✓</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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

// ── MAIN SCREEN ───────────────────────────────────────────────────────────────
export default function ResultScreen({ navigation, route }) {
  const {
    result, imageUri, compressedBase64, imageMime,
    location, locationData, triageRoute,
  } = route.params;

  const [saved, setSaved]               = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [chatHistory, setChatHistory]   = useState([]);
  const [chatInput, setChatInput]       = useState("");
  const [chatLoading, setChatLoading]   = useState(false);
  const [showChat, setShowChat]         = useState(false);
  const [followUpCount, setFollowUpCount] = useState(0);
  const [retryLoading, setRetryLoading] = useState(false);
  const [retryResult, setRetryResult]   = useState(null);
  const [showingRetry, setShowingRetry] = useState(false);
  const scrollRef = useRef();

  const activeResult = showingRetry && retryResult ? retryResult : result;

  const sanitizeInput = (text) => {
    const banned = [
      /ignore\s+(all\s+)?(previous|prior|above)/i,
      /system\s*prompt/i, /you\s+are\s+now/i,
      /forget\s+(everything|all)/i, /act\s+as/i, /jailbreak/i,
    ];
    if (banned.some(p => p.test(text))) return null;
    return text.slice(0, 300);
  };

  const handleSave = async (selectedCollections) => {
    try {
      const entry = {
        id: Date.now(),
        savedAt: new Date().toISOString(),
        imageUri,
        result: activeResult,
        location,
        collections: selectedCollections,
      };
      const existing = await loadCollections();
      await saveToJournal(entry, selectedCollections, existing);
      setSaved(true);
      setShowSaveModal(false);
    } catch (e) {
      Alert.alert("Error", "Could not save to journal.");
    }
  };

  const sendChat = async (text) => {
    const msg = sanitizeInput(text || chatInput);
    if (!msg || followUpCount >= FREE_FOLLOWUPS_PER_SCAN || chatLoading) return;
    setChatInput("");
    setFollowUpCount(c => c + 1);
    const userMsg = { role: "user", text: msg };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory);
    setChatLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const response = await fetch("https://tellme-backend-production.up.railway.app/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: activeResult.subject,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imageMime, data: compressedBase64 } },
              { type: "text", text: msg },
            ],
          }],
        }),
      });
      const data = await response.json();
      const reply = data.content?.find(b => b.type === "text")?.text || "Sorry, something went wrong.";
      setChatHistory([...newHistory, { role: "assistant", text: reply }]);
    } catch {
      setChatHistory([...newHistory, { role: "assistant", text: "Sorry, something went wrong." }]);
    }
    setChatLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleRetry = async () => {
    setRetryLoading(true);
    try {
      const messages = [{
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: imageMime, data: compressedBase64 } },
          { type: "text", text: `The user believes "${result.subject}" may be incorrect. Look at this image again carefully. What else could this be? Provide your best alternative identification. Respond with the same JSON format.` },
        ],
      }];
      const raw = await callClaude(messages, null);
      const parsed = JSON.parse(extractAndRepairJSON(raw));
      setRetryResult(parsed);
      setShowingRetry(true);
    } catch (e) {
      Alert.alert("Error", "Could not get alternative identification.");
    }
    setRetryLoading(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>

          {/* Hero image */}
          <View style={styles.heroContainer}>
            <Image source={{ uri: imageUri }} style={styles.heroImage} resizeMode="cover" />
            <View style={styles.heroOverlay}>
              <View style={styles.heroContent}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroSubject}>{activeResult.subject}</Text>
                  <Text style={styles.heroTagline}>{activeResult.tagline}</Text>
                </View>
                <ConfidencePill value={activeResult.confidence} />
              </View>
            </View>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backBtnText}>← NEW</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>

            {/* Action bar */}
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.newScanBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.newScanText}>📷  NEW SCAN</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveJournalBtn, saved && styles.saveJournalBtnSaved]}
                onPress={() => !saved && setShowSaveModal(true)}
                disabled={saved}
              >
                <Text style={[styles.saveJournalText, saved && { color: COLORS.green }]}>
                  {saved ? "✓  SAVED!" : "📓  SAVE"}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Original photo note */}
            {saved && (
              <Text style={styles.photoNote}>
                📱 Your original full-resolution photo is safe in your camera roll.
              </Text>
            )}

            {/* Triage route badge */}
            {triageRoute && (
              <Text style={styles.triageBadge}>
                {triageRoute === "landmark_confirmed" ? "📍 GPS LANDMARK CONFIRMED" :
                 triageRoute === "no_exif" ? "🔍 VISION ANALYSIS — NO LOCATION DATA" :
                 triageRoute === "nature_with_gps" ? "🔍 VISION ANALYSIS — NATURE SUBJECT" :
                 "⚡ DIRECT ANALYSIS — LOCATION CONTEXT"}
              </Text>
            )}

            {/* Location */}
            {location && (
              <View style={styles.locationBadge}>
                <Text style={styles.locationText}>📍 {location}</Text>
              </View>
            )}

            {/* Safety banner */}
            {activeResult.safetyFlag && activeResult.safetyNote && (
              <SafetyBanner note={activeResult.safetyNote} />
            )}

            {/* Confidence note */}
            {activeResult.confidenceNote && (
              <ConfidenceNote note={activeResult.confidenceNote} />
            )}

            {/* Not quite right button — shown when confidence < 85 */}
            {!showingRetry && activeResult.confidence < 85 && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={handleRetry}
                disabled={retryLoading}
              >
                {retryLoading ? (
                  <ActivityIndicator color={COLORS.accent} size="small" />
                ) : (
                  <Text style={styles.retryBtnText}>Not quite right? Try again →</Text>
                )}
              </TouchableOpacity>
            )}

            {/* Retry result toggle */}
            {retryResult && (
              <View style={styles.retryToggle}>
                <TouchableOpacity onPress={() => setShowingRetry(false)}
                  style={[styles.retryTab, !showingRetry && styles.retryTabActive]}>
                  <Text style={[styles.retryTabText, !showingRetry && styles.retryTabTextActive]}>
                    Original
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowingRetry(true)}
                  style={[styles.retryTab, showingRetry && styles.retryTabActive]}>
                  <Text style={[styles.retryTabText, showingRetry && styles.retryTabTextActive]}>
                    Alternative
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Quick facts */}
            {activeResult.quickFacts?.length > 0 && (
              <QuickFacts facts={activeResult.quickFacts} />
            )}

            {/* Sections */}
            {activeResult.sections?.map((s, i) => (
              <Section key={i} icon={s.icon} title={s.title} body={s.body} />
            ))}

            {/* Did you know */}
            {activeResult.didYouKnow && <DidYouKnow text={activeResult.didYouKnow} />}

            {/* Follow-up suggestions */}
            {!showChat && activeResult.followUpSuggestions?.length > 0 && followUpCount < FREE_FOLLOWUPS_PER_SCAN && (
              <View style={styles.followUps}>
                <View style={styles.followUpsHeader}>
                  <Text style={styles.followUpsLabel}>ASK MORE</Text>
                  <Text style={styles.followUpsCount}>{FREE_FOLLOWUPS_PER_SCAN - followUpCount}/{FREE_FOLLOWUPS_PER_SCAN} left</Text>
                </View>
                {activeResult.followUpSuggestions.map((s, i) => (
                  <TouchableOpacity key={i} style={styles.followUpBtn}
                    onPress={() => { setShowChat(true); sendChat(s); }}>
                    <Text style={styles.followUpText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Chat panel */}
            {showChat && (
              <View style={styles.chatPanel}>
                <View style={styles.chatHeader}>
                  <Text style={styles.chatLabel}>✦ ASK YOUR GUIDE</Text>
                  <Text style={styles.chatCount}>{FREE_FOLLOWUPS_PER_SCAN - followUpCount}/{FREE_FOLLOWUPS_PER_SCAN} left</Text>
                </View>
                <ScrollView style={styles.chatMessages} nestedScrollEnabled>
                  {chatHistory.map((m, i) => <ChatMessage key={i} role={m.role} text={m.text} />)}
                  {chatLoading && (
                    <View style={styles.chatLoading}>
                      <ActivityIndicator color={COLORS.accent} size="small" />
                    </View>
                  )}
                </ScrollView>
                {followUpCount < FREE_FOLLOWUPS_PER_SCAN ? (
                  <View style={styles.chatInputRow}>
                    <TextInput
                      value={chatInput}
                      onChangeText={setChatInput}
                      onSubmitEditing={() => sendChat()}
                      placeholder="Ask anything about this..."
                      placeholderTextColor={COLORS.textMuted}
                      style={styles.chatInput}
                      maxLength={300}
                      returnKeyType="send"
                    />
                    <TouchableOpacity style={styles.chatSendBtn} onPress={() => sendChat()} disabled={chatLoading}>
                      <Text style={styles.chatSendIcon}>→</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.chatLimitText}>Follow-up limit reached for this scan</Text>
                )}
              </View>
            )}

            {/* Open chat button */}
            {!showChat && (
              <TouchableOpacity style={styles.openChatBtn} onPress={() => setShowChat(true)}>
                <Text style={styles.openChatText}>Ask your guide a question ✦</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {showSaveModal && (
        <SaveModal
          result={activeResult}
          locationData={locationData}
          onSave={handleSave}
          onClose={() => setShowSaveModal(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  heroContainer:    { height: 300, position: "relative" },
  heroImage:        { width: "100%", height: "100%" },
  heroOverlay:      { position: "absolute", bottom: 0, left: 0, right: 0, padding: 20, paddingTop: 60, background: "transparent" },
  heroContent:      { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 12 },
  heroSubject:      { color: COLORS.white, fontSize: 24, fontWeight: "700", marginBottom: 4, lineHeight: 28 },
  heroTagline:      { color: "rgba(255,255,255,0.55)", fontSize: 12, fontStyle: "italic", lineHeight: 16 },
  backBtn:          { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: RADIUS.full, paddingVertical: 5, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  backBtnText:      { color: "rgba(255,255,255,0.7)", fontSize: 10, fontFamily: "Courier New", letterSpacing: 1 },
  content:          { padding: 16 },
  actionBar:        { flexDirection: "row", gap: 10, marginBottom: 12 },
  newScanBtn:       { flex: 1, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center" },
  newScanText:      { color: COLORS.bg, fontSize: 13, fontWeight: "700", fontFamily: "Courier New", letterSpacing: 1 },
  saveJournalBtn:   { flex: 1, backgroundColor: COLORS.accentDim, borderRadius: RADIUS.md, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.accentBorder },
  saveJournalBtnSaved: { backgroundColor: COLORS.greenDim, borderColor: COLORS.green },
  saveJournalText:  { color: COLORS.accent, fontSize: 13, fontFamily: "Courier New", letterSpacing: 1 },
  photoNote:        { color: COLORS.textMuted, fontSize: 11, fontStyle: "italic", marginBottom: 10 },
  triageBadge:      { color: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "Courier New", letterSpacing: 1, marginBottom: 8 },
  locationBadge:    { backgroundColor: COLORS.greenDim, borderRadius: RADIUS.full, paddingVertical: 4, paddingHorizontal: 12, alignSelf: "flex-start", marginBottom: 12 },
  locationText:     { color: COLORS.green, fontSize: 10, fontFamily: "Courier New", letterSpacing: 1 },
  pill:             { borderWidth: 1, borderRadius: RADIUS.full, paddingVertical: 3, paddingHorizontal: 8 },
  pillText:         { fontSize: 10, fontFamily: "Courier New", letterSpacing: 1 },
  safetyBanner:     { flexDirection: "row", gap: 10, backgroundColor: COLORS.redDim, borderWidth: 1, borderColor: COLORS.red, borderRadius: RADIUS.md, padding: 12, marginBottom: 12 },
  safetyIcon:       { fontSize: 20 },
  safetyLabel:      { color: COLORS.red, fontSize: 9, fontFamily: "Courier New", letterSpacing: 2, marginBottom: 3 },
  safetyText:       { color: COLORS.textPrimary, fontSize: 12, lineHeight: 17 },
  confidenceNote:   { backgroundColor: COLORS.accentDim, borderRadius: RADIUS.md, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.accentBorder },
  confidenceLabel:  { color: "rgba(232,197,71,0.5)", fontSize: 9, fontFamily: "Courier New", letterSpacing: 2, marginBottom: 3 },
  confidenceText:   { color: COLORS.textSecondary, fontSize: 12, fontStyle: "italic", lineHeight: 17 },
  retryBtn:         { borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, padding: 12, alignItems: "center", marginBottom: 12 },
  retryBtnText:     { color: COLORS.accent, fontSize: 13 },
  retryToggle:      { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.04)", borderRadius: RADIUS.md, padding: 3, marginBottom: 14 },
  retryTab:         { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: RADIUS.sm },
  retryTabActive:   { backgroundColor: COLORS.surface },
  retryTabText:     { color: COLORS.textMuted, fontSize: 12, fontFamily: "Courier New" },
  retryTabTextActive: { color: COLORS.accent },
  factsGrid:        { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  factCard:         { backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, padding: 10, width: "48%" },
  factLabel:        { color: "rgba(232,197,71,0.5)", fontSize: 8, fontFamily: "Courier New", letterSpacing: 1.5, marginBottom: 3 },
  factValue:        { color: COLORS.textPrimary, fontSize: 13, lineHeight: 17 },
  section:          { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 16, marginBottom: 10 },
  sectionHeader:    { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  sectionIcon:      { fontSize: 18 },
  sectionTitle:     { color: COLORS.accent, fontSize: 14, fontWeight: "700" },
  sectionBody:      { color: COLORS.textSecondary, fontSize: 13, lineHeight: 20 },
  dyk:              { backgroundColor: COLORS.accentDim, borderWidth: 1, borderColor: "rgba(232,197,71,0.3)", borderRadius: RADIUS.md, padding: 14, marginBottom: 14 },
  dykLabel:         { color: COLORS.accent, fontSize: 9, fontFamily: "Courier New", letterSpacing: 2, marginBottom: 6 },
  dykText:          { color: COLORS.textPrimary, fontSize: 13, fontStyle: "italic", lineHeight: 19 },
  followUps:        { marginBottom: 14 },
  followUpsHeader:  { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  followUpsLabel:   { color: COLORS.textMuted, fontSize: 9, fontFamily: "Courier New", letterSpacing: 2 },
  followUpsCount:   { color: COLORS.accent, fontSize: 9, fontFamily: "Courier New" },
  followUpBtn:      { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10, marginBottom: 6 },
  followUpText:     { color: COLORS.textSecondary, fontSize: 12, lineHeight: 17 },
  chatPanel:        { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.lg, padding: 14, marginBottom: 12 },
  chatHeader:       { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  chatLabel:        { color: "rgba(232,197,71,0.5)", fontSize: 9, fontFamily: "Courier New", letterSpacing: 2 },
  chatCount:        { color: COLORS.accent, fontSize: 9, fontFamily: "Courier New" },
  chatMessages:     { maxHeight: 240, marginBottom: 12 },
  chatMsg:          { maxWidth: "85%", marginBottom: 8 },
  chatMsgText:      { borderWidth: 1, borderRadius: RADIUS.md, padding: 10, color: COLORS.textPrimary, fontSize: 13, lineHeight: 18, overflow: "hidden" },
  chatLoading:      { padding: 10 },
  chatInputRow:     { flexDirection: "row", gap: 8 },
  chatInput:        { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 10, color: COLORS.textPrimary, fontSize: 13 },
  chatSendBtn:      { backgroundColor: COLORS.accent, borderRadius: RADIUS.md, width: 42, height: 42, alignItems: "center", justifyContent: "center" },
  chatSendIcon:     { color: COLORS.bg, fontSize: 18, fontWeight: "700" },
  chatLimitText:    { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic", textAlign: "center" },
  openChatBtn:      { borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, padding: 14, alignItems: "center", backgroundColor: COLORS.accentDim, marginBottom: 8 },
  openChatText:     { color: COLORS.accent, fontSize: 15, fontWeight: "600" },
  modalOverlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "flex-end" },
  modalSheet:       { backgroundColor: "#1A1714", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalHandle:      { width: 40, height: 4, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  modalTitle:       { color: COLORS.white, fontSize: 20, fontWeight: "700", marginBottom: 4 },
  modalSubject:     { color: COLORS.textMuted, fontSize: 12, fontStyle: "italic", marginBottom: 16 },
  modalSectionLabel:{ color: "rgba(232,197,71,0.5)", fontSize: 9, fontFamily: "Courier New", letterSpacing: 2, marginBottom: 8 },
  collectionRow:    { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.03)", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 12, marginBottom: 8 },
  collectionRowSelected: { backgroundColor: COLORS.accentDim, borderColor: COLORS.accentBorder },
  collectionIcon:   { fontSize: 20 },
  collectionName:   { color: COLORS.textPrimary, fontSize: 14 },
  collectionType:   { color: COLORS.textMuted, fontSize: 10, fontFamily: "Courier New", marginTop: 2 },
  checkbox:         { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  checkboxSelected: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  checkmark:        { color: COLORS.bg, fontSize: 12, fontWeight: "700" },
  chipRow:          { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip:             { backgroundColor: "rgba(255,255,255,0.04)", borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.full, paddingVertical: 6, paddingHorizontal: 12 },
  chipSelected:     { backgroundColor: COLORS.accentDim, borderColor: COLORS.accentBorder },
  chipText:         { color: COLORS.textSecondary, fontSize: 12 },
  newCollBtn:       { borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: RADIUS.md, padding: 12, alignItems: "center", marginBottom: 20, borderStyle: "dashed" },
  newCollBtnText:   { color: COLORS.textMuted, fontSize: 13, fontStyle: "italic" },
  customRow:        { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 20 },
  customInput:      { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderWidth: 1, borderColor: COLORS.accentBorder, borderRadius: RADIUS.md, padding: 10, color: COLORS.white, fontSize: 13 },
  customCancel:     { color: COLORS.textMuted, fontSize: 12, fontFamily: "Courier New" },
  modalActions:     { flexDirection: "row", gap: 10 },
  cancelBtn:        { flex: 1, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: RADIUS.md, padding: 14, alignItems: "center", borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText:    { color: COLORS.textSecondary, fontSize: 12, fontFamily: "Courier New", letterSpacing: 1 },
  saveBtn:          { flex: 2, backgroundColor: COLORS.accent, borderRadius: RADIUS.md, padding: 14, alignItems: "center" },
  saveBtnText:      { color: COLORS.bg, fontSize: 13, fontWeight: "700", fontFamily: "Courier New", letterSpacing: 1 },
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
