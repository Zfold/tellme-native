import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "./src/constants";
import { supabase } from "./src/utils/supabase";

import AuthScreen       from "./src/screens/AuthScreen";
import WelcomeScreen    from "./src/screens/WelcomeScreen";
import HomeScreen       from "./src/screens/HomeScreen";
import ResultScreen     from "./src/screens/ResultScreen";
import JournalScreen    from "./src/screens/JournalScreen";
import CollectionScreen from "./src/screens/CollectionScreen";
import EntryScreen      from "./src/screens/EntryScreen";

const Stack = createNativeStackNavigator();
const WELCOME_KEY = "tellme_welcome_shown";

export default function App() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // Listen for changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check welcome screen status after auth
  useEffect(() => {
    if (session) {
      AsyncStorage.getItem(WELCOME_KEY).then(val => {
        setShowWelcome(val !== "true");
      });
    }
  }, [session]);

  const handleWelcomeComplete = async () => {
    await AsyncStorage.setItem(WELCOME_KEY, "true");
    setShowWelcome(false);
  };

  // Loading state
  if (authLoading) return null;

  // Not signed in — show auth screen
  if (!session) {
    return (
      <>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <AuthScreen />
      </>
    );
  }

  // First launch after sign in — show welcome
  if (showWelcome === null) return null;
  if (showWelcome) {
    return (
      <>
        <StatusBar style="light" backgroundColor={COLORS.bg} />
        <WelcomeScreen onComplete={handleWelcomeComplete} />
      </>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="light" backgroundColor={COLORS.bg} />
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.bg },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="Home"       component={HomeScreen} />
        <Stack.Screen name="Result"     component={ResultScreen} />
        <Stack.Screen name="Journal"    component={JournalScreen} />
        <Stack.Screen name="Collection" component={CollectionScreen} />
        <Stack.Screen name="Entry"      component={EntryScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
