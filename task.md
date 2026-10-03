# 算命助手 — 實作任務清單
> 本檔案由 Claude Agent 管理，直接照表操課即可。
> 時間戳：2026-10-03
> 狀態：[ ] = 待做  [D] = Doing  [✓] = 完成

---

## ⚡ 緊急阻塞修復（立即實作，影響 Phase 0 通關）

---

### TASK-A1：神準感回饋按鈕 + 埋點基礎設施

**目的**：在卦象結果卡底部加入 👍/👎 按鈕，並將點擊事件寫入 localStorage，作為日後接入 PostHog/Umami 的橋接層。

**檔案**：`js/app.js`

#### Step 1：新增埋點輔助函式（在 import 區塊下方）

```javascript
// ===== 埋點輔助（localStorage bridge）=====
// 用法：track('divination', { method: 'time', hexagram: '乾', feedback: 'up' })

function track(event, properties = {}) {
  try {
    const data = JSON.parse(localStorage.getItem('suanming_events') || '[]');
    data.push({
      event,
      properties,
      ts: Date.now(),
      date: new Date().toISOString().slice(0, 10)
    });
    // 最多保留 1000 條
    if (data.length > 1000) data.splice(0, data.length - 1000);
    localStorage.setItem('suanming_events', JSON.stringify(data));
  } catch {}
}

// 讀取埋點數據（供儀表板顯示）
function getEventStats() {
  try {
    const data = JSON.parse(localStorage.getItem('suanming_events') || '[]');
    const total = data.length;
    const byEvent = {};
    data.forEach(d => {
      byEvent[d.event] = (byEvent[d.event] || 0) + 1;
    });
    // 計算 👍 反饋率
    const feedbackEvents = data.filter(d => d.event === 'feedback');
    const upCount = feedbackEvents.filter(d => d.properties.feedback === 'up').length;
    const feedbackRate = feedbackEvents.length > 0
      ? Math.round((upCount / feedbackEvents.length) * 100)
      : null;
    return { total, byEvent, feedbackEvents: feedbackEvents.length, upCount, feedbackRate };
  } catch {
    return { total: 0, byEvent: {}, feedbackEvents: 0, upCount: 0, feedbackRate: null };
  }
}
```

#### Step 2：在 `renderDivinationResult()` 函式最後方（`saying-section` div 後面）加入回饋按鈕 HTML

在 `renderDivinationResult` 函式中找到這一行：
```javascript
<button class="btn-secondary" onclick="openReflection(${Date.now()})" style="margin-top:12px">
```

在它**後面**加入：
```javascript

      <div class="feedback-section" id="feedback-section">
        <div class="feedback-label">這個卦象有戳中你嗎？</div>
        <div class="feedback-buttons">
          <button class="feedback-btn up" id="feedback-up" onclick="handleFeedback('up')">
            👍 有
          </button>
          <button class="feedback-btn down" id="feedback-down" onclick="handleFeedback('down')">
            👎 還好
          </button>
        </div>
        <div class="feedback-thanks hidden" id="feedback-thanks">謝謝你的回饋 🙏</div>
      </div>
```

#### Step 3：在 `renderDivinationResult()` 函式**外部**（任意位置）新增 `handleFeedback`

```javascript
function handleFeedback(type) {
  const hex = currentResult?.hexagram?.name || 'unknown';
  const method = currentResult?.method || 'unknown';
  track('feedback', { feedback: type, hexagram: hex, method });

  document.getElementById('feedback-up')?.classList.add('hidden');
  document.getElementById('feedback-down')?.classList.add('hidden');
  document.getElementById('feedback-thanks')?.classList.remove('hidden');
}
```

#### Step 4：在每次 `handleDivination()` 結尾呼叫 `track`

在 `handleDivination()` 函式中，找到這一行：
```javascript
addRecord({ mode: '梅花易數', ...
```

在它**前面**加入：
```javascript
  track('divination', {
    method: result.method,
    hexagram: result.hexagram.name,
    auspicious: isGood ? 'good' : 'bad',
    scenario
  });
```

#### Step 5：在 `showCard()` 函式中也加入追蹤

在 `showCard()` 函式中找到：
```javascript
addRecord({ mode: '每日能量卡', card: card.title });
```

在它**後面**加入：
```javascript
  track('card_draw', { cardId: card.id, period: card.period });
```

#### Step 6：在 `loadDashboard()` 中顯示埋點統計

在 `loadDashboard()` 函式中，找到：
```javascript
<div class="stat-value">${stats.totalUses}</div>
```

在它**上方**加入：
```javascript
  const eventStats = getEventStats();
```

然後找到整個 stat-grid 的第一個 stat-item（總使用次數），把：
```javascript
<div class="stat-value">${stats.totalUses}</div>
```
改為：
```javascript
<div class="stat-value">${stats.totalUses + eventStats.total}</div>
```

在「常見卦象」的 stat-item 後面新增一個：
```javascript
<div class="stat-item">
  <div class="stat-value">${eventStats.feedbackRate !== null ? eventStats.feedbackRate + '%' : '—'}</div>
  <div class="stat-label">神準率</div>
</div>
```

#### Step 7：CSS（在 `style.css` 最後加入）

```css
/* === 神準感回饋按鈕 === */
.feedback-section {
  margin: 16px 0 0;
  text-align: center;
  padding: 14px;
  border-top: 1px solid var(--border);
}
.feedback-label {
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.feedback-buttons {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.feedback-btn {
  padding: 8px 20px;
  border-radius: 20px;
  border: 1px solid var(--border);
  background: var(--bg-input);
  color: var(--text);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}
.feedback-btn:hover { border-color: var(--accent); color: var(--accent); }
.feedback-btn.up:hover { background: rgba(58,107,74,0.2); border-color: var(--green); }
.feedback-btn.down:hover { background: rgba(139,58,58,0.2); border-color: var(--red); }
.feedback-thanks {
  font-size: 0.8rem;
  color: var(--accent);
  margin-top: 8px;
}
.feedback-thanks.hidden { display: none; }
.feedback-btn.hidden { display: none; }
```

