import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import type { ReceiptItem } from "@/types";

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "";

interface ParsedReceipt {
  store: string;
  date: string;
  total: number;
  tax?: number;
  items: ReceiptItem[];
}

async function imageToBase64(uri: string): Promise<string> {
  if (uri.startsWith("data:")) {
    return uri.split(",")[1];
  }

  if (Platform.OS === "web") {
    const res = await fetch(uri);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  return FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

const PROMPT_TEXT = `你是一个专业的日本小票分析AI。请仔细分析这张日本小票，提取所有商品信息并正确分类。

【分類一覧】

- eating_out      → レストラン、カフェ、居酒屋、出前・デリバリー、牛丼屋、ラーメン屋、定食屋で食べた食事
- home_cooking    → スーパーで購入した食材（肉、野菜、卵、米、調味料、魚、豆腐、納豆、牛乳、冷凍食品）
- snacks_drinks   → おにぎり、スナック菓子、チョコ、アイスクリーム、清涼飲料水、エナジードリンク、パン（単品購入）、お茶
- smoking_alcohol → タバコ、ビール、日本酒、焼酎、ワイン、ウイスキー、アルコール類全般
- daily_goods     → ティッシュ、洗剤、マスク、ゴミ袋、電池、歯ブラシ、トイレットペーパー、台所用品、入浴剤
- beauty          → 化粧水、乳液、日焼け止め、口紅、ファンデーション、シャンプー、リップ、ハンドクリーム
- medical         → 頭痛薬、風邪薬、目薬、湿布、絆創膏、胃薬、ビタミン剤、サプリメント
- shopping        → Tシャツ、靴、バッグ、アクセサリー、電化製品、家具、時計
- entertainment   → 映画チケット、ゲームソフト、漫画、CD、カラオケ、遊園地、雑誌、新聞
- transportation  → ガソリン、駐車料金、高速料金、電車切符、バス代、タクシー、軽油
- utilities       → 電気代、水道代、ガス代
- communication   → 携帯料金、ネット料金、Wi-Fiルーター、SIMカード
- education       → 書籍、文房具、塾代、学費、参考書、ノート
- other           → 上記のいずれにも当てはまらない場合のみ使用

【重要な判定ルール】

1. レストラン・カフェ・居酒屋・出前 → すべての商品を eating_out に分類
2. スーパーで食材（肉・野菜・魚・調味料など）→ home_cooking に分類
3. コンビニのおにぎり・スナック・飲み物 → snacks_drinks に分類
4. タバコ・酒類 → smoking_alcohol に分類
5. どうしても判断に迷う場合は other にする
6. マークダウン記法は一切使わず、純粋なJSONのみを返す
7. quantity は必ず数値を入れる（デフォルトは 1）

返却JSONフォーマット：
{
  "store": "店舗名（日本語）",
  "date": "YYYY-MM-DD",
  "total": 合計金額（税込、数字のみ）,
  "tax": 消費税額（必須、数字で。不明なら0）,
  "items": [
    {
      "name": "商品名（日本語）",
      "price": 税込価格（数字のみ）,
      "category": "上記カテゴリのいずれか",
      "quantity": 数量（数字で必須）
    }
  ]
}`;

const CATEGORY_ENUM = [
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
] as const;

async function callOpenAI(b64: string): Promise<string> {
  if (Platform.OS === "web") {
    const res = await fetch("http://localhost:3099", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ base64: b64 }),
    });
    if (!res.ok) throw new Error(`Proxy error: ${res.status}`);
    const data = await res.json();
    return data.output_text;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      input: [
        {
          role: "user",
          content: [
            { type: "input_image", image_url: `data:image/jpeg;base64,${b64}` },
            { type: "input_text", text: PROMPT_TEXT },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "receipt",
          schema: {
            type: "object",
            properties: {
              store: { type: "string" },
              date: { type: "string" },
              total: { type: "number" },
              tax: { type: ["number", "null"] },
              items: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    price: { type: "number" },
                    category: { type: "string", enum: CATEGORY_ENUM },
                    quantity: { type: ["number", "null"] },
                  },
                  required: ["name", "price", "category", "quantity"],
                  additionalProperties: false,
                },
              },
            },
            required: ["store", "date", "total", "tax", "items"],
            additionalProperties: false,
          },
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) throw new Error(`OpenAI API error: ${response.status}`);
  const data = await response.json();
  return data.output?.[0]?.content?.[0]?.text ?? "";
}

export async function analyzeReceipt(uri: string): Promise<ParsedReceipt> {
  const b64 = await imageToBase64(uri);
  const outputText = await callOpenAI(b64);
  if (!outputText) throw new Error("Empty response from OpenAI");
  return JSON.parse(outputText) as ParsedReceipt;
}
