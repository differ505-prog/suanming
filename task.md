# 算命 · 紫微斗數增強實作清單

> 最後更新：2026-10-03
> 現況：命宮主星只顯示在命宮，其他11宮全空的 Bug 已修復（commit `92e0201`）。下一步是充分挖掘 iztro v1.3.5 已計算但未呈現的資料。

---

## 目標：將命盤從「只有主星名字」升級為「完整視覺化命盤」

---

## 實作順序一：最小改動，最大impact（預估 2–3 小時）

### Task 1 — 主星亮度標籤（優先度：🔥 必做）

**問題現況**：`ziwei.js` 的 `castZiwei()` 目前只取 `s.name`，把亮度資訊全部丟掉。
iztro 回傳的 `s.brightness`（廟/旺/得/利/平/不/陷）完全沒用上。

**改動範圍**：`js/ziwei.js`（`castZiwei` 函式）+ `js/app.js`（`renderZiweiResult` 函式）

**實作步驟**：

1. `ziwei.js` 第 ~130 行，找到：
   ```js
   palaces[internalName].stars = majorStars.map(s => s.name);
   ```
   改為：
   ```js
   palaces[internalName].stars = majorStars.map(s => ({
     name: s.name,
     brightness: s.brightness || null,
     mutagen: s.mutagen || null
   }));
   ```

2. 同時更新 `generateReading()` 和 `readings` 陣列結構，讓每顆星攜帶 brightness。

3. `app.js` 的 `renderZiweiResult()` 第 ~行，取 `r.stars` 時分開渲染：
   ```js
   // 舊：
   const starsStr = r.stars && r.stars.length > 0
     ? r.stars.join('·')
     : '<span class="empty-palace">空</span>';

   // 新：
   const starsStr = (r.stars || []).length > 0
     ? r.stars.map(s => {
         const brightness = s.brightness
           ? `<span class="brightness-badge ${getBrightnessClass(s.brightness)}">${s.brightness}</span>`
           : '';
         return `${s.name}${brightness}`;
       }).join('·')
     : '<span class="empty-palace">空</span>';
   ```

4. 在 `style.css` 加入亮度配色（新增約 15 行）：
   ```css
   .brightness-badge {
     font-size: 0.6rem;
     padding: 1px 4px;
     border-radius: 4px;
     margin-left: 2px;
     vertical-align: middle;
     font-weight: bold;
   }
   .brightness-廟, .brightness-旺, .brightness-得  { color: #22c55e; background: rgba(34,197,94,0.12); border: 1px solid rgba(34,197,94,0.3); }
   .brightness-利, .brightness-平                  { color: #94a3b8; background: rgba(148,163,184,0.1); border: 1px solid rgba(148,163,184,0.2); }
   .brightness-不, .brightness-陷                  { color: #ef4444; background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3); }
   ```

5. 在 `app.js` 底部新增 helper：
   ```js
   function getBrightnessClass(b) {
     if (!b) return '';
     const good = ['廟', '旺', '得'];
     const mid  = ['利', '平'];
     const bad  = ['不', '陷'];
     if (good.includes(b)) return 'brightness-廟';
     if (mid.includes(b))  return 'brightness-平';
     if (bad.includes(b))  return 'brightness-不';
     return '';
   }
   ```

**驗證方式**：用 1990-6-15 14:00 男命排盤，夫妻宮的「武曲(得/權)」應顯示綠色「得」標籤和橙色「權」標籤。

---

### Task 2 — 身宮主星顯示（優先度：🔥 必做）

**問題現況**：iztro 的 `body`（身宮主星）已計算，但 UI 完全沒用。

**改動範圍**：`js/ziwei.js`（`castZiwei`）+ `js/app.js`（`renderZiweiResult`）

**實作步驟**：

