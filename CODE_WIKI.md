# Receipt Scanner — Code Wiki

> 版本: 1.0.0 | 技术栈: Expo SDK 55 · React Native 0.85 · TypeScript 5.3 · NativeWind 4.2

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [技术栈与依赖关系](#3-技术栈与依赖关系)
4. [目录结构](#4-目录结构)
5. [路由与页面详解](#5-路由与页面详解)
   - [5.1 根布局 — `app/_layout.tsx`](#51-根布局--app_layouttsx)
   - [5.2 首页 — `app/index.tsx`](#52-首页--appindextsx)
   - [5.3 扫描页 — `app/scan.tsx`](#53-扫描页--appscantsx)
   - [5.4 明细页 — `app/receipt/[id].tsx`](#54-明细页--appreceiptidtsx)
6. [组件详解](#6-组件详解)
   - [6.1 ReceiptCard — 收据卡片](#61-receiptcard--收据卡片)
   - [6.2 ScanButton — 扫描浮动按钮](#62-scanbutton--扫描浮动按钮)
   - [6.3 StatsCard — 支出统计卡片](#63-statscard--支出统计卡片)
7. [自定义 Hook 详解](#7-自定义-hook-详解)
   - [7.1 useReceipts — 数据核心](#71-usereceipts--数据核心)
8. [服务层详解](#8-服务层详解)
   - [8.1 OpenAI 收据分析服务 — `services/openai.ts`](#81-openai-收据分析服务--servicesopenaits)
   - [8.2 本地存储服务 — `services/storage.ts`](#82-本地存储服务--servicesstoragets)
9. [类型定义 — `types/index.ts`](#9-类型定义--typesindexts)
10. [辅助工具与脚本](#10-辅助工具与脚本)
    - [10.1 Proxy Server — `proxy-server.js`](#101-proxy-server--proxy-serverjs)
    - [10.2 测试脚本 — `test-api.js` / `test-proxy.js`](#102-测试脚本--test-apijs--test-proxyjs)
11. [主题与样式配置](#11-主题与样式配置)
12. [项目运行方式](#12-项目运行方式)
13. [数据流全景图](#13-数据流全景图)

---

## 1. 项目概述

**Receipt Scanner** 是一款基于 React Native (Expo) 的移动端收据扫描与记账应用。用户通过拍照或从相册选取收据图片，应用调用 OpenAI GPT-4o-mini 视觉模型对收据进行 OCR 识别与结构化解析，自动提取店铺名称、购买日期、消费总额、税额、以及每个商品的名目/价格/分类/数量。解析结果以列表和详细页的形式呈现，并按类别（食费、交通、购物、娱乐等）进行消费统计与可视化。

---

## 2. 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    UI Layer (Expo Router)               │
│  ┌───────────┐  ┌────────────┐  ┌────────────────────┐ │
│  │  index.tsx │  │  scan.tsx  │  │ receipt/[id].tsx   │ │
│  │  (首页)    │  │  (扫描页)   │  │ (收据明细)         │ │
│  └─────┬─────┘  └──────┬─────┘  └─────────┬──────────┘ │
│        │               │                  │             │
│  ┌─────┴─────┐  ┌──────┴──────┐  ┌───────┴───────────┐ │
│  │ReceiptCard│  │ImagePicker  │  │  ScrollView       │ │
│  │StatsCard  │  │Camera/Gallery│  │  项目列表/合计     │ │
│  │ScanButton │  └─────────────┘  └───────────────────┘ │
│  └───────────┘                                         │
└────────────────────┬────────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │   useReceipts Hook      │  ← 数据核心 (状态管理)
        │   receipts/scan/remove  │
        │   stats/totalSpent      │
        └────────┬───────┬────────┘
                 │       │
       ┌─────────┴─┐  ┌──┴───────────┐
       │  storage  │  │    openai     │
       │  (本地存储)│  │  (API 集成)   │
       └───────────┘  └───────┬───────┘
                              │
                ┌─────────────┴──────────────┐
                │  OpenAI GPT-4o-mini API    │
                │  (接收图片 → 返回JSON)      │
                └────────────────────────────┘
```

**架构特点：**

- **三层结构**：UI层（页面 + 组件） → Hook层（状态管理） → Service层（数据持久化 + 外部API）
- **集中式状态管理**：通过 `useReceipts` 自定义 Hook 统一管理所有收据数据和操作
- **平台适配**：同一套代码通过 `Platform.OS` 判断处理 Web 与 Native 差异（图片存储、API调用路径）
- **Web平台额外依赖 Proxy Server**：浏览器无法跨域直接调用 OpenAI API，通过本地 `proxy-server.js` 中转

---

## 3. 技术栈与依赖关系

### 运行环境

| 类别 | 技术 |
|------|------|
| 框架 | Expo SDK 55 |
| 运行时 | React Native 0.85 |
| 语言 | TypeScript 5.3 |
| 路由 | expo-router (文件系统路由) |
| 样式 | NativeWind 4.2 (Tailwind CSS for RN) + Tailwind CSS 3.4 |
| 打包 | Metro bundler |

### 核心依赖

| 包名 | 用途 |
|------|------|
| `expo` ~55.0.0 | Expo 运行时框架 |
| `expo-router` ~55.0.0 | 文件系统路由 |
| `expo-file-system` ~55.0.0 | 本地文件读写与图片存储 |
| `expo-image-picker` ~55.0.0 | 相机拍照 / 相册选取 |
| `@react-native-async-storage/async-storage` ^2.2.0 | 键值对持久化 (收据JSON数据) |
| `react-native-safe-area-context` ~5.6.2 | 安全区域适配 (刘海屏等) |
| `react-native-screens` ~4.23.0 | 原生屏幕容器 |
| `nativewind` ^4.2.0 | Tailwind CSS → React Native StyleSheet |
| `tailwindcss` ^3.4.0 | Tailwind CSS 引擎 |
| `react-native-web` ^0.21.2 | Web平台支持 |

### 外部 API

| API | 说明 |
|-----|------|
| **OpenAI Responses API** (`v1/responses`) | 接收收据图片 + 结构化 JSON Schema，返回解析后的收据数据 |
| **Model**: `gpt-4o-mini` | 轻量视觉模型 |

---

## 4. 目录结构

```
receipt-scanner/
├── app/                          # 页面路由 (expo-router)
│   ├── _layout.tsx               # 根布局 + Stack 导航配置
│   ├── index.tsx                 # 首页 (收据列表 + 统计 + 浮动按钮)
│   ├── scan.tsx                  # 扫描页 (拍照/相册 → OpenAI 解析)
│   └── receipt/
│       └── [id].tsx              # 收据明細动态路由页
│
├── components/                   # 可复用 UI 组件
│   ├── ReceiptCard.tsx           # 收据卡片 (列表项)
│   ├── ScanButton.tsx            # 浮动扫描按钮 (FAB)
│   └── StatsCard.tsx             # 类别支出统计卡片
│
├── hooks/                        # 自定义 Hooks
│   └── useReceipts.ts            # 核心数据 Hook (CRUD + 统计)
│
├── services/                     # 服务层
│   ├── openai.ts                # OpenAI API 调用 (图片 → 结构化JSON)
│   └── storage.ts               # 本地存储 (AsyncStorage + FileSystem)
│
├── types/                        # TypeScript 类型定义
│   └── index.ts                 # Receipt, ReceiptItem, Category, CategoryStats
│
├── proxy-server.js               # Node.js HTTP 代理 (Web平台用)
├── test-api.js                   # OpenAI API 直连测试脚本
├── test-proxy.js                 # Proxy 链路测试脚本
├── tailwind.config.js            # NativeWind/Tailwind 自定义主题
├── global.css                    # Tailwind CSS 入口
├── app.json                      # Expo 配置 (权限、图标、启动画面)
├── babel.config.js               # Babel 配置
├── metro.config.js               # Metro bundler 配置
├── package.json                  # 项目依赖与脚本
├── tsconfig.json                 # TypeScript 配置
├── .env / .env.example           # 环境变量 (OpenAI API Key)
└── .expo/                        # Expo 开发环境缓存
```

---

## 5. 路由与页面详解

项目使用 **expo-router** 的文件系统路由机制，目录结构即为路由树。

### 5.1 根布局 — `app/_layout.tsx`

**文件路径**：[app/_layout.tsx](file:///Users/wang/Desktop/receipt-scanner/app/_layout.tsx)

**职责**：定义全局导航结构与 UI 主题。

```tsx
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ /* 全局样式配置 */ }}>
        <Stack.Screen name="index" options={{ title: "レシート" }} />
        <Stack.Screen name="scan"  options={{ title: "スキャン", presentation: "modal" }} />
        <Stack.Screen name="receipt/[id]" options={{ title: "明細" }} />
      </Stack>
    </SafeAreaProvider>
  );
}
```

**关键点：**

| 配置项 | 说明 |
|--------|------|
| `SafeAreaProvider` | 包裹全局，提供安全区域上下文 |
| `StatusBar style="dark"` | 深色状态栏 (light mode) |
| `headerStyle: #F2F2F7` | 导航栏背景色 (iOS 风格浅灰) |
| `headerTintColor: #007AFF` | 返回按钮 / 标题颜色 (iOS 蓝) |
| `contentStyle: #F2F2F7` | 页面内容区背景色 |
| `animation: slide_from_right` | 页面切换滑入动画 |
| `presentation: "modal"` | 扫描页以 modal 形式呈现 |

**路由映射表：**

| 路由 | 页面文件 | 标题 |
|------|----------|------|
| `/` | `app/index.tsx` | レシート |
| `/scan` | `app/scan.tsx` | スキャン (modal) |
| `/receipt/:id` | `app/receipt/[id].tsx` | 明細 |

---

### 5.2 首页 — `app/index.tsx`

**文件路径**：[app/index.tsx](file:///Users/wang/Desktop/receipt-scanner/app/index.tsx)

**职责**：展示收据列表、月度统计面板、提供扫描入口。

**组件树：**

```
HomeScreen
├── StatsCard (stats, totalSpent)        ← 列表顶部统计
├── FlatList
│   ├── ListEmptyComponent → 空状态提示
│   └── renderItem → ReceiptCard (每项)
└── ScanButton (浮动，absolute定位)
```

**关键代码片段：**

```tsx
export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { receipts, stats, totalSpent, error } = useReceipts();
  
  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <FlatList
        data={receipts}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          receipts.length > 0 
            ? <StatsCard stats={stats} totalSpent={totalSpent} /> 
            : null
        }
        ListEmptyComponent={/* 空状态提示 */}
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
```

**设计要点：**
- `StatsCard` 仅在列表非空时渲染（作为 `ListHeaderComponent`）
- `ScanButton` 使用 `absolute` 定位覆盖在列表上方，确保始终可见
- 错误状态通过顶部红色提示条展示

---

### 5.3 扫描页 — `app/scan.tsx`

**文件路径**：[app/scan.tsx](file:///Users/wang/Desktop/receipt-scanner/app/scan.tsx)

**职责**：提供两种图像获取方式（拍照 / 相册），调用 OpenAI 解析收据，成功后跳转明細页。

**核心流程：**

```
用户点击「写真を撮る」或「アルバムから選択」
       │
       ├── pickFromCamera()          pickFromLibrary()
       │     ├── requestCameraPermissionsAsync()
       │     └── launchCameraAsync({quality:0.8})
       │                                    │
       └────────────┬───────────────────────┘
                    ▼
            analyzeAndGo(uri)
                    │
                    ▼
            useReceipts().scan(uri)
                    │
         ┌─────────┴──────────┐
         │  services/openai   │ → OpenAI API 解析
         │  services/storage  │ → 保存到本地
         └─────────┬──────────┘
                   ▼
         router.replace(`/receipt/${receipt.id}`)
```

**状态处理：**

| 状态 | UI 表现 |
|------|---------|
| 正常 | 两个操作按钮 + 取消按钮 |
| `scanning=true` | 全屏居中 `ActivityIndicator` + "解析中..." |
| `error` 存在 | 顶部红色错误提示卡片 |

**关键函数：**

| 函数 | 职责 |
|------|------|
| `pickFromCamera()` | 请求相机权限 → 打开相机 → 获取图片 → 调用分析 |
| `pickFromLibrary()` | 请求相册权限 → 打开相册 → 获取图片 → 调用分析 |
| `analyzeAndGo(uri)` | 调用 `scan()` 执行分析，成功后 `router.replace` 跳转明细页 |

---

### 5.4 明细页 — `app/receipt/[id].tsx`

**文件路径**：[app/receipt/[id].tsx](file:///Users/wang/Desktop/receipt-scanner/app/receipt/[id].tsx)

**职责**：展示单张收据的完整详细信息，包括店铺名称、日期、明細列表、金额汇总，并提供删除功能。

**动态路由**：通过 `useLocalSearchParams<{ id: string }>()` 获取路由参数 `id`。

**组件结构：**

```
ReceiptDetailScreen
├── Image (收据原图缩略)
├── Store Info Card (店铺名 + 日期)
├── Items List Card (明細列表)
│   └── 逐项显示: 商品名 / 分类 标签 / 数量 / 价格
├── Summary Card (金额汇总)
│   ├── 小計
│   ├── 内消費税 (10%)  [条件渲染]
│   ├── 税抜合計         [条件渲染]
│   └── 合計
└── Delete Button (删除确认对话框)
```

**数据获取**：通过 `services/storage` 的 `getReceipt(id)` 直接从 AsyncStorage 读取（独立于全局列表状态）。

**删除流程：**
```
点击「このレシートを削除」
  → Alert.alert("削除の確認", ...)
  → 用户确认 → remove(receipt.id)
    → storage.deleteReceipt() (删除本地图片 + 更新 AsyncStorage)
    → useReceipts 更新 state
    → router.back()
```

---

## 6. 组件详解

### 6.1 ReceiptCard — 收据卡片

**文件路径**：[components/ReceiptCard.tsx](file:///Users/wang/Desktop/receipt-scanner/components/ReceiptCard.tsx)

**Props:**

| 属性 | 类型 | 说明 |
|------|------|------|
| `receipt` | `Receipt` | 收据数据对象 |
| `onPress` | `() => void` | 点击回调 (导航到明细页) |

**渲染内容：**

```
┌──────────────────────────────────────────┐
│ ┌──────┐ セブン-イレブン 渋谷店   ¥2,840 │
│ │ 图片  │ 5月12日 · 5点                   │
│ └──────┘ [食費] [食費] [その他]           │
└──────────────────────────────────────────┘
```

**关键实现细节：**

- 分类标签使用 `CATEGORY_LABELS` 映射为日文显示（例：`food` → `食費`）
- 最多显示前 3 个分类标签，通过 `items.slice(0, 3)` 裁剪
- 图片使用 `resizeMode="cover"` 填充式裁剪
- 按压态通过 `pressed` 参数实现 0.96 透明度反馈

---

### 6.2 ScanButton — 扫描浮动按钮

**文件路径**：[components/ScanButton.tsx](file:///Users/wang/Desktop/receipt-scanner/components/ScanButton.tsx)

**Props:**

| 属性 | 类型 | 说明 |
|------|------|------|
| `onPress` | `() => void` | 点击导航到扫描页 |

**样式特点：**
- `absolute bottom-8 right-6` — 固定在屏幕右下角
- `h-14 w-14 rounded-full` — 圆形 56x56
- `bg-primary (#007AFF)` — iOS 蓝色
- 按压缩放动画：`scale: pressed ? 0.96 : 1`

**用途**：经典的 FAB (Floating Action Button) 模式，在首页提供快速扫描入口。

---

### 6.3 StatsCard — 支出统计卡片

**文件路径**：[components/StatsCard.tsx](file:///Users/wang/Desktop/receipt-scanner/components/StatsCard.tsx)

**Props:**

| 属性 | 类型 | 说明 |
|------|------|------|
| `stats` | `CategoryStats[]` | 按类别的统计数据数组 |
| `totalSpent` | `number` | 总支出金额 |

**渲染内容：**

```
┌──────────────────────────────────┐
│ 今月の支出                       │
│ ¥24,720                          │
│ 🍙 食費    ¥12,340  ████████░░░  │
│ ⛽ 交通    ¥5,800   ████░░░░░░░  │
│ 👕 買い物  ¥4,980   ███░░░░░░░░  │
│ 🎬 娯楽    ¥1,600   █░░░░░░░░░░  │
└──────────────────────────────────┘
```

**关键实现：**

- 百分比进度条：`width: ${Math.min(pct, 100)}%`
- 使用 emoji 图标映射 `CATEGORY_ICONS`
- 当 `stats` 为空时返回 `null`（不渲染）

---

## 7. 自定义 Hook 详解

### 7.1 useReceipts — 数据核心

**文件路径**：[hooks/useReceipts.ts](file:///Users/wang/Desktop/receipt-scanner/hooks/useReceipts.ts)

**职责**：封装收据相关的全部状态管理和业务逻辑，是 UI 层与 Service 层之间的桥梁。

**状态 (State)：**

| State | 类型 | 初始值 | 说明 |
|-------|------|--------|------|
| `receipts` | `Receipt[]` | `[]` | 所有收据列表 |
| `loading` | `boolean` | `false` | 加载状态 |
| `scanning` | `boolean` | `false` | 扫描解析中标志 |
| `error` | `string \| null` | `null` | 错误信息 |

**派生数据 (Computed)：**

| 数据 | 来源 | 说明 |
|------|------|------|
| `stats` | `getCategoryStats(receipts)` | 按类别聚合统计 |
| `totalSpent` | `receipts.reduce(...)` | 所有收据总金额 |

**对外暴露的方法：**

| 方法 | 签名 | 说明 |
|------|------|------|
| `refresh()` | `() => Promise<void>` | 重新加载数据，含 mock 数据种子逻辑 |
| `scan(uri)` | `(uri: string) => Promise<Receipt \| null>` | 拍照扫描完整流程 |
| `remove(id)` | `(id: string) => Promise<void>` | 删除指定收据 |
| `refresh` | - | 暴露手动刷新方法 |

**种子数据 (Mock Data)：**

`seedIfEmpty()` — 首次启动时，若 AsyncStorage 中不存在收据记录，自动插入 5 条日文示例收据：

| ID | 店铺 | 金额 |
|----|------|------|
| mock-1 | セブン-イレブン 渋谷店 | ¥2,840 |
| mock-2 | ENEOS 新宿セルフSS | ¥5,800 |
| mock-3 | ユニクロ 銀座店 | ¥4,980 |
| mock-4 | TOHOシネマズ 六本木 | ¥3,800 |
| mock-5 | 松屋 渋谷センター街店 | ¥1,300 |

**scan 流程详解：**

```
scan(imageUri)
  ├── setScanning(true) | setError(null)
  ├── analyzeReceipt(imageUri)            ← services/openai
  │     ├── imageToBase64(uri)
  │     └── callOpenAI(b64) → JSON
  ├── 构造 Receipt 对象 (id = Date.now())
  ├── saveReceipt(receipt, imageUri)      ← services/storage
  │     ├── [Native] FileSystem.copyAsync  (保存图片到 app 私有目录)
  │     └── AsyncStorage.setItem           (更新 JSON)
  ├── setReceipts(prev → [saved, ...prev])
  └── return saved
  catch → setError(e.message) → return null
  finally → setScanning(false)
```

---

## 8. 服务层详解

### 8.1 OpenAI 收据分析服务 — `services/openai.ts`

**文件路径**：[services/openai.ts](file:///Users/wang/Desktop/receipt-scanner/services/openai.ts)

**对外接口：**

```typescript
export async function analyzeReceipt(uri: string): Promise<ParsedReceipt>
```

**内部函数调用链：**

```
analyzeReceipt(uri)
  │
  ├── imageToBase64(uri)
  │     ├── [data URI]  → 直接裁剪前缀
  │     ├── [Web]       → fetch + FileReader
  │     └── [Native]    → FileSystem.readAsStringAsync(Base64)
  │
  └── callOpenAI(b64)
        ├── [Web]  → fetch("http://localhost:3099")  (代理)
        └── [Native] → fetch("https://api.openai.com/v1/responses")
              │
              ├── Model: gpt-4o-mini
              ├── Input: image/jpeg base64 + 文本提示 (日文)
              ├── Response Format: json_schema (strict mode)
              └── 返回: output[0].content[0].text → JSON string
```

**OpenAI 请求结构：**

```json
{
  "model": "gpt-4o-mini",
  "input": [{
    "role": "user",
    "content": [
      { "type": "input_image", "image_url": "data:image/jpeg;base64,..." },
      { "type": "input_text", "text": "このレシート画像を解析し..." }
    ]
  }],
  "text": {
    "format": {
      "type": "json_schema",
      "name": "receipt",
      "schema": { ... },
      "strict": true
    }
  }
}
```

**提示词要点 (日文)：**
- 要求返回纯 JSON（不使用 Markdown）
- `store`：店名（日文）
- `date`：YYYY-MM-DD 格式
- `total`：含税总金额（纯数字）
- `tax`：消费税额（必填）
- `items[].category`：food / transport / shopping / entertainment / other
- `items[].quantity`：必填，默认 1

**平台差异适配：**

| 场景 | Web平台 | Native平台 |
|------|---------|------------|
| Base64 转换 | `fetch + FileReader` | `FileSystem.readAsStringAsync` |
| API 调用 | `http://localhost:3099` (本地代理) | 直连 `api.openai.com` |
| 原因 | 浏览器 CORS 限制 | 原生无跨域限制 |

---

### 8.2 本地存储服务 — `services/storage.ts`

**文件路径**：[services/storage.ts](file:///Users/wang/Desktop/receipt-scanner/services/storage.ts)

**存储方案：**

| 数据类型 | 存储方式 | 位置 |
|---------|---------|------|
| 收据元数据 (JSON) | `AsyncStorage` key: `"receipts"` | App 沙盒 |
| 收据图片文件 | `expo-file-system` | `{documentDirectory}/receipt-images/` |

**对外 API：**

| 函数 | 签名 | 说明 |
|------|------|------|
| `saveReceipt` | `(receipt, imageUri) → Promise<Receipt>` | 保存收据 (复制图片 + 更新元数据) |
| `loadReceipts` | `() → Promise<Receipt[]>` | 读取全部收据 |
| `getReceipt` | `(id) → Promise<Receipt \| null>` | 按 ID 读取单条 |
| `deleteReceipt` | `(id) → Promise<void>` | 删除收据 (图片 + 元数据) |
| `getCategoryStats` | `(receipts) → CategoryStats[]` | 同步计算类别统计 |

**`saveReceipt` 详细流程：**

```
saveReceipt(receipt, imageUri)
  │
  ├── [Web] → 直接使用 blob URL (无需复制文件)
  │     └── AsyncStorage: 元数据 unshift + setItem
  │
  └── [Native]
        ├── ensureImageDir()         ← 确保 {docDir}/receipt-images/ 存在
        ├── FileSystem.copyAsync()   ← 将临时图片复制到持久化目录
        │     命名: {receipt.id}.{ext}
        ├── 构造 Receipt 对象 (imageUri = 持久化路径)
        └── AsyncStorage: 元数据 unshift + setItem
```

**`getCategoryStats` 计算逻辑：**

```
遍历所有 receipts → 遍历每个 receipt 的所有 items →
按 category 聚合: { category, total, count }
  total = Σ(price × quantity)
  count = Σ(1)
→ 按预定义顺序排序: food, transport, shopping, entertainment, other
→ 返回 CategoryStats[]
```

---

## 9. 类型定义 — `types/index.ts`

**文件路径**：[types/index.ts](file:///Users/wang/Desktop/receipt-scanner/types/index.ts)

```typescript
// 消费类别枚举
export type Category = "food" | "transport" | "shopping" | "entertainment" | "other";

// 收据中的单个商品
export interface ReceiptItem {
  name: string;          // 商品名
  price: number;         // 单价 (税込)
  category: Category;    // 消费类别
  quantity?: number;     // 数量 (可选，默认为1)
}

// 完整收据
export interface Receipt {
  id: string;            // 唯一标识 (时间戳)
  store: string;         // 店铺名
  date: string;          // 购买日期 YYYY-MM-DD
  total: number;         // 总金额 (税込)
  tax?: number;          // 消费税额 (可选)
  items: ReceiptItem[];  // 商品列表
  imageUri: string;      // 收据图片路径
  createdAt: number;     // 创建时间戳
}

// 类别统计聚合
export interface CategoryStats {
  category: Category;    // 消费类别
  total: number;         // 该类总消费额
  count: number;         // 该类商品数量
}
```

**数据关系图：**

```
Receipt 1 ──┬── ReceiptItem (name, price, category, quantity)
             ├── ReceiptItem
             ├── ReceiptItem
             └── ...

Receipt 2 ──┬── ReceiptItem
             └── ...

CategoryStats[] ← 所有 Receipt 的 items 按 category 聚合
```

---

## 10. 辅助工具与脚本

### 10.1 Proxy Server — `proxy-server.js`

**文件路径**：[proxy-server.js](file:///Users/wang/Desktop/receipt-scanner/proxy-server.js)

**用途**：Web 平台浏览器无法跨域直连 OpenAI API，此脚本启动本地 HTTP 服务 (端口 3099) 作为中转代理。

**架构：**

```
[Browser App] ──POST──→ [localhost:3099] ──POST──→ [api.openai.com/v1/responses]
  imageUri                 proxy-server.js              GPT-4o-mini
```

**技术细节：**

- 纯 Node.js `http` 模块，零依赖
- CORS 全开放 (`Access-Control-Allow-Origin: *`)
- 从 `.env` 文件读取 `EXPO_PUBLIC_OPENAI_API_KEY`
- 请求体和提示词与 `services/openai.ts` 完全一致

**启动：**
```bash
node proxy-server.js
# → Proxy running at http://localhost:3099
```

### 10.2 测试脚本 — `test-api.js` / `test-proxy.js`

| 文件 | 功能 | 使用场景 |
|------|------|---------|
| [test-api.js](file:///Users/wang/Desktop/receipt-scanner/test-api.js) | 直连 OpenAI API 测试 | 验证 API Key 有效性和提示词效果 |
| [test-proxy.js](file:///Users/wang/Desktop/receipt-scanner/test-proxy.js) | 通过本地代理测试完整链路 | 验证 proxy-server 是否正常工作 |

**测试方式：**
- 将测试用收据图片放在 `~/Downloads/レシート.jpg`
- 运行 `node test-api.js` 或 `node test-proxy.js`

---

## 11. 主题与样式配置

### NativeWind / Tailwind CSS

**配置文件**：[tailwind.config.js](file:///Users/wang/Desktop/receipt-scanner/tailwind.config.js)

**自定义色彩体系 (iOS 风格)：**

| Token | 色值 | 用途 |
|-------|------|------|
| `background` | `#F2F2F7` | 页面/列表背景 (iOS 系统浅灰) |
| `card` | `#FFFFFF` | 卡片背景 |
| `primary` | `#007AFF` | 主色调 (iOS Blue) |
| `secondary` | `#8E8E93` | 次要文字/图标 |
| `separator` | `#E5E5EA` | 分割线 |
| `text` | `#1C1C1E` | 主文字色 |
| `text-secondary` | `#8E8E93` | 次要文字色 |

**自定义圆角：**

| Token | 值 | 用途 |
|-------|-----|------|
| `card` | `16px` | 卡片圆角 |
| `button` | `12px` | 按钮圆角 |

**CSS 入口**：[global.css](file:///Users/wang/Desktop/receipt-scanner/global.css) — 仅包含 3 行 Tailwind 指令集。

### NativeWind 阴影约定

项目对 iOS/Android 阴影做了平台区分：
- `ios:shadow-sm` — 仅 iOS 渲染阴影 (通过 NativeWind 平台前缀)
- 不使用跨平台的 `shadow-*`，避免 Android 上的阴影黑边问题

---

## 12. 项目运行方式

### 前置条件

- Node.js 18+
- npm 或 yarn
- Expo CLI (`npx expo`)
- (可选) Expo Go 手机 App 或 iOS/Android 模拟器

### 环境配置

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env`，填入 OpenAI API Key：
```
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-actual-key
```

### 启动开发服务

```bash
# 安装依赖
npm install

# 启动 Expo 开发服务器
npx expo start

# 或指定平台
npx expo start --ios      # iOS 模拟器
npx expo start --android  # Android 模拟器
npx expo start --web      # Web 浏览器
```

### Web 平台额外步骤

Web 平台需要启动本地代理服务器：

```bash
# 终端 1：启动代理
node proxy-server.js

# 终端 2：启动 Expo Web
npx expo start --web
```

### 可用脚本 (package.json)

| 脚本 | 命令 | 说明 |
|------|------|------|
| `start` | `expo start` | 启动开发服务器 (交互式) |
| `android` | `expo start --android` | 直接启动 Android |
| `ios` | `expo start --ios` | 直接启动 iOS |
| `web` | `expo start --web` | 直接启动 Web |

---

## 13. 数据流全景图

### 完整用户操作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                         用户操作                                 │
│                                                                  │
│  1. 打开 App                                                     │
│     ├── useReceipts() 初始化                                     │
│     ├── seedIfEmpty() → 插入 5 条示例数据                       │
│     └── loadReceipts() → 渲染首页 (FlatList + StatsCard)        │
│                                                                  │
│  2. 点击「+」按钮                                                │
│     └── router.push("/scan")                                     │
│                                                                  │
│  3. 选择「写真を撮る」或「アルバムから選択」                     │
│     ├── ImagePicker 获取图片 URI                                 │
│     ├── analyzeReceipt(uri)                                      │
│     │     ├── imageToBase64 → 图片转 Base64                     │
│     │     ├── callOpenAI(b64)                                     │
│     │     │     ├── [Native] → api.openai.com/v1/responses      │
│     │     │     └── [Web]    → localhost:3099 → OpenAI           │
│     │     └── JSON.parse → ParsedReceipt                         │
│     ├── saveReceipt(receipt, imageUri)                           │
│     │     ├── [Native] → 复制图片到 app 私有目录                 │
│     │     └── AsyncStorage 更新                                  │
│     ├── setReceipts(prev → [saved, ...prev])                     │
│     └── router.replace(`/receipt/${receipt.id}`)                 │
│                                                                  │
│  4. 收据明细页面                                                 │
│     ├── getReceipt(id) → 加载完整数据                            │
│     ├── 展示商品列表 + 金额汇总                                  │
│     └── 可执行删除 → remove() → 清理图片+元数据 → router.back() │
│                                                                  │
│  5. 返回首页                                                     │
│     └── StatsCard 自动重新计算 → 更新类别分布                    │
└─────────────────────────────────────────────────────────────────┘
```

### 模块依赖关系图

```
app/index.tsx ────────┐
app/scan.tsx ─────────┼──→ hooks/useReceipts.ts ──┬──→ services/openai.ts ──→ OpenAI API
app/receipt/[id].tsx ─┘                           │
                                                  └──→ services/storage.ts
app/_layout.tsx ───→ 全局布局 (无数据依赖)              ├──→ AsyncStorage
                                                       └──→ expo-file-system

components/ReceiptCard.tsx ←── 纯展示组件 (Props驱动)
components/ScanButton.tsx   ←── 纯交互组件 (回调驱动)
components/StatsCard.tsx    ←── 纯展示组件 (Props驱动)

types/index.ts ←── 被所有模块引用 (类型定义)
```

---

> **文档生成日期**: 2026-05-16 · **维护者**: Receipt Scanner Team
