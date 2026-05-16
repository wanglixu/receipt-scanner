import { View, Text, ScrollView, Image, Pressable, Modal, TouchableWithoutFeedback } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Category, Receipt } from "@/types";
import { getReceipt } from "@/services/storage";
import { useReceipts } from "@/hooks/useReceipts";

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

const CATEGORY_OPTIONS: { key: Category; emoji: string }[] = [
  { key: "eating_out", emoji: "🍽️" },
  { key: "home_cooking", emoji: "🥬" },
  { key: "snacks_drinks", emoji: "🍙" },
  { key: "smoking_alcohol", emoji: "🍺" },
  { key: "transportation", emoji: "🚃" },
  { key: "shopping", emoji: "🛍️" },
  { key: "daily_goods", emoji: "🧹" },
  { key: "entertainment", emoji: "🎬" },
  { key: "medical", emoji: "💊" },
  { key: "utilities", emoji: "💡" },
  { key: "communication", emoji: "📱" },
  { key: "beauty", emoji: "💄" },
  { key: "education", emoji: "📚" },
  { key: "other", emoji: "📦" },
];

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { remove, updateItemCategory } = useReceipts();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (id) {
      getReceipt(id).then(setReceipt);
    }
  }, [id]);

  const handleDelete = async () => {
    if (deleting || !receipt) return;
    setDeleting(true);
    await remove(receipt.id);
    setDeleting(false);
    router.back();
  };

  const handleCategoryChange = async (category: Category) => {
    if (pickerIndex === null || !receipt) return;
    const newItems = receipt.items.map((item, i) =>
      i === pickerIndex ? { ...item, category } : item
    );
    const updated = { ...receipt, items: newItems };
    setReceipt(updated);
    setPickerIndex(null);
    await updateItemCategory(receipt.id, pickerIndex, category);
  };

  if (!receipt) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-text-secondary">読み込み中...</Text>
      </View>
    );
  }

  const date = new Date(receipt.date).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return (
    <>
      <ScrollView
        className="flex-1 bg-background"
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <Image
          source={{ uri: receipt.imageUri }}
          className="mx-4 mt-4 h-48 rounded-card"
          resizeMode="cover"
        />

        <View className="mx-4 mt-4 rounded-card bg-card p-4 ios:shadow-sm">
          <Text className="text-xl font-bold text-text">{receipt.store}</Text>
          <Text className="mt-1 text-sm text-text-secondary">{date}</Text>
        </View>

        <View className="mx-4 mt-3 rounded-card bg-card p-4 ios:shadow-sm">
          <Text className="mb-3 text-sm font-semibold text-text-secondary">明細</Text>
          {receipt.items.map((item, i) => (
            <Pressable
              key={i}
              onPress={() => setPickerIndex(i)}
              className="flex-row justify-between border-t border-separator py-3"
              style={({ pressed }) => ({
                borderTopWidth: i === 0 ? 0 : undefined,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <View className="flex-1">
                <Text className="text-base text-text">{item.name}</Text>
                <View className="mt-1 flex-row items-center gap-1">
                  <View className="rounded-full bg-blue-50 px-2 py-0.5">
                    <Text className="text-xs text-primary">
                      {CATEGORY_LABELS[item.category] ?? item.category}
                    </Text>
                  </View>
                  {item.quantity ? (
                    <Text className="text-xs text-text-secondary">×{item.quantity}</Text>
                  ) : null}
                </View>
              </View>
              <Text className="text-base font-medium text-text">
                ¥{item.price.toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View className="mx-4 mt-3 rounded-card bg-card p-4 ios:shadow-sm">
          <View className="flex-row justify-between py-1">
            <Text className="text-base text-text-secondary">小計</Text>
            <Text className="text-base text-text">
              ¥{receipt.total.toLocaleString()}
            </Text>
          </View>
          {receipt.tax != null && (
            <>
              <View className="flex-row justify-between border-t border-separator py-1">
                <Text className="text-base text-text-secondary">内消費税 (10%)</Text>
                <Text className="text-base text-text">
                  ¥{receipt.tax.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row justify-between border-t border-separator py-1">
                <Text className="text-base text-text-secondary">税抜合計</Text>
                <Text className="text-base text-text">
                  ¥{(receipt.total - receipt.tax).toLocaleString()}
                </Text>
              </View>
            </>
          )}
          <View className="mt-3 flex-row justify-between border-t border-separator pt-3">
            <Text className="text-lg font-bold text-text">合計</Text>
            <Text className="text-lg font-bold text-text">
              ¥{receipt.total.toLocaleString()}
            </Text>
          </View>
        </View>

        <Pressable
          onPress={handleDelete}
          disabled={deleting}
          className="mx-4 mt-6 items-center rounded-button bg-red-50 py-3"
        >
          <Text className="text-base font-medium text-red-600">
            {deleting ? "削除中..." : "このレシートを削除"}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={pickerIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerIndex(null)}
      >
        <TouchableWithoutFeedback onPress={() => setPickerIndex(null)}>
          <View className="flex-1 justify-end bg-black/40">
            <TouchableWithoutFeedback>
              <View
                className="rounded-t-card bg-card px-4 pt-5"
                style={{ paddingBottom: insets.bottom + 20 }}
              >
                <Text className="mb-4 text-center text-base font-semibold text-text">
                  分類を選択
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map((opt) => {
                    const selected =
                      pickerIndex !== null &&
                      receipt.items[pickerIndex]?.category === opt.key;
                    return (
                      <Pressable
                        key={opt.key}
                        onPress={() => handleCategoryChange(opt.key)}
                        className={`rounded-full px-4 py-2.5 ${
                          selected ? "bg-primary" : "bg-gray-100"
                        }`}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            selected ? "text-white" : "text-text"
                          }`}
                        >
                          {opt.emoji} {CATEGORY_LABELS[opt.key]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  onPress={() => setPickerIndex(null)}
                  className="mt-4 items-center rounded-button bg-gray-100 py-3"
                >
                  <Text className="text-base font-medium text-text-secondary">
                    キャンセル
                  </Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}
