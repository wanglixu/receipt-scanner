import { View, Text } from "react-native";
import type { CategoryStats } from "@/types";

interface Props {
  stats: CategoryStats[];
  totalSpent: number;
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

const CATEGORY_ICONS: Record<string, string> = {
  eating_out: "🍽️",
  home_cooking: "🥬",
  snacks_drinks: "🍙",
  smoking_alcohol: "🍺",
  transportation: "🚃",
  shopping: "🛍️",
  daily_goods: "🧹",
  entertainment: "🎬",
  medical: "💊",
  utilities: "💡",
  communication: "📱",
  beauty: "💄",
  education: "📚",
  other: "📦",
};

export default function StatsCard({ stats, totalSpent }: Props) {
  if (stats.length === 0) return null;

  return (
    <View className="mx-4 mb-4 rounded-card bg-card p-4 ios:shadow-sm">
      <Text className="mb-3 text-sm font-semibold text-text-secondary">
        今月の支出
      </Text>
      <Text className="mb-4 text-3xl font-bold text-text">
        ¥{totalSpent.toLocaleString()}
      </Text>
      <View className="gap-2">
        {stats.map((s) => {
          const pct = totalSpent > 0 ? (s.total / totalSpent) * 100 : 0;
          return (
            <View key={s.category}>
              <View className="mb-1 flex-row justify-between">
                <Text className="text-sm text-text-secondary">
                  {CATEGORY_ICONS[s.category] ?? ""}{" "}
                  {CATEGORY_LABELS[s.category] ?? s.category}
                </Text>
                <Text className="text-sm font-medium text-text">
                  ¥{s.total.toLocaleString()}
                </Text>
              </View>
              <View className="h-1 overflow-hidden rounded-full bg-gray-100">
                <View
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
