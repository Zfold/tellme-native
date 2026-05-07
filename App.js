import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { COLORS } from "./src/constants";

import HomeScreen       from "./src/screens/HomeScreen";
import ResultScreen     from "./src/screens/ResultScreen";
import JournalScreen    from "./src/screens/JournalScreen";
import CollectionScreen from "./src/screens/CollectionScreen";
import EntryScreen      from "./src/screens/EntryScreen";

const Stack = createNativeStackNavigator();

export default function App() {
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