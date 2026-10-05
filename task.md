# 星曜資訊 UI 增強實作清單

> 更新日期：2026-10-05
> UI/UX 總監評分目標：9+（構面：資訊完整度 / 行動端可用性 / 認知負荷 / 專業權威感 / 使用者負擔 / 差異化）
> 方案：詳情面板三層分類 + 人格卡亮度解讀 + 宮卡上下文提示 + 完整欄位露出

---

## 【第 0 步】修正既有的資料模型 Bug

> **為什麼要先做**：後續所有實作都依賴正確的星曜分類。若不修，新的三層分類會把祿存 / 天馬重複歸進兩層。

### 0.1 — `js/ziwei.js`：改 `castZiwei` 中宮位星曜的建構邏輯

**目標**：在蒐集 `majorStars` 時，依 `type` 分流；`minorStars` 與 `adjectiveStars` 從 `iztro` 原生欄位讀取，不再從 `majorStars` 過濾。

**現在的錯誤程式碼**（約在 line 149–166）：

```js
palaces[internalName].stars = majorStars.map(s => ({
  name: s.name,
  brightness: s.brightness || null,
  mutagen: s.mutagen
    ? (typeof s.mutagen === 'string' ? s.mutagen : (s.mutagen.type || null))
    : null
}));
```

**改成**：

```js
// 只取 type === 'major' 的才是真正的主星
const trueMajorStars = majorStars.filter(s => s.type === 'major');
palaces[internalName].stars = trueMajorStars.map(s => ({
  name: s.name,
  brightness: s.brightness || null,
  mutagen: s.mutagen
    ? (typeof s.mutagen === 'string' ? s.mutagen : (s.mutagen.type || null))
    : null
}));
// 14 輔星：取 type 為 lucun / tianma / minor 的
const minorStarsOfPalace = majorStars
  .filter(s => ['lucun', 'tianma'].includes(s.type))
  .map(s => s.name);
palaces[internalName].minorStars = [
  ...minorStarsOfPalace,
  ...(palace.minorStars || []).map(s => s.name || s)
];
// 雜曜：取 adjectiveStars 原生欄位
palaces[internalName].adjectiveStars = (palace.adjectiveStars || []).map(s => s.name || s);
```

**驗證**：以 1984/5/5 巳時測試，命宮 majorStars 不再包含「祿存」「天馬」；14 輔星與雜曜各自獨立陣列。

---

## 【第 1 步】宮卡上下文提示（行動端可用性 +9.5 的關鍵）

> **核心洞察**：行動端使用者不會主動去點每一個宮位。「含 N 顆輔星」是零成本發現提示，會觸發探索行為。

### 1.1 — `js/app.js`：`palacesHTML` 渲染時，在 `.palace-stars` 之後插入輔星計數提示

**目標位置**：`renderZiweiResult` 函式（約 line 915–939），在 `palacesHTML` 的 `map` 迴圈中。

**在 `const starsStr = ...` 之後、`tooltipTitle` 之前**，插入：

```js
// 計算該宮的輔星與雜曜總數，用於上下文提示
const minorCount = (r.minorStars || []).length;
const adjCount = (r.adjectiveStars || []).length;
const hasExtraStars = minorCount > 0 || adjCount > 0;
const extraStarsHint = hasExtraStars
  ? `<div class="palace-extra-hint">含${minorCount > 0 ? `${minorCount}輔星` : ''}${minorCount > 0 && adjCount > 0 ? ' · ' : ''}${adjCount > 0 ? `${adjCount}雜曜` : ''}</div>`
  : '';
```