1. `ziwei.js` 的 `castZiwei()` 回傳值中，在 `shenStar` 之後新增：
   ```js
   shenStar: shenStar,  // 已存在
   shenStars: palaces[result.bodyPalaceName || '疾厄']?.stars || [],
   // 計算身宮落在哪一宮
   // iztro 的 earthlyBranchOfBodyPalace 是身宮地支，
   // 需要找到對應的宮位
   ```

   具體做法：遍歷 12 宮，找到 `earthlyBranch === astrolabe.earthlyBranchOfBodyPalace` 的那個宮位，取其 `stars`。

2. `app.js` 的 `renderZiweiResult()` 的 header 區塊，找到 `.chart-info-row`，在命宮主星後面新增：
   ```html
   <div class="chart-info-item">
     <span class="ci-label">身宮</span>
     <span class="ci-value">${shenStar || '—'}</span>
   </div>
   ```

3. 中央摘要卡 `.chart-center` 中，在 `命宮主星` 後加一行：
   ```html
   <div class="center-shen">身宮：${shenStar || '—'}</div>
   ```

**驗證方式**：同一命盤，身宮應顯示「火星」（iztro 的 `body` 欄位）。

---

### Task 3 — 農曆日期 + 生肖/星座（優先度：🔥 必做）

**問題現況**：iztro 的 `rawDates.lunarDate`、`zodiac`、`sign` 完全閒置。

**改動範圍**：`js/ziwei.js`（`castZiwei`）+ `js/app.js`（`renderZiweiResult`）

**實作步驟**：

1. `ziwei.js` 的 `castZiwei()` 回傳值新增：
   ```js
   lunarDate: astrolabe.rawDates?.lunarDate
     ? `${astrolabe.rawDates.lunarDate.lunarYear}年${astrolabe.rawDates.lunarDate.lunarMonth}月${astrolabe.rawDates.lunarDate.lunarDay}日`
     : null,
   zodiac: astrolabe.zodiac,    // 馬/龍/蛇...
   sign: astrolabe.sign,        // 雙子座/牡羊座...
   ```

2. `app.js` 的 `renderZiweiResult()` header 區塊，在 `.chart-info-row` 最左側新增：
   ```html
   <div class="chart-info-item" style="flex-basis: 100%;">
     <span class="ci-label">出生</span>
     <span class="ci-value">${result.lunarDate || ''} · ${result.zodiac || ''} · ${result.sign || ''}</span>
   </div>
   ```

**驗證方式**：1990-6-15 應顯示「1990年5月23日 · 馬 · 雙子座」。

---

## 實作順序二：大限系統（預估 2–3 小時）

### Task 4 — 當前大限卡片（優先度：⭐ 強烈推薦）

**問題現況**：iztro 的 `astrolabe.horoscope()` 已計算當前大限，卻沒呈現。

**改動範圍**：`js/ziwei.js`（`castZiwei`）+ `js/app.js`（`renderZiweiResult`）

**實作步驟**：

1. `ziwei.js` 的 `castZiwei()` 中，呼叫 `astrolabe.horoscope()`，取出 `decadal`：
   ```js
   const horoscope = astrolabe.horoscope();
   const currentDecadal = horoscope.decadal; // { index, name, heavenlyStem, earthlyBranch, palaceNames }
   // palaceNames 是 [當前年齡段對應的宮位名, ...] 共12個

   return {
     // ...現有欄位...
     currentDecadal: {
       range: currentDecadal.palaceNames, // 12宮的當前大限宮位名稱
       heavenlyStem: currentDecadal.heavenlyStem,
       earthlyBranch: currentDecadal.earthlyBranch,
     }
   };
   ```

2. `app.js` 的 `renderZiweiResult()` 在 header 區塊最後一行後面新增：
   ```js
   // 找到當前年齡落在哪個大限段
   const age = new Date().getFullYear() - birthData.year;
   const ageIndex = Math.floor(age / 10); // 0-6 roughly
   const currentDecadalPalace = currentDecadal.range[ageIndex] || currentDecadal.range[0];
   ```

