# 個人算命助手 v1.1 — Phase 1 修復實作清單

## 總目標
修復已知 Bug，完成 Phase 1 全部 6 項功能落地，交付可正常運行的 MVP。目標評分：7.5/10（修 Bug + 基礎功能）。

---

## 🔴 優先零：P0 Bug 修復（修復後才能談功能）

### BUG-1：ziwei.js 整份檔案重複宣告
**現狀**：`js/ziwei.js` 從第 380 行起整段重複貼了所有變數與函式，導致 `TIAN_GAN` 等變數 `Identifier 'TIAN_GAN' has already been declared`。
**修復動作**：
- [ ] 刪除 `js/ziwei.js` 第 380 行之後的全部重複內容
- [ ] 只保留第 1-378 行的「乾淨版本」（到第一個 `export` 為止）
- [ ] 驗證：`node -e "import('./js/ziwei.js').then(m => console.log('OK', Object.keys(m).slice(0,5)))"` 無錯誤

### BUG-2：solarToLunar() 引用未定義的 LUNAR_DATA
**現狀**：`solarToLunar()` 函式內使用 `const monthData = LUNAR_DATA[lunarYear]`，但 `LUNAR_DATA` 變數從未定義。
**修復動作**：
- [ ] 在 `js/ziwei.js` 頂部（在第一個 function 之前）加入完整的 `LUNAR_DATA` 農曆數據表（1900-2050 年，每年含 `leapMonth` + `monthDays` 陣列）
- [ ] 或將 `solarToLunar()` 改寫為純算術農曆轉換（不依賴查表，內建 1900-01-31 為基準的朔望月偏移）
- [ ] 驗證：`castZiwei(1990, 5, 15, 8)` 不報 `ReferenceError`

### BUG-3：card.js 缺少 getTodayCard / saveTodayCard export
**現狀**：`app.js` 從 `card.js` 引入這兩個函式，但 `card.js` 只有 `ENERGY_CARDS, drawRandomCard, getCardByPeriod, getCurrentCard` 四個 export。
**修復動作**：
- [ ] 在 `js/card.js` 底部 `export` 列表中加入 `getTodayCard` 和 `saveTodayCard`
- [ ] 確認 `app.js` 的 `import` 語句正確
- [ ] 驗證：瀏覽器打開 `index.html`，今日面板正常顯示卡片，刷新後卡片不變

### BUG-4：Ziwei 演算法精度問題
**現狀**：安星法使用固定偏移，與正統紫微斗數安星規則不符。
**修復動作**：
- [ ] 修正「天府」安星：從正月寅宮起逆數（與廉貞相隔5宮）
- [ ] 修正「七殺/破軍/貪狼」（殺破狼系列）：根據命宮五行局安星
- [ ] 加入「天姚/紅鸞」等常見桃花星（簡化版，至少6顆星）
- [ ] 驗證：1990/5/15 辰時 女 命宮應有「紫微」（需確認準確性）

---

## 🔵 Phase 1：主星原型認領、習慣錨定與社交裂變

### 1.1 移除 Math.random（全程確認）

**現狀**：檢查全專案，`card.js` 的 `drawRandomCard` 仍使用 `Math.random()`。
**修復動作**：
- [ ] 將 `drawRandomCard` 的隨機改為「日期 + 卡片ID」的確定性 seed
  ```js
  // 錯誤（已移除 Math.random 於卦象，確認卡片刷新也不需要 random）
  const idx = Math.floor(Math.random() * pool.length);
  // 改為：
  const today = new Date();
  const seed = (today.getDate() * 31 + today.getHours()) % pool.length;
  ```
- [ ] 全專案搜尋：`grep -rn "Math.random" js/` 應無任何卦象計算用途的 random

---

### 1.2 建立 LUNAR_DATA 農曆數據表

**現狀**：完全缺失。
**修復動作**：
- [ ] 在 `js/ziwei.js` 頂部（const 宣告區）加入 `LUNAR_DATA` 物件
- [ ] 格式：`{ year: { leapMonth: 0~1, monthDays: [30,29,30,...] } }`
- [ ] 涵蓋 1900-2050 年
- [ ] 驗證：2000-02-05（除夕）→ 應輸出農曆臘月三十或正月初一

---

### 1.3 靈魂主星認領微互動（新增功能）

