import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Receipt, CategoryStats } from "@/types";
import { loadReceipts, saveReceipt, deleteReceipt, updateReceipt, getCategoryStats } from "@/services/storage";
import { analyzeReceipt } from "@/services/openai";

const PLACEHOLDER = "https://placehold.co/400x300/F2F2F7/8E8E93?text=Receipt";

const MOCK_RECEIPTS: Receipt[] = [
  {
    id: "mock-1",
    store: "セブン-イレブン 渋谷店",
    date: "2026-05-12",
    total: 2840,
    tax: 210,
    items: [
      { name: "おにぎり 鮭", price: 150, category: "snacks_drinks", quantity: 2 },
      { name: "サンドイッチ ハム", price: 320, category: "snacks_drinks" },
      { name: "緑茶 500ml", price: 140, category: "snacks_drinks" },
      { name: "からあげクン", price: 240, category: "snacks_drinks" },
      { name: "マスク 7枚入り", price: 480, category: "daily_goods" },
    ],
    imageUri: PLACEHOLDER,
    createdAt: Date.now() - 86400000,
  },
  {
    id: "mock-2",
    store: "ENEOS 新宿セルフSS",
    date: "2026-05-10",
    total: 5800,
    items: [{ name: "レギュラー 満タン", price: 5800, category: "transportation" }],
    imageUri: PLACEHOLDER,
    createdAt: Date.now() - 172800000,
  },
  {
    id: "mock-3",
    store: "ユニクロ 銀座店",
    date: "2026-05-08",
    total: 4980,
    tax: 368,
    items: [
      { name: "エアリズムTシャツ", price: 990, category: "shopping", quantity: 2 },
      { name: "ソックス 3足組", price: 790, category: "shopping" },
    ],
    imageUri: PLACEHOLDER,
    createdAt: Date.now() - 259200000,
  },
  {
    id: "mock-4",
    store: "TOHOシネマズ 六本木",
    date: "2026-05-05",
    total: 3800,
    items: [
      { name: "映画鑑賞券 一般", price: 1900, category: "entertainment", quantity: 2 },
      { name: "ポップコーン L", price: 580, category: "snacks_drinks" },
      { name: "コカ・コーラ M", price: 420, category: "snacks_drinks" },
    ],
    imageUri: PLACEHOLDER,
    createdAt: Date.now() - 345600000,
  },
  {
    id: "mock-5",
    store: "松屋 渋谷センター街店",
    date: "2026-04-28",
    total: 1300,
    items: [
      { name: "牛めし 並盛", price: 430, category: "eating_out" },
      { name: "豚めし 大盛", price: 550, category: "eating_out" },
      { name: "みそ汁", price: 100, category: "eating_out" },
      { name: "生野菜サラダ", price: 220, category: "eating_out" },
    ],
    imageUri: PLACEHOLDER,
    createdAt: Date.now() - 604800000,
  },
];

async function seedIfEmpty() {
  const existing = await AsyncStorage.getItem("receipts");
  if (!existing || JSON.parse(existing).length === 0) {
    await AsyncStorage.setItem("receipts", JSON.stringify(MOCK_RECEIPTS));
    return MOCK_RECEIPTS;
  }

  const receipts: Receipt[] = JSON.parse(existing);
  const cleaned = receipts.filter((r) => {
    if (Platform.OS === "web" && r.imageUri.startsWith("blob:")) {
      return false;
    }
    return true;
  });

  if (cleaned.length !== receipts.length) {
    if (cleaned.length === 0) {
      await AsyncStorage.setItem("receipts", JSON.stringify(MOCK_RECEIPTS));
      return MOCK_RECEIPTS;
    }
    await AsyncStorage.setItem("receipts", JSON.stringify(cleaned));
    return cleaned;
  }

  return null;
}

interface ReceiptsContextValue {
  receipts: Receipt[];
  loading: boolean;
  scanning: boolean;
  error: string | null;
  scan: (imageUri: string) => Promise<Receipt | null>;
  remove: (id: string) => Promise<void>;
  updateItemCategory: (receiptId: string, itemIndex: number, category: string) => Promise<void>;
  refresh: () => Promise<void>;
  stats: CategoryStats[];
  totalSpent: number;
}

const ReceiptsContext = createContext<ReceiptsContextValue | null>(null);

export function ReceiptsProvider({ children }: { children: ReactNode }) {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const seeded = await seedIfEmpty();
    if (seeded) {
      const sorted = [...seeded].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setReceipts(sorted);
    } else {
      const data = await loadReceipts();
      const sorted = data.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setReceipts(sorted);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const scan = useCallback(
    async (imageUri: string) => {
      setScanning(true);
      setError(null);
      try {
        const parsed = await analyzeReceipt(imageUri);
        const receipt: Omit<Receipt, "imageUri"> = {
          id: Date.now().toString(),
          store: parsed.store,
          date: parsed.date,
          total: parsed.total,
          tax: parsed.tax,
          items: parsed.items,
          createdAt: Date.now(),
        };
        const saved = await saveReceipt(receipt, imageUri);
        setReceipts((prev) => {
          const next = [saved, ...prev];
          next.sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          return next;
        });
        return saved;
      } catch (e: any) {
        setError(e.message ?? "Scan failed");
        return null;
      } finally {
        setScanning(false);
      }
    },
    []
  );

  const remove = useCallback(async (id: string) => {
    await deleteReceipt(id);
    setReceipts((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const updateItemCategory = useCallback(
    async (receiptId: string, itemIndex: number, category: string) => {
      setReceipts((prev) => {
        const updated = prev.map((r) => {
          if (r.id !== receiptId) return r;
          const items = r.items.map((item, i) =>
            i === itemIndex ? { ...item, category: category as Receipt["items"][number]["category"] } : item
          );
          return { ...r, items };
        });
        const target = updated.find((r) => r.id === receiptId);
        if (target) updateReceipt(target);
        return updated;
      });
    },
    []
  );

  const stats = getCategoryStats(receipts);
  const totalSpent = receipts.reduce((sum, r) => sum + r.total, 0);

  return (
    <ReceiptsContext.Provider
      value={{ receipts, loading, scanning, error, scan, remove, updateItemCategory, refresh, stats, totalSpent }}
    >
      {children}
    </ReceiptsContext.Provider>
  );
}

export function useReceipts(): ReceiptsContextValue {
  const ctx = useContext(ReceiptsContext);
  if (!ctx) {
    throw new Error("useReceipts must be used within a <ReceiptsProvider>");
  }
  return ctx;
}
