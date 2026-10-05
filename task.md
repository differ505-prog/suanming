# 紫微斗數排盤 UI 修復計畫

> 更新日期：2026-10-05
> 目標：修復 2 個 UI 顯示問題（頂部曆法標籤、大限年齡計算）

---

## Bug 1：頂部資訊列未標明「農曆」

### 現狀問題

`result.lunarDateStr` 回傳 `1984年4月5日`，搭配「出生」標籤，後面又接「金牛座」（國曆星座）。使用者容易混淆以為月份抓錯。

### 根因分析

`result.lunarDateStr` 的值類似 `1984年四月月日`，但：
1. 標籤「出生」沒有標明是「農曆」
2. 國曆日期（使用者輸入的 `birthData`）沒有單獨顯示，導致後面的「金牛座」看起來像是配套錯誤

### 修復方案

**檔案**：`js/app.js`（`renderZiweiResult` 函式中的 `headerHTML`）

**修改點**：將「出生」改為「農曆」，並將國曆日期與農曆日期分列：

```js
// === 頂部摘要（簡化版，供滾動時參考）===
// mingStars 現在是 [{name, brightness, mutagen}] 格式
const mingStarsForHeader = (mingStars || []).map(s => {
  if (typeof s === 'string') return s;
  const badge = s.brightness
    ? `<span class="brightness-badge ${getBrightnessClass(s.brightness)}">${s.brightness}</span>`
    : '';
  return `${s.name}${badge}`;
}).join('');

// 取得 iztro 的 raw lunar date（完整農曆年月日）
const rawLunar = result._astrolabe?.rawDates?.lunarDate;
const lunarMonthDayStr = rawLunar
  ? `${rawLunar.lunarMonth}月${rawLunar.lunarDay}日`
  : result.lunarDateStr || '';

// 國曆生日格式化
const solarStr = `${birthData.month}月${birthData.day}日`;

const headerHTML = `
  <div class="chart-header">
    ${mingStars && mingStars.length > 0 ? `<div class="chart-ming-star" onclick="showArchetypeCard('${typeof mingStars[0] === 'string' ? mingStars[0] : mingStars[0]?.name || ''}')" style="cursor:pointer" title="點擊查看完整人格卡">命宮主星：${mingStarsForHeader} ⭐</div>` : ''}
    <div class="chart-info-row">
      <div class="chart-info-item" style="flex-basis: 100%;">
        <span class="ci-label">出生</span>
        <span class="ci-value">${lunarMonthDayStr} ${result.zodiac ? '· ' + result.zodiac + '屬' : ''} ${result.sign ? '· ' + result.sign : ''}</span>
      </div>
      <div class="chart-info-item">
        <span class="ci-label">國曆</span>
        <span class="ci-value">${birthData.year}/${birthData.month}/${birthData.day}</span>
      </div>
      <div class="chart-info-item">
        <span class="ci-label">年干支</span>
        <span class="ci-value">${yearGZ.gan}${yearGZ.zhi}</span>
      </div>
      <div class="chart-info-item">
        <span class="ci-label">日干支</span>
        <span class="ci-value">${dayGZ.gan}${dayGZ.zhi}</span>
      </div>
      <div class="chart-info-item">
        <span class="ci-label">命宮</span>
        <span class="ci-value">${mingGongDi}</span>
      </div>
      <div class="chart-info-item">
        <span class="ci-label">身宮</span>
        <span class="ci-value">${result.shenPalaceName || '—'} ${result.shenStar || ''}</span>
      </div>
      <div class="chart-info-item">
        <span class="ci-label">五行局</span>
        <span class="ci-value">${wuxingJu}</span>
      </div>
      <div class="chart-info-item">
        <span class="ci-label">四化</span>
        <span class="ci-value">化${fourHua.huaLu}·化${fourHua.huaQuan}·化${fourHua.huaKe}·化${fourHua.huaJi}</span>
      </div>
    </div>
  </div>
`;
```

**說明**：
- `rawLunar.lunarMonth` 和 `rawLunar.lunarDay` 從 iztro 直接取得農曆月日（無年份重複），格式乾淨
- 國曆日期移到單獨一行，標籤「國曆」明確區分
- 「出生」行的月份日使用農曆格式（如「四月月日」），後面的「金牛座」自然對應國曆

---

## Bug 2：當前大限宮位錯誤 + 年齡公式錯誤

### 現狀問題

畫面顯示：`⚡ 當前大限 戊辰 走 福德宮 40-49歲`

**錯誤 1 — 宮位名稱錯**：
`decadalPalaceNames[ageIndex]` 用 `floor(age/10)` 計算 `ageIndex`，取的宮位是錯誤的。
例如：年齡 42 → `ageIndex = floor(42/10) = 4` → 取 `palaceNames[4]`。但 `palaceNames` 是以「命宮為起點的人生宮位序列」（命→父母→田宅→事業→奴僕...），index 4 對應的是「奴僕」，不是年齡 42-51 對應的宮位（應為「事業」或「遷移」）。

**錯誤 2 — 起運年齡寫死**：
`decadalAgeStart = floor(age / 10) * 10` 完全忽略五行局起運歲數。
水二局：2 歲起運；水三局：3 歲起運。
正確公式：`startAge = 水局數 + currentDecadal.index * 10`

### 根因分析

1. `iztro` 的 `horoscope().decadal` 物件包含 `name`（當前大限宮位名稱，如「事業」）和 `index`（大限在 12 宮序列中的位置）。直接用 `currentDecadal.name` 即可取得正確宮位。
2. iztro 包含 `startAge` 欄位（該大限的起始年齡）。若有，直接用；否則用公式推算。