**現狀**：完全缺失。用戶首次進入沒有「認領自己主星」的鉤子。
**修復動作**：
- [ ] 在 `js/storage.js` 中新增欄位：`userBirthData`（儲存用戶出生日期和時辰）
- [ ] 在 `js/app.js` 的「今日面板」中，檢查 `localStorage` 是否已有 `userBirthData`
  - 若無：顯示「認領你的命宮主星」按鈕（取代空白 placeholder）
  - 若有：直接顯示「【天同星】的專屬決策所，今日來了」之類的個人化文案
- [ ] 「認領」流程：
  1. 點擊按鈕 → 彈出一個 modal（HTML + CSS + JS，純前端）
  2. Modal 內容：讓用戶輸入「出生年、月、日、時（0-23）」
  3. 點「確認」→ 呼叫 `castZiwei()` → 取出「命宮」那一宮的全部主星（陣列）
  4. 取第一顆主星（命宮主星）→ 顯示「你是【天同星】人」+ 3 句特質描述
  5. 存入 `localStorage` → 之後每次開啟直接顯示
- [ ] 個人化稱呼範例：「天同星坐命」「紫微星坐命」「天府星坐命」
- [ ] 驗證：第一次開啟 → 出現認領引導 → 輸入 1990/5/15/8 → 顯示「你是【XX星】人」

---

### 1.4 命宮主星 × 梅花卦象 交叉解讀矩陣（新增功能）

**現狀**：完全缺失。梅花占卜結果和紫微命盤各自獨立，沒有交叉。
**修復動作**：
- [ ] 在 `js/app.js` 的 `renderDivinationResult()` 中新增邏輯：
  1. 讀取 `localStorage` 的 `userBirthData`
  2. 若有：呼叫 `castZiwei()` 取得命宮主星陣列，取第一顆
  3. 建立一個「主星性格標籤」對照表（`js/ziwei.js` 新增）：
     ```js
     const STAR_TRAITS = {
       '天同': '享受型、怕得罪人、依賴直覺',
       '紫微': '領導型、面子至上、不服輸',
       '天府': '保守型、穩健理財、缺乏衝勁',
       // ... 其餘12顆
     };
     ```
  4. 在占卜結果的「金句」區塊下方，新增一行：
     ```
     【天同星提醒】卦象顯示...（結合卦象五行與主星性格的客製化解讀）
     ```
- [ ] 交叉解讀邏輯示例：
  - 體卦為「木」+ 主星為「天同」（懶散）→ 「天同星人今天的木卦，剛好補足你的執行力缺口」
  - 用剋體 + 主星為「七殺」（衝動）→ 「七殺星人今天遇上用剋體，適合忍讓而非硬碰硬」
- [ ] 驗證：已認領天同星 → 占一卦 → 結果應出現「天同星提醒」段落

---

### 1.5 PWA 離線緩存 + 安裝至主畫面（新增功能）

**現狀**：完全缺失。
**修復動作**：

#### Step 1：建立 `manifest.json`
- [ ] 在專案根目錄新建 `manifest.json`：
  ```json
  {
    "name": "梅花易數 · 紫微斗數",
    "short_name": "算命",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#111110",
    "theme_color": "#C9A84C",
    "icons": [
      { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
      { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
    ]
  }
  ```

#### Step 2：建立 `icon-192.png` 和 `icon-512.png`
- [ ] 使用線上工具（如 realfavicongenerator.net）或純 CSS/SVG 生成兩張圖示
- [ ] 或在 `index.html` 的 `<head>` 中直接內嵌 SVG favicon（最簡方案）：
  ```html
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>☰</text></svg>">
  <link rel="apple-touch-icon" href="data:image/svg+xml,...">
  ```

#### Step 3：修改 `index.html`
- [ ] 在 `<head>` 加入：
  ```html
  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#111110">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  ```

#### Step 4：建立 Service Worker（`sw.js`）
- [ ] 在根目錄新建 `sw.js`：
  ```js
  const CACHE_NAME = 'suanming-v1';
  const ASSETS = ['/', '/index.html', '/css/style.css', '/js/app.js', '/js/meihua.js', '/js/ziwei.js', '/js/sayings.js', '/js/card.js', '/js/storage.js'];
  
  self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
    self.skipWaiting();
  });
  
  self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  });
  
  self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  });
  ```

#### Step 5：在 `index.html` 註冊 SW
- [ ] 在 `<body>` 底部加入：
  ```js
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }
  ```

#### Step 6：安裝引導
- [ ] 在 `js/app.js` 的「今日面板」，當偵測到 iOS/Android 時，顯示「加入主畫面獲得完整體驗」提示
  ```js
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  if (!isStandalone && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    // 顯示安裝提示 banner
  }
  ```