然後在 `return \`...\` 區塊的 `<div class="palace-stars">${starsStr}</div>` 之後插入：

```html
${extraStarsHint}
```

### 1.2 — `css/style.css`：新增 `.palace-extra-hint` 樣式

**目標位置**：`style.css` 約 line 582（`.palace-hua` 之後）：

```css
/* 輔星 / 雜曜計數提示（行動端探索觸發器）*/
.palace-extra-hint {
  font-size: 0.58rem;
  color: var(--text-dim);
  margin-top: 2px;
  opacity: 0.7;
  letter-spacing: 0.02em;
}
```

**不要加粗、不要高對比**。這是一個安靜的提示，存在但不搶主星注意力。

### 1.3 — `css/style.css`：當亮度為「不」或「陷」時，宮卡左側加警示邊線

**目標位置**：`style.css` 約 line 550（`.palace-card.palace-ming` 之後）：

```css
/* 亮度警示：該宮有亮度為「不」或「陷」的主星時，宮卡左側顯示紅色豎線 */
.palace-card.has-critical-brightness {
  border-left: 3px solid #ef4444;
}
```

**修改 `js/app.js` 中的 `palacesHTML` map 迴圈**：

在 `const isMing = r.palace === '命';` 之後插入：

```js
// 檢查該宮主星是否有「不」或「陷」的亮度（視為 critical）
const hasCritical = (r.stars || []).some(s =>
  (s.brightness === '不' || s.brightness === '陷')
);
const criticalClass = hasCritical ? ' has-critical-brightness' : '';
```

然後在 `palace-card` 的 classList 加入 `${criticalClass}`：

```html
<div class="palace-card ${isMing ? 'palace-ming' : ''}${criticalClass}" ...>
```

**驗證**：以 1984/5/5 命宮（太陽陷忌），命宮宮卡左側應有紅線；其他宮格無此標記。

---

## 【第 2 步】詳情面板三層分類 + 完整欄位露出

> **核心洞察**：將閒置的四個欄位（博士／歲驛／喪門／年齡序列）從資料庫直接呈現，是零成本提升資訊完整度從 9 → 9.5 的關鍵。

### 2.1 — `js/app.js`：`openPalaceDetail` 完整重寫

**目標**：約 line 1237，現在的函式內容替換成以下實作。

**完整新函式**：

```js
window.openPalaceDetail = function(di, palaceName) {
  const astrolabe = currentResult?.data?._astrolabe;
  if (!astrolabe) return;

  const iztroName = REVERSE_PALACE_MAP[palaceName] || palaceName;
  const palaceIdx = PALACE_INDEX_MAP[iztroName] ?? 0;

  let surr;
  try { surr = astrolabe.surroundedPalaces(palaceIdx); } catch { return; }
  if (!surr) return;

  // 從 astrolabe.palaces[palaceIdx] 取得原生欄位
  const palaceData = astrolabe.palaces[palaceIdx];

  // === 三層星曜分類 ===
  const rawMajor = palaceData?.majorStars || [];
  const majorList = rawMajor
    .filter(s => s.type === 'major')
    .map(s => {
      const hua = s.mutagen
        ? `<span class="mutagen-inline ${getMutagenClass(typeof s.mutagen === 'string' ? s.mutagen : s.mutagen.type || '')}">${typeof s.mutagen === 'string' ? s.mutagen : s.mutagen.type || ''}</span>`
        : '';
      const bright = s.brightness
        ? `<span class="brightness-badge ${getBrightnessClass(s.brightness)}">${s.brightness}</span>`
        : '';
      return `<span class="chip-major">${s.name}${bright}${hua}</span>`;
    });

  // 14 輔星：type=lucun/tianma + palace.minorStars[]
  const minorRaw = rawMajor.filter(s => ['lucun', 'tianma'].includes(s.type)).map(s => s.name);
  const minorFromField = (palaceData?.minorStars || []).map(s => s.name || s);
  const minorList = [...minorRaw, ...minorFromField]
    .filter((v, i, a) => a.indexOf(v) === i); // 去重
  const minorChips = minorList.map(s => `<span class="chip-minor">${s}</span>`);

  // 雜曜：palace.adjectiveStars[]
  const adjList = (palaceData?.adjectiveStars || []).map(s => s.name || s);
  const adjChips = adjList.map(s => `<span class="chip-adj">${s}</span>`);

  // === 博士 / 歲驛 / 喪門（目前未使用的四個欄位）===
  const boshi = palaceData?.boshi12 || '';
  const jiangqian = palaceData?.jiangqian12 || '';
  const suiqian = palaceData?.suiqian12 || '';

  const extraInfoHTML = (boshi || jiangqian || suiqian)
    ? `<div class="palace-extra-info">
        ${boshi ? `<span class="extra-tag">博士：${boshi}</span>` : ''}
        ${jiangqian ? `<span class="extra-tag">歲驛：${jiangqian}</span>` : ''}
        ${suiqian ? `<span class="extra-tag">喪門：${suiqian}</span>` : ''}
       </div>`
    : '';

  // === 三方四正宮位建構（保持原邏輯，補充星曜晶片）===
  const buildPalaceHTML = (p) => {
    if (!p) return '';
    const rawM = p.majorStars || [];
    const majors = rawM.filter(s => s.type === 'major').map(s => {
      const hua = s.mutagen
        ? `<span class="mutagen-inline ${getMutagenClass(typeof s.mutagen === 'string' ? s.mutagen : s.mutagen.type || '')}">${typeof s.mutagen === 'string' ? s.mutagen : s.mutagen.type || ''}</span>`
        : '';
      const bright = s.brightness
        ? `<span class="brightness-badge ${getBrightnessClass(s.brightness)}">${s.brightness}</span>`
        : '';
      return `<span class="chip-major-sm">${s.name}${bright}${hua}</span>`;
    });
    const minors = (rawM.filter(s => ['lucun','tianma'].includes(s.type)).map(s=>s.name) || [])
      .concat((p.minorStars||[]).map(s=>s.name||s))
      .filter((v,i,a)=>a.indexOf(v)===i)
      .map(s => `<span class="chip-minor-sm">${s}</span>`);

    return `<div class="surr-palace">
      <div class="surr-palace-name">${p.name || ''}</div>
      <div class="surr-palace-di">${p.earthlyBranch || ''}</div>
      <div class="surr-palace-stars">${[...majors, ...minors].join(' ')}</div>
    </div>`;
  };

  const html = `
    <div class="modal-overlay" id="palace-detail-overlay" onclick="closePalaceDetail()"></div>
    <div class="palace-detail-modal" id="palace-detail-modal">
      <button class="palace-detail-close" onclick="closePalaceDetail()">✕</button>
      <div class="palace-detail-header">
        <div class="palace-detail-title">${palaceName}</div>
        <div class="palace-detail-sub">三方四正：對宮、財帛、官祿</div>
      </div>

      <!-- 第一層：主星（含亮度 + 四化）-->
      <div class="detail-layer">
        <div class="detail-layer-label">主星</div>
        <div class="detail-chips">${majorList.join('') || '<span class="detail-empty">空宮</span>'}</div>
      </div>

      <!-- 第二層：14 輔星 -->
      ${minorChips.length > 0 ? `
      <div class="detail-layer">
        <div class="detail-layer-label">14 輔星</div>
        <div class="detail-chips">${minorChips.join('')}</div>
      </div>` : ''}

      <!-- 第三層：雜曜 -->
      ${adjChips.length > 0 ? `
      <div class="detail-layer">
        <div class="detail-layer-label">雜曜</div>
        <div class="detail-chips">${adjChips.join('')}</div>
      </div>` : ''}

      <!-- 長生位 + 博士 / 歲驛 / 喪門 -->
      ${palaceData?.changsheng12 ? `<div class="detail-changsheng">長生位：${palaceData.changsheng12}</div>` : ''}
      ${extraInfoHTML}

      <div class="detail-divider"></div>

      <div class="palace-detail-grid">
        ${buildPalaceHTML(surr.opposite)}
        ${(surr.together || []).map(p => buildPalaceHTML(p)).join('')}
      </div>
    </div>
  `;

  document.getElementById('palace-detail-modal')?.remove();
  document.body.insertAdjacentHTML('beforeend', html);
};
```

### 2.2 — `css/style.css`：新增晶片與詳情面板樣式

**目標位置**：`style.css` 最後（約倒數第三行之前）新增：

```css
/* ===== 星曜詳情面板 ===== */
.detail-layer {
  margin-bottom: 12px;
}
.detail-layer-label {
  font-size: 0.65rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-muted);
  margin-bottom: 6px;
}
.detail-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.detail-empty {
  font-size: 0.8rem;
  color: var(--text-dim);
  font-style: italic;
}
.detail-changsheng {
  font-size: 0.72rem;
  color: var(--purple);
  font-weight: 500;
  margin-top: 4px;
}
.detail-extra-info {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.extra-tag {
  font-size: 0.65rem;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 6px;
}
.detail-divider {
  height: 1px;
  background: var(--border);
  margin: 16px 0;
}

/* 晶片（chip）樣式 */
.chip-major {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text);
  background: var(--bg-elevated);
  border: 1px solid var(--border-accent);
  border-radius: 6px;
  padding: 3px 7px;
}
.chip-major-sm {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  font-size: 0.7rem;
  color: var(--text);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 5px;
}
.chip-minor {
  display: inline-flex;
  align-items: center;
  font-size: 0.75rem;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 3px 7px;
}
.chip-minor-sm {
  display: inline-flex;
  align-items: center;
  font-size: 0.65rem;
  color: var(--text-secondary);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 5px;
}
.chip-adj {
  display: inline-flex;
  align-items: center;
  font-size: 0.7rem;
  color: var(--text-dim);
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle, #333);
  border-radius: 6px;
  padding: 3px 7px;
  opacity: 0.8;
}
```

**視覺階層設計原則**：
- **主星晶片**：字最重、邊框用 accent 色，襯托主星地位
- **14 輔星晶片**：中等字重、無 accent 邊框，視覺次之
- **雜曜晶片**：字最小、顏色最淡（`--text-dim` + `opacity: 0.8`），明確表示影響力最弱

---

## 【第 3 步】人格卡亮度 × 四化狀態列（差異化的核心）

> **核心洞察**：同一顆「太陽」，旺與陷的解讀應該不同。這是對方 UI 完全沒有的功能，我們無需追內容量就能贏。

### 3.1 — `js/app.js`：`showArchetypeCard` 接收命宮星資料並渲染狀態列

**目標**：重構 `showArchetypeCard`，讓它從呼叫點傳入命宮星資料（亮度 + 四化），在人格卡頂部 header 區塊顯示。

**第一步：修改呼叫點**（約 line 870）：

現在的呼叫：
```js
onclick="showArchetypeCard('${...}')"
```

改成（把命宮的亮度與四化作為第二、第三參數）：
```js
onclick="showArchetypeCard('${starName}', '${brightness || ''}', '${mutagen || ''}')"
```

在 `renderZiweiResult` 的 `mingStarsForHeader` map 中（第 853–858 行），確認有把 `brightness` 與 `mutagen` 正確取出：

```js
const mingStarsForHeader = (mingStars || []).map(s => {
  if (typeof s === 'string') return s;
  const brightness = s.brightness || null;  // 確認有
  const mutagen = s.mutagen || null;        // 確認有
  const badge = brightness
    ? `<span class="brightness-badge ${getBrightnessClass(brightness)}">${brightness}</span>`
    : '';
  return `${s.name}${badge}`;
  // 注意：starName 從 r.stars[0].name 取
  const starName = s.name;
  const brightness = s.brightness || null;
  const mutagen = s.mutagen || null;
  // 這段 map 需要傳入 brightness/mutagen
}).join('');
```

**修改 `mingStarsForHeader` map**（約 line 853-860）：

```js
const mingStarsForHeader = (mingStars || []).map(s => {
  if (typeof s === 'string') return s;
  const badge = s.brightness
    ? `<span class="brightness-badge ${getBrightnessClass(s.brightness)}">${s.brightness}</span>`
    : '';
  return `${s.name}${badge}`;
}).join('');