### 修復方案

**檔案 1**：`js/ziwei.js`（`castZiwei` 函式中的 `currentDecadal` 建構）

在 `currentDecadal` 物件中新增 `startAge` 和 `ageRange` 欄位：

```js
// === 大限資料 ===
const horoscope = astrolabe.horoscope();
const currentDecadal = horoscope?.decadal || null;

// 從五行局數字推算起運歲數（水二局=2, 水三局=3, 水一局=1...）
const bureauNumberMap = { '水一局': 1, '水二局': 2, '水三局': 3, '木一局': 1, '木二局': 2, '木三局': 3, '金一局': 1, '金二局': 2, '金三局': 3, '土一局': 1, '土二局': 2, '土三局': 3, '火一局': 1, '火二局': 2, '火三局': 3 };
const bureauNumber = bureauNumberMap[wuxingJu] || 2; // 預設水二局
const decadalIndex = currentDecadal?.index ?? 0;
const decadalStartAge = (currentDecadal?.startAge != null)
  ? currentDecadal.startAge
  : bureauNumber + decadalIndex * 10;
const decadalEndAge = decadalStartAge + 9;

// 構造完整 12 宮大限名稱（從 decadal 的 index 出發，遍歷 12 宮）
let decadalPalaceNames = [];
if (currentDecadal && currentDecadal.palaceNames) {
  decadalPalaceNames = currentDecadal.palaceNames;
} else if (astrolabe.palaces && astrolabe.palaces.length === 12) {
  decadalPalaceNames = astrolabe.palaces.map(p => PALACE_NAME_MAP[p.name] || p.name);
}
```

更新 `currentDecadal` 回傳物件：

```js
currentDecadal: currentDecadal ? {
  index: currentDecadal.index ?? 0,
  name: currentDecadal.name || '',              // ← 這是正確的當前大限宮位名
  heavenlyStem: currentDecadal.heavenlyStem || '',
  earthlyBranch: currentDecadal.earthlyBranch || '',
  palaceNames: decadalPalaceNames,
  startAge: decadalStartAge,                     // ← 新增
  ageRange: `${decadalStartAge}-${decadalEndAge}歲` // ← 新增
} : null,
```

**檔案 2**：`js/app.js`（`renderZiweiResult` 函式中的 `decadalBannerHTML`）

```js
// === 當前大限計算 ===
// 直接使用 iztro 提供的 startAge 和當前大限名稱（最準確）
const currentDecadal = result.currentDecadal;

// 從 birthData 計算實歲（僅作參考，不用於大限年齡）
const age = birthData ? new Date().getFullYear() - birthData.year : 30;

// 優先使用 iztro 提供的年齡範圍；若沒有則用 bureauNumber + index*10 推算
const decadalAgeStart = currentDecadal?.startAge ?? (() => {
  // 從 wuxingJu 推算 bureauNumber（水二局=2，以此類推）
  const bureauMap = { '水一局':1,'水二局':2,'水三局':3,'木一局':1,'木二局':2,'木三局':3,'金一局':1,'金二局':2,'金三局':3,'土一局':1,'土二局':2,'土三局':3,'火一局':1,'火二局':2,'火三局':3 };
  const bureau = bureauMap[wuxingJu] || 2;
  const idx = currentDecadal?.index ?? 0;
  return bureau + idx * 10;
})();
const decadalAgeEnd = decadalAgeStart + 9;

// 當前大限宮位：直接用 currentDecadal.name（iztro 提供），不依賴 ageIndex 查表
// 備援：若 name 為空，則用 decadalPalaceNames[currentDecadal.index]
const currentDecadalPalace = currentDecadal?.name
  || (decadalPalaceNames[currentDecadal?.index ?? 0])
  || decadalPalaceNames[0]
  || '命';

const decadalBannerHTML = currentDecadal ? `
  <div class="decadal-banner">
    <div class="decadal-label">⚡ 當前大限</div>
    <div class="decadal-info">
      <span class="decadal-gz">${currentDecadal.heavenlyStem}${currentDecadal.earthlyBranch}</span>
      <span class="decadal-palace">走 ${currentDecadalPalace} 宮</span>
      <span class="decadal-ages">${decadalAgeStart}-${decadalAgeEnd}歲</span>
    </div>
  </div>
` : '';
```

**說明**：
- `currentDecadal.name` 是 iztro 計算出的當前大限宮位名（如「事業」），是權威資料
- `currentDecadal.startAge` 是 iztro 計算出的起運年齡（包含五行局起運 offset）
- 若 iztro 未提供 `startAge`，則用公式推算：`bureauNumber + index * 10`
- 完全廢除 `floor(age/10)` 作為 `ageIndex` 的錯誤用法

---

## 驗證清單

| 測試案例 | 預期結果 |
|---------|---------|
| 國曆 1984/5/5 顯示 | 頂部：「出生」行顯示「四月月日 · 鼠屬 · 金牛座」；國曆行顯示「1984/5/5」 |
| 水二局辰宮大限 | 顯示正確宮位名稱（如「事業」）和年齡 42-51 |
| 其他五行局（如木三局） | 起運年齡正確（如 3 + index*10） |

---

## 檔案變動總覽

| 檔案 | 變動 |
|------|------|
| `js/ziwei.js` | 在 `currentDecadal` 回傳物件中新增 `startAge`、`ageRange`；`decadalStartAge` 計算支援 bureauNumber |
| `js/app.js` | `headerHTML` 中的出生日期分列農曆/國曆；`decadalBannerHTML` 使用 `currentDecadal.name` 和 `startAge` |