- [ ] 驗證：
  - Chrome DevTools → Application → Service Workers → 已註冊
  - Network → Offline → 刷新頁面仍可顯示內容
  - iOS Safari → 分享按鈕 → 「加入主畫面」可用

---

### 1.6 每日晨間氣場升級（改寫 card.js）

**現狀**：`getCurrentCard()` 直接根據時段（晨/午/暮/夜）固定抽卡，沒有「8:00 專屬儀式」也沒有「當日時空能量」。
**修復動作**：
- [ ] 將 `getCurrentCard()` 改為「日期 seed」驅動（同一天同一張卡）：
  ```js
  function getCurrentCard() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const hour = today.getHours();
    // 加入時辰能量：時辰地支也影響 seed
    const shichen = Math.floor((hour + 1) / 2) % 12;
    const seed = (dayOfYear * 7 + shichen) % ENERGY_CARDS.length;
    return ENERGY_CARDS[seed];
  }
  ```
- [ ] 在「晨」時段（6:00-12:00）首次開啟時，特別顯示「🌅 今日晨間氣場」標題
- [ ] 驗證：同一日多次刷新，卡片不變；隔日（ UTC 00:00 後）更換

---

## 🟡 Phase 2 預留（若時間允許）

以下為 Phase 2 待實作項目，**不列入本次交付**，但預留介面：

- [ ] 8:00 定時推播提醒（需 Web Push API + Vercel Cron 或瀏覽器通知 API）
- [ ] 「每週複盤」面板（storage.js 已有 `weeklyReview` 欄位，app.js 已有按鈕，只需實作 UI）
- [ ] 「決策回看」7天提醒（storage.js 已有 `reflections` 欄位，只需實作 UI）

---

## 交付標準（7.5 分檢查清單）

### P0：不能壞
- [ ] `node -e "import('./js/ziwei.js').then(console.log)"` 無錯誤
- [ ] `node -e "import('./js/card.js').then(m => m.getCurrentCard() && m.saveTodayCard && console.log('OK'))"` 有 OK
- [ ] `castZiwei(1990, 5, 15, 8)` 不拋 ReferenceError
- [ ] `grep -rn "Math.random" js/` 無任何與卦象相關的 random（卡片刷新允許 random）

### 功能驗收
- [ ] 打開 `index.html`，今日面板顯示卡片（不是空白 placeholder）
- [ ] 第一次開啟 → 出現「認領命宮主星」引導
- [ ] 認領後 → 顯示「你是【XX星】人」個人化稱呼
- [ ] 認領後占一卦 → 出現「【XX星提醒】」交叉解讀
- [ ] Chrome DevTools → Application → Manifest → manifest.json 可讀
- [ ] Chrome DevTools → Application → Service Workers → 已註冊
- [ ] 刷新頁面，當日卡片不變
- [ ] 儀表板：streak、統計、匯出 JSON 正常運作

### 視覺檢查
- [ ] 手機 Chrome / Safari 測試通過（響應式）
- [ ] 無 `Math.random` 用於卦象（用戶檢查原始碼時不尷尬）

---

## 預估工時

| 項目 | 工作內容 | 工時 |
|------|----------|------|
| BUG-1 | 刪除 ziwei.js 重複宣告段 | 0.5h |
| BUG-2 | 建立 LUNAR_DATA 農曆數據表 | 2h |
| BUG-3 | 修 card.js export | 0.25h |
| BUG-4 | 修正 Ziwei 安星法精度 | 2h |
| 1.1 | 移除 Math.random | 0.25h |
| 1.2 | LUNAR_DATA 農曆數據表 | （已含 BUG-2）|
| 1.3 | 靈魂主星認領微互動 | 2h |
| 1.4 | 交叉解讀矩陣 | 1.5h |
| 1.5 | PWA 離線緩存 | 2h |
| 1.6 | 晨間氣場升級 | 1h |
| 測試 | 整合測試 | 1h |
| **合計** | | **~12.5h** |

---

## 優先順序（若時間不足，可砍）

**MVP（7 分，必做）**：BUG-1 + BUG-2 + BUG-3 + 1.3（主星認領）+ 1.6（卡片seed）≈ 6h
**高分（8 分，建議加）**：BUG-4（安星精度）+ 1.1（全無random）+ 1.5（PWA）+ 1.4（交叉解讀）≈ 5.5h
**炫技（8.5 分，可選）**：1.5 安裝引導美化 + UI 優化

---

確認後立即動工，先從 BUG-1 開始。