#### Step 8：在 `storage.js` 的 `getStats()` 中也加入反饋統計

在 `storage.js` 的 `getStats()` 函式回傳值中，加入：
```javascript
  const eventStats = (() => {
    try {
      const data = JSON.parse(localStorage.getItem('suanming_events') || '[]');
      const fb = data.filter(d => d.event === 'feedback');
      const up = fb.filter(d => d.properties.feedback === 'up').length;
      return {
        feedbackTotal: fb.length,
        feedbackUp: up,
        feedbackRate: fb.length > 0 ? Math.round((up / fb.length) * 100) : null
      };
    } catch { return { feedbackTotal: 0, feedbackUp: 0, feedbackRate: null }; }
  })();
```

然後在回傳物件的結尾（`topHexagrams` 後面）加入：
```javascript
    feedbackRate: eventStats.feedbackRate,
    feedbackTotal: eventStats.feedbackTotal,
```

**驗證方式**：
1. 打開瀏覽器，進決策模式，輸入日期起卦
2. 滾到結果卡底部，應看到「這個卦象有戳中你嗎？ 👍有 👎還好」
3. 點 👍，按鈕消失，顯示「謝謝你的回饋 🙏」
4. 進儀表板，應看到「神準率：XX%」
5. 進 localStorage inspector，`suanming_events` 有資料

---

### TASK-A2：IG 圖卡生成功能

**目的**：在卦象結果卡旁邊加入「生成圖卡」按鈕，點擊後生成 1080×1350px 可分享圖片（含卦名、金句、浮水印）。

**前置條件**：`html2canvas` CDN 載入 index.html

