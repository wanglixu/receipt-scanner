import { View, Text, Pressable } from "react-native";

interface Props {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
}

const MONTH_LABELS = [
  "1月", "2月", "3月", "4月", "5月", "6月",
  "7月", "8月", "9月", "10月", "11月", "12月",
];

export default function MonthPicker({ year, month, onPrev, onNext }: Props) {
  return (
    <View className="mx-4 mb-3 flex-row items-center justify-between rounded-card bg-card px-3 py-2 ios:shadow-sm">
      <Pressable
        onPress={onPrev}
        className="h-10 w-10 items-center justify-center rounded-button bg-gray-100"
        hitSlop={8}
      >
        <Text className="text-lg text-text-secondary">‹</Text>
      </Pressable>
      <Text className="text-base font-semibold text-text">
        {year}年 {MONTH_LABELS[month - 1]}
      </Text>
      <Pressable
        onPress={onNext}
        className="h-10 w-10 items-center justify-center rounded-button bg-gray-100"
        hitSlop={8}
      >
        <Text className="text-lg text-text-secondary">›</Text>
      </Pressable>
    </View>
  );
}