3. 在 `.chart-header` 底部新增大限標題列：
   ```html
   <div class="decadal-banner">
     <div class="decadal-label">⚡ 當前大限</div>
     <div class="decadal-info">
       <span class="decadal-gz">${currentDecadal.heavenlyStem}${currentDecadal.earthlyBranch}</span>
       <span class="decadal-palace">走 ${currentDecadalPalace} 宮</span>
       <span class="decadal-ages">${age - (age % 10)}-${age - (age % 10) + 9}歲</span>
     </div>
   </div>
   ```

4. `style.css` 新增（約 12 行）：
   ```css
   .decadal-banner {
     display: flex;
     align-items: center;
     gap: 12px;
     padding: 10px 16px;
     background: linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.05));
     border: 1px solid var(--border-accent);
     border-radius: var(--radius-sm);
     margin-bottom: 16px;
   }
   .decadal-label {
     font-size: 0.7rem;
     color: var(--accent);
     font-weight: 500;
     letter-spacing: 0.1em;
     white-space: nowrap;
   }
   .decadal-info {
     display: flex;
     gap: 12px;
     align-items: center;
     flex-wrap: wrap;
   }
   .decadal-gz {
     font-size: 0.85rem;
     color: var(--accent);
     font-weight: bold;
   }
   .decadal-palace {
     font-size: 0.85rem;
     color: var(--text);
   }
   .decadal-ages {
     font-size: 0.75rem;
     color: var(--text-muted);
   }
   ```

---

### Task 5 — 人生大限時間軸（優先度：⭐ 強烈推薦）

**問題現況**：大限是付費命理 app 的核心功能，目前完全空白。

**改動範圍**：`js/app.js`（`renderZiweiResult`）+ `css/style.css` + `index.html`（新增巢狀結構）

**實作步驟**：

1. `index.html` 在 `#chart-result` 內，在 `.palace-grid` 之後新增一個巢狀區塊：
   ```html
   <!-- 命盤增強資訊 -->
   <div id="chart-enhancements" class="chart-enhancements hidden">
     <!-- 大限時間軸 tab -->
     <!-- 三方四正 tab -->
     <!-- 桃花/貴人星 tab -->
   </div>
   ```

2. `app.js` 的 `renderZiweiResult()` 在 `.chart-note` 之後新增：
   ```js
   // 渲染大限時間軸（以小面板方式展開，非 Default 顯示）
   const decadalTimeline = buildDecadalTimeline(result, birthData.year);
   const surrondedPalacesPanel = buildSurroundedPalacesPanel();
   const minorStarsPanel = buildMinorStarsPanel(result);

   area.innerHTML += `
     <div class="chart-enhancement-tabs">
       <button class="enhancement-tab active" onclick="showEnhancementTab('decadal')">大限時間軸</button>
       <button class="enhancement-tab" onclick="showEnhancementTab('surrounded')">三方四正</button>
       <button class="enhancement-tab" onclick="showEnhancementTab('minor')">桃花·貴人星</button>
     </div>
     <div id="enhancement-decadal" class="enhancement-content">${decadalTimeline}</div>
     <div id="enhancement-surrounded" class="enhancement-content hidden">${surrondedPalacesPanel}</div>
     <div id="enhancement-minor" class="enhancement-content hidden">${minorStarsPanel}</div>
   `;
   ```

