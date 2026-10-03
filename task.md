# 任務清單：引入 iztro 開源紫微排盤庫 + esbuild 建構系統

## 目標

用 **Option B**（esbuild 打包 iztro）替換當前手寫簡化版 `js/ziwei.js`，獲得業界標準精度的紫微排盤能力。

## 技術背景

### iztro API 概覽

```js
import { astro } from 'iztro';

// 太陽曆排盤
const astrolabe = astro.bySolar('2000-8-16', 2, 'male', true, 'zh-TW');
// 參數：日期(YYYY-M-D), 時辰(0-23 數字), 性別, 顯示年支, 語言

// 可用方法
astrolabe.mingGong;          // 命宮主星名
astrolabe.shenGong;          // 身宮主星名
astrolabe.wuXingJu;          // 五行局
astrolabe.yearBranch;        // 年支
astrolabe.starsInPalace('命');  // 某宮所有星
astrolabe.star('紫微');         // 查某星在哪宮
astrolabe.oppositePalace('命'); // 對宮
astrolabe.fourTransformations;  // 四化星
```

### 現有 API 契約（必須保留）

現有 `js/app.js` 對 `ziwei.js` 的呼叫契約：
```js
const result = castZiwei(year, month, day, hour);
// 回傳：{ mingStar, mingStars, yearGZ, dayGZ, wuxingJu, palaces, mingGongDi, ... }
```

同時 `ziwei.js` 還匯出：`generateReading()`, `getCrossReading()`, `STAR_TRAITS`, `getMingGongZhi()` 等。這些全部必須保留作為相容層。

---

## 工作階段一：建構環境架設

### TASK-B1：初始化 npm 專案

- [ ] 在專案根目錄建立 `package.json`（若已存在則跳過）
- [ ] `npm install iztro` 安裝紫微排盤庫
- [ ] `npm install --save-dev esbuild` 安裝打包工具
- [ ] 確認 `node_modules/iztro` 已存在

**驗證指令：**
```bash
ls node_modules/iztro/dist/iztro.js   # 應該存在
node -e "require('iztro'); console.log('ok')"  # 應該輸出 ok
```

---

### TASK-B2：建立 esbuild 建構設定

- [ ] 建立 `build.mjs` 檔案（根目錄）

```js
// build.mjs — esbuild 建構腳本
import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

const isWatch = process.argv.includes('--watch');
const isDev = process.argv.includes('--dev');

// === Bundle 1: 主應用程式 ===
await esbuild.build({
  entryPoints: ['js/app.js'],
  bundle: true,
  format: 'esm',
  splitting: false,          // 單一 bundle，iPhone 離線 PWA 更簡單
  minify: !isDev,
  sourcemap: isDev,
  outfile: 'dist/bundle.js',
  target: ['es2020'],
  define: {
    'process.env.NODE_ENV': isDev ? '"development"' : '"production"'
  },
  logLevel: 'info',
});

// === Bundle 2: SW（Service Worker 需要獨立 bundle）===
await esbuild.build({
  entryPoints: ['sw.js'],
  bundle: true,
  format: 'iife',           // SW 必須是 IIFE，不能用 ESM
  minify: !isDev,
  outfile: 'dist/sw-bundle.js',
  target: ['es2020'],
  logLevel: 'info',
});

console.log('✅ Build 完成 → dist/');
```

- [ ] 在 `package.json` 新增 scripts：

```json
{
  "scripts": {
    "dev": "node build.mjs --dev",
    "build": "node build.mjs",
    "watch": "node build.mjs --watch",
    "postinstall": "npm run build"
  }
}
```

- [ ] 建立 `dist/` 目錄（.gitkeep）

**驗證指令：**
```bash
npm run build
ls dist/  # 應該有 bundle.js 和 sw-bundle.js
```

---

### TASK-B3：遷移 index.html 載入點

- [ ] 備份 `index.html`
- [ ] 將 `<script type="module" src="js/app.js">` 替換為 `<script type="module" src="dist/bundle.js">`
- [ ] 將 `<script src="sw.js">` 替換為 `<script src="dist/sw-bundle.js">`
- [ ] 確認 `index.html` 中 `sw.js` 的註冊也要更新（`navigator.serviceWorker.register('/dist/sw-bundle.js')`）

---

### TASK-B4：設定 gitignore 排除建構產物

- [ ] 確認 `.gitignore` 包含：
```
node_modules/
dist/
```

---

## 工作階段二：重寫 ziwei.js 相容層（核心工作）

