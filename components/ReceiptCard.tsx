import { View, Text, Pressable, Image } from "react-native";
import type { Receipt } from "@/types";

interface Props {
  receipt: Receipt;
  onPress: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  eating_out: "外食",
  home_cooking: "自炊",
  snacks_drinks: "零食饮料",
  smoking_alcohol: "烟酒",
  transportation: "交通",
  shopping: "购物",
  daily_goods: "日用品",
  entertainment: "娱乐",
  medical: "医疗",
  utilities: "生活缴费",
  communication: "通信",
  beauty: "美容",
  education: "教育",
  other: "其他",
};

export default function ReceiptCard({ receipt, onPress }: Props) {
  const date = new Date(receipt.date).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mb-3 rounded-card bg-card ios:shadow-sm"
      style={({ pressed }) => ({ opacity: pressed ? 0.96 : 1 })}
    >
      <View className="flex-row p-4">
        <Image
          source={{ uri: receipt.imageUri }}
          className="h-16 w-16 rounded-xl"
          resizeMode="cover"
        />
        <View className="ml-3 flex-1 justify-center">
          <Text className="text-base font-semibold text-text" numberOfLines={1}>
            {receipt.store}
          </Text>
          <Text className="mt-1 text-sm text-text-secondary">
            {date} · {receipt.items.length}点
          </Text>
          <View className="mt-1 flex-row gap-1">
            {receipt.items.slice(0, 3).map((item, i) => (
              <View
                key={i}
                className="rounded-full bg-gray-100 px-2 py-0.5"
              >
                <Text className="text-xs text-text-secondary">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </Text>
              </View>
            ))}
          </View>
        </View>
        <View className="justify-center">
          <Text className="text-base font-semibold text-text">
            ¥{receipt.total.toLocaleString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}
