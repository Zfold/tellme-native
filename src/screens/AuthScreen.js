import { useState } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS } from "../constants";
import { supabase } from "../utils/supabase";

export default function AuthScreen() {
  const [mode, setMode] = useState("signin"); // signin, signup, forgot
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Sign In Failed", error.message);
    }
    // Success handled by auth listener in App.js
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing Fields", "Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak Password", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Password Mismatch", "Passwords do not match.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    } else {
      Alert.alert(
        "Check Your Email",
        "We sent a confirmation link to your email. Tap it to activate your account, then sign in.",
        [{ text: "OK", onPress: () => setMode("signin") }]
      );
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert("Enter Email", "Please enter your email address first.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());
    setLoading(false);
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      Alert.alert(
        "Reset Link Sent",
        "Check your email for a password reset link.",
        [{ text: "OK", onPress: () => setMode("signin") }]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Logo */}
          <View style={styles.logoSection}>
            <Text style={styles.logo}>
              <Text style={styles.logoWhite}>Tell</Text>
              <Text style={styles.logoGold}>ME</Text>
            </Text>
            <View style={styles.divider} />
            <Text style={styles.tagline}>Your world, explained.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.formTitle}>
              {mode === "signin" ? "Welcome Back" :
               mode === "signup" ? "Create Account" :
               "Reset Password"}
            </Text>
            <Text style={styles.formSubtitle}>
              {mode === "signin" ? "Sign in to sync your journal across devices" :
               mode === "signup" ? "Create an account to save your discoveries" :
               "Enter your email and we'll send a reset link"}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.2)"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {mode !== "forgot" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry
                />
              </View>
            )}

            {mode === "signup" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
                <TextInput
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="••••••••"
                  placeholderTextColor="rgba(255,255,255,0.2)"
                  secureTextEntry
                />
              </View>
            )}

            {/* Primary action */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={
                mode === "signin" ? handleSignIn :
                mode === "signup" ? handleSignUp :
                handleForgotPassword
              }
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.bg} />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {mode === "signin" ? "Sign In" :
                   mode === "signup" ? "Create Account" :
                   "Send Reset Link"}
                </Text>
              )}
            </TouchableOpacity>

            {/* Secondary actions */}
            {mode === "signin" && (
              <>
                <TouchableOpacity onPress={() => setMode("forgot")} style={styles.linkBtn}>
                  <Text style={styles.linkText}>Forgot password?</Text>
                </TouchableOpacity>
                <View style={styles.switchRow}>
                  <Text style={styles.switchText}>Don't have an account?</Text>
                  <TouchableOpacity onPress={() => { setMode("signup"); setPassword(""); setConfirmPassword(""); }}>
                    <Text style={styles.switchLink}> Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {mode === "signup" && (
              <View style={styles.switchRow}>
                <Text style={styles.switchText}>Already have an account?</Text>
                <TouchableOpacity onPress={() => { setMode("signin"); setPassword(""); setConfirmPassword(""); }}>
                  <Text style={styles.switchLink}> Sign In</Text>
                </TouchableOpacity>
              </View>
            )}

            {mode === "forgot" && (
              <TouchableOpacity onPress={() => setMode("signin")} style={styles.linkBtn}>
                <Text style={styles.linkText}>← Back to Sign In</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.footerNote}>
            Your journal syncs securely across devices.{"\n"}
            100 free scans per day.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: COLORS.bg },
  scroll:       { padding: 24, paddingBottom: 40 },
  logoSection:  { alignItems: "center", marginTop: 40, marginBottom: 32 },
  logo:         { fontSize: 48, fontWeight: "700" },
  logoWhite:    { color: COLORS.white },
  logoGold:     { color: COLORS.accent },
  divider:      { width: 60, height: 2, backgroundColor: COLORS.accent, marginVertical: 10, borderRadius: 1 },
  tagline:      { color: COLORS.textMuted, fontSize: 14, fontStyle: "italic" },
  form:         { marginBottom: 24 },
  formTitle:    { color: COLORS.white, fontSize: 24, fontWeight: "700", marginBottom: 6 },
  formSubtitle: { color: COLORS.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 19 },
  inputGroup:   { marginBottom: 16 },
  inputLabel:   { color: COLORS.accent, fontSize: 9, fontFamily: "Courier New", letterSpacing: 2, marginBottom: 6 },
  input:        { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: 14, color: COLORS.white, fontSize: 15 },
  primaryBtn:   { backgroundColor: COLORS.accent, borderRadius: RADIUS.lg, paddingVertical: 16, alignItems: "center", marginTop: 8, marginBottom: 12 },
  primaryBtnText: { color: COLORS.bg, fontSize: 16, fontWeight: "700" },
  linkBtn:      { alignItems: "center", paddingVertical: 8 },
  linkText:     { color: COLORS.textMuted, fontSize: 13 },
  switchRow:    { flexDirection: "row", justifyContent: "center", paddingVertical: 12 },
  switchText:   { color: COLORS.textMuted, fontSize: 13 },
  switchLink:   { color: COLORS.accent, fontSize: 13, fontWeight: "600" },
  footerNote:   { color: "rgba(255,255,255,0.2)", fontSize: 11, textAlign: "center", lineHeight: 17, fontStyle: "italic" },
});
