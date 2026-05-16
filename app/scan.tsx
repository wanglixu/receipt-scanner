import { View, Text, Pressable, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReceipts } from "@/hooks/useReceipts";

export default function ScanScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { scan, scanning, error } = useReceipts();

  async function pickFromCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("権限が必要です", "レシートをスキャンするにはカメラへのアクセスが必要です。");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      await analyzeAndGo(result.assets[0].uri);
    }
  }

  async function pickFromLibrary() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("権限が必要です", "写真ライブラリへのアクセスが必要です。");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });

    if (!result.canceled) {
      await analyzeAndGo(result.assets[0].uri);
    }
  }

  async function analyzeAndGo(uri: string) {
    const receipt = await scan(uri);
    if (receipt) {
      router.replace(`/receipt/${receipt.id}`);
    }
  }

  if (scanning) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background"
        style={{ paddingBottom: insets.bottom }}
      >
        <ActivityIndicator size="large" color="#007AFF" />
        <Text className="mt-4 text-base text-text-secondary">
          解析中...
        </Text>
      </View>
    );
  }

  return (
    <View
      className="flex-1 items-center justify-center gap-6 bg-background px-8"
      style={{ paddingBottom: insets.bottom }}
    >
      {error && (
        <View className="w-full rounded-xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      )}

      <Pressable
        onPress={pickFromCamera}
        className="w-full items-center rounded-button bg-primary py-4"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Text className="text-lg font-semibold text-white">写真を撮る</Text>
      </Pressable>

      <Pressable
        onPress={pickFromLibrary}
        className="w-full items-center rounded-button bg-card py-4 ios:shadow-sm"
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <Text className="text-lg font-semibold text-primary">
          アルバムから選択
        </Text>
      </Pressable>

      <Pressable onPress={() => router.back()}>
        <Text className="text-base text-primary">キャンセル</Text>
      </Pressable>
    </View>
  );
}
