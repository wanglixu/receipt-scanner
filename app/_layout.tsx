import "@/global.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ReceiptsProvider } from "@/hooks/useReceipts";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ReceiptsProvider>
        <StatusBar style="dark" />
        <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#F2F2F7" },
          headerTintColor: "#007AFF",
          headerTitleStyle: { fontWeight: "600", color: "#1C1C1E" },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: "#F2F2F7" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="index" options={{ title: "レシート" }} />
        <Stack.Screen
          name="scan"
          options={{ title: "スキャン", presentation: "modal" }}
        />
        <Stack.Screen
          name="receipt/[id]"
          options={{ title: "明細" }}
        />
      </Stack>
      </ReceiptsProvider>
    </SafeAreaProvider>
  );
}
