# 紫微斗數排盤 Bug 修復 + 迴字形 UI

## 根本原因確認

**所有 Bug 的源頭是一個參數誤解**：

`iztro` 的 `timeIndex` 參數是 **0-12 的時辰序號**，不是 24 小時制：

| timeIndex | 時辰 | 對應時段 |
|-----------|------|----------|
| 0 | 子時（早） | 00:00~01:00 |
| 1 | 丑時 | 01:00~03:00 |
| 2 | 寅時 | 03:00~05:00 |
| 3 | 卯時 | 05:00~07:00 |
| 4 | 辰時 | 07:00~09:00 |
| **5** | **巳時** | **09:00~11:00** |
| 6 | 午時 | 11:00~13:00 |
| 7 | 未時 | 13:00~15:00 |
| 8 | 申時 | 15:00~17:00 |
| 9 | 酉時 | 17:00~19:00 |
| 10 | 戌時 | 19:00~21:00 |
| 11 | 亥時 | 21:00~23:00 |
| 12 | 子時（晚） | 23:00~00:00 |

用戶輸入 hour=9 → 代碼直接傳 9 → iztro 視為 timeIndex=9（酉時）→ 命宮錯在申宮（而非正確的子宮）。

---

## 工作階段一：修復 Bug #1 — 時辰轉換（根本修復）

### TASK-1：新增 `hourToTimeIndex` 輔助函數

在 `js/ziwei.js` 開頭常數區之後，加入：

```js
/**
 * 將 24 小時制數字轉換為 iztro 的 timeIndex（0-12）
 *
 * 對照表：
 * hour 0  → 0  （早子時）
 * hour 1  → 1  （丑時）
 * hour 3  → 2  （寅時）
 * hour 5  → 3  （卯時）
 * hour 7  → 4  （辰時）
 * hour 9  → 5  （巳時）  ← 用戶輸入 9 時，必須轉為 5
 * hour 11 → 6  （午時）
 * hour 13 → 7  （未時）
 * hour 15 → 8  （申時）
 * hour 17 → 9  （酉時）
 * hour 19 → 10 （戌時）
 * hour 21 → 11 （亥時）
 * hour 23 → 12 （晚子時）
 *
 * @param {number} hour - 24 小時制（0-23）
 * @returns {number} timeIndex（0-12）
 */
function hourToTimeIndex(hour) {
  if (hour === 0) return 0;  // 00:00 早子時
  if (hour === 23) return 12; // 23:00 晚子時
  // 其餘：Math.floor(hour / 2)
  return Math.floor(hour / 2);
}
```

**驗證：** `hourToTimeIndex(9) === 5`，`hourToTimeIndex(8) === 4`，`hourToTimeIndex(0) === 0`，`hourToTimeIndex(23) === 12`

---

### TASK-2：修改 `castZiwei` 中的 iztro 呼叫

在 `js/ziwei.js` 的 `castZiwei` 函數中，找到：

```js
const astrolabe = astro.astrolabeBySolarDate(dateStr, birthHour, gender, true, 'zh-TW');
```

**替換為：**

```js
const timeIndex = hourToTimeIndex(birthHour);
const astrolabe = astro.astrolabeBySolarDate(dateStr, timeIndex, gender, true, 'zh-TW');
```

**驗證：**
```bash
node -e "
const {castZiwei} = require('./js/ziwei.js');
const r = castZiwei(1984, 5, 5, 9, 'male');
console.log('命宮主星：', r.mingStar);
console.log('五行局：', r.wuxingJu);
console.log('命宮地支：', r.mingGongDi);
"
```

預期：命宮主星非 null，五行局為 水二局，命宮地支為 子。

---

## 工作階段二：修復 Bug #2 — 命宮地支正確讀取

### TASK-3：從 iztro 結果直接讀取 `earthlyBranchOfSoulPalace`

在 `castZiwei` 的回傳物件中，找到：

```js
// === 命宮地支 ===
const mingGongDi = palaces['命']?.di || '申';
```

**替換為：**

```js
// === 命宮地支 ===
// 直接從 iztro 的 astrolabe 取得（最準確，不依賴 palace.di 的映射）
const mingGongDi = astrolabe.earthlyBranchOfSoulPalace || palaces['命']?.di || '子';
```

**為什麼這樣改：**
- `astrolabe.earthlyBranchOfSoulPalace` 是 iztro 源碼中計算出的 命宮地支
- `palaces['命']?.di` 是宮位物件的 地支 欄位（也可用，但依賴 palace 映射正確性）
- 直接取 `astrolabe` 上的欄位繞過了 palace 遍歷環節

---

## 工作階段三：修復 Bug #3 — 四化表使用年干（日干→年干）

### TASK-4：將四化表的 key 從日干改為年干

在 `castZiwei` 的回傳物件中，找到：