3. 新增 `buildDecadalTimeline(result, birthYear)` 函式：
   ```js
   function buildDecadalTimeline(result, birthYear) {
     // iztro 的 horoscope() 有 decadal.palaceNames（12宮的大限宮位名）
     // 每個大限 = 10年
     // 構造 7 個大限區段（覆蓋 0-79 歲）
     const h = result._astrolabe.horoscope();
     // 需要完整的大限陣列，用 horoscope.decadal.palaceNames 配合年齡計算
     const decads = [];
     for (let i = 0; i < 7; i++) {
       const ageStart = birthYear + i * 10;
       const ageEnd   = birthYear + (i + 1) * 10 - 1;
       const ages = `${ageStart}-${ageEnd}`;
       // 用 iztro palaceIndex 對映宮位
       const palaceIdx = (result.currentDecadal?.index + i) % 12;
       const palaceName = result.currentDecadal?.range?.[palaceIdx] || '命';
       decads.push({ ages, palace: palaceName });
     }

     return `
       <div class="decadal-timeline">
         ${decads.map(d => `
           <div class="decadal-segment">
             <div class="decadal-ages-label">${d.ages}</div>
             <div class="decadal-bar">
               <div class="decadal-palace-label">${d.palace}</div>
             </div>
           </div>
         `).join('')}
       </div>
     `;
   }
   ```

   具體的 decadal 宮位需要更精確計算：根據 `astrolabe.horoscope()` 回傳的 `decadal` 物件（包含每個大限對應的起點宮位）。

4. `style.css` 新增（約 30 行）：
   ```css
   .chart-enhancement-tabs {
     display: flex;
     gap: 4px;
     margin-bottom: 12px;
     background: var(--bg-card);
     border: 1px solid var(--border);
     border-radius: var(--radius-sm);
     padding: 4px;
   }
   .enhancement-tab {
     flex: 1;
     background: transparent;
     border: none;
     color: var(--text-muted);
     font-size: 0.78rem;
     padding: 6px 8px;
     border-radius: 6px;
     cursor: pointer;
     transition: all 0.2s;
   }
   .enhancement-tab.active {
     background: var(--accent);
     color: var(--bg);
     font-weight: 500;
   }
   .enhancement-content.hidden { display: none; }

   /* 大限時間軸 */
   .decadal-timeline {
     display: flex;
     flex-direction: column;
     gap: 6px;
   }
   .decadal-segment {
     display: flex;
     align-items: center;
     gap: 12px;
   }
   .decadal-ages-label {
     font-size: 0.72rem;
     color: var(--text-muted);
     min-width: 80px;
     text-align: right;
   }
   .decadal-bar {
     flex: 1;
     height: 36px;
     background: var(--bg-card);
     border: 1px solid var(--border);
     border-radius: 6px;
     display: flex;
     align-items: center;
     padding: 0 12px;
   }
   .decadal-palace-label {
     font-size: 0.82rem;
     color: var(--accent);
     font-weight: 500;
   }
   ```

5. 新增 Tab 切換 JS（在 `app.js` 底部）：
   ```js
   window.showEnhancementTab = function(tab) {
     document.querySelectorAll('.enhancement-tab').forEach(t => t.classList.remove('active'));
     document.querySelectorAll('.enhancement-content').forEach(c => c.classList.add('hidden'));
     document.querySelector(`[onclick="showEnhancementTab('${tab}')"]`)?.classList.add('active');
     document.getElementById(`enhancement-${tab}`)?.classList.remove('hidden');
   };
   ```

---

## 實作順序三：互動深化（預估 2–3 小時）

### Task 6 — 點擊宮位顯示三方四正（優先度：⭐ 強烈推薦）

**問題現況**：iztro 有 `surroundedPalaces()` API，可以取得任意宮位的三方四正（對宮、財帛/官祿×2）。

**改動範圍**：`js/app.js`（`renderZiweiResult`）+ `css/style.css`

**實作步驟**：

1. `app.js` 的 `renderZiweiResult()` 中，宮位卡片的 `onclick` 從簡單的 `togglePalace(this)` 改為：
   ```js
   onClick="openPalaceDetail('${r.di}', '${r.palace}')"
   ```