// 新增：用於人格卡呼叫（取命宮第一顆星的狀態）
const primaryMingStar = (mingStars && mingStars.length > 0)
  ? (typeof mingStars[0] === 'string' ? mingStars[0] : mingStars[0]?.name)
  : '';
const primaryBrightness = (mingStars && mingStars.length > 0)
  ? (typeof mingStars[0] === 'string' ? null : mingStars[0]?.brightness)
  : null;
const primaryMutagen = (mingStars && mingStars.length > 0)
  ? (typeof mingStars[0] === 'string' ? null : mingStars[0]?.mutagen)
  : null;
```

然後在 `headerHTML` 的 `showArchetypeCard` 呼叫改為：
```js
onclick="showArchetypeCard('${primaryMingStar}', '${primaryBrightness || ''}', '${primaryMutagen || ''}')"
```

**第二步：重構 `showArchetypeCard` 函式**（約 line 639）：

新的函式簽名：
```js
window.showArchetypeCard = function(starName, brightness, mutagen) {
  const data = ARCHETYPES[starName];
  if (!data) return;

  // === 亮度 × 四化 → 狀態描述 ===
  const BRIGHTNESS_DESC = {
    '廟': '力量充沛，能量完整釋放',
    '旺': '狀態良好，得地有力',
    '得': '有所得力，條件具備',
    '利': '中平狀態，需配合格局',
    '平': '普通狀態，力量一般',
    '不': '力量受限，需補足條件',
    '陷': '失位耗損，需謹慎應對'
  };
  const MUTAGEN_DESC = {
    '祿': '帶來加分與機會',
    '權': '帶來強化與動力',
    '科': '帶來名聲與榮耀',
    '忌': '帶來耗損與課題'
  };

  const brightDesc = brightness ? (BRIGHTNESS_DESC[brightness] || `亮度：${brightness}`) : null;
  const mutagenDesc = mutagen ? (MUTAGEN_DESC[mutagen] || `化${mutagen}`) : null;
  const stateTag = (brightDesc || mutagenDesc)
    ? `<div class="archetype-state-bar">
        ${brightDesc ? `<span class="state-tag ${brightness ? 'state-' + brightness : ''}">${brightDesc}</span>` : ''}
        ${mutagenDesc ? `<span class="state-tag state-mutagen">${mutagenDesc}</span>` : ''}
       </div>`
    : '';

  const modal = document.createElement('div');
  modal.id = 'archetype-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeArchetypeCard()"></div>
    <div class="archetype-card">
      <button class="archetype-close" onclick="closeArchetypeCard()">✕</button>
      <div class="archetype-header" style="background:linear-gradient(135deg, ${data.color}20, ${data.colorCodes[2]})">
        ${stateTag}
        <div class="archetype-symbol" style="font-size:4rem">${data.symbol}</div>
        <div class="archetype-name" style="color:${data.color}">【${starName}】</div>
        <div class="archetype-type">${data.archetype}</div>
        <div class="archetype-tagline">"${data.tagline}"</div>
      </div>
      <div class="archetype-body">
        <div class="archetype-section">
          <div class="as-label">核心優勢</div>
          <div class="as-value">${data.strength}</div>
        </div>
        <div class="archetype-section">
          <div class="as-label">成長功課</div>
          <div class="as-value growth">${data.growthTask}</div>
        </div>
        <div class="archetype-section">
          <div class="as-label">理想環境</div>
          <div class="as-value">${data.idealEnv}</div>
        </div>
        <div class="archetype-section avoid">
          <div class="as-label">避開</div>
          <div class="as-value">${data.avoid}</div>
        </div>
        <div class="archetype-quote">${data.quote}</div>
        <div class="archetype-colors">
          <div class="as-label">專屬色彩</div>
          <div class="color-chips">
            ${data.colorCodes.map(c => `<div class="color-chip" style="background:${c}" title="${c}"></div>`).join('')}
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(() => modal.classList.add('open'), 10);
};
```

### 3.2 — `css/style.css`：新增狀態列與晶片樣式

**目標位置**：約 line 1460（在 `.mutagen-inline` 之後）：

```css
/* ===== 人格卡狀態列 ===== */
.archetype-state-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}
.state-tag {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 20px;
  letter-spacing: 0.03em;
}
.state-tag.state-mutagen {
  color: #f59e0b;
  background: rgba(245,158,11,0.12);
  border: 1px solid rgba(245,158,11,0.25);
}
.state-tag.state-廟,
.state-tag.state-旺,
.state-tag.state-得 {
  color: #22c55e;
  background: rgba(34,197,94,0.12);
  border: 1px solid rgba(34,197,94,0.3);
}
.state-tag.state-利,
.state-tag.state-平 {
  color: #94a3b8;
  background: rgba(148,163,184,0.1);
  border: 1px solid rgba(148,163,184,0.2);
}
.state-tag.state-不,
.state-tag.state-陷 {
  color: #ef4444;
  background: rgba(239,68,68,0.12);
  border: 1px solid rgba(239,68,68,0.3);
}
```

---

## 【第 4 步】清理既有多餘程式碼

### 4.1 — `js/app.js`：移除 `buildMinorStarsPanel` 與 `PEACH_BLOSSOM_STARS` 等常數

**目標**：約 line 1288–1335，`buildMinorStarsPanel` 函式。現在輔星已整合進 `openPalaceDetail` 的三層分類，此全域面板已冗餘。搜尋所有對 `buildMinorStarsPanel` 的參照並移除。若無參照，直接刪除函式本體。

**驗證**：搜尋 `buildMinorStarsPanel` 出現次數，若為 1（僅函式定義本身）則可直接刪除。

### 4.2 — `js/app.js`：移除 `surr-palace` 中「[附]」標記

**目標**：約 line 1251，原本的 `minorNames = (p.minorStars || []).map(s => s.name + '[附]')` 已過時，因為新的 `buildPalaceHTML` 使用晶片樣式，不需「[附]」標記。確認已更新（見 2.1 節的新函式）即可。

---

## 實作順序對照表

| 步驟 | 檔案 | 優先級 | 預計工時 | 驗證方式 |
|------|------|--------|----------|----------|
| 0.1 | `js/ziwei.js` | **必須先做** | 20 分鐘 | 1984/5/5 命宮 majorStars 不含祿存/天馬 |
| 1.1 | `js/app.js` | 高 | 15 分鐘 | 宮卡有「含 N 輔星」提示文字 |
| 1.2 | `css/style.css` | 高 | 5 分鐘 | 提示文字樣式正確 |
| 1.3 | `js/app.js` + `css/style.css` | 高 | 15 分鐘 | 太陽陷宮卡左側有紅線 |
| 2.1 | `js/app.js` | 高 | 60 分鐘 | 詳情面板有三層分類 |
| 2.2 | `css/style.css` | 高 | 30 分鐘 | 晶片視覺階層正確 |
| 3.1 | `js/app.js` | 高 | 45 分鐘 | 人格卡有狀態列 |
| 3.2 | `css/style.css` | 高 | 15 分鐘 | 狀態列顏色正確 |
| 4.1 | `js/app.js` | 中（可延後） | 20 分鐘 | buildMinorStarsPanel 無參照後刪除 |

**總工時：約 3.5 小時**

---

## 驗證情境（全項目通過才能交付）

| 情境 | 預期結果 |
|------|---------|
| 國曆 1984/5/5 男 巳時 | 命宮 majorStars = [太陽]（不含祿存、天馬）；命宮宮卡左側有紅線（太陽陷）；命宮宮卡顯示「含 0 輔星 · 3 雜曜」 |
| 點命宮主星 | 人格卡顯示「【太陽】」頂部狀態列：「失位耗損，需謹慎應對」+「帶來耗損與課題」 |
| 點任意宮位 | 詳情面板有主星層（帶亮度 + 四化晶片）、14 輔星層（如有）、雜曜層（如有）；長生位 + 博士/歲驛/喪門顯示 |
| 點任意三方四正宮位 | 小晶片顯示該宮主星與 14 輔星 |
| 三星連續滑動（Mobile） | 無卡頓；無橫向溢位；提示文字不中斷排版 |
| 空宮（無主星） | 詳情面板顯示「空宮」；無 crash |

---

## 差異化評估（與對方 UI 對照）

| 功能 | 對方 UI | 本方案 |
|------|---------|--------|
| 廟旺陷亮度 | 未顯示 | 宮卡紅線 + 人格卡狀態列 + 晶片徽章（3 層露出） |
| 四化 × 亮度解讀 | 無 | 人格卡根據亮度 + 四化提供當前狀態描述 |
| 14 輔星 | 有（但與四化混排） | 詳情面板獨立第二層 |
| 雜曜 | 有（但與四化混排） | 詳情面板獨立第三層，字最淡 |
| 博士／歲驛／喪門 | 無 | 詳情面板露出 |
| 宮卡探索提示 | 無 | 「含 N 顆輔星」提示文字 |
| 命盤人格卡 | 無 | 有（已有），加亮度狀態列 |