### TASK-B5：建立 js/ziwei-iztro.js（新底層，直接使用 iztro）

- [ ] 新建 `js/ziwei-iztro.js`，內容：

```js
/**
 * iztro 底層適配層
 * 用途：直接封裝 iztro API，轉換為內部所需格式
 */
import { astro } from 'iztro';

const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

export function castByIztro(year, month, day, hour, gender = 'male') {
  // iztro 日期格式：'YYYY-M-D'，時辰：0-23 數字
  const dateStr = `${year}-${month}-${day}`;
  const astrolabe = astro.bySolar(dateStr, hour, gender, true, 'zh-TW');

  // === 提取命宮主星 ===
  const mingGong = astrolabe.mingGong;  // 字串如 '天同'
  const shenGong = astrolabe.shenGong;  // 身宮

  // === 提取 12 宮所有星曜 ===
  const palaces = {};
  for (const palaceName of ['命宮','兄弟宮','夫妻宮','子女宮',
       '財帛宮','疾厄宮','遷移宮','奴僕宮','事業宮',
       '田宅宮','福德宮','父母宮']) {
    const stars = astrolabe.starsInPalace(palaceName) || [];
    palaces[palaceName] = {
      stars: stars,
      fourHua: [],  // 四化後續處理
      di: ''        // 宮位地支（可用 astrolabe.shragaQuery 等）
    };
  }

  // === 年干支 ===
  const yearGZ = {
    gan: TIAN_GAN[astrolabe.yearStemIndex],
    zhi: astrolabe.yearBranch
  };

  // === 日干支 ===
  const dayGZ = {
    gan: TIAN_GAN[astrolabe.dayStemIndex],
    zhi: astrolabe.dayBranch
  };

  // === 五行局 ===
  const wuxingJu = astrolabe.wuXingJu;

  // === 命宮地支 ===
  const mingGongDi = astrolabe.mingGongDiZhi || astrolabe.mingGongBranch;

  // === 四化星 ===
  const fourTransformations = astrolabe.fourTransformations || {};

  return {
    mingStar: mingGong,
    shenStar: shenGong,
    mingGongDi,
    wuxingJu,
    yearGZ,
    dayGZ,
    palaces,
    fourTransformations,
    _astrolabe: astrolabe  // 保留完整 astrolabe 供高階 API 使用
  };
}
```

> **⚠️ 注意**：`astrolabe` 的具體欄位名稱需在安裝 iztro 後，用 `node -e "const {astro}=require('iztro'); console.log(Object.keys(astro.bySolar('1984-5-5',9,'male',true,'zh-TW')))"` 確認正確欄位名。

- [ ] 執行驗證（安裝完 iztro 之後）：
```bash
node -e "
const {astro} = require('iztro');
const a = astro.bySolar('1984-5-5', 9, 'male', true, 'zh-TW');
console.log(JSON.stringify({
  mingGong: a.mingGong,
  shenGong: a.shenGong,
  wuXingJu: a.wuXingJu,
  yearBranch: a.yearBranch,
  dayBranch: a.dayBranch,
  yearStemIndex: a.yearStemIndex,
  dayStemIndex: a.dayStemIndex,
  keys: Object.keys(a)
}, null, 2));
"
```

---

### TASK-B6：重寫 js/ziwei.js（保留 API 契約 + 橋接新底層）

- [ ] 完全重寫 `js/ziwei.js`：

