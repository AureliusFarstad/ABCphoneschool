import "../../global.css";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  useFonts,
} from "@expo-google-fonts/inter";
import { setAudioModeAsync } from "expo-audio";
import { Stack, ThemeProvider, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useEffect, useRef } from "react";
import { LogBox } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { audioStoreActions } from "@/core/store/audio";
import { theme } from "@/core/useThemeConfig";
import { LetterCaseProvider } from "@/ui/core/headers/letter-case-context";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "index",
};

LogBox.ignoreLogs([`Text strings must be rendered within a <Text> component.`]);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// Play clips even when the phone is on silent, and pause other apps' audio
// (music, podcasts) while a clip plays.
setAudioModeAsync({ playsInSilentMode: true, interruptionMode: "doNotMix" });

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Thomas: require("@/assets/fonts/ThomasDraft.ttf"),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  const onLayoutRootView = useCallback(async () => {
    if (loaded) {
      // This tells the splash screen to hide immediately! If we call this after
      // `setAppIsReady`, then we may see a blank screen while the app is
      // loading its initial state and rendering its first pixels. So instead,
      // we hide the splash screen once we know the root view has already
      // performed layout.
      await SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <ThemeProvider value={theme}>
        <LetterCaseProvider>
          <RootLayoutNav />
        </LetterCaseProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function NavigationAudioHandler() {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Stop audio when route changes
    if (
      previousPathnameRef.current !== undefined &&
      previousPathnameRef.current !== pathname
    ) {
      audioStoreActions.stopAllAudio();
    }

    previousPathnameRef.current = pathname;
  }, [pathname]);

  return null;
}

function RootLayoutNav() {
  return (
    <>
      <NavigationAudioHandler />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(level-one)" options={{ headerShown: false }} />
        <Stack.Screen name="(level-two)" options={{ headerShown: false }} />
        <Stack.Screen name="(level-three)" options={{ headerShown: false }} />
        <Stack.Screen name="(level-four)" options={{ headerShown: false }} />
        {/* Define video screens (maybe don't need this:) */}
        <Stack.Screen
          name="(videos)/welcome"
          options={{
            animation: "slide_from_bottom",
            presentation: "fullScreenModal",
            headerShown: false,
            headerShadowVisible: false,
          }}
        />
        <Stack.Screen
          name="(videos)/little-and-often"
          options={{
            animation: "slide_from_bottom",
            presentation: "fullScreenModal",
            headerShown: false,
            headerShadowVisible: false,
          }}
        />
      </Stack>
    </>
  );
}