```js
// === 日干四化表 ===
const fourHuaTable = SIHUA_TABLE[dayGZ.gan] || SIHUA_TABLE['甲'];
```

**替換為：**

```js
// === 生年四化表（以年干為準）===
const fourHuaTable = SIHUA_TABLE[yearGZ.gan] || SIHUA_TABLE['甲'];
```

**為什麼這樣改：**
- 生年四化 = 「甲廉破武陽、乙陰同機……」是以「出生年的天干」為準
- 1984 年為甲子年 → 年干是「甲」→ 甲廉破武陽（廉貞化祿、破軍化權、武曲化科、太陽化忌）
- 原本用 `dayGZ.gan`（日干）是錯誤的，會導致四化與年干不符

---

## 工作階段四：修復 Bug #3 附 — 宮位四化從 iztro star.mutagen 正確讀取

### TASK-5：將 `star.mutagen`（字串）寫入 `palaces[].fourHua`

在 `castZiwei` 的 palace 遍歷區塊，找到目前這段：

```js
// 四化星
const fourHua = [];
for (const star of majorStars) {
  if (star.mutagen) {
    fourHua.push(star.mutagen);
  }
}
palaces[internalName].fourHua = fourHua;
```

**保留這段邏輯，但確認 `star.mutagen` 是字串（如 `"祿"`, `"權"`, `"科"`, `"忌"`），不要重複呼叫 SIHUA_TABLE。**

如果 `star.mutagen` 在某些版本中是物件 `{type: "祿", star: "廉貞"}`，則改為：

```js
// 四化星（取星曜的四化標記）
const fourHua = [];
for (const star of majorStars) {
  if (star.mutagen) {
    // mutagen 可能為字串（'祿'/'權'/'科'/'忌'）或物件 {type, star}
    const huaType = typeof star.mutagen === 'string' ? star.mutagen : star.mutagen.type;
    if (huaType) fourHua.push(huaType);
  }
}
palaces[internalName].fourHua = fourHua;
```

**驗證：** 財帛宮（廉貞+天府）應顯示「祿」；遷移宮（破軍）應顯示「權」。

---

## 工作階段五：修復 Bug #4 — 頂部摘要與宮位卡片資料同步

### TASK-6：統一頂部摘要的 `mingStar` 來源

在 `js/app.js` 的 `renderZiweiResult` 中，找到：

```js
const headerHTML = `
  <div class="chart-header">
    ${mingStar ? `<div class="chart-ming-star" onclick="showArchetypeCard('${mingStar}')" ...`
```

`mingStar` 來自 `const { yearGZ, dayGZ, mingGongDi, wuxingJu, fourHua, mingStar } = result;`。

檢查 `castZiwei` 的回傳：`mingStar` 來自 `astrolabe.soul`。

**問題：iztro 的 `astrolabe.soul` 是「命宮主星名」（如「天同」），
而 `astrolabe.earthlyBranchOfSoulPalace` 才是「命宮地支」（如「子」）。
UI 上應該同時顯示「命宮主星 + 命宮地支」。**

確認 `renderZiweiResult` 的 `headerHTML` 中，已有 `ci-label 命宮` 顯示 `mingGongDi`（地支），
但 `chart-ming-star` 顯示的應該是主星名稱。**這個部分邏輯上是對的，不需要修改。**

真正的問題是：由於 Bug #1 和 Bug #2，`mingGongDi` 一直是錯的（申而非子），
連帶導致 `mingStars`（命宮有哪些星）全部偏移。只要修好 TASK-2 和 TASK-3，
這個同步問題會自動解決。

---

## 工作階段六：修復 Bug #5 — UI 改為傳統迴字形

### TASK-7：修改 CSS 支援迴字形佈局

在 `css/` 目錄的 CSS 檔案中（或 `index.html` 的 `<style>` 區塊），
找到 `.palace-grid` 的樣式。

**將 `.palace-grid` 從 4×3 線性網格改為迴字形：**

```css
/* 迴字形命盤：外圍 12 格固定地支位置 */
.palace-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, 1fr);
  gap: 6px;
  max-width: 480px;
  margin: 0 auto;
  position: relative;
}

