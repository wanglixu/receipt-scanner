export type Category =
  | "eating_out"
  | "home_cooking"
  | "snacks_drinks"
  | "smoking_alcohol"
  | "transportation"
  | "shopping"
  | "daily_goods"
  | "entertainment"
  | "medical"
  | "utilities"
  | "communication"
  | "beauty"
  | "education"
  | "other";

export interface ReceiptItem {
  name: string;
  price: number;
  category: Category;
  quantity?: number;
}

export interface Receipt {
  id: string;
  store: string;
  date: string;
  total: number;
  tax?: number;
  items: ReceiptItem[];
  imageUri: string;
  createdAt: number;
}

export interface CategoryStats {
  category: Category;
  total: number;
  count: number;
}