2. 新增 `openPalaceDetail(di, palaceName)` 函式：
   ```js
   window.openPalaceDetail = function(di, palaceName) {
     // 用 _astrolabe.surroundedPalaces() 取三方四正
     const astrolabe = currentResult?.data?._astrolabe;
     if (!astrolabe) return;

     // palaceName → iztro 宮位名映射（反向）
     const REVERSE_PALACE_MAP = { '命':'命宮','兄':'兄弟','夫妻':'夫妻','子女':'子女',
       '財帛':'財帛','疾厄':'疾厄','遷移':'遷移','奴僕':'僕役','事業':'官祿','田宅':'田宅','福德':'福德','父母':'父母' };
     const iztroName = REVERSE_PALACE_MAP[palaceName] || palaceName;

     // 取得宮位 index
     let palaceIdx = astrolabe.palaces.findIndex(p => p.name === iztroName);
     if (palaceIdx === -1) palaceIdx = 0;

     const surr = astrolabe.surroundedPalaces(palaceIdx);
     if (!surr) return;

     const buildPalaceHTML = (p) => {
       const stars = [...(p.majorStars||[]).map(s=>s.name), ...(p.minorStars||[]).map(s=>s.name+'[附]')].join('、') || '空';
       return `<div class="surr-palace">
         <div class="surr-palace-name">${p.name}</div>
         <div class="surr-palace-di">${p.earthlyBranch}</div>
         <div class="surr-palace-stars">${stars}</div>
       </div>`;
     };

     const html = `
       <div class="modal-overlay" onclick="closePalaceDetail()"></div>
       <div class="palace-detail-modal">
         <button class="palace-detail-close" onclick="closePalaceDetail()">✕</button>
         <div class="palace-detail-header">
           <div class="palace-detail-title">${palaceName}的三方四正</div>
           <div class="palace-detail-sub">對宮、財帛、官祿（統稱三方四正）</div>
         </div>
         <div class="palace-detail-grid">
           ${buildPalaceHTML(surr.opposite)}  <!-- 對宮 -->
           ${surr.together.map(p => buildPalaceHTML(p)).join('')}  <!-- 財帛+官祿×2 -->
         </div>
       </div>
     `;

     const existing = document.getElementById('palace-detail-modal');
     if (existing) existing.remove();
     document.body.insertAdjacentHTML('beforeend', html);
   };

   window.closePalaceDetail = function() {
     document.getElementById('palace-detail-modal')?.remove();
   };
   ```

3. `style.css` 新增（約 25 行）：
   ```css
   .palace-detail-modal {
     position: fixed;
     top: 50%;
     left: 50%;
     transform: translate(-50%, -50%);
     background: var(--bg-card);
     border: 1px solid var(--border-accent);
     border-radius: var(--radius);
     padding: 24px;
     width: 90%;
     max-width: 480px;
     max-height: 80vh;
     overflow-y: auto;
     z-index: 500;
     box-shadow: var(--shadow);
   }
   .palace-detail-close {
     position: absolute;
     top: 12px;
     right: 12px;
     background: none;
     border: none;
     color: var(--text-muted);
     font-size: 1.2rem;
     cursor: pointer;
   }
   .palace-detail-header { margin-bottom: 16px; text-align: center; }
   .palace-detail-title {
     font-family: var(--font-serif);
     font-size: 1.2rem;
     color: var(--accent);
     margin-bottom: 4px;
   }
   .palace-detail-sub { font-size: 0.75rem; color: var(--text-dim); }
   .palace-detail-grid {
     display: grid;
     grid-template-columns: 1fr 1fr;
     gap: 8px;
   }
   .surr-palace {
     background: var(--bg-input);
     border: 1px solid var(--border);
     border-radius: var(--radius-sm);
     padding: 10px;
     text-align: center;
   }
   .surr-palace-name { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 2px; }
   .surr-palace-di { font-size: 1rem; color: var(--accent); font-weight: bold; margin-bottom: 4px; }
   .surr-palace-stars { font-size: 0.72rem; color: var(--text); line-height: 1.4; }
   ```

---

### Task 7 — 桃花/貴人星 icon 標記（優先度：💡 錦上添花）