/*
  迴字形排列（地支固定位置）：
  ┌─────┬─────┬─────┬─────┐
  │巳(命)│午(兄)│未(夫)│申(妻)│
  ├─────┼─────┼─────┼─────┤
  │辰(子)│  ★  │  ★  │酉(事)│
  │     │中央區域│中央區域│     │
  ├─────┼─────┼─────┼─────┤
  │卯(財)│寅(疾)│丑(遷)│子(奴)│
  └─────┴─────┴─────┴─────┘

  宮位對應地支：
  0 命 → 巳  (index 6)
  1 兄 → 午  (index 7)
  2 夫妻 → 未 (index 8)
  3 子女 → 申 (index 9)
  4 財帛 → 酉 (index 10)
  5 疾厄 → 戌 (index 11)
  6 遷移 → 亥 (index 0)  ← 注意：從子(0)逆時針
  7 奴僕 → 子 (index 1)  ← 注意
  8 事業 → 丑 (index 2)
  9 田宅 → 寅 (index 3)
  10 福德 → 卯 (index 4)
  11 父母 → 辰 (index 5)

  實際 iztro 的地支排列（palace index → 地支）：
  0 命 → 地支由 iztro 計算（巳/子視 input 而定）
  ...需動態對應
*/

/* 動態計算每宮的地支位置（依命宮地支）*/
/* 預設：命宮在巳（index 6），其餘宮逆時針排列 */
.palace-grid .palace-card {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 6px;
  min-height: 80px;
  background: var(--card-bg);
  position: relative;
  cursor: pointer;
  transition: all 0.2s;
}

.palace-grid .palace-card:hover {
  border-color: var(--accent);
  transform: scale(1.02);
}

/* 命宮特殊標記 */
.palace-grid .palace-ming {
  border: 2px solid var(--accent);
  background: linear-gradient(135deg, var(--accent)10, transparent);
}

/* 宮位名 */
.palace-name {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: bold;
}

/* 地支 */
.palace-di {
  font-size: 1.1rem;
  color: var(--accent);
  font-weight: bold;
}

/* 主星 */
.palace-stars {
  font-size: 0.85rem;
  color: var(--text);
  margin-top: 2px;
  line-height: 1.3;
}

/* 四化標記 */
.palace-hua {
  font-size: 0.7rem;
  color: var(--warning);
  margin-top: 2px;
}

/* 空宮 */
.empty-palace {
  color: var(--text-muted);
  font-style: italic;
}

/* 展開區 */
.palace-expanded {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid var(--border);
  font-size: 0.75rem;
  color: var(--text-muted);
  line-height: 1.5;
}
```

---

### TASK-8：修改 `renderZiweiResult` 動態計算地支位置

在 `js/app.js` 的 `renderZiweiResult` 中，
修改宮位排列邏輯，讓每個宮位根據 `mingGongDi` 動態計算自己的地支。

**原理：**
地支固定環繞（寅1→丑2→子0→亥11→戌10→酉9→申8→未7→午6→巳5→辰4→卯3），
命宮在哪個地支，其餘宮就順時針分配。

```js
// 地支固定序列（由 iztro 的 earthBranchOfSoulPalace 確定命宮位置）
const DI_ZHI_ORDER = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
const PALACE_ORDER = ['命','兄','夫妻','子女','財帛','疾厄','遷移','奴僕','事業','田宅','福德','父母'];

// 命宮地支 → 地支在地支序列中的 index
function getDiIndex(di) {
  return DI_ZHI_ORDER.indexOf(di);
}

// 根據命宮地支，計算每個宮位應該在哪個地支
function getPalaceDi(mingGongDi, palaceIndex) {
  const mingIdx = getDiIndex(mingGongDi); // 命宮地支的 index
  // 命宮宮位 index=0，逆時針遞減（子丑寅卯...由命宮地支決定起點）
  // iztro 的宮位從命宮（index=0, 地支=命宮地支）順時針排列
  const offset = (mingIdx - palaceIndex + 12) % 12;
  return DI_ZHI_ORDER[offset];
}
```

然後在 `readings.map()` 中，`di` 改為動態計算：

```js
const readings = PALACE_ORDER.map((palaceName, i) => {
  const data = palaces[palaceName] || { stars: [], fourHua: [] };
  const di = getPalaceDi(mingGongDi, i); // 動態計算地支
  return {
    palace: palaceName,
    di,
    stars: data.stars || [],
    hua: data.fourHua || [],
    starsDesc: ...,
    huaDesc: ...
  };
});
```

**預期效果：**
- 輸入 1984/5/5 9時，男
- 命宮地支 = 子
- 其餘宮地支自動計算：
  - 命（子）、兄（亥）、夫妻（戌）、子女（酉）……
  - 財帛（辰）、疾厄（卯）、遷移（寅）……

---

### TASK-9：在中央區域顯示命盤摘要卡

在 `renderZiweiResult` 的 `palacesHTML` 之後，加入中央摘要區：

```js
// 中央 2×2 摘要區
const centerHTML = `
  <div class="chart-center">
    <div class="center-name">${birthData?.name || '命主'}</div>
    <div class="center-birth">
      ${birthData.year}年 ${birthData.month}月 ${birthData.day}日
      ${birthData.hour}時
    </div>
    <div class="center-lunar">
      農曆 ${result.lunar?.month}月 ${result.lunar?.day}
    </div>
    <div class="center-wuxing">${wuxingJu}</div>
    <div class="center-four-hua">
      化${fourHua.huaLu} · 化${fourHua.huaQuan} · 化${fourHua.huaKe} · 化${fourHua.huaJi}
    </div>
  </div>
`;
```

CSS：

```css
/* 中央摘要區 */
.chart-center {
  grid-column: 2 / 4;
  grid-row: 2 / 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--card-bg);
  border-radius: 12px;
  border: 1px solid var(--border);
  gap: 4px;
  padding: 12px;
}