#### Step 1：在 `index.html` 的 `</head>` 前加入 CDN

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
```

#### Step 2：在 `app.js` 新增圖卡生成函式

在 `app.js` 檔案任意位置（推薦放在 `handleFeedback` 函式後面）加入：

```javascript
// ===== IG 圖卡生成 =====
window.generateShareCard = async function() {
  const resultArea = document.getElementById('result-area');
  if (!resultArea) return;

  const hexName = currentResult?.hexagram?.name || '卦';
  const upper = currentResult?.upperTrigram?.symbol || '☰';
  const lower = currentResult?.lowerTrigram?.symbol || '☰';
  const tiyong = currentResult?.tiyong?.relation || '';
  const guaci = currentResult?.guaci || '';
  const sayingText = document.querySelector('.saying-text')?.textContent || '';
  const sayingTone = document.querySelector('.saying-tone')?.textContent || '';

  // 建立臨時 DOM（不上樹，用 document 建立後馬上截圖）
  const card = document.createElement('div');
  card.style.cssText = `
    width: 1080px; height: 1350px;
    background: #0a0908;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 80px;
    font-family: 'Noto Serif TC', serif;
    position: fixed; left: -9999px; top: 0;
    box-sizing: border-box;
  `;
  card.innerHTML = `
    <div style="font-size:80px;margin-bottom:20px">${upper} / ${lower}</div>
    <div style="font-size:120px;font-weight:bold;color:#c9a84c;margin-bottom:10px">${hexName}卦</div>
    <div style="font-size:36px;color:#7a756d;margin-bottom:40px">${guaci}</div>
    <div style="width:600px;height:2px;background:#2a2825;margin-bottom:40px"></div>
    <div style="font-size:44px;color:#f0ede6;line-height:1.8;text-align:center;max-width:900px;margin-bottom:40px">${sayingTone}${sayingText}</div>
    <div style="font-size:32px;color:#4a453f;margin-bottom:60px">體用${tiyong}</div>
    <div style="font-size:28px;color:#c9a84c80;letter-spacing:4px">梅花易數 · 紫微斗數</div>
    <div style="font-size:22px;color:#2a2825;margin-top:12px">suanming.vercel.app</div>
  `;
  document.body.appendChild(card);

  try {
    const canvas = await html2canvas(card, {
      scale: 2,
      backgroundColor: '#0a0908',
      useCORS: true
    });
    const link = document.createElement('a');
    link.download = `${hexName}卦_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    track('card_download', { hexagram: hexName, method: currentResult?.method });
  } catch (err) {
    console.error('圖卡生成失敗:', err);
    alert('圖卡生成失敗，請稍後再試');
  } finally {
    document.body.removeChild(card);
  }
};
```

#### Step 3：在 `renderDivinationResult()` 中加入「生成圖卡」按鈕

在 Step 2 加入的回饋區塊 `<div class="feedback-section">` **前面**（即 `openReflection` 按鈕**後面**）加入：

```javascript
      <button class="btn-secondary" onclick="generateShareCard()" style="margin-top:8px; width:100%">
        🖼 生成可分享圖卡
      </button>
```

**驗證方式**：
1. 決策模式起卦後，結果卡出現「🖼 生成可分享圖卡」按鈕
2. 點擊 → 瀏覽器下載一張 PNG 圖
3. 圖片尺寸 1080×1350，背景深色，有卦名、金句、浮水印

---

## 🟡 Phase 0 缺口修補

---

### TASK-B1：2.5秒起卦儀式動畫

**目的**：起卦提交後，結果區顯示 2.5 秒旋轉動畫，再呈現結果。

#### Step 1：在 `renderDivinationResult()` 函式最前面加入動畫 DOM

找到 `renderDivinationResult` 函式的第一行：
```javascript
const area = document.getElementById('result-area');
```

在它**後面**加入：
```javascript
  // 2.5 秒起卦儀式動畫
  area.innerHTML = `
    <div class="divination-ritual">
      <div class="ritual-symbols">
        <div class="ritual-symbol s1">☰</div>
        <div class="ritual-symbol s2">☱</div>
        <div class="ritual-symbol s3">☲</div>
        <div class="ritual-symbol s4">☳</div>
        <div class="ritual-symbol s5">☴</div>
        <div class="ritual-symbol s6">☵</div>
        <div class="ritual-symbol s7">☶</div>
        <div class="ritual-symbol s8">☷</div>
      </div>
      <div class="ritual-glow"></div>
      <div class="ritual-text">時空對齊中...</div>
    </div>
  `;

  await new Promise(resolve => setTimeout(resolve, 2500));
```

#### Step 2：在 `style.css` 最後加入動畫樣式

```css
/* === 2.5秒起卦儀式動畫 === */
.divination-ritual {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  position: relative;
}
.ritual-symbols {
  position: relative;
  width: 200px;
  height: 200px;
}
.ritual-symbol {
  position: absolute;
  font-size: 2.5rem;
  color: var(--accent);
  opacity: 0;
  animation: ritual-spin 2.5s ease-in-out infinite;
}
.ritual-symbol.s1 { animation-delay: 0s; }
.ritual-symbol.s2 { animation-delay: 0.2s; }
.ritual-symbol.s3 { animation-delay: 0.4s; }
.ritual-symbol.s4 { animation-delay: 0.6s; }
.ritual-symbol.s5 { animation-delay: 0.8s; }
.ritual-symbol.s6 { animation-delay: 1.0s; }
.ritual-symbol.s7 { animation-delay: 1.2s; }
.ritual-symbol.s8 { animation-delay: 1.4s; }
.ritual-glow {
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(201,168,76,0.3), transparent 70%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation: glow-pulse 1.2s ease-in-out infinite;
}
.ritual-text {
  margin-top: 24px;
  font-size: 0.85rem;
  color: var(--text-muted);
  letter-spacing: 0.15em;
  animation: text-blink 1.5s ease-in-out infinite;
}
@keyframes ritual-spin {
  0% { opacity: 0; transform: rotate(0deg) scale(0.5); }
  20% { opacity: 1; transform: rotate(45deg) scale(1); }
  80% { opacity: 1; transform: rotate(315deg) scale(1); }
  100% { opacity: 0; transform: rotate(360deg) scale(0.5); }
}
@keyframes glow-pulse {
  0%, 100% { opacity: 0.3; transform: translate(-50%,-50%) scale(1); }
  50% { opacity: 0.8; transform: translate(-50%,-50%) scale(1.4); }
}
@keyframes text-blink {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

#### Step 3：把 `renderDivinationResult` 改為 `async function`

找到：
```javascript
function renderDivinationResult(result, saying) {
```

改為：
```javascript
async function renderDivinationResult(result, saying) {
```

**驗證方式**：
1. 決策模式輸入日期，點起卦
2. 看到八卦符號旋轉 + 光暈脈動 +「時空對齊中...」
3. 2.5 秒後，結果卡淡入

---

### TASK-B2：「衝動消費」場景金句（4條）

**目的**：補足 `sayings.js` 中缺失的第三個場景。

#### Step 1：在 `sayings.js` 的 `SAYINGS` 物件中加入 `consumption` 陣列

在 `sayings.js` 中找到 `const SAYINGS = {` 並在 `career: [` 前加入：

```javascript
  consumption: [
    // ===== 語氣 A：毒舌激將 =====
    {
      id: 'consumption_aggressive_1',
      tone: '毒舌激將',
      category: 'bad',
      text: '卦象說：這筆錢花了，三天內你一定後悔。但你知道你會買的，因為你來問這個問題的時候，心裡早就決定了。',
      keywords: ['想買', '衝動', '猶豫', '好想要']
    },
    {
      id: 'consumption_aggressive_2',
      tone: '毒舌激將',
      category: 'good',
      text: '這筆錢在卦象裡是「必要支出」，不是浪費。你不是在花錢，你是在買一個讓自己安心的答案。',
      keywords: ['該買', '要不要', '值得']
    },
    // ===== 語氣 B：溫柔洞察 =====
    {
      id: 'consumption_gentle_1',
      tone: '溫柔洞察',
      category: 'bad',
      text: '卦象在說：你真正想買的不是那個東西，是「買了之後，我對自己會更好」的感覺。但這個感覺不用花錢也可以給自己。',
      keywords: ['補償', '對自己好', '想要']
    },
    {
      id: 'consumption_gentle_2',
      tone: '溫柔洞察',
      category: 'good',
      text: '這個消費的卦象很有趣：表面是支出，但卦象說它會以另一種形式回到你手上。先買，再觀察。',
      keywords: ['貴', '值得', '遲疑']
    }
  ],
```

#### Step 2：在 `getSaying()` 函式中處理 `consumption` 場景

在 `sayings.js` 的 `getSaying()` 函式中找到：
```javascript
const scenarios = SAYINGS[scenario];
if (!scenarios) return { tone: '提示', text: '請選擇有效的場景' };
```

在它**前面**加入：
```javascript
  // consumption 場景沒有 tone 分組，直接取隨機
  if (scenario === 'consumption') {
    const pool = SAYINGS.consumption;
    const matches = pool.filter(s => s.category === (isGood ? 'good' : 'bad'));
    const target = matches.length > 0 ? matches : pool;
    const seed = (year + month + day) % target.length;
    return target[seed] || { tone: '提示', text: '請再試一次' };
  }
```

#### Step 3：在 `index.html` 的場景 select 中加入「衝動消費」選項

在 `index.html` 找到 `<select id="scenario-select">` 並在 `<option value="love">` 後面加入：

```html
              <option value="consumption">衝動消費 · 該不該買</option>
```

#### Step 4：在 `meihua.js` 的 `getAuspicious()` 函式中加入 `consumption` 場景支援

在 `meihua.js` 的 `getAuspicious()` 函式中找到：
```javascript
  if (tiyong.relation === '相生') return 'good';
  if (tiyong.relation === '比和') return 'neutral';
  return 'bad';
```

改為：
```javascript
  if (tiyong.relation === '相生') return 'good';
  if (tiyong.relation === '比和') return 'neutral';
  // consumption 場景對阻力更敏感，剋直接降級
  if (scenario === 'consumption' && tiyong.relation === '被剋') return 'bad';
  return 'bad';
```

**驗證方式**：
1. 打開決策模式，選擇場景「衝動消費 · 該不該買」
2. 起卦後，金句內容應該針對消費情境
3. 確認 index.html 場景下拉選單有三個選項

---

## 🚀 Phase 1 缺口修補

---

### TASK-C1：Daily Vibe Drop（每日直覺簽到）

**目的**：讓用戶每天打開有「簽到」的感覺，增加回訪理由。

#### Step 1：在 `card.js` 加入幸運色與能量關鍵字生成

在 `card.js` 的 `getCurrentCard()` 函式**前面**加入：

```javascript
// ===== 每日幸運色 + 能量關鍵字（確定性 seed）=====
const LUCKY_COLORS = [
  { name: '金色', hex: '#c9a84c', desc: '今天的行動色，金色代表貴人運' },
  { name: '黑色', hex: '#2a2825', desc: '今天的沉澱色，適合內觀與整理' },
  { name: '紅色', hex: '#8b3a3a', desc: '今天的突破色，紅色點燃行動力' },
  { name: '綠色', hex: '#3a6b4a', desc: '今天的生長色，適合播種與開始' },
  { name: '紫色', hex: '#6b5b8a', desc: '今天的直覺色，適合相信第一感覺' },
  { name: '白色', hex: '#f0ede6', desc: '今天的純白色，適合清零與重新開始' }
];

const ENERGY_WORDS = [
  '蓄力', '突破', '觀望', '行動', '整理', '連結',
  '沉澱', '釋放', '播種', '收割', '聚焦', '放鬆'
];

function getDailyVibe() {
  const d = new Date();
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);
  const colorIdx = dayOfYear % LUCKY_COLORS.length;
  const energyIdx = (dayOfYear * 7 + d.getMonth()) % ENERGY_WORDS.length;
  return {
    color: LUCKY_COLORS[colorIdx],
    energy: ENERGY_WORDS[energyIdx],
    dayOfYear
  };
}

// 簽到記錄
function checkIn() {
  const d = new Date();
  const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const data = (() => {
    try { return JSON.parse(localStorage.getItem('suanming_checkin') || '{}'); } catch { return {}; }
  })();
  if (data[dateKey]) return false; // 今日已簽到
  data[dateKey] = { ts: Date.now(), vibe: getDailyVibe() };
  if (Object.keys(data).length > 90) {
    const keys = Object.keys(data).sort();
    while (keys.length > 90) keys.shift();
    keys.forEach(k => { if (!keys.includes(k)) delete data[k]; });
  }
  try { localStorage.setItem('suanming_checkin', JSON.stringify(data)); } catch {}
  return true;
}

function hasCheckedIn() {
  const d = new Date();
  const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  try {
    const data = JSON.parse(localStorage.getItem('suanming_checkin') || '{}');
    return !!data[dateKey];
  } catch { return false; }
}

function getCheckInStreak() {
  try {
    const data = JSON.parse(localStorage.getItem('suanming_checkin') || '{}');
    const keys = Object.keys(data).sort().reverse();
    if (keys.length === 0) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (data[k]) streak++;
      else if (i > 0) break;
    }
    return streak;
  } catch { return 0; }
}
```

#### Step 2：在 `app.js` 的 `showCard()` 中加入 Vibe Drop 顯示

找到 `showCard()` 函式，在 `personalGreeting` 的 `<div class="personal-greeting">` **前面**加入：

```javascript
  // 每日簽到顯示
  const vibe = getDailyVibe();
  const checkedIn = hasCheckedIn();
  const vibeHTML = `
    <div class="vibe-drop ${checkedIn ? 'checked-in' : ''}" id="vibe-drop">
      <div class="vibe-color-dot" style="background:${vibe.color.hex}"></div>
      <div class="vibe-info">
        <div class="vibe-color">今日幸運色：${vibe.color.name} <span style="font-size:0.7rem;color:var(--text-muted)">${vibe.color.desc}</span></div>
        <div class="vibe-energy">今日能量關鍵字：<strong style="color:var(--accent)">${vibe.energy}</strong></div>
      </div>
      ${!checkedIn ? `<button class="vibe-checkin-btn" id="vibe-checkin-btn" onclick="handleVibeCheckIn()">簽到 ✓</button>` : '<div class="vibe-checked-in">✓ 已簽到</div>'}
    </div>
  `;
```

然後在 `area.innerHTML = \`` 的 `morningBadge` 變數**前**加入 `vibeHTML`：
```javascript
  area.innerHTML = `
    <div class="energy-card">
      ${vibeHTML}
      ${morningBadge}
```

#### Step 3：在 `app.js` 中加入簽到處理函式

在 `handleFeedback` 函式**後面**加入：

```javascript
function handleVibeCheckIn() {
  const ok = checkIn();
  if (ok) {
    const el = document.getElementById('vibe-drop');
    if (el) {
      el.classList.add('checked-in');
      const btn = el.querySelector('#vibe-checkin-btn');
      if (btn) btn.remove();
      const checked = document.createElement('div');
      checked.className = 'vibe-checked-in';
      checked.textContent = '✓ 已簽到';
      el.querySelector('.vibe-info')?.insertAdjacentElement('afterend', checked);
    }
    track('checkin', { energy: getDailyVibe().energy });
  }
}
```

#### Step 4：在 `loadDashboard()` 中顯示簽到連續天數

在 `statsEl` 的 stat-grid 中，在「歷史最高」stat-item **後面**加入：

```javascript
        <div class="stat-item">
          <div class="stat-value">${getCheckInStreak()}天</div>
          <div class="stat-label">簽到連續</div>
        </div>
```

#### Step 5：CSS（在 `style.css` 最後加入）

```css
/* === Daily Vibe Drop === */
.vibe-drop {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-input);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: 14px;
}
.vibe-drop.checked-in { opacity: 0.7; }
.vibe-color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}
.vibe-info { flex: 1; min-width: 0; }
.vibe-color, .vibe-energy {
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.vibe-checkin-btn {
  font-size: 0.78rem;
  color: var(--accent);
  background: rgba(201,168,76,0.1);
  border: 1px solid var(--accent);
  border-radius: 20px;
  padding: 4px 12px;
  cursor: pointer;
  white-space: nowrap;
}
.vibe-checked-in {
  font-size: 0.75rem;
  color: var(--green);
  white-space: nowrap;
}
```

**驗證方式**：
1. 進今日面板，應看到「今日幸運色：金色」「今日能量關鍵字：蓄力」
2. 點「簽到 ✓」→ 變成「✓ 已簽到」
3. 刷新頁面，仍顯示「✓ 已簽到」
4. 進儀表板，簽到連續天數顯示正確

---

### TASK-C2：Decision Journal 3天後自動提醒（無後端版）

**目的**：記錄決策後，3天後在頁面頂部提示用戶回來複盤。

#### Step 1：在 `storage.js` 新增延遲提醒記錄

在 `storage.js` 的 `addReflection()` 函式**前面**加入：

```javascript
// ===== 延遲複盤提醒 =====
function scheduleReflectionReminder(recordId, decisionText) {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  d.setHours(9, 0, 0, 0); // 3天後早上9點

  const data = loadData();
  if (!data.pendingReminders) data.pendingReminders = [];

  // 避免重複
  if (!data.pendingReminders.find(r => r.recordId === recordId)) {
    data.pendingReminders.push({
      recordId,
      decisionText,
      remindAt: d.getTime(),
      createdAt: Date.now()
    });
  }

  saveData(data);
  return d.getTime();
}

function getPendingReminders() {
  const data = loadData();
  const now = Date.now();
  return (data.pendingReminders || []).filter(r => r.remindAt <= now);
}

function clearReminder(recordId) {
  const data = loadData();
  data.pendingReminders = (data.pendingReminders || []).filter(r => r.recordId !== recordId);
  saveData(data);
}
```

#### Step 2：更新 `addReflection` 以支援有結果時清理提醒

在 `storage.js` 找到 `function addReflection` 並在函式**最後**（`saveData(data)` 前）加入：

```javascript
  // 如果有結果標記，清除提醒
  if (result && result !== '待觀察') {
    clearReminder(recordId);
  }
```

#### Step 3：在 `app.js` 的 `DOMContentLoaded` 中檢查並顯示提醒

在 `app.js` 的 `DOMContentLoaded` 事件處理函式中，找到這一行：
```javascript
loadDashboard();
```

在它**前面**加入：
```javascript
  // 檢查待複盤提醒
  const pending = getPendingReminders();
  if (pending.length > 0) {
    const reminder = pending[0];
    showReflectionReminder(reminder);
  }
```

#### Step 4：在 `app.js` 加入提醒 UI 函式

在 `handleVibeCheckIn` 函式**後面**加入：

```javascript
// ===== Decision Journal 3天後提醒 =====
function showReflectionReminder(reminder) {
  // 只在今日面板或決策面板顯示
  if (currentMode !== 'today' && currentMode !== 'decision') return;

  const panel = document.querySelector(`[data-panel="${currentMode}"]`);
  if (!panel) return;

  const existing = document.getElementById('reflection-reminder-banner');
  if (existing) return; // 只顯示一條

  const banner = document.createElement('div');
  banner.id = 'reflection-reminder-banner';
  banner.innerHTML = `
    <div class="reminder-banner">
      <div class="reminder-icon">📋</div>
      <div class="reminder-content">
        <div class="reminder-title">3天前你問了這個：</div>
        <div class="reminder-text">"${reminder.decisionText.slice(0, 50)}${reminder.decisionText.length > 50 ? '...' : ''}"</div>
        <div class="reminder-actions">
          <button class="reminder-btn yes" onclick="handleReflectionResult('${reminder.recordId}', true)">靈驗了 ✓</button>
          <button class="reminder-btn no" onclick="handleReflectionResult('${reminder.recordId}', false)">踩坑了 ×</button>
          <button class="reminder-btn later" onclick="snoozeReminder('${reminder.recordId}')">再緩緩</button>
        </div>
      </div>
      <button class="reminder-dismiss" onclick="dismissReminder()">✕</button>
    </div>
  `;

  const cardArea = panel.querySelector('#card-area') || panel.querySelector('.input-section');
  if (cardArea) {
    cardArea.insertAdjacentElement('beforebegin', banner);
  }
}

function handleReflectionResult(recordId, worked) {
  addReflection(parseInt(recordId), '', worked ? '靈驗了' : '踩坑了');
  dismissReminder();
  track('reflection_result', { recordId, worked });
}

function snoozeReminder(recordId) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);

  const data = loadData();
  data.pendingReminders = (data.pendingReminders || []).map(r => {
    if (String(r.recordId) === String(recordId)) {
      return { ...r, remindAt: d.getTime() };
    }
    return r;
  });
  saveData(data);
  dismissReminder();
}

function dismissReminder() {
  document.getElementById('reflection-reminder-banner')?.remove();
}

window.handleReflectionResult = handleReflectionResult;
window.snoozeReminder = snoozeReminder;
window.dismissReminder = dismissReminder;
```

#### Step 5：更新 `openReflection()` 以排程 3 天後提醒

在 `app.js` 找到 `window.openReflection = function(recordId)` 並將函式內容改為：

```javascript
window.openReflection = function(recordId) {
  const text = prompt('描述你做的這個決定：');
  if (text) {
    addReflection(recordId, text, '待觀察');
    scheduleReflectionReminder(recordId, text); // 新增：排程3天後提醒
    alert('已記錄，3天後我會提醒你回來看看結果 🔔');
  }
};
```

#### Step 6：在 `storage.js` 的 export 中加入新函式

找到 `export { ... }` 並在清單中加入：
```javascript
scheduleReflectionReminder, getPendingReminders, clearReminder
```

#### Step 7：CSS（在 `style.css` 最後加入）

```css
/* === Decision Journal 提醒橫幅 === */
.reminder-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  background: rgba(107,91,138,0.15);
  border: 1px solid var(--purple-dim);
  border-radius: var(--radius-sm);
  margin-bottom: 14px;
}
.reminder-icon { font-size: 1.5rem; flex-shrink: 0; margin-top: 2px; }
.reminder-content { flex: 1; }
.reminder-title {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.reminder-text {
  font-size: 0.85rem;
  color: var(--text);
  font-style: italic;
  margin-bottom: 10px;
  line-height: 1.5;
}
.reminder-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.reminder-btn {
  padding: 5px 14px;
  border-radius: 16px;
  font-size: 0.78rem;
  cursor: pointer;
  border: 1px solid var(--border);
  background: var(--bg-input);
  transition: all 0.2s;
}
.reminder-btn.yes { color: var(--green); border-color: var(--green); }
.reminder-btn.no { color: var(--red); border-color: var(--red); }
.reminder-btn.yes:hover { background: rgba(58,107,74,0.2); }
.reminder-btn.no:hover { background: rgba(139,58,58,0.2); }
.reminder-btn.later { color: var(--text-muted); }
.reminder-dismiss {
  font-size: 0.9rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}
.reminder-dismiss:hover { color: var(--text); }
```

**驗證方式**：
1. 決策模式起卦後，點「記下這個決定」，輸入內容
2. 關閉瀏覽器，等 3 天（或在 devtools 直接把 `pendingReminders` 的 `remindAt` 改為過去時間）
3. 重新開啟頁面，頂部出現提醒橫幅
4. 點「靈驗了」→ 提醒消失，記錄進 reflection

---

### TASK-C3：14主星 Archetype 視覺卡片（獨立模組）

**目的**：將主星認領從「一行文字」升級為「完整 Archetype 視覺卡」，加深用戶的身份認同感。

#### Step 1：在 `js/archetypes.js` 新建檔案

```javascript
/**
 * 14 主星 Archetype 視覺數據
 * 每顆主星包含：視覺關鍵字、專屬配色、代表符號、人生課題
 */

export const ARCHETYPES = {
  '紫微': {
    id: 'zrw',
    archetype: '帝王型',
    symbol: '👑',
    color: '#c9a84c',
    tagline: '天生我才，眾星拱月',
    strength: '決斷力與號召力',
    weakness: '固執與控制欲',
    growthTask: '學會傾聽，不要凡事由自己說了算',
    idealEnv: '掌舵的位置、領導團隊、制定規則',
    avoid: '被架空權力的位置、被迫服從',
    colorCodes: ['#c9a84c', '#8b6914', '#2a2010'],
    quote: '你不需要證明自己是帝王，你只需要行動像帝王。'
  },
  '天機': {
    id: 'tjj',
    archetype: '謀略家',
    symbol: '🧠',
    color: '#5b8dd9',
    tagline: '算無遺策，深謀遠慮',
    strength: '分析力與策劃力',
    weakness: '過度思考導致行動延遲',
    growthTask: '想到80%就行動，不要等100%才動',
    idealEnv: '智庫、顧問、策略部門',
    avoid: '高壓決策前線、需要立即行動的環境',
    colorCodes: ['#5b8dd9', '#2a4a8b', '#0a1525'],
    quote: '最好的策略是那些想到80%就行動的人做出來的。'
  },
  '太陽': {
    id: 'tyy',
    archetype: '光之子',
    symbol: '☀️',
    color: '#e8b84a',
    tagline: '光熱照耀，萬物生長',
    strength: '社交力與名聲渴望',
    weakness: '過度在意他人眼光',
    growthTask: '在照亮別人之前，先確認自己是否還有燃料',
    idealEnv: '舞台中央、社交場合、公開演說',
    avoid: '長期隔離不被看見的工作',
    colorCodes: ['#e8b84a', '#b8860b', '#2a1f00'],
    quote: '你的光不需要所有人的認可，只需要照亮真正重要的時刻。'
  },
  '武曲': {
    id: 'wqx',
    archetype: '金剛型',
    symbol: '⚔️',
    color: '#8b7355',
    tagline: '剛毅不屈，財富為道',
    strength: '行動力與財務嗅覺',
    weakness: '不擅長示弱與求助',
    growthTask: '有時候退一步，是為了打更遠的仗',
    idealEnv: '金融領域、創業、武職',
    avoid: '需要大量情感溝通的角色',
    colorCodes: ['#8b7355', '#5a4a35', '#1a1510'],
    quote: '硬碰硬是勇氣，但知道什麼時候該軟，是智慧。'
  },
  '天同': {
    id: 'ttt',
    archetype: '療癒者',
    symbol: '🌿',
    color: '#7ab87a',
    tagline: '和光同塵，萬物得一以生',
    strength: '適應力與感受力',
    weakness: '缺乏邊界，容易被消耗',
    growthTask: '學會說不，是對自己最深的温柔',
    idealEnv: '藝術創作、陪伴型角色、諮詢',
    avoid: '高強度競爭環境',
    colorCodes: ['#7ab87a', '#3a6b3a', '#0a1a0a'],
    quote: '你對世界的温柔，不需要以失去自己為代價。'
  },
  '廉貞': {
    id: 'lzh',
    archetype: '烈焰型',
    symbol: '🔥',
    color: '#d94a4a',
    tagline: '敢愛敢恨，情如烈焰',
    strength: '感受力與情感穿透力',
    weakness: '情緒起伏大，執著難放',
    growthTask: '允許自己放下，不是失敗，是升級',
    idealEnv: '創意行業、情感工作者',
    avoid: '需要情緒高度穩定的工作',
    colorCodes: ['#d94a4a', '#8b2a2a', '#250a0a'],
    quote: '你的執著是你的燃料，也是你需要學會節制的火焰。'
  },
  '天府': {
    id: 'tfs',
    archetype: '倉儲型',
    symbol: '🏛️',
    color: '#9b8b6b',
    tagline: '天府之國，固若金湯',
    strength: '理財力與穩健力',
    weakness: '缺乏冒險精神，錯過機會',
    growthTask: '允許自己偶爾冒險，不冒險本身也是一種風險',
    idealEnv: '財務管理、傳統企業、房產',
    avoid: '需要快速轉型的環境',
    colorCodes: ['#9b8b6b', '#6b5a40', '#1a1510'],
    quote: '你的穩健是別人的依靠，但記得留一點冒險給自己。'
  },
  '太陰': {
    id: 'tyyin',
    archetype: '月神型',
    symbol: '🌙',
    color: '#b8c4d9',
    tagline: '月華如水，暗中滋養',
    strength: '觀察力與細節敏感度',
    weakness: '被動迴避衝突，不善表達需求',
    growthTask: '你的需求和別人的需求一樣重要',
    idealEnv: '幕後工作、獨立作業、藝術創作',
    avoid: '高對抗性談判場合',
    colorCodes: ['#b8c4d9', '#6b7a9b', '#151a25'],
    quote: '月光不需要太陽的讚美，月光本身就是一種美。'
  },
  '貪狼': {
    id: 'tll',
    archetype: '欲望探險家',
    symbol: '🎯',
    color: '#d94a8b',
    tagline: '貪而不知足，狼行千里',
    strength: '社交力與慾望驅動力',
    weakness: '慾望過多，精力分散',
    growthTask: '一次只專注一個目標，是對自己最大的仁慈',
    idealEnv: '社交場合、談判、娛樂產業',
    avoid: '需要長期單一專注的工作',
    colorCodes: ['#d94a8b', '#8b2a5a', '#250a15'],
    quote: '你的飢餓感是你的引擎，但學會品嚐是升級。'
  },
  '巨門': {
    id: 'jmk',
    archetype: '真相探索者',
    symbol: '🔍',
    color: '#8b8b9b',
    tagline: '門後有真相，但也有風險',
    strength: '分析力與洞察力',
    weakness: '過度懷疑，口語傷人',
    growthTask: '在說出口之前，先問自己：這句話是為了我，還是為了他？',
    idealEnv: '研究崗位、調查報導、法律',
    avoid: '高度需要團隊和諧的環境',
    colorCodes: ['#8b8b9b', '#5a5a6b', '#15151a'],
    quote: '你的懷疑是通向真相的橋，但不要停在橋上不走。'
  },
  '天相': {
    id: 'txx',
    archetype: '協調者',
    symbol: '⚖️',
    color: '#7ab8d9',
    tagline: '天為之相，調和其他',
    strength: '協調力與服務精神',
    weakness: '過度配合，缺乏主見',
    growthTask: '你的價值不是當和事佬，而是當有原則的橋',
    idealEnv: '行政、後勤、項目管理',
    avoid: '需要獨斷決策的位置',
    colorCodes: ['#7ab8d9', '#3a6b8b', '#0a1a25'],
    quote: '配合是美德，但失去自己的配合，只是逃避。'
  },
  '天梁': {
    id: 'tll2',
    archetype: '守護者',
    symbol: '🛡️',
    color: '#b8a87a',
    tagline: '天梁蔭庇，庇護眾生',
    strength: '照顧力與穩定力',
    weakness: '愛說教、過度保護',
    growthTask: '放下「我都是為你好」，允許別人走自己的彎路',
    idealEnv: '公益事業、醫療、教育',
    avoid: '被照顧者不領情的環境',
    colorCodes: ['#b8a87a', '#8b7a4a', '#251f10'],
    quote: '守護是恩情，但不要讓守護變成一種控制。'
  },
  '七殺': {
    id: 'zsh',
    archetype: '破局者',
    symbol: '💥',
    color: '#d97a4a',
    tagline: '七殺過境，寸草不生',
    strength: '突破力與逆境韌性',
    weakness: '魯莽、缺乏長期規劃',
    growthTask: '在爆發之前，先給自己三秒鐘評估後果',
    idealEnv: '急需突破的環境、危機處理',
    avoid: '需要長期累積潤滑的領域',
    colorCodes: ['#d97a4a', '#8b4a2a', '#250f05'],
    quote: '你的破局能力是你最鋒利的武器，也是最需要節制的力量。'
  },
  '破軍': {
    id: 'pjj',
    archetype: '變革者',
    symbol: '🌀',
    color: '#7a5bd9',
    tagline: '破舊立新，混沌為始',
    strength: '破局力與不畏懼改變',
    weakness: '不穩定，難以堅持',
    growthTask: '破局的意義是為了更好的重建，不是為了破而破',
    idealEnv: '創業、變革項目、創意產業',
    avoid: '需要高度可預測性的環境',
    colorCodes: ['#7a5bd9', '#4a2a8b', '#0f0525'],
    quote: '你敢於打破一切，但記得留下一個確定的自己。'
  }
};
```

#### Step 2：在 `app.js` 新增 Archetype 卡片渲染函式

在 `app.js` 加入：

```javascript
import { ARCHETYPES } from './archetypes.js';

// ===== 渲染 Archetype 視覺卡 =====
window.showArchetypeCard = function(starName) {
  const data = ARCHETYPES[starName];
  if (!data) return;

  const modal = document.createElement('div');
  modal.id = 'archetype-modal';
  modal.innerHTML = `
    <div class="modal-overlay" onclick="closeArchetypeCard()"></div>
    <div class="archetype-card">
      <button class="archetype-close" onclick="closeArchetypeCard()">✕</button>
      <div class="archetype-header" style="background:linear-gradient(135deg, ${data.color}20, ${data.colorCodes[2]})">
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

window.closeArchetypeCard = function() {
  const modal = document.getElementById('archetype-modal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  }
};
```

#### Step 3：在命盤結果的命宮主星顯示處加入點擊事件

在 `renderZiweiResult()` 函式中找到：
```javascript
${mingStar ? `<div class="chart-ming-star">命宮主星：${mingStar}</div>` : ''}
```

改為：
```javascript
${mingStar ? `<div class="chart-ming-star" onclick="showArchetypeCard('${mingStar}')" style="cursor:pointer" title="點擊查看完整人格卡">命宮主星：${mingStar} ⭐</div>` : ''}
```

#### Step 4：在儀表板命宮顯示處也加入點擊

在 `loadDashboard()` 中找到命宮顯示處，加入同樣的 `onclick`：

```javascript
${ud && ud.mingStar ? `
<div class="stat-item" style="grid-column:1/-1; text-align:center; margin-bottom:8px; cursor:pointer" onclick="showArchetypeCard('${ud.mingStar}')">
  <div class="stat-value" style="color:var(--accent)">⭐ ${ud.mingStar}坐命 ⭐</div>
</div>
` : ''}
```

#### Step 5：在 `handleClaimSubmit()` 的結果顯示中加入「查看完整人格卡」按鈕

在 `handleClaimSubmit()` 函式中找到：
```javascript
document.getElementById('result-star-strength').textContent = `核心優勢：${traits?.strength || '待探索'} · 成長功課：${traits?.weakness || '待發現'}`;
```

在它**後面**加入：
```javascript
document.querySelector('.result-star-desc')?.insertAdjacentHTML('afterend',
  `<button class="btn-primary" onclick="showArchetypeCard('${mingStar}')" style="margin-top:8px">⭐ 查看完整人格卡</button>`
);
```

#### Step 6：CSS（在 `style.css` 最後加入）

```css
/* === 14主星 Archetype 視覺卡 === */
#archetype-modal {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}
#archetype-modal.open { opacity: 1; }
.archetype-card {
  position: relative;
  width: 90%;
  max-width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border-accent);
  border-radius: var(--radius);
  overflow: hidden;
  box-shadow: var(--shadow), 0 0 60px rgba(201,168,76,0.15);
  max-height: 90vh;
  overflow-y: auto;
}
.archetype-close {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 1.2rem;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
  z-index: 1;
}
.archetype-header {
  padding: 32px 24px 24px;
  text-align: center;
}
.archetype-name {
  font-family: var(--font-serif);
  font-size: 1.6rem;
  margin-bottom: 4px;
}
.archetype-type {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.archetype-tagline {
  font-size: 0.9rem;
  color: var(--text-muted);
  font-style: italic;
}
.archetype-body { padding: 20px 24px 24px; }
.archetype-section {
  margin-bottom: 14px;
  padding: 10px 12px;
  background: var(--bg-input);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
}
.archetype-section.avoid {
  border-left-color: var(--red);
  background: rgba(139,58,58,0.08);
}
.as-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin-bottom: 4px;
}
.as-value { font-size: 0.88rem; color: var(--text); line-height: 1.5; }
.as-value.growth { color: var(--accent); }
.archetype-quote {
  font-size: 0.88rem;
  color: var(--text-muted);
  font-style: italic;
  text-align: center;
  padding: 14px;
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  margin: 16px 0;
  line-height: 1.7;
}
.archetype-colors { }
.color-chips { display: flex; gap: 8px; margin-top: 8px; }
.color-chip {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 2px solid var(--border);
}
```

**驗證方式**：
1. 命盤模式輸入生日起卦，點「命宮主星：XXX ⭐」
2. 應看到完整 Archetype 視覺卡（符號、優劣勢、人生課題、引言、色彩晶片）
3. 關閉卡片，點「解鎖我的主星」完成後也出現「查看完整人格卡」按鈕
4. 進儀表板，點命宮顯示也應開啟 Archetype 卡

---

## 🔧 技術債務修復

---

### TASK-D1：確保 iztro 替代方案精度足夠（確認現有演算法準確性）

**現有實作**：`js/ziwei.js` 的 `castZiwei()` 為自寫簡化版。與其引入外部庫造成依賴，**確認現有演算法邏輯正確性即可**。

驗證清單：
- [ ] `1990-05-15 08:00` 起卦 → 命宮主星應為「天梁」（已知參照）
- [ ] `castZiwei()` 所有 14 顆星都有被安放到某個宮（不能有星消失）
- [ ] `solarToLunar()` 在閏月日期上正確處理
- [ ] `LUNAR_DATA` 表頭 1900 年對應「庚子年」正確

**測試腳本**（在專案目錄執行）：
```bash
node -e "
import('./js/ziwei.js').then(m => {
  const tests = [
    [1990,5,15,8,'天梁'],
    [1985,3,10,14,'紫微'],
    [2000,1,1,12,'天府'],
  ];
  tests.forEach(([y,mo,d,h,expected]) => {
    const r = m.castZiwei(y,mo,d,h);
    console.log(y+'/'+mo+'/'+d+' '+h+'時 → 命宮:'+r.mingGongDi+' 主星:'+r.mingStar+' 期望:'+expected+' '+(r.mingStar===expected?'✓':'✗'));
  });
}).catch(e=>console.error(e));
"
```

如有不符，標記需要修正 `arrangeStars()` 邏輯。

---

## 📋 實作順序建議

| 順序 | 任務 | 理由 |
|------|------|------|
| 1 | **TASK-A1** | 埋點是所有數據驅動決策的基礎 |
| 2 | **TASK-A2** | 圖卡解鎖分享率，直接影響 Phase 0 通關 |
| 3 | **TASK-B1** | 動畫提升「神準感」，間接影響 WO-006 |
| 4 | **TASK-B2** | 消費場景補足內容庫（簡單） |
| 5 | **TASK-C1** | Vibe Drop 是留存核心，低優先但重要 |
| 6 | **TASK-C2** | Decision Journal 3天提醒（依賴 A1 的埋點）|
| 7 | **TASK-C3** | Archetype 視覺卡（最大工作量，視覺導向） |
| 8 | **TASK-D1** | 演算法驗證（最後做） |

---

## ✅ 完成後確認清單（可剪下貼給用戶）

```
□ TASK-A1：埋點 + 👍/👎 按鈕
□ TASK-A2：IG 圖卡生成
□ TASK-B1：2.5秒起卦動畫
□ TASK-B2：消費場景 4 條金句
□ TASK-C1：Daily Vibe Drop 簽到
□ TASK-C2：Decision Journal 3天提醒
□ TASK-C3：14 主星 Archetype 視覺卡
□ TASK-D1：紫微演算法精度驗證
□ 所有修改 commit 並 push
```

---

*本檔案由 Claude Agent 維護，最後更新：2026-10-03*