**問題現況**：`minorStars`（文昌文曲天魁天鉞）和 `adjectiveStars`（紅鸞天姚咸池）完全沒展示。

**改動範圍**：`js/app.js` + `css/style.css`

**實作步驟**：

1. 在 `app.js` 定義桃花/貴人星列表：
   ```js
   const PEACH_BLOSSOM_STARS = ['紅鸞', '天姚', '咸池', '天喜', '貪狼'];  // 桃花星
   const WEALTH_STARS = ['武曲', '太陰', '天府'];                          // 財富星
   const NOBLE_STARS = ['天魁', '天鉞', '文昌', '文曲', '左輔', '右弼'];   // 貴人星
   const WISDOM_STARS = ['天機', '紫微', '太陰'];                           // 智慧星
   ```

2. 修改 `buildMinorStarsPanel(result)` 函式（用於 Task 5 的 tab）：
   ```js
   function buildMinorStarsPanel(result) {
     // 遍歷 12 宮，收集桃花/貴人星
     const peachStars = [];
     const nobleStars = [];
     const wisdomStars = [];

     for (const r of result.readings || []) {
       const allStars = [...(r.minorStars||[]), ...(r.adjectiveStars||[]), ...(r.stars||[]).map(s=>typeof s==='string'?s:s.name)];
       for (const star of allStars) {
         const name = typeof star === 'string' ? star : star.name;
         if (PEACH_BLOSSOM_STARS.includes(name) && !peachStars.includes(name))
           peachStars.push({ name, palace: r.palace });
         if (NOBLE_STARS.includes(name) && !nobleStars.includes(name))
           nobleStars.push({ name, palace: r.palace });
         if (WISDOM_STARS.includes(name) && !wisdomStars.includes(name))
           wisdomStars.push({ name, palace: r.palace });
       }
     }

     return `
       <div class="minor-stars-panel">
         <div class="minor-stars-section">
           <div class="ms-label">🌸 桃花/感情星</div>
           <div class="ms-items">${peachStars.map(s => `<span class="ms-star peach">${s.name}</span>`).join('') || '<span class="ms-empty">無</span>'}</div>
         </div>
         <div class="minor-stars-section">
           <div class="ms-label">👑 貴人星</div>
           <div class="ms-items">${nobleStars.map(s => `<span class="ms-star noble">${s.name}</span>`).join('') || '<span class="ms-empty">無</span>'}</div>
         </div>
         <div class="minor-stars-section">
           <div class="ms-label">🧠 智慧星</div>
           <div class="ms-items">${wisdomStars.map(s => `<span class="ms-star wisdom">${s.name}</span>`).join('') || '<span class="ms-empty">無</span>'}</div>
         </div>
       </div>
     `;
   }
   ```

3. `style.css` 新增（約 20 行）：
   ```css
   .minor-stars-panel { display: flex; flex-direction: column; gap: 12px; }
   .minor-stars-section { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 12px; }
   .ms-label { font-size: 0.78rem; color: var(--text-muted); margin-bottom: 8px; }
   .ms-items { display: flex; flex-wrap: wrap; gap: 6px; }
   .ms-star {
     font-size: 0.78rem;
     padding: 3px 10px;
     border-radius: 12px;
     font-weight: 500;
   }
   .ms-star.peach   { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.3); }
   .ms-star.noble   { background: rgba(201,168,76,0.15); color: var(--accent); border: 1px solid rgba(201,168,76,0.3); }
   .ms-star.wisdom  { background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
   .ms-empty { font-size: 0.78rem; color: var(--text-dim); }
   ```

---

## 實作順序四：細節打磨（預估 1–2 小時）

### Task 8 — 四化星視覺化（優先度：💡 錦上添花）

**問題現況**：每顆星的 `mutagen`（祿/權/科/忌四化）有顏色，但目前只顯示在 `.palace-hua` 那一行，CP 值低。

**改動範圍**：`js/app.js` + `css/style.css`

**實作步驟**：