```js
/**
 * 紫微斗數排盤系統 v3.0（iztro 驅動版）
 * API 契約完全向後相容，所有現有呼叫無需修改
 */

// 如果在瀏覽器環境，嘗試從 iztro 相容包引入
// 如果在 Node.js 環境，直接 require
let iztroAstro;
try {
  // 瀏覽器/esbuild 環境
  import { astro } from 'iztro';
  iztroAstro = astro;
} catch {
  // Node.js 測試環境
  const mod = require('iztro');
  iztroAstro = mod.astro;
}

// ===== 舊版常數（供 STAR_TRAITS、交叉解讀等相容性程式使用）=====
const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// ===== 舊版 STAR_TRAITS（供 getCrossReading 使用，完整保留）=====
const STAR_TRAITS = {
  '紫微': { type:'領袖型', desc:'愛面子、不服輸、抗壓力強', strength:'執行力', weakness:'控制欲' },
  '天機': { type:'智謀型', desc:'想得多、執行慢、愛糾結', strength:'策劃力', weakness:'猶豫不決' },
  '太陽': { type:'博愛型', desc:'重名聲、講義氣、脾氣急', strength:'社交力', weakness:'好勝心' },
  '武曲': { type:'剛毅型', desc:'固執、直接、不懂示弱', strength:'行動力', weakness:'脾氣硬' },
  '天同': { type:'福氣型', desc:'怕得罪人、依賴直覺、易滿足', strength:'適應力', weakness:'懶散' },
  '廉貞': { type:'情感型', desc:'執著、敢愛敢恨、情緒化', strength:'感受力', weakness:'糾結' },
  '天府': { type:'保守型', desc:'穩健理財、不愛冒險、防備心', strength:'理財力', weakness:'缺乏衝勁' },
  '太陰': { type:'柔韌型', desc:'隱忍、細膩、被動、不善表達', strength:'觀察力', weakness:'逃避衝突' },
  '貪狼': { type:'欲望型', desc:'野心大、桃花旺、社交高手', strength:'社交力', weakness:'貪心' },
  '巨門': { type:'疑惑型', desc:'多疑、口說傷人、愛分析', strength:'分析力', weakness:'玻璃心' },
  '天相': { type:'印綬型', desc:'配合度高、重承諾、有耐心', strength:'協調力', weakness:'無主見' },
  '天梁': { type:'蔭庇型', desc:'老成、喜照顧人、愛說教', strength:'照顧力', weakness:'固執' },
  '七殺': { type:'衝動型', desc:'果斷、急性子、爆發力強', strength:'突破力', weakness:'魯莽' },
  '破軍': { type:'變革型', desc:'不怕輸、敢破局、不計後果', strength:'破局力', weakness:'不穩定' }
};

// ===== 主排盤函數（完整向後相容）=====
function castZiwei(birthYear, birthMonth, birthDay, birthHour, gender = 'male') {
  const dateStr = `${birthYear}-${birthMonth}-${birthDay}`;
  const astrolabe = iztroAstro.bySolar(dateStr, birthHour, gender, true, 'zh-TW');

  // === 命宮主星 ===
  const mingStar = astrolabe.mingGong || null;
  const shenStar = astrolabe.shenGong || null;

  // === 命宮地支 ===
  // iztro 欄位確認後填入正確屬性名
  const mingGongDi = astrolabe.mingGongDiZhi
    || astrolabe.mingGongBranch
    || DI_ZHI[0];

  // === 五行局 ===
  const wuxingJu = astrolabe.wuXingJu || '水二局';

  // === 年干支 ===
  const yearStemIdx = astrolabe.yearStemIndex ?? astrolabe.yearStem;
  const yearBranch  = astrolabe.yearBranch;
  const yearGZ = {
    gan: TIAN_GAN[yearStemIdx] || '甲',
    zhi: yearBranch || '子'
  };

  // === 日干支 ===
  const dayStemIdx = astrolabe.dayStemIndex ?? astrolabe.dayStem;
  const dayBranch  = astrolabe.dayBranch;
  const dayGZ = {
    gan: TIAN_GAN[dayStemIdx] || '甲',
    zhi: dayBranch || '子'
  };

  // === 12 宮星曜 ===
  const palaceNames = ['命','兄','夫妻','子女','財帛','疾厄','遷移',
                       '奴僕','事業','田宅','福德','父母'];
  const palaces = {};
  for (const name of palaceNames) {
    const fullName = name === '命' ? '命宮'
      : name === '兄' ? '兄弟宮'
      : name === '夫妻' ? '夫妻宮'
      : name === '子女' ? '子女宮'
      : name === '財帛' ? '財帛宮'
      : name === '疾厄' ? '疾厄宮'
      : name === '遷移' ? '遷移宮'
      : name === '奴僕' ? '奴僕宮'
      : name === '事業' ? '事業宮'
      : name === '田宅' ? '田宅宮'
      : name === '福德' ? '福德宮'
      : '父母宮';
    palaces[name] = {
      stars: astrolabe.starsInPalace(fullName) || [],
      fourHua: [],
      di: ''
    };
  }

  return {
    lunar: { year: birthYear, month: birthMonth, day: birthDay },
    hourZhi: astrolabe.hourBranch || DI_ZHI[0],
    yearGZ,
    dayGZ,
    mingGongDi,
    wuxingJu,
    palaces,
    mingGongPalace: '命',
    mingStar,
    mingStars: palaces['命']?.stars || [],
    shenStar,
    fourHua: astrolabe.fourTransformations || {},
    _astrolabe: astrolabe  // 內部使用
  };
}

// ===== generateReading（完整向後相容）=====
function generateReading(ziweiResult) {
  const { palaces, mingStar } = ziweiResult;
  const readings = [];
  const STAR_MEANINGS = {
    '紫微':'尊貴、領導、野心','天機':'智慧、策劃、變動','太陽':'光輝、博愛、名聲',
    '武曲':'剛毅、財富、果斷','天同':'福氣、享受、懶散','廉貞':'感情、桃花、紛爭',
    '天府':'保守、財庫、安穩','太陰':'柔美、隱秘、財富','貪狼':'欲望、桃花、機巧',
    '巨門':'是非、口舌、疑惑','天相':'印綬、服務、穩重','天梁':'蔭庇、穩定、老成',
    '七殺':'威嚴、衝動、肅殺','破軍':'耗損、變動、果敢'
  };
  for (const [palaceName, data] of Object.entries(palaces)) {
    const stars = data.stars || [];
    const meanings = stars.map(s => STAR_MEANINGS[s] || '').filter(Boolean);
    readings.push({
      palace: palaceName,
      di: data.di,
      stars,
      hua: data.fourHua || [],
      starsDesc: stars.length > 0
        ? `${stars.join('、')}，${meanings.join('；')}`
        : '空宮，本宮無主星',
      huaDesc: (data.fourHua || []).join('、')
    });
  }
  return readings;
}

// ===== getCrossReading（完整向後相容）=====
function getCrossReading(hexagram, tiyong, mingStar) {
  if (!mingStar) return null;
  const traits = STAR_TRAITS[mingStar];
  if (!traits) return null;
  const { ti, yong } = tiyong;
  const tiNature = ti?.nature || '陽';
  const yongNature = yong?.nature || '陰';
  // 取卦象的陰陽性質映射到體用關係
  const natureMap = { '乾':'陽','坤':'陰','震':'陽','巽':'陰','坎':'陽','離':'陰','艮':'陽','兌':'陰' };
  const hexNature = natureMap[hexagram] || '陽';
  const relation = tiNature === hexNature ? '比和'
    : (tiNature === '陽' && hexNature === '陰') ? '剋' : '生';
  const crossReadings = {
    '紫微': { '生':'紫微星人今天的領導力得到卦象的加持，正好是你大膽做決定的時機。','比和':'紫微星今天的氣場和卦象共振，適合主導談判或公開發言。','剋':'紫微星人今天的卦象帶來阻力，強行推動只會招致反效果，先退一步。' },
    '天同': { '生':'天同星人今天的直覺被卦象放大，跟著感覺走是對的。','比和':'天同星今天的狀態平穩，適合處理日常瑣事。','剋':'天同星人今天的惰性與卦象的阻力碰撞，強迫自己動起來才有出路。' },
    '天府': { '生':'天府星人今天的理財直覺上揚，適合評估財務決策或保守型投資。','比和':'天府星今天的穩健氣場與卦象吻合，按原計劃執行即可。','剋':'天府星人今天的卦象帶來財務壓力，盡量避免大額支出或借貸。' },
    '七殺': { '生':'七殺星人今天的行動力得到卦象支持，正是衝刺的時機。','比和':'七殺星今天的能量與卦象共振，適合談判、對抗或突破僵局。','剋':'七殺星人今天的卦象預警衝突，強硬只會兩敗俱傷，先退讓。' },
    '天機': { '生':'天機星今天的謀劃能力被放大，適合做策略性思考。','比和':'天機星今天的思考平穩，適合整理思緒。','剋':'天機星今天的過度分析反而形成阻礙，行動比想太多更重要。' },
    '太陽': { '生':'太陽星今天的博愛能量被放大，適合社交或公開場合。','比和':'太陽星今天的光輝正旺，適合表現自己。','剋':'太陽星今天的脾氣容易失控，收斂鋒芒為宜。' },
    '武曲': { '生':'武曲星今天的行動力被放大，適合做果斷決策。','比和':'武曲星今天執行力強，按計劃前進。','剋':'武曲星今天的固執可能帶來麻煩，彈性應對。' },
    '太陰': { '生':'太陰星今天的直覺敏銳，適合處理隱秘事務。','比和':'太陰星今天情緒平穩，低調行事。','剋':'太陰星今天容易過度敏感，多給自己空間。' },
    '貪狼': { '生':'貪狼星今天的社交運勢被放大，適合拓展人脈。','比和':'貪狼星今天慾望高漲，慎防貪多。','剋':'貪狼星今天容易过度欲望，克制为上。' }
  };
  return crossReadings[mingStar]?.[relation]
    || `${mingStar}星人今天的能量與${hexagram}卦象互動，保持平常心即可。`;
}

// ===== 匯出（完整向後相容）=====
export { castZiwei, generateReading, getCrossReading, STAR_TRAITS };
```

