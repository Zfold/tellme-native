import { useState, useEffect } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS } from "./src/constants";

import WelcomeScreen    from "./src/screens/WelcomeScreen";
import HomeScreen       from "./src/screens/HomeScreen";
import ResultScreen     from "./src/screens/ResultScreen";
import JournalScreen    from "./src/screens/JournalScreen";
import CollectionScreen from "./src/screens/CollectionScreen";
import EntryScreen      from "./src/screens/EntryScreen";

const Stack = createNativeStackNavigator();
const WELCOME_KEY = "tellme_welcome_shown";

export default function App() {
  const [showWelcome, setShowWelcome] = useState(null);

  useEffect(() => {
    AsyncStorage.getItem(WELCOME_KEY).then(val => {
      setShowWelcome(val !== "true");
    });
  }, []);

  const handleWelcomeComplete = async () => {
    await AsyncStorage.setItem(WELCOME_KEY, "true");
    setShowWelcome(false);
  };

  // Loading state
  if (showWelcome === null) return null;

  // First launch — show welcome
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