1. 修改宮位卡渲染，把四化內嵌到每顆星名字後面：
   ```js
   // 在 starsStr 建構時
   r.stars.map(s => {
     let suffix = '';
     if (s.mutagen) {
       const mutagenClass = { '祿': 'hua-lu', '權': 'hua-quan', '科': 'hua-ke', '忌': 'hua-ji' }[s.mutagen] || '';
       suffix = `<span class="mutagen-tag ${mutagenClass}">${s.mutagen}</span>`;
     }
     return `${s.name}${suffix}`;
   }).join('·')
   ```

2. 去掉 `.palace-hua` 那個全域四化列表（因為視覺上已經內嵌了）。

---

### Task 9 — 十二長生 tooltip（優先度：💡 錦上添花）

**問題現況**：iztro 的 `changsheng12`（長生/沐浴…12 階段）完全閒置。

**改動範圍**：`js/app.js`（`renderZiweiResult`）+ `css/style.css`

**實作步驟**：

1. `ziwei.js` 的 `castZiwei()`，在宮位資料中新增：
   ```js
   palaces[internalName].changsheng12 = palace.changsheng12 || '';
   ```

2. 在 `app.js` 的宮位卡 `.palace-card` 的 `title` 屬性中加入長生位：
   ```js
   title="${r.palace}宮 · ${r.changsheng12 || ''}"
   ```
   （瀏覽器原生 tooltip，無需 JS）

3. 進階：在 `.palace-expanded` 展開內容中新增長生位說明：
   ```js
   <div class="palace-changsheng">${r.changsheng12 ? '長生位：' + r.changsheng12 : ''}</div>
   ```

---

## 實作順序五：資料層增強（預估 1 小時）

### Task 10 — 回傳結構重構（優先度：🔧 底層建設）

**問題現況**：目前 `castZiwei()` 回傳的 `palaces` 結構需要配合渲染層的多次 `.map()`，不利維護。

**改動範圍**：`js/ziwei.js`（`castZiwei` 回傳值）+ `js/app.js`（`renderZiweiResult`）

**實作步驟**：

將 `palaces` 從 `{ [name]: { stars, fourHua, di } }` 改為陣列格式：
```js
palaces: astrolabe.palaces.map(p => ({
  name: PALACE_NAME_MAP[p.name] || p.name,
  iztroName: p.name,
  di: p.earthlyBranch,
  heavenlyStem: p.heavenlyStem,
  majorStars: p.majorStars.map(s => ({ name: s.name, brightness: s.brightness, mutagen: s.mutagen })),
  minorStars: p.minorStars.map(s => s.name),
  adjectiveStars: p.adjectiveStars.map(s => s.name),
  changsheng12: p.changsheng12,
  isBodyPalace: p.isBodyPalace,
  isOriginalPalace: p.isOriginalPalace,
  majorStarsText: p.majorStars.map(s => s.name).join('·'),
}))
```

同時在 `return` 中新增：
```js
currentDecadal: horoscope.decadal,
zodiac: astrolabe.zodiac,
sign: astrolabe.sign,
lunarDateStr: `${astrolabe.rawDates?.lunarDate?.lunarYear}年${astrolabe.rawDates?.lunarDate?.lunarMonth}月${astrolabe.rawDates?.lunarDate?.lunarDay}日`,
soulPalaceBranch: astrolabe.earthlyBranchOfSoulPalace,
bodyPalaceBranch: astrolabe.earthlyBranchOfBodyPalace,
```

這樣 `app.js` 的 `renderZiweiResult()` 就可以直接用 `result.palaces[i]` 而不用再繞一次 `readings`。

---

## 實作順序六：命盤頁面頂部資訊卡（優先度：🔥 必做）

### Task 11 — 命盤頂部資訊卡（優先度：🔥 必做）

**問題現況**：命盤面板目前只有冷冰冰的 4×4 grid，缺少「這是我的命盤」那種 Personalization 感。