---

### TASK-B7：驗證節點計算結果（與舊版對照）

- [ ] 安裝 iztro 並完成 `js/ziwei.js` 重寫後，執行：

```bash
node -e "
const {castZiwei} = require('./js/ziwei.js');
const r = castZiwei(1984, 5, 5, 9, 'male');
console.log('命宮主星：', r.mingStar);
console.log('身宮主星：', r.shenStar);
console.log('五行局：', r.wuxingJu);
console.log('年干支：', r.yearGZ.gan + r.yearGZ.zhi);
console.log('日干支：', r.dayGZ.gan + r.dayGZ.zhi);
console.log('命宮星曜：', r.mingStars);
"
```

- [ ] 比對輸出是否合理（命宮應有主要星曜如天同/武曲等）
- [ ] 如結果為 `null` 或空白，說明 `astrolabe` 欄位抓取有誤，需用 `node -e "..."` 檢查 iztro 回傳的所有 key

---

## 工作階段三：更新 SW 與 PWA

### TASK-B8：更新 Service Worker 註冊

- [ ] 在 `sw.js` 開頭註釋標明版本：`// SW v4 — iztro bundle`
- [ ] 更新 `index.html` 中的 SW 註冊路徑：
```js
navigator.serviceWorker.register('/dist/sw-bundle.js')
```
- [ ] 在 `sw.js` 中更新快取版本：
```js
const CACHE_NAME = 'suanming-v4';
```