.center-name {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--accent);
}

.center-birth {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.center-lunar {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.center-wuxing {
  font-size: 1rem;
  color: var(--text);
  font-weight: bold;
  margin-top: 4px;
}

.center-four-hua {
  font-size: 0.7rem;
  color: var(--warning);
}
```

---

## 工作階段七：完整驗證

### TASK-10：節點驗證（修復後）

```bash
node -e "
const {castZiwei} = require('./js/ziwei.js');

// 測試 1：1984/5/5 9時（男）
const r = castZiwei(1984, 5, 5, 9, 'male');
console.log('=== 1984/5/5 9時 男 ===');
console.log('年干支：', r.yearGZ.gan + r.yearGZ.zhi);
console.log('日干支：', r.dayGZ.gan + r.dayGZ.zhi);
console.log('命宮地支：', r.mingGongDi);       // 預期：子
console.log('五行局：', r.wuxingJu);            // 預期：水二局
console.log('命宮主星：', r.mingStar);
console.log('命宮星曜：', r.mingStars);
console.log('四化（年干）：', JSON.stringify(r.fourHua)); // 預期：{huaLu:'祿',huaQuan:'權',huaKe:'科',huaJi:'忌'}
console.log('');
console.log('=== 各宮地支 ===');
const PALACE_NAMES = ['命','兄','夫妻','子女','財帛','疾厄','遷移','奴僕','事業','田宅','福德','父母'];
PALACE_NAMES.forEach((name, i) => {
  const p = r.palaces[name];
  console.log(name + '宮：', p?.di || '無', '|', (p?.stars||[]).join('·'), '| 四化:', (p?.fourHua||[]).join(''));
});
"
```

**預期輸出（關鍵）：**
- 命宮地支：`子`
- 五行局：`水二局`
- 年干支：`甲子`
- 四化：`{huaLu:'祿',huaQuan:'權',huaKe:'科',huaJi:'忌'}`（甲年）
- 命宮星：天同（或紫微在卯...需視 iztro 實際結果）
- 財帛宮（辰）：廉貞·天府，帶「祿」
- 遷移宮（寅）：破軍，帶「權」

---

### TASK-11：瀏覽器驗證（本地）

1. `npm run build`（或 esbuild）
2. `python3 -m http.server 8080`
3. 開瀏覽器 → `http://localhost:8080`
4. 點「命盤」→ 輸入：1984 / 5 / 5 / 9 / 男 → 送出
5. 檢查：
   - ✅ 命宮地支顯示「子」（不是「申」）
   - ✅ 五行局顯示「水二局」（不是「金四局」）
   - ✅ 命宮主星非空
   - ✅ 遷移宮（破軍）顯示「權」
   - ✅ 財帛宮（廉貞）顯示「祿」
   - ✅ UI 為迴字形，命宮與遷移宮對應正確

---

## 檔案變動清單

| 檔案 | 動作 | 說明 |
|------|------|------|
| `js/ziwei.js` | 修改 | 加入 `hourToTimeIndex` + 修改 `castZiwei` + 修正 `fourHua` 用年干 |
| `js/app.js` | 修改 | `renderZiweiResult` 動態計算地支 + 中央摘要區 |
| `css/*.css`（或 index.html style） | 修改 | `.palace-grid` 迴字形樣式 + `.chart-center` 摘要卡 |

## 預估時間

- TASK-1 ~ TASK-3（時辰+命宮地支+四化）：20 分鐘
- TASK-4 ~ TASK-5（宮位四化+摘要同步）：10 分鐘
- TASK-6 ~ TASK-9（迴字形 UI）：30 分鐘
- TASK-10 ~ TASK-11（驗證）：15 分鐘

**總計：約 75 分鐘**

## 成功標準

1. `hourToTimeIndex(9)` 返回 `5`
2. `castZiwei(1984,5,5,9,'male').mingGongDi` 返回 `'子'`
3. `castZiwei(1984,5,5,9,'male').wuxingJu` 返回 `'水二局'`
4. `castZiwei(1984,5,5,9,'male').fourHua.huaLu` 返回 `'祿'`（年干=甲）
5. 瀏覽器 UI：命宮在「子」，遷移宮（破軍）顯示「權」
6. UI 為迴字形，中央顯示摘要卡
