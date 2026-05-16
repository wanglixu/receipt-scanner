import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { CategoryStats, Receipt } from "@/types";

const RECEIPTS_KEY = "receipts";
const IMAGE_DIR = `${FileSystem.documentDirectory ?? ""}receipt-images/`;

async function ensureImageDir() {
  if (Platform.OS === "web") return;
  const info = await FileSystem.getInfoAsync(IMAGE_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_DIR, { intermediates: true });
  }
}

async function blobToDataUri(blobUrl: string): Promise<string> {
  const res = await fetch(blobUrl);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function saveReceipt(
  receipt: Omit<Receipt, "imageUri">,
  imageUri: string
): Promise<Receipt> {
  if (Platform.OS === "web") {
    const persistedUri = imageUri.startsWith("blob:")
      ? await blobToDataUri(imageUri)
      : imageUri;
    const full: Receipt = { ...receipt, imageUri: persistedUri };
    const stored = await loadReceipts();
    stored.unshift(full);
    await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(stored));
    return full;
  }

  await ensureImageDir();
  const ext = imageUri.split(".").pop() ?? "jpg";
  const imageName = `${receipt.id}.${ext}`;
  const dest = IMAGE_DIR + imageName;

  await FileSystem.copyAsync({ from: imageUri, to: dest });
  const full: Receipt = { ...receipt, imageUri: dest };

  const stored = await loadReceipts();
  stored.unshift(full);
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(stored));

  return full;
}

export async function loadReceipts(): Promise<Receipt[]> {
  const raw = await AsyncStorage.getItem(RECEIPTS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const all = await loadReceipts();
  return all.find((r) => r.id === id) ?? null;
}

export async function updateReceipt(updated: Receipt): Promise<void> {
  const all = await loadReceipts();
  const idx = all.findIndex((r) => r.id === updated.id);
  if (idx !== -1) {
    all[idx] = updated;
    await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(all));
  }
}

export async function deleteReceipt(id: string): Promise<void> {
  const all = await loadReceipts();
  const target = all.find((r) => r.id === id);
  if (target && Platform.OS !== "web") {
    await FileSystem.deleteAsync(target.imageUri, { idempotent: true });
  }
  const filtered = all.filter((r) => r.id !== id);
  await AsyncStorage.setItem(RECEIPTS_KEY, JSON.stringify(filtered));
}

export function getCategoryStats(receipts: Receipt[]): CategoryStats[] {
  const map = new Map<string, { total: number; count: number }>();

  for (const r of receipts) {
    for (const item of r.items) {
      const prev = map.get(item.category) ?? { total: 0, count: 0 };
      map.set(item.category, {
        total: prev.total + item.price * (item.quantity ?? 1),
        count: prev.count + 1,
      });
    }
  }

  const order: CategoryStats["category"][] = [
    "eating_out",
    "home_cooking",
    "snacks_drinks",
    "smoking_alcohol",
    "transportation",
    "shopping",
    "daily_goods",
    "entertainment",
    "medical",
    "utilities",
    "communication",
    "beauty",
    "education",
    "other",
  ];
  return order
    .filter((c) => map.has(c))
    .map((category) => ({ category, ...map.get(category)! }));
}