### TASK-B9：驗證 PWA 離線可用

- [ ] 確認 `dist/bundle.js` 在 `CACHE_FILES` 陣列中被快取
- [ ] 確認 `dist/sw-bundle.js` 在 `CACHE_FILES` 陣列中被快取
- [ ] 用 Chrome DevTools → Application → Service Workers → 「Update」按鈕強迫更新
- [ ] 確認離線模式下首頁仍可載入

---

## 工作階段四：Git 提交與 Vercel 部署

### TASK-B10：Git 操作

- [ ] 確認 `.gitignore` 已排除 `node_modules/` 和 `dist/`
- [ ] `git add -A`
- [ ] `git commit -m "feat: 引入 iztro 開源紫微排盤庫 + esbuild 建構系統（Option B）"`
- [ ] `git push origin main`

### TASK-B11：Vercel 設定

- [ ] 登入 Vercel → 選取 `suanming` 專案
- [ ] Settings → Build & Development Settings：
  - **Build Command**：`npm run build`
  - **Output Directory**：`dist`
  - **Install Command**：`npm install`
- [ ] Save → 觸發重新部署
- [ ] 確認 Deployments 頁面顯示 ✅ Success

---

## 工作階段五：最終驗收

### TASK-B12：功能驗收清單

| 測項 | 預期結果 | 狀態 |
|------|----------|------|
| 首頁載入（網路） | 無 404，`dist/bundle.js` 正確載入 | ☐ |
| 點「排紫微命盤」（1984/5/5 9時 男） | 出現完整命盤，含主星、五行局、干支 | ☐ |
| 命宮主星非 null | `mingStar` 有值（非空） | ☐ |
| 12 宮至少 4 宮有主星 | 非全部空宮 | ☐ |
| 離線模式（關網路後刷新） | 首頁可見，今日卡片可顯示 | ☐ |
| Vercel 正式網址測試 | 與本地行為一致 | ☐ |

---

## 依賴 Tree

```
iztro (npm)
  └── 無外部依賴（純 JS）
esbuild (dev)
  └── 純 JS CLI 工具
```

## 預估檔案變動

| 檔案 | 動作 |
|------|------|
| `package.json` | 新建 |
| `build.mjs` | 新建 |
| `js/ziwei.js` | 完全重寫 |
| `js/ziwei-iztro.js` | 新建（最終會被整合进 ziwei.js，可選刪除） |
| `index.html` | 修改 script src |
| `sw.js` | 修改 cache version + bundle path |
| `dist/` | 自動產生（gitignore） |

## 成功標準

1. `npm run build` 無錯誤完成，產出 `dist/bundle.js`
2. 本地 `python3 -m http.server` 測試：排命盤正常出現主星名
3. Vercel 正式網址：排命盤正常出現主星名
4. 離線模式：首頁可載入，今日能量卡可顯示
5. 所有現有功能（梅花決策、每日卡片、主星認領）**零破壞**
