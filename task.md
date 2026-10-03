# 紫微排盤 — 三項 UI 修正

## 現況

輸入 `1984 / 5 / 5 / 9 / 男`，iztro 已正確回傳：
- 命宮地支 = 子，主星 = 太陽[忌]
- 丑宮（父母）= 天府
- 卯宮（田宅）= 紫微·貪狼
- 寅宮（福德）= 天機·太陰·祿存·天馬
- 亥宮（兄弟）= 武曲[科]·破軍[權]
- 其餘宮位與甲年四化皆正確

但 UI 三處出錯，根因都在 `js/app.js` 的 `renderZiweiResult` 與 `js/ziwei.js` 的回傳欄位。

---

## TASK-1：命宮主星綁定到實際坐守主星（非命主）

### 根因
`ziwei.js` 的 `castZiwei` 回傳兩個欄位：

| 欄位 | 來源 | 含義 |
|------|------|------|
| `result.mingStar` | `astrolabe.soul` | **命主**（按命宮地支查表）= 貪狼 |
| `result.mingStars` | `palaces['命'].stars` | **命宮實際坐守的主星** = [太陽] |

UI 兩處（頂部摘要 + 中宮）目前都抓 `mingStar`，所以顯示「貪狼坐命」。

### 修改 1：頂部摘要（`js/app.js`）

檔案：`js/app.js`，函數 `renderZiweiResult`

第 783 行附近，解構賦值改為：
```js
const { yearGZ, dayGZ, mingGongDi, wuxingJu, fourHua, mingStars } = result;
```
（拿掉 `mingStar`，改拿 `mingStars`）

第 800 行附近，headerHTML 內：
```js
${mingStars?.[0] ? `<div class="chart-ming-star" onclick="showArchetypeCard('${mingStars[0]}')" style="cursor:pointer" title="點擊查看完整人格卡">命宮主星：${mingStars.join('·')} ⭐</div>` : ''}
```

### 修改 2：中央中宮（`js/app.js`）

第 859 行附近，centerHTML 內：
```js
<div class="center-name">${mingStars?.[0] ? mingStars[0] + '坐命' : '命主'}</div>
```

### 驗證
命宮地支 = 子 → 命宮實際主星 = 太陽 → 頂部與中宮皆顯示「太陽坐命」。

---

## TASK-2：丑宮補回「父母」與「天府」

### 根因
`renderZiweiResult` 用地支 key 查找宮位資料：

```js
const DI_ZHI_ORDER = ['巳','午','未','申','酉','戌','亥','子','丑','寅','卯','辰'];
// ...
const palaceByDi = {};
for (const r of readings) {
  palaceByDi[r.di] = r;
}
```

但 `r.di` 來自 `palace.earthlyBranch`，iztro 回傳的是**繁體** `醜`。
DI_ZHI_ORDER 裡寫的是**簡體** `丑`。`'醜' !== '丑'` → lookup miss → 丑宮 fall back 到空模板。

順帶檢查其他字：子、寅、卯、辰、巳、午、未、申、酉、戌、亥 — 繁簡皆同，**只有「丑/醜」會撞牆**。

### 修改（`js/app.js`）

第 792 行，DI_ZHI_ORDER 改為繁體：
```js
const DI_ZHI_ORDER = ['巳','午','未','申','酉','戌','亥','子','醜','寅','卯','辰'];
```
（只動這一個字：`丑` → `醜`）

### 驗證
- 丑宮顯示「父母 · 醜 · 天府」
- 其餘 11 宮維持原樣不變

---

## TASK-3：外圍 12 格改為順時針閉環

### 現況
DOM 線性填入：`巳→午→未→申→酉→戌→亥→子→丑→寅→卯→辰`
4×4 grid 自動放置結果（中央 2×2 = center）：

```
巳  午  未  申
酉  [C] [C] 戌
亥  [C] [C] 子
丑  寅  卯  辰
```

缺點：地支失去順時針閉環，丑/寅/卯/辰 從左到右排，子(命) 不在底邊中點、午(遷移) 不在頂邊中點 → 視覺上沒對宮。

### 目標佈局（順時針閉環）

```
巳  午  未  申       ← 頂 row（左→右）
辰  [C] [C] 酉       ← 左上 / 右上
卯  [C] [C] 戌
寅  丑  子  亥       ← 底 row（左→右，但地支順序為 寅→丑→子→亥，順時針從右下回來）
```

子(命) 在底邊中點 → 午(遷移) 在頂邊中點 → 垂直對宮成立。
卯(田宅) 在左中 → 酉(子女) 在右中 → 水平對宮成立。
辰(事業) 與 戌(夫妻) 對角呼應。

### 對應 grid 位置
| index | 地支 | grid 位置 |
|-------|------|----------|
| 0 | 巳 | (0,0) |
| 1 | 午 | (0,1) |
| 2 | 未 | (0,2) |
| 3 | 申 | (0,3) |
| 4 | 辰 | (1,0) |
| 5 | 酉 | (1,3) |
| 6 | 卯 | (2,0) |
| 7 | 戌 | (2,3) |
| 8 | 寅 | (3,0) |
| 9 | 丑 | (3,1) |
| 10 | 子 | (3,2) |
| 11 | 亥 | (3,3) |

### 修改（`js/app.js`）

第 792 行，DI_ZHI_ORDER 改為順時針順序：
```js
const DI_ZHI_ORDER = ['巳','午','未','申','辰','酉','卯','戌','寅','醜','子','亥'];
```

### 驗證
- 命宮（子）落在底邊中點 (3,2)
- 遷移宮（午）落在頂邊中點 (0,1)
- 兄弟宮（亥）落在右下角 (3,3)
- 奴僕宮（巳）落在左上角 (0,0)
- 子↔午、卯↔酉、辰↔戌、丑↔未、寅↔申、巳↔亥 六對對宮皆正確

---

## TASK-4：CSS `.chart-center` 對齊 2×2 中央

### 現況
中央卡片 grid 設定為 `grid-column: 2/4; grid-row: 2/4`，會跨 (1,1) (1,2) (2,1) (2,2) 4 格 — 正確。
TASK-3 改 DI_ZHI_ORDER 後，CSS 無需動，中央位置仍正確。

### 修改
**無需改 CSS。**

只驗證：中央卡片在 4×4 grid 中跨 2×2 = 4 格，外圍 12 格剩餘 12 格剛好放滿。

---

## TASK-5：建構並推送

```bash
cd "/Users/liangzhiwei/Documents/VIbe Coding/算命"
npm run build
git add -A
git commit -m "fix: 命宮主星綁定實際主星 + 丑宮父母天府 + 順時針環狀地支佈局"
git push origin main
```

### 驗證（瀏覽器 / Vercel 部署後）
1. 輸入 1984/5/5/9/男
2. 頂部顯示「命宮主星：太陽 ⭐」
3. 中宮顯示「太陽坐命」
4. 丑宮（左下中點）顯示「父母 · 醜 · 天府」
5. 命宮（子）位於底邊中點，遷移宮（午）位於頂邊中點
6. 六對對宮地支關係正確

---

## 改動檔案

| 檔案 | 行數 | 動作 |
|------|------|------|
| `js/app.js` | ~783 / ~800 / ~859 | 解構改 `mingStars`、頂部與中宮用 `mingStars[0]` |
| `js/app.js` | 792 | DI_ZHI_ORDER 順時針 + 改 `醜` |

CSS 不動，HTML 結構不動，其他 JS 不動。

## 預估

15 分鐘（純修改 + build + push）。
