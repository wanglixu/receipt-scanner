import { FlatList, View, Text } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReceiptCard from "@/components/ReceiptCard";
import ScanButton from "@/components/ScanButton";
import StatsCard from "@/components/StatsCard";
import { useReceipts } from "@/hooks/useReceipts";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { receipts, stats, totalSpent, error } = useReceipts();

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {error && (
        <View className="mx-4 mb-3 rounded-xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      )}

      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          receipts.length > 0 ? (
            <StatsCard stats={stats} totalSpent={totalSpent} />
          ) : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center px-8 pt-40">
            <Text className="text-center text-lg font-semibold text-text">
              レシートがありません
            </Text>
            <Text className="mt-2 text-center text-sm text-text-secondary">
              +ボタンをタップしてスキャン
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ReceiptCard
            receipt={item}
            onPress={() => router.push(`/receipt/${item.id}`)}
          />
        )}
      />

      <ScanButton onPress={() => router.push("/scan")} />
    </View>
  );
}