**改動範圍**：`js/app.js`（`renderZiweiResult`）+ `css/style.css`

**實作步驟**：

在 `.chart-header` 改為一個更完整的資訊卡：
```js
const headerHTML = `
  <div class="chart-hero">
    <div class="chart-hero-title">
      <div class="chart-hero-name">${result.lunarDateStr || ''}</div>
      <div class="chart-hero-subtitle">${result.sign || ''} · ${result.zodiac || ''}屬</div>
    </div>
    <div class="chart-hero-stars">
      <div class="chart-hero-ming">
        <div class="ch-label">命宮主星</div>
        <div class="ch-value">${(result.palaces.find(p=>p.name==='命')?.majorStars||[]).map(s=>s.name).join('·') || '空宮'}</div>
      </div>
      <div class="chart-hero-shen">
        <div class="ch-label">身宮主星</div>
        <div class="ch-value">${result.shenStar || '—'}</div>
      </div>
      <div class="chart-hero-ju">
        <div class="ch-label">五行局</div>
        <div class="ch-value">${result.wuxingJu}</div>
      </div>
      <div class="chart-hero-gz">
        <div class="ch-label">年干支</div>
        <div class="ch-value">${result.yearGZ.gan}${result.yearGZ.zhi}</div>
      </div>
    </div>
  </div>
`;
```

`style.css` 新增（約 35 行）：
```css
.chart-hero {
  background: linear-gradient(135deg, rgba(201,168,76,0.08), rgba(107,91,138,0.08));
  border: 1px solid var(--border-accent);
  border-radius: var(--radius);
  padding: 20px 24px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.chart-hero-title { text-align: center; }
.chart-hero-name {
  font-family: var(--font-serif);
  font-size: 1.1rem;
  color: var(--accent);
  margin-bottom: 2px;
}
.chart-hero-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
}
.chart-hero-stars {
  display: flex;
  justify-content: space-around;
  gap: 8px;
  flex-wrap: wrap;
}
.chart-hero-ming,
.chart-hero-shen,
.chart-hero-ju,
.chart-hero-gz {
  text-align: center;
  flex: 1;
  min-width: 70px;
}
.ch-label {
  font-size: 0.65rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin-bottom: 3px;
}
.ch-value {
  font-size: 0.88rem;
  color: var(--text);
  font-weight: 500;
}
```

---

## 任務優先順序總結

| # | 任務名稱 | 優先度 | 預估工時 | 變更檔案 |
|---|---------|--------|---------|---------|
| 1 | 主星亮度標籤 | 🔥 | 1h | `ziwei.js` + `app.js` + `style.css` |
| 2 | 身宮主星顯示 | 🔥 | 30m | `ziwei.js` + `app.js` |
| 3 | 農曆/生肖/星座 | 🔥 | 30m | `ziwei.js` + `app.js` |
| 11 | 命盤頂部資訊卡 | 🔥 | 1h | `app.js` + `style.css` |
| 4 | 當前大限卡片 | ⭐ | 1h | `ziwei.js` + `app.js` + `style.css` |
| 5 | 大限時間軸 | ⭐ | 2h | `app.js` + `style.css` |
| 6 | 三方四正 Modal | ⭐ | 1.5h | `app.js` + `style.css` |
| 7 | 桃花/貴人星 icon | 💡 | 1h | `app.js` + `style.css` |
| 8 | 四化星視覺化 | 💡 | 30m | `app.js` + `style.css` |
| 9 | 十二長生 tooltip | 💡 | 30m | `ziwei.js` + `app.js` |
| 10 | 回傳結構重構 | 🔧 | 1h | `ziwei.js` + `app.js` |

**建議實作順序**：1 → 2 → 3 → 11 → 4 → 5 → 6 → 7 → 8 → 9 → 10

每次完成一個 Task，執行 `node build.mjs` 並在瀏覽器用 `1990-6-15 14:00 男命`驗證，再推進下一個。
