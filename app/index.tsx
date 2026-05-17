import { FlatList, View, Text } from "react-native";
import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReceiptCard from "@/components/ReceiptCard";
import ScanButton from "@/components/ScanButton";
import StatsCard from "@/components/StatsCard";
import MonthPicker from "@/components/MonthPicker";
import { useReceipts } from "@/hooks/useReceipts";
import { getCategoryStats } from "@/services/storage";

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { receipts, error } = useReceipts();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1);

  const goPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((y) => y - 1);
      setSelectedMonth(12);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    const nowYear = today.getFullYear();
    const nowMonth = today.getMonth() + 1;
    if (selectedYear === nowYear && selectedMonth === nowMonth) return;
    if (selectedMonth === 12) {
      setSelectedYear((y) => y + 1);
      setSelectedMonth(1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === selectedYear && d.getMonth() + 1 === selectedMonth;
    });
  }, [receipts, selectedYear, selectedMonth]);

  const filteredStats = useMemo(() => getCategoryStats(filteredReceipts), [filteredReceipts]);
  const filteredTotal = useMemo(
    () => filteredReceipts.reduce((sum, r) => sum + r.total, 0),
    [filteredReceipts],
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {error && (
        <View className="mx-4 mb-3 rounded-xl bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-600">{error}</Text>
        </View>
      )}

      <MonthPicker
        year={selectedYear}
        month={selectedMonth}
        onPrev={goPrevMonth}
        onNext={goNextMonth}
      />

      <FlatList
        data={filteredReceipts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          filteredReceipts.length > 0 ? (
            <StatsCard stats={filteredStats} totalSpent={filteredTotal} />
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
