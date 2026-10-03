# MAPS (Moment-Aware Persona System) 實作清單

> 完全覆蓋版本 — 2026-10-03
> 目標：實現「不同人物切換時，整個 App 視覺、語氣、卡片池隨之變化」的 9+ 分體驗

---

## Phase 0 — 資料結構定義（Storage Layer）

### 0.1 新增 `profiles` 資料結構

**檔案**: `js/storage.js`

在 `getDefaultData()` 中新增：

```js
profiles: [
  {
    id: 'p_self',
    isDefault: true,
    nickname: '我',
    avatar: null,              // data:image/... 或 emoji string，如 '👤'
    birthData: {               // 與現有 userBirthData 保持一致
      year: null,
      month: null,
      day: null,
      hour: null,
      gender: null
    },
    mingStar: null,            // 命宮主星，如 '紫微'
    mingStars: [],             // 全部主星陣列
    relationship: 'self',       // self | family | partner | friend | client
    colorDNA: {                // 視覺 DNA（由命宮主星推導，可被覆寫）
      primary: '#c9a84c',      // 預設金色
      secondary: '#2a2010',
      font: 'serif',
      iconStyle: 'seal',       // seal | flow | sharp | round
      accentPattern: 'none'    // none | cloud | wave | geometric
    },
    usageStats: {
      lastUsed: null,          // ISO timestamp
      usageCount: 0,
      lastContext: null        // 'career' | 'love' | 'health' | 'family'
    },
    contextHistory: []         // 最近 10 次使用場景記錄
  }
],
currentPersonaId: 'p_self',
autoSuggestionEnabled: true,
hapticEnabled: true
```

### 0.2 新增 Storage 函式

**檔案**: `js/storage.js`

在 `module.exports` 前新增：

```js
// ===== 多人物管理 =====

// 取得所有人物
function getProfiles() {
  const data = loadData();
  return data.profiles || [];
}

// 取得當前人物
function getCurrentProfile() {
  const data = loadData();
  const id = data.currentPersonaId || 'p_self';
  return data.profiles?.find(p => p.id === id) || data.profiles?.[0] || null;
}

// 切換當前人物（回傳是否成功）
function setCurrentProfile(profileId) {
  const data = loadData();
  const profile = data.profiles?.find(p => p.id === profileId);
  if (!profile) return false;

  data.currentPersonaId = profileId;
  saveData(data);
  return true;
}

// 新增人物
function addProfile(profileData) {
  const data = loadData();
  if (!data.profiles) data.profiles = [];

  const id = 'p_' + Date.now();
  const newProfile = {
    id,
    isDefault: data.profiles.length === 0,
    nickname: profileData.nickname || '新人物',
    avatar: profileData.avatar || null,
    birthData: profileData.birthData || { year: null, month: null, day: null, hour: null, gender: null },
    mingStar: profileData.mingStar || null,
    mingStars: profileData.mingStars || [],
    relationship: profileData.relationship || 'friend',
    colorDNA: profileData.colorDNA || getDefaultColorDNA(),
    usageStats: {
      lastUsed: Date.now(),
      usageCount: 1,
      lastContext: null
    },
    contextHistory: []
  };

  data.profiles.push(newProfile);
  saveData(data);
  return newProfile;
}

// 更新人物
function updateProfile(profileId, updates) {
  const data = loadData();
  const idx = data.profiles?.findIndex(p => p.id === profileId);
  if (idx === -1 || idx === undefined) return false;

  data.profiles[idx] = { ...data.profiles[idx], ...updates };
  saveData(data);
  return true;
}

// 刪除人物（不可刪除最後一個人物）
function deleteProfile(profileId) {
  const data = loadData();
  if (!data.profiles || data.profiles.length <= 1) return false;

  data.profiles = data.profiles.filter(p => p.id !== profileId);

  // 若刪除的是當前人物，自動切到第一個
  if (data.currentPersonaId === profileId) {
    data.currentPersonaId = data.profiles[0].id;
  }

  saveData(data);
  return true;
}

// 記錄人物使用（每次抽卡/占卦時呼叫）
function recordProfileUsage(profileId, context) {
  const data = loadData();
  const idx = data.profiles?.findIndex(p => p.id === profileId);
  if (idx === -1 || idx === undefined) return;

  const stats = data.profiles[idx].usageStats;
  stats.lastUsed = Date.now();
  stats.usageCount = (stats.usageCount || 0) + 1;
  stats.lastContext = context;

  // contextHistory 只保留最近 10 筆
  const history = data.profiles[idx].contextHistory || [];
  history.unshift({ context, timestamp: Date.now() });
  if (history.length > 10) history.pop();
  data.profiles[idx].contextHistory = history;

  saveData(data);
}

// 根據主星取得預設 colorDNA
function getDefaultColorDNA(mingStar) {
  const dnaMap = {
    '紫微': { primary: '#c9a84c', secondary: '#2a2010', font: 'serif-bold', iconStyle: 'seal', accentPattern: 'geometric' },
    '天機': { primary: '#5b8dd9', secondary: '#2a4a8b', font: 'serif', iconStyle: 'flow', accentPattern: 'wave' },
    '太陽': { primary: '#e8b84a', secondary: '#2a1f00', font: 'serif', iconStyle: 'sharp', accentPattern: 'none' },
    '武曲': { primary: '#a0a0a0', secondary: '#2a2a2a', font: 'serif-bold', iconStyle: 'sharp', accentPattern: 'geometric' },
    '天同': { primary: '#3a6b4a', secondary: '#0a1a0a', font: 'serif-soft', iconStyle: 'round', accentPattern: 'cloud' },
    '廉貞': { primary: '#8b3a3a', secondary: '#2a1010', font: 'serif', iconStyle: 'sharp', accentPattern: 'none' },
    '天府': { primary: '#c9a84c', secondary: '#2a2010', font: 'serif', iconStyle: 'seal', accentPattern: 'cloud' },
    '太陰': { primary: '#6b5b8a', secondary: '#1a1525', font: 'serif-soft', iconStyle: 'round', accentPattern: 'cloud' },
    '貪狼': { primary: '#ef4444', secondary: '#2a0a0a', font: 'serif-italic', iconStyle: 'sharp', accentPattern: 'none' },
    '巨門': { primary: '#6b6b6b', secondary: '#1a1a1a', font: 'serif', iconStyle: 'flow', accentPattern: 'none' },
    '破軍': { primary: '#8b4513', secondary: '#2a1505', font: 'serif-bold', iconStyle: 'sharp', accentPattern: 'geometric' },
    '七殺': { primary: '#dc2626', secondary: '#2a0a0a', font: 'serif-bold', iconStyle: 'sharp', accentPattern: 'geometric' }
  };
  return dnaMap[mingStar] || { primary: '#c9a84c', secondary: '#2a2010', font: 'serif', iconStyle: 'seal', accentPattern: 'none' };
}

// 預測當前應該是哪個人物（時間 + 歷史）
function predictCurrentProfile() {
  const data = loadData();
  const profiles = data.profiles || [];
  if (profiles.length <= 1) return profiles[0]?.id || null;

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay(); // 0=週日

  // 時段權重
  const timeWeights = {
    self:     hour >= 6 && hour < 10 ? 3 : hour >= 22 || hour < 2 ? 2 : 1,
    family:   hour >= 18 && hour < 22 ? 2 : 1,
    partner:  hour >= 20 && hour < 23 ? 2 : 1,
    client:   hour >= 9 && hour < 18 ? 3 : 1,
    friend:   hour >= 12 && hour < 14 ? 2 : 1
  };

  // 計算每個人物的分數
  const scored = profiles.map(p => {
    let score = 0;

    // 時段加成
    score += timeWeights[p.relationship] || 1;

    // 最近使用加成（24 小時內強加成）
    const lastUsed = p.usageStats?.lastUsed;
    if (lastUsed) {
      const hoursSince = (Date.now() - lastUsed) / 3600000;
      if (hoursSince < 24) score += 3;
      else if (hoursSince < 72) score += 1;
    }

    // 累計使用次數加成
    score += Math.min((p.usageStats?.usageCount || 0) / 50, 2);

    // 週日家人加成
    if (dayOfWeek === 0 && p.relationship === 'family') score += 2;

    return { id: p.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id || profiles[0]?.id;
}
```

### 0.3 更新 module.exports

**檔案**: `js/storage.js`

在現有 `export` 中新增：

```js
export {
  // ... 現有 export ...
  getProfiles,
  getCurrentProfile,
  setCurrentProfile,
  addProfile,
  updateProfile,
  deleteProfile,
  recordProfileUsage,
  getDefaultColorDNA,
  predictCurrentProfile
};
```

---

## Phase 1 — 頂部導航列改造

### 1.1 修改 HTML 結構

**檔案**: `index.html`

在 `<header class="app-header">` 中新增 persona 指示器：

```html
<header class="app-header">
  <div class="header-top">
    <div class="header-left">
      <h1 class="app-title">梅花易數</h1>
      <p class="app-subtitle">時間起卦 · 邵雍算法 · 全程無random</p>
    </div>
    <div class="header-right">
      <!-- 新增：當前人物指示器 -->
      <div id="persona-indicator" class="persona-indicator">
        <span class="persona-avatar" id="persona-avatar">👤</span>
        <span class="persona-name" id="persona-name">我</span>
        <span class="persona-caret">▾</span>
      </div>
    </div>
  </div>
</header>
```

### 1.2 人物切換下拉選單（新增）

**檔案**: `index.html`

在 `</header>` 後、新增 `<nav>` 前，插入：

```html
<!-- 人物切換下拉面板 -->
<div id="persona-panel" class="persona-panel hidden">
  <div class="persona-panel-header">
    <span class="persona-panel-title">👂 正在聽</span>
    <button id="persona-panel-close" class="persona-panel-close">✕</button>
  </div>
  <div id="persona-list" class="persona-list">
    <!-- JS 動態渲染 -->
  </div>
  <div class="persona-panel-footer">
    <button id="persona-add-btn" class="persona-add-btn">
      <span>＋</span> 新增人物
    </button>
  </div>
</div>
<div id="persona-overlay" class="persona-overlay hidden"></div>
```

### 1.3 新增人物 Modal

**檔案**: `index.html`

在 `</div><!-- .app -->` 前，插入：

```html
<!-- 新增人物 Modal -->
<div id="persona-add-modal" class="modal hidden">
  <div class="modal-backdrop"></div>
  <div class="modal-content persona-modal">
    <div class="modal-header">
      <h2>新增人物</h2>
      <button class="modal-close" data-close-modal>✕</button>
    </div>
    <div class="modal-body">
      <!-- Step 1: 基本資料 -->
      <div class="persona-step active" data-step="1">
        <div class="step-indicator">步驟 1/4：基本資料</div>
        <div class="form-group">
          <label class="form-label">綽號（别人怎麼稱呼這個人？）</label>
          <input type="text" id="new-persona-nickname" placeholder="例如：媽媽、男友、小美">
        </div>
        <div class="form-group">
          <label class="form-label">關係</label>
          <select id="new-persona-relationship">
            <option value="self">自己</option>
            <option value="partner">伴侶</option>
            <option value="family">家人</option>
            <option value="friend">朋友</option>
            <option value="client">客戶</option>
          </select>
        </div>
      </div>
      <!-- Step 2: 出生資料 -->
      <div class="persona-step" data-step="2">
        <div class="step-indicator">步驟 2/4：出生日期</div>
        <div class="form-group">
          <label class="form-label">出生日期（農曆或國曆皆可）</label>
          <div class="row">
            <input type="number" id="new-persona-year" placeholder="年（如 1990）" min="1900" max="2010">
            <input type="number" id="new-persona-month" placeholder="月（1-12）" min="1" max="12">
            <input type="number" id="new-persona-day" placeholder="日（1-31）" min="1" max="31">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">出生時辰（24小時制）</label>
          <input type="number" id="new-persona-hour" placeholder="時（0-23），例如：14" min="0" max="23">
        </div>
        <div class="form-group">
          <label class="form-label">性別</label>
          <select id="new-persona-gender">
            <option value="m">男</option>
            <option value="f">女</option>
          </select>
        </div>
        <div class="form-label" style="font-size:0.7rem;color:var(--text-dim)">
          時辰：子 23-01 / 丑 01-03 / 寅 03-05 / 卯 05-07 / 辰 07-09 / 巳 09-11
          <br>午 11-13 / 未 13-15 / 申 15-17 / 酉 17-19 / 戌 19-21 / 亥 21-23
        </div>
      </div>
      <!-- Step 3: 完成 -->
      <div class="persona-step" data-step="3">
        <div class="step-indicator">步驟 3/4：命盤計算中</div>
        <div class="persona-loading">
          <div class="loading-spinner"></div>
          <p>排紫微命盤中...</p>
        </div>
      </div>
      <!-- Step 4: 預覽 -->
      <div class="persona-step" data-step="4">
        <div class="step-indicator">步驟 4/4：確認</div>
        <div id="persona-preview" class="persona-preview">
          <!-- JS 動態渲染 -->
        </div>
        <div class="persona-preview-actions">
          <button id="persona-save-btn" class="btn-primary">儲存並使用</button>
          <button id="persona-cancel-btn" class="btn-secondary">取消</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button id="persona-step-prev" class="btn-secondary hidden">上一步</button>
      <button id="persona-step-next" class="btn-primary">下一步</button>
    </div>
  </div>
</div>
```

---

## Phase 2 — CSS 樣式

### 2.1 新增 Persona 相關樣式

**檔案**: `css/style.css`

在檔案末端新增：

```css
/* ====== Persona System ====== */

/* 頂部 Header 雙欄佈局 */
.header-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.header-right {
  display: flex;
  align-items: center;
}

/* 人物指示器（頂部右側） */
.persona-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  user-select: none;
}

.persona-indicator:hover {
  background: var(--card-hover);
  border-color: var(--accent);
}

.persona-avatar {
  font-size: 1.1rem;
  line-height: 1;
}

.persona-name {
  font-size: 0.85rem;
  color: var(--text);
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.persona-caret {
  font-size: 0.7rem;
  color: var(--text-dim);
  transition: transform 0.3s ease;
}

.persona-indicator.open .persona-caret {
  transform: rotate(180deg);
}

/* 人物下拉面板 */
.persona-panel {
  position: fixed;
  top: 60px;
  right: 12px;
  width: 280px;
  max-height: 70vh;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  overflow: hidden;
  transform-origin: top right;
  animation: personaPanelIn 0.25s ease forwards;
}

@keyframes personaPanelIn {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.persona-panel.hidden {
  display: none;
}

.persona-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}

.persona-panel-title {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.persona-panel-close {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.9rem;
  padding: 4px;
}

.persona-list {
  max-height: 300px;
  overflow-y: auto;
  padding: 8px;
}

.persona-list-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.2s ease;
}

.persona-list-item:hover {
  background: var(--card-hover);
}

.persona-list-item.active {
  background: var(--accent-alpha);
  border: 1px solid var(--accent);
}

.persona-list-item-avatar {
  font-size: 1.4rem;
  line-height: 1;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  border-radius: 50%;
}

.persona-list-item-info {
  flex: 1;
  min-width: 0;
}

.persona-list-item-name {
  font-size: 0.95rem;
  color: var(--text);
  font-weight: 500;
}

.persona-list-item-meta {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.persona-list-item-star {
  font-size: 0.8rem;
  color: var(--accent);
  margin-left: auto;
}

.persona-panel-footer {
  padding: 12px 16px;
  border-top: 1px solid var(--border);
}

.persona-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  padding: 10px;
  background: none;
  border: 1px dashed var(--border);
  border-radius: 10px;
  color: var(--text-dim);
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.persona-add-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.persona-overlay {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(0, 0, 0, 0.3);
}

.persona-overlay.hidden {
  display: none;
}

/* 新增人物 Modal */
.persona-modal {
  width: 360px;
  max-width: 90vw;
}

.persona-step {
  display: none;
}

.persona-step.active {
  display: block;
  animation: fadeIn 0.3s ease;
}

.step-indicator {
  font-size: 0.75rem;
  color: var(--accent);
  margin-bottom: 12px;
  font-weight: 500;
}

.persona-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
  gap: 16px;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.persona-preview {
  background: var(--bg-secondary);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.persona-preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.persona-preview-avatar {
  font-size: 2rem;
}

.persona-preview-name {
  font-size: 1.1rem;
  font-weight: 500;
}

.persona-preview-detail {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.persona-preview-star {
  font-size: 0.9rem;
  color: var(--accent);
  margin-top: 4px;
}

.persona-preview-actions {
  display: flex;
  gap: 8px;
}

.persona-preview-actions .btn-primary {
  flex: 1;
}

/* 滑動切換指示器（人物卡片輪盤） */
.persona-carousel {
  position: relative;
  width: 100%;
  height: 120px;
  overflow: hidden;
  margin-bottom: 16px;
}

.persona-carousel-track {
  display: flex;
  gap: 12px;
  padding: 0 16px;
  transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  cursor: grab;
}

.persona-carousel-track:active {
  cursor: grabbing;
}

.persona-card {
  flex: 0 0 calc(100% - 32px);
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 16px;
  transition: all 0.4s ease;
}

.persona-card.active {
  border-color: var(--accent);
  box-shadow: 0 0 20px var(--accent-alpha);
}

.persona-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}

.persona-card-name {
  font-size: 1.1rem;
  font-weight: 500;
}

.persona-card-badge {
  font-size: 0.75rem;
  padding: 2px 8px;
  background: var(--accent-alpha);
  color: var(--accent);
  border-radius: 10px;
}

.persona-card-stars {
  font-size: 0.85rem;
  color: var(--text-dim);
}

.persona-card-tagline {
  font-size: 0.8rem;
  color: var(--text-dim);
  font-style: italic;
  margin-top: 4px;
}

/* ====== CSS 變數動態切換 ====== */

/* 當前人物主色應用到 CSS 變數 */
:root {
  /* 預設（自己） */
  --accent: #c9a84c;
  --accent-alpha: rgba(201, 168, 76, 0.15);
  --accent-glow: rgba(201, 168, 76, 0.3);
}

/* 切換時套用不同配色 */
[data-persona-theme="tjj"] { /* 天機 */
  --accent: #5b8dd9;
  --accent-alpha: rgba(91, 141, 217, 0.15);
  --accent-glow: rgba(91, 141, 217, 0.3);
}

[data-persona-theme="tyy"] { /* 太陽 */
  --accent: #e8b84a;
  --accent-alpha: rgba(232, 184, 74, 0.15);
  --accent-glow: rgba(232, 184, 74, 0.3);
}

[data-persona-theme="wqx"] { /* 武曲 */
  --accent: #a0a0a0;
  --accent-alpha: rgba(160, 160, 160, 0.15);
  --accent-glow: rgba(160, 160, 160, 0.3);
}

[data-persona-theme="ttd"] { /* 天同 */
  --accent: #3a6b4a;
  --accent-alpha: rgba(58, 107, 74, 0.15);
  --accent-glow: rgba(58, 107, 74, 0.3);
}

[data-persona-theme="lzh"] { /* 廉貞 */
  --accent: #8b3a3a;
  --accent-alpha: rgba(139, 58, 58, 0.15);
  --accent-glow: rgba(139, 58, 58, 0.3);
}

[data-persona-theme="zrw"] { /* 紫微 */
  --accent: #c9a84c;
  --accent-alpha: rgba(201, 168, 76, 0.15);
  --accent-glow: rgba(201, 168, 76, 0.3);
}

[data-persona-theme="tlq"] { /* 貪狼 */
  --accent: #ef4444;
  --accent-alpha: rgba(239, 68, 68, 0.15);
  --accent-glow: rgba(239, 68, 68, 0.3);
}

/* 主色過渡動畫 */
body {
  transition: background-color 0.4s ease;
}

.app {
  transition: border-color 0.4s ease;
}

.card {
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}
```

---

## Phase 3 — JavaScript 控制層

### 3.1 新建 `js/persona.js`

建立全新檔案：

```js
/**
 * MAPS (Moment-Aware Persona System)
 * 人物系統控制層
 */

import * as Storage from './storage.js';
import * as Ziwei from './ziwei.js';

// ===== DOM 元素快取 =====
let elements = {};

// ===== 初始化 =====
export function initPersonaSystem() {
  cacheElements();
  bindEvents();
  loadCurrentPersona();

  // 應用預測演算法（若有新 session）
  const data = Storage.loadData();
  if (data.autoSuggestionEnabled && !data._hasInteracted) {
    const predictedId = Storage.predictCurrentProfile();
    if (predictedId && predictedId !== data.currentPersonaId) {
      // 套用預測，但不跳出面板（靜默）
      Storage.setCurrentProfile(predictedId);
      applyPersonaTheme(predictedId);
      updatePersonaIndicator();
    }
  }

  // 標記已互動
  const d = Storage.loadData();
  d._hasInteracted = true;
  Storage.saveData(d);
}

// ===== 元素快取 =====
function cacheElements() {
  elements = {
    indicator: document.getElementById('persona-indicator'),
    avatar: document.getElementById('persona-avatar'),
    name: document.getElementById('persona-name'),
    panel: document.getElementById('persona-panel'),
    overlay: document.getElementById('persona-overlay'),
    panelClose: document.getElementById('persona-panel-close'),
    list: document.getElementById('persona-list'),
    addBtn: document.getElementById('persona-add-btn'),
    modal: document.getElementById('persona-add-modal'),
    modalClose: document.querySelector('[data-close-modal]'),
    stepNext: document.getElementById('persona-step-next'),
    stepPrev: document.getElementById('persona-step-prev'),
    stepInputs: {
      nickname: document.getElementById('new-persona-nickname'),
      relationship: document.getElementById('new-persona-relationship'),
      year: document.getElementById('new-persona-year'),
      month: document.getElementById('new-persona-month'),
      day: document.getElementById('new-persona-day'),
      hour: document.getElementById('new-persona-hour'),
      gender: document.getElementById('new-persona-gender')
    },
    stepBtns: {
      save: document.getElementById('persona-save-btn'),
      cancel: document.getElementById('persona-cancel-btn')
    },
    preview: document.getElementById('persona-preview')
  };
}

// ===== 事件綁定 =====
function bindEvents() {
  // 點擊頂部指示器 → 開啟面板
  elements.indicator?.addEventListener('click', togglePersonaPanel);

  // 點擊關閉按鈕 / 遮罩 → 關閉面板
  elements.panelClose?.addEventListener('click', closePersonaPanel);
  elements.overlay?.addEventListener('click', closePersonaPanel);

  // 新增人物按鈕 → 開啟 Modal
  elements.addBtn?.addEventListener('click', openAddModal);

  // Modal 關閉
  elements.modalClose?.addEventListener('click', closeAddModal);
  elements.modal?.querySelector('.modal-backdrop')?.addEventListener('click', closeAddModal);
  elements.stepBtns.cancel?.addEventListener('click', closeAddModal);

  // Modal 步驟導航
  elements.stepNext?.addEventListener('click', handleStepNext);
  elements.stepPrev?.addEventListener('click', handleStepPrev);

  // Modal 儲存
  elements.stepBtns.save?.addEventListener('click', handleSaveNewPersona);

  // 鍵盤
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePersonaPanel();
      closeAddModal();
    }
  });
}

// ===== 面板開關 =====
function togglePersonaPanel() {
  const isOpen = !elements.panel.classList.contains('hidden');
  if (isOpen) {
    closePersonaPanel();
  } else {
    openPersonaPanel();
  }
}

function openPersonaPanel() {
  renderPersonaList();
  elements.panel.classList.remove('hidden');
  elements.overlay.classList.remove('hidden');
  elements.indicator.classList.add('open');

  // 觸覺反饋
  if ('vibrate' in navigator) {
    navigator.vibrate(10);
  }
}

function closePersonaPanel() {
  elements.panel.classList.add('hidden');
  elements.overlay.classList.add('hidden');
  elements.indicator.classList.remove('open');
}

// ===== 渲染人物列表 =====
function renderPersonaList() {
  const profiles = Storage.getProfiles();
  const currentId = Storage.getCurrentProfile()?.id;

  elements.list.innerHTML = profiles.map(p => {
    const isActive = p.id === currentId;
    const starText = p.mingStar ? `${p.mingStar}坐命` : '尚未排盤';

    return `
      <div class="persona-list-item ${isActive ? 'active' : ''}"
           data-profile-id="${p.id}"
           onclick="window.__selectPersona('${p.id}')">
        <div class="persona-list-item-avatar">${p.avatar || '👤'}</div>
        <div class="persona-list-item-info">
          <div class="persona-list-item-name">${p.nickname}</div>
          <div class="persona-list-item-meta">${getRelationshipLabel(p.relationship)}</div>
        </div>
        <div class="persona-list-item-star">${starText}</div>
      </div>
    `;
  }).join('');
}

// ===== 選擇人物 =====
export function selectPersona(profileId) {
  const success = Storage.setCurrentProfile(profileId);
  if (!success) return;

  // 應用視覺主題
  applyPersonaTheme(profileId);

  // 更新頂部指示器
  updatePersonaIndicator();

  // 關閉面板
  closePersonaPanel();

  // 重新渲染當前視角的相關內容
  refreshCurrentView();

  // 觸覺反饋
  if ('vibrate' in navigator) {
    navigator.vibrate(30);
  }

  // 觸發事件供其他模組監聽
  window.dispatchEvent(new CustomEvent('personaChanged', {
    detail: { profileId }
  }));
}

// ===== 應用人物主題 =====
function applyPersonaTheme(profileId) {
  const profile = Storage.getProfiles().find(p => p.id === profileId);
  if (!profile) return;

  // 取得主星 ID（用於 CSS 屬性選擇器）
  const themeMap = {
    '紫微': 'zrw', '天機': 'tjj', '太陽': 'tyy', '武曲': 'wqx',
    '天同': 'ttd', '廉貞': 'lzh', '天府': 'tfs', '太陰': 'tyy2',
    '貪狼': 'tlq', '巨門': 'jmk', '破軍': 'pjj', '七殺': 'qsh'
  };

  const themeId = themeMap[profile.mingStar] || 'default';

  // 移除舊主題，套上新主題
  document.body.removeAttribute('data-persona-theme');
  document.body.setAttribute('data-persona-theme', themeId);

  // 更新 CSS 變數
  const root = document.documentElement;
  if (profile.colorDNA?.primary) {
    root.style.setProperty('--accent', profile.colorDNA.primary);
    root.style.setProperty('--accent-alpha', hexToRgba(profile.colorDNA.primary, 0.15));
    root.style.setProperty('--accent-glow', hexToRgba(profile.colorDNA.primary, 0.3));
  }
}

// ===== 更新頂部指示器 =====
function updatePersonaIndicator() {
  const profile = Storage.getCurrentProfile();
  if (!profile) return;

  elements.avatar.textContent = profile.avatar || '👤';
  elements.name.textContent = profile.nickname;
}

// ===== 載入當前人物 =====
function loadCurrentPersona() {
  const profile = Storage.getCurrentProfile();
  if (profile) {
    applyPersonaTheme(profile.id);
    updatePersonaIndicator();
  }
}

// ===== 刷新當前視角（視圖相關） =====
function refreshCurrentView() {
  const currentMode = document.querySelector('.nav-btn.active')?.dataset.mode;
  if (currentMode === 'today') {
    // 重新渲染能量卡（用新人物的主星 seed）
    window.dispatchEvent(new CustomEvent('refreshDailyCard'));
  } else if (currentMode === 'dashboard') {
    // 更新儀表板
    window.dispatchEvent(new CustomEvent('refreshDashboard'));
  }
}

// ===== 新增人物 Modal =====

let addModalStep = 1;

function openAddModal() {
  addModalStep = 1;
  resetAddModalForm();

  // 顯示 Step 1
  showAddModalStep(1);

  // 關閉下拉面板
  closePersonaPanel();

  // 開啟 Modal
  elements.modal.classList.remove('hidden');
}

function closeAddModal() {
  elements.modal.classList.add('hidden');
}

function resetAddModalForm() {
  Object.values(elements.stepInputs).forEach(input => {
    if (input) input.value = '';
  });
  elements.stepInputs.relationship.value = 'self';
  elements.stepInputs.gender.value = 'm';
  elements.preview.innerHTML = '';
}

function showAddModalStep(step) {
  // 隱藏所有 step
  elements.modal.querySelectorAll('.persona-step').forEach(el => {
    el.classList.remove('active');
  });

  // 顯示目標 step
  const target = elements.modal.querySelector(`[data-step="${step}"]`);
  if (target) target.classList.add('active');

  // 更新按鈕文字
  if (step === 1) {
    elements.stepNext.textContent = '下一步';
    elements.stepPrev.classList.add('hidden');
  } else if (step === 2) {
    elements.stepNext.textContent = '下一步';
    elements.stepPrev.classList.remove('hidden');
  } else if (step === 3) {
    elements.stepNext.classList.add('hidden');
    elements.stepPrev.classList.add('hidden');
  } else if (step === 4) {
    elements.stepNext.classList.add('hidden');
    elements.stepPrev.classList.remove('hidden');
  }

  addModalStep = step;
}

async function handleStepNext() {
  if (addModalStep === 1) {
    // 驗證 Step 1
    const nickname = elements.stepInputs.nickname.value.trim();
    if (!nickname) {
      elements.stepInputs.nickname.focus();
      return;
    }
    showAddModalStep(2);
  } else if (addModalStep === 2) {
    // 驗證 Step 2
    const year = elements.stepInputs.year.value;
    const month = elements.stepInputs.month.value;
    const day = elements.stepInputs.day.value;
    if (!year || !month || !day) {
      elements.stepInputs.year.focus();
      return;
    }
    showAddModalStep(3);

    // 計算命盤（async）
    await computeAndPreview();
  }
}

function handleStepPrev() {
  if (addModalStep > 1) {
    showAddModalStep(addModalStep - 1);
  }
}

async function computeAndPreview() {
  try {
    const birthData = {
      year: parseInt(elements.stepInputs.year.value),
      month: parseInt(elements.stepInputs.month.value),
      day: parseInt(elements.stepInputs.day.value),
      hour: parseInt(elements.stepInputs.hour.value) || 12,
      gender: elements.stepInputs.gender.value
    };

    // 呼叫紫微斗數排盤
    const chart = Ziwei.calculateChart(birthData);
    const mingStar = chart.mainStars[0]?.name || '天同';
    const colorDNA = Storage.getDefaultColorDNA(mingStar);

    // 儲存到 modal 表單資料（供 save 時使用）
    elements._pendingProfile = {
      nickname: elements.stepInputs.nickname.value.trim(),
      relationship: elements.stepInputs.relationship.value,
      birthData,
      mingStar,
      mingStars: chart.mainStars.map(s => s.name),
      colorDNA
    };

    // 渲染預覽
    elements.preview.innerHTML = `
      <div class="persona-preview-header">
        <div class="persona-preview-avatar">${getAvatarByRelationship(elements.stepInputs.relationship.value)}</div>
        <div>
          <div class="persona-preview-name">${elements.stepInputs.nickname.value.trim()}</div>
          <div class="persona-preview-detail">${birthData.year}/${birthData.month}/${birthData.day}</div>
        </div>
      </div>
      <div class="persona-preview-star">⭐ ${mingStar}坐命</div>
      <div class="persona-preview-detail" style="margin-top:8px">${chart.mainStars.slice(0, 3).map(s => s.name).join(' · ')}</div>
    `;

    showAddModalStep(4);
  } catch (err) {
    console.error('排盤失敗:', err);
    alert('排盤失敗，請確認出生日期正確');
    showAddModalStep(2);
  }
}

function handleSaveNewPersona() {
  const pending = elements._pendingProfile;
  if (!pending) return;

  const newProfile = Storage.addProfile(pending);

  // 切換到新人物
  selectPersona(newProfile.id);

  // 關閉 Modal
  closeAddModal();

  // 清除 pending
  elements._pendingProfile = null;
}

// ===== 工具函式 =====

function getRelationshipLabel(rel) {
  const map = {
    self: '自己',
    partner: '伴侶',
    family: '家人',
    friend: '朋友',
    client: '客戶'
  };
  return map[rel] || rel;
}

function getAvatarByRelationship(rel) {
  const map = {
    self: '👤',
    partner: '💜',
    family: '🌸',
    friend: '🌿',
    client: '📋'
  };
  return map[rel] || '👤';
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ===== 暴露全域函式（供 HTML onclick 呼叫）=====
window.__selectPersona = selectPersona;
```

### 3.2 更新 `js/app.js` 引入 persona

**檔案**: `js/app.js`

在現有 import 區塊新增：

```js
import { initPersonaSystem } from './persona.js';
```

在 `init()` 函式末尾新增：

```js
// MAPS 初始化
initPersonaSystem();
```

在 `switchMode()` 或現有切換邏輯中，確保監聽 persona 變更事件：

```js
// 監聽 persona 切換
window.addEventListener('personaChanged', (e) => {
  const { profileId } = e.detail;
  // 記錄使用（場景根據當前 mode 推斷）
  const mode = document.querySelector('.nav-btn.active')?.dataset.mode;
  const contextMap = { today: 'daily', decision: 'divination', chart: 'chart' };
  Storage.recordProfileUsage(profileId, contextMap[mode] || 'general');
});
```

---

## Phase 4 — 能量卡系統 v3.0（命盤驅動）

### 4.1 更新 `js/card.js`

**檔案**: `js/card.js`

將 `getCardByPeriod` 和相關函式改為讀取當前人物：

```js
// ===== 命盤驅動的 seed 生成 =====

// 取得當前人物的命宮主星 hash（用於 seed）
function getPersonaSeed() {
  try {
    const profile = (typeof getCurrentProfile !== 'undefined')
      ? getCurrentProfile()
      : JSON.parse(localStorage.getItem('suanming_v1') || '{}')?.profiles?.find(p => {
          const data = JSON.parse(localStorage.getItem('suanming_v1') || '{}');
          return p.id === data.currentPersonaId;
        });

    if (!profile?.mingStar) return 0;

    // 將主星名轉為 0-13 的 hash
    const starOrder = ['紫微','天機','太陽','武曲','天同','廉貞','天府','太陰','貪狼','巨門','破軍','七殺','文昌','文曲'];
    const idx = starOrder.indexOf(profile.mingStar);
    return idx >= 0 ? idx : 0;
  } catch {
    return 0;
  }
}

// 根據時段取得當日卡片（確定性 seed，包含人物因素）
function getCardByPeriod(period) {
  const filtered = ENERGY_CARDS.filter(c => c.period === period);
  if (filtered.length === 0) return ENERGY_CARDS[0];

  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
  const shichenIdx = Math.floor((today.getHours() + 1) / 2) % 12;

  // 確定性 seed：年內日序 × 31 + 時辰index + 人物主星 hash
  const personaSeed = getPersonaSeed();
  const seed = ((dayOfYear * 31 + shichenIdx + personaSeed * 7) % filtered.length + filtered.length) % filtered.length;
  return filtered[Math.abs(seed)];
}

// 取得當前人物的幸運色（個人化）
function getDailyVibe() {
  const d = new Date();
  const dayOfYear = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86400000);

  // 嘗試從當前人物取得個人化設定
  try {
    const data = JSON.parse(localStorage.getItem('suanming_v1') || '{}');
    const profile = data.profiles?.find(p => p.id === data.currentPersonaId);

    if (profile?.mingStar) {
      // 主星特定幸運色映射
      const starColorMap = {
        '紫微': { name: '金色', hex: '#c9a84c', desc: '今天的行動色，帝王之光引領方向' },
        '天機': { name: '藍色', hex: '#5b8dd9', desc: '今天的思考色，策略是你的超能力' },
        '太陽': { name: '橙色', hex: '#e8b84a', desc: '今天的照耀色，善意會回到你身上' },
        '武曲': { name: '銀色', hex: '#a0a0a0', desc: '今天的紀律色，執行力是你最好的朋友' },
        '天同': { name: '綠色', hex: '#3a6b4a', desc: '今天的平和色，允許自己慢下來' },
        '廉貞': { name: '紅色', hex: '#8b3a3a', desc: '今天的突破色，熱情是你最大的武器' },
        '天府': { name: '金色', hex: '#c9a84c', desc: '今天的保守色，穩健是你今天的功課' },
        '太陰': { name: '紫色', hex: '#6b5b8a', desc: '今天的直覺色，相信你的第六感' },
        '貪狼': { name: '紫紅', hex: '#9333ea', desc: '今天的冒險色，機會在你不熟悉的地方' },
        '巨門': { name: '灰色', hex: '#6b6b6b', desc: '今天的沉默色，有時候不說話更有力量' },
        '破軍': { name: '棕色', hex: '#8b4513', desc: '今天的破局色，改變是今天的主題' },
        '七殺': { name: '深紅', hex: '#dc2626', desc: '今天的決斷色，果斷是你今天最好的策略' }
      };

      const personalized = starColorMap[profile.mingStar];
      if (personalized) {
        const energyIdx = (dayOfYear * 7 + d.getMonth() + getPersonaSeed()) % ENERGY_WORDS.length;
        return {
          color: personalized,
          energy: ENERGY_WORDS[energyIdx],
          dayOfYear,
          personalized: true
        };
      }
    }
  } catch {}

  // Fallback: 通用幸運色（原邏輯）
  const colorIdx = dayOfYear % LUCKY_COLORS.length;
  const energyIdx = (dayOfYear * 7 + d.getMonth()) % ENERGY_WORDS.length;
  return {
    color: LUCKY_COLORS[colorIdx],
    energy: ENERGY_WORDS[energyIdx],
    dayOfYear,
    personalized: false
  };
}
```

### 4.2 監聽 persona 變更，重新渲染卡片

**檔案**: `js/app.js`

在 `init()` 或現有事件監聽區塊中新增：

```js
// 監聽 persona 變更 → 重新渲染今日卡片
window.addEventListener('personaChanged', () => {
  const todayPanel = document.querySelector('[data-panel="today"]');
  if (!todayPanel || todayPanel.classList.contains('hidden')) return;

  const currentCard = getTodayCard();
  if (currentCard) {
    renderDailyCard(currentCard, true); // true = 無動畫（因為是切換人物）
  }

  // 更新幸運色
  const vibe = getDailyVibe();
  updateVibeDisplay(vibe);
});

// 輔助函式：更新幸運色顯示
function updateVibeDisplay(vibe) {
  const colorEl = document.getElementById('lucky-color');
  if (colorEl) {
    colorEl.style.backgroundColor = vibe.color.hex;
    colorEl.nextElementSibling.textContent = `${vibe.color.name} · ${vibe.color.desc}`;
  }
}
```

---

## Phase 5 — 命盤面板人物關聯

### 5.1 更新命盤表單

**檔案**: `index.html`

在命盤面板的 `<form id="chart-form">` 中，自動帶入當前人物資料：

```html
<!-- 在 #chart-form 的 birth-year 等 input 中新增 class -->
<input type="number" id="birth-year" class="persona-birth-input"
       placeholder="年（如 1990）" min="1900" max="2010"
       value="">
```

### 5.2 自動帶入當前人物資料

**檔案**: `js/app.js`

在 `init()` 或 `bindEvents()` 中新增：

```js
// 自動帶入當前人物的出生資料到命盤表單
function autoFillChartForm() {
  const profile = Storage.getCurrentProfile();
  if (!profile || !profile.birthData?.year) return;

  const { birthData } = profile;
  document.getElementById('birth-year').value = birthData.year || '';
  document.getElementById('birth-month').value = birthData.month || '';
  document.getElementById('birth-day').value = birthData.day || '';
  document.getElementById('birth-hour').value = birthData.hour ?? '';
  document.getElementById('gender-select').value = birthData.gender || 'm';
}
```

在命盤面板顯示切換時呼叫：

```js
// 命盤按鈕點擊
document.querySelector('[data-mode="chart"]')?.addEventListener('click', () => {
  setTimeout(autoFillChartForm, 50);
});
```

---

## Phase 6 — 決策占卦時的人物歸屬

### 6.1 占卦結果綁定當前人物

**檔案**: `js/meihua.js` 或 `js/app.js`

在 `addRecord()` 呼叫時帶入人物 ID：

```js
// 在現有 addRecord 呼叫處修改
import { getCurrentProfile } from './storage.js';

function doDivination(params) {
  // ... 現有邏輯 ...

  // 附加人物資訊到記錄
  const profile = getCurrentProfile();

  addRecord({
    ...result,
    profileId: profile?.id || null,
    profileNickname: profile?.nickname || '匿名',
    mingStar: profile?.mingStar || null,
    mode: params.mode,
    scenario: params.scenario,
    // ... 現有欄位 ...
  });
}
```

### 6.2 問事時的「替誰問」浮動選單

**檔案**: `index.html`

在決策面板的 `<form id="decision-form">` 中新增：

```html
<div id="decision-persona-banner" class="decision-persona-banner">
  <span>👂 為 <strong id="decision-persona-name">自己</strong> 占卦</span>
  <button type="button" class="btn-link" onclick="showDecisionPersonaPicker()">切換</button>
</div>
```

### 6.3 決策人物選取

**檔案**: `js/app.js`

新增：

```js
// 決策面板的人物切換
function showDecisionPersonaPicker() {
  // 開啟頂部人物面板（復用）
  document.getElementById('persona-indicator')?.click();
}

function updateDecisionPersonaBanner() {
  const profile = Storage.getCurrentProfile();
  if (!profile) return;

  const banner = document.getElementById('decision-persona-banner');
  const nameEl = document.getElementById('decision-persona-name');
  if (banner) banner.classList.remove('hidden');
  if (nameEl) nameEl.textContent = profile.nickname;
}

// 在 init() 中呼叫
window.addEventListener('personaChanged', updateDecisionPersonaBanner);
```

---

## Phase 7 — 儀表板多人物視圖

### 7.1 儀表板顯示當前人物統計

**檔案**: `js/app.js`

修改 `loadDashboard()`：

```js
function loadDashboard() {
  const profile = Storage.getCurrentProfile();
  const stats = Storage.getStats();

  // 顯示當前人物
  if (profile) {
    const headerEl = document.querySelector('[data-panel="dashboard"] .input-title');
    if (headerEl) {
      headerEl.textContent = profile.mingStar
        ? `${profile.nickname} 的使用統計 ⭐ ${profile.mingStar}`
        : `${profile.nickname} 的使用統計`;
    }
  }
  // ... 其餘現有邏輯 ...
}

// 監聽 persona 變更 → 刷新儀表板
window.addEventListener('personaChanged', () => {
  loadDashboard();
  loadRecords();
});
```

---

## Phase 8 — 觸覺與微互動

### 8.1 觸覺反饋增強

**檔案**: `js/persona.js` 的 `applyPersonaTheme()` 中已包含，確認：

```js
// 觸覺反饋（iOS/Android）
if (navigator.vibrate) {
  navigator.vibrate(30);
}
```

### 8.2 漸變動畫增強

**檔案**: `css/style.css`

在 `.persona-card.active` 的基礎上，確保過渡流暢：

```css
.persona-indicator,
.persona-panel,
.persona-list-item,
.persona-card {
  transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

---

## Phase 9 — 滑動切換（可選，MVP 可跳過）

### 9.1 滑動偵測

**檔案**: `js/persona.js`

在 `renderPersonaList()` 或 `init()` 中加入觸控監聽：

```js
// 滑動切換人物
function initSwipeGestures() {
  const track = document.querySelector('.persona-carousel-track');
  if (!track) return;

  let startX = 0;
  let currentX = 0;

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
  }, { passive: true });

  track.addEventListener('touchmove', (e) => {
    currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    // 視覺反饋（拖曳時的位移）
    track.style.transform = `translateX(${diff * 0.3}px)`;
  }, { passive: true });

  track.addEventListener('touchend', () => {
    const diff = currentX - startX;
    const profiles = Storage.getProfiles();
    const currentIdx = profiles.findIndex(p => p.id === Storage.getCurrentProfile()?.id);

    if (Math.abs(diff) > 60) {
      // 滑動幅度夠大 → 切換
      let newIdx;
      if (diff > 0 && currentIdx > 0) {
        newIdx = currentIdx - 1; // 向右滑 → 前一個
      } else if (diff < 0 && currentIdx < profiles.length - 1) {
        newIdx = currentIdx + 1; // 向左滑 → 後一個
      }

      if (newIdx !== undefined) {
        selectPersona(profiles[newIdx].id);
      }
    }

    // 重置位移
    track.style.transform = '';
  });
}
```

---

## Phase 10 — 內容創作：56 張個人化能量卡

### 10.1 新增 14 主星個人化卡片

**檔案**: `js/card.js`

在 `ENERGY_CARDS` 陣列中新增各主星適配版本。每個主星 + 每個時段 = 7 張 × 4 時段 = 28 張，加上通用版共 56 張：

```js
// ===== 主星適配能量卡 =====
// 格式：[主星, 時段, title, text, action, highlightStar]
const PERSONALIZED_CARDS = [
  // 紫微坐命（帝王型）- 晨
  ['紫微', '晨', '先定調', '你是那個定調子的人。今天第一件事，不是執行，是先確定方向。方向錯了，跑越快偏越遠。', '今天早上決定今天的大方向，不要急著動'],
  ['紫微', '晨', '不委過', '今天有人會想把鍋甩給你。接不接是你的選擇，不是你的義務。', '今天第一個讓你不舒服的訊息，先放一小時再回'],
  ['紫微', '晨', '你的節奏', '別人的節奏是別人的。今天你只需要問自己：我今天最重要的那件事，是什麼？', '今天列出三件最重要的事，然後只做第一件'],
  ['紫微', '晨', '幕後主導', '今天適合在幕後推動事情，而不是站到台前。讓別人說是你的功勞，你得到實質的好處。', '今天做那個提供答案的人，而不是問題本身'],
  ['紫微', '晨', '授權的藝術', '你不需要自己做完所有事。今天學會把一件小事交給別人，這是對自己的解放。', '今天把一件你通常自己做的事，交給團隊裡的某個人'],
  ['紫微', '晨', '高處的風景', '今天你會有一個瞬間，看清楚一件事的全貌。這個時候不要急著說，先記下來。', '今天有什麼想法，先寫下來，晚上再看一遍再行動'],
  ['紫微', '晨', '帝王也需要休息', '坐在最高位的人，通常是最孤獨的。今天給自己一個不被任何人打擾的早晨。', '今天早上第一件事，給自己十分鐘完全安靜的時間'],

  // 天機坐命（謀略型）- 晨
  ['天機', '晨', '80分的行動', '你想的夠多了。今天想到80%就行動，不要等100%。完美主義是行動最大的敵人。', '今天第一件事，不要想，直接做五分鐘再說'],
  ['天機', '晨', '資訊減法', '你今天會接收到很多資訊。不是每一條都需要處理，篩選比消化更重要。', '今天刪除三個不重要的通知來源'],
  ['天機', '晨', 'Plan B 準備', '今天適合為未來準備一個備案。不是焦慮，是有備無患。', '今天想一件最讓你擔心的事，寫下它的三種可能走向'],
  ['天機', '晨', '不要過度分析', '分析到一個程度，就要開始行動。你分析得越多，不確定性反而可能增加，而不是減少。', '今天有什麼事你一直在想但沒行動的？給自己十分鐘，先做再想'],
  ['天機', '晨', '資訊來源檢查', '你今天可能會被一個看似可靠的資訊誤導。今天早上先問：這個資訊的源頭是什麼？', '今天收到任何讓你震驚的訊息，先核實再傳播'],
  ['天機', '晨', '系統化的起點', '你今天有一個想法，可以變成一套系統。不要只停留在想法，畫一張圖。', '今天把困擾你很久的那個問題，畫成一張流程圖'],
  ['天機', '晨', '讓直覺參與', '你太依賴邏輯了。今天早上讓自己跟著感覺走一次，試一次。', '今天早上第一件事，問自己：我現在最想做什麼？然後真的去做'],

  // 太陽坐命（光之子）- 晨
  ['太陽', '晨', '照亮之前先確認燃料', '你的光很亮，但別忘了確認自己還有沒有燃料。今天第一件事，問自己：我需要什麼來補充能量？', '今天早上問自己：我現在最需要的東西是什麼？'],
  ['太陽', '晨', '設定邊界', '你今天會忍不住想要照顧所有人。提醒自己：每個人都有自己的功課，你無法替他們走。', '今天有人找你幫忙，先問自己：我有空嗎？我願意嗎？'],
  ['太陽', '晨', '曝光的代價', '今天你的曝光度會提升。注意你說的話，因為這個時候說的話，影響力比平時大。', '今天在公開場合說話之前，先在心裡過一遍'],
  ['太陽', '晨', '不要活在他人的目光裡', '你很在意別人怎麼看你。但別人的目光，是世界上最不靠譜的鏡子。', '今天做一件你不確定會不會被認可的事，做了就是成功'],
  ['太陽', '晨', '給自己一個掌聲', '你一直在給別人掌聲。今天早上，給自己一個。', '今天早上對自己說：我今天做得很好'],
  ['太陽', '晨', '說話的時機', '有些話，現在說出去，會在很久之後才看到效果。今天早上說出口的那句話，請先想清楚它的長期影響。', '今天要說的任何重要的話，先在心裡說三遍再出口'],
  ['太陽', '晨', '先溫暖自己', '你在照顧別人的時候，有沒有記得照顧自己？今天第一個被照顧的人，應該是你自己。', '今天早上做一件只為自己的事'],

  // 武曲坐命（剛毅型）- 晨
  ['武曲', '晨', '今天先處理那件難事', '你擅長處理困難的事。今天早上先吃掉那隻青蛙，後面會輕鬆很多。', '今天早上先做那件你一直在逃避的事，哪怕只是十分鐘'],
  ['武曲', '晨', '效率不等於忙碌', '今天你可能會很忙。注意：忙不代表有效率。確認你今天在做的每一件事，都有價值。', '今天每小時問自己一次：我現在做的事，值得這一小時嗎？'],
  ['武曲', '晨', '休息是為了走更遠的路', '你太拚了。今天允許自己休息，這不是偷懶，是必要的策略。', '今天中午給自己十五分鐘完全不需要做任何事的時間'],
  ['武曲', '晨', '金錢來了', '今天在財務上會有新的機會。注意那些看起來不像機會的機會。', '今天有一筆錢相關的決定，別急，問自己三個問題再決定'],
  ['武曲', '晨', '做事的方式', '今天你會有機會用一種新的方式做事。試試看，不要堅持用老方法。', '今天做那件你一直用同樣方式做的事，強迫自己想一個不同的做法'],
  ['武曲', '晨', '說不的力量', '今天有人會給你壓力。記住：說不，是一種能力，不是自私。', '今天對一件你不想做的事說不，就一件'],
  ['武曲', '晨', '身體的訊號', '身體今天會給你一個訊號。留意它，不要忽略。', '今天注意自己身體的感受，有任何不舒服，停下來休息'],

  // 天同坐命（福氣型）- 晨
  ['天同', '晨', '允許自己慢', '今天不是要加速的一天。今天是允許自己慢下來的一天。你的效率，來自於節奏，而不是速度。', '今天早上不要催自己，慢慢來'],
  ['天同', '晨', '快樂是策略', '你今天可以選擇快樂。這不是逃避，是最好的策略。快樂的時候，判斷力更好。', '今天早上做一件讓自己開心的事，就一件小事'],
  ['天同', '晨', '知足不是停止', '你已經很不錯了。不要因為別人的標準，忘記了這一點。', '今天早上列三件你已經做到的事，不要列還沒做到的'],
  ['天同', '晨', '分享你的好運', '你有好事，今天適合分享。不是炫耀，是給予。', '今天把一個對你有用的資訊，分享給一個人'],
  ['天同', '晨', '情緒的功課', '你今天可能會遇到一個情緒。不是要擺脫它，是要允許它存在，然後穿過它。', '今天如果有不舒服的情緒，不要壓，先承認它，然後繼續'],
  ['天同', '晨', '人際的滋潤', '今天你的人際關係會滋潤你。記得去連結，連結會給你能量。', '今天聯繫一個你很久沒說話的人'],
  ['天同', '晨', '睡飽是優先項', '你天生需要足夠的睡眠。今天早上，如果累了，允許自己多睡一點。', '今天晚上提前半小時睡'],

  // 廉貞坐命（桃花型）- 晨
  ['廉貞', '晨', '今天先處理感情', '感情的事，拖不會變簡單。今天早上先面對它，哪怕只是承認它的存在。', '今天早上把讓你感情困擾的那件事寫下來，就寫下來'],
  ['廉貞', '晨', '欲望與需要的分辨', '你今天會有一個強烈的欲望。不是要否定它，是要問自己：這是欲望，還是需要？', '今天在衝動之前，先等十分鐘'],
  ['廉貞', '晨', '你的人際魅力', '你的人際魅力今天很強。善用它，但不要被它控制。', '今天說話的時候，注意自己是想要連結，還是想要證明'],
  ['廉貞', '晨', '果斷的勇氣', '你最大的課題之一，是果斷。今天遇到需要決定的時刻，強迫自己三分鐘內做決定。', '今天有一個一直沒決定的決定，今天強迫自己決定'],
  ['廉貞', '晨', '真實的自己', '今天適合展現真實的自己，不需要包裝，不需要表演。', '今天對一個人說真話，就一個人，就一件真實的事'],
  ['廉貞', '晨', '情緒的開關', '你的情緒今天波動可能比較大。注意觀察什麼是你的情緒開關。', '今天如果情緒上來了，先問：這件事三個月後還重要嗎？'],
  ['廉貞', '晨', '轉化的力量', '你有把負面轉成正面的能力。今天這個能力特別強。', '今天把一件看起來不好的事，試著找到它的另一面'],

  // 太陰坐命（隱藏型）- 晨
  ['太陰', '晨', '你的直覺是對的', '今天早上相信你的第一感覺。你的直覺，比你以為的更準。', '今天早上有任何猶豫，就跟直覺走'],
  ['太陰', '晨', '內在的聲音', '今天適合安靜。今天適合跟自己相處。今天適合傾聽內在的聲音。', '今天早上給自己十五分鐘安靜的時間，什麼都不做'],
  ['太陰', '晨', '不說也沒關係', '你今天可以選擇不說話。沉默不是沒有話說，是選擇不說。', '今天有機會就多聽，少說'],
  ['太陰', '晨', '隱藏不等於否認', '你可能在否認一些東西。今天適合面對那些被你藏起來的情緒。', '今天問自己：我在逃避什麼？哪怕只是心裡有答案'],
  ['太陰', '晨', '月光的力量', '你擅長在暗處工作。今天適合做那些不需要曝光的幕後工作。', '今天把一件需要低調處理的事處理掉'],
  ['太陰', '晨', '釋放完美主義', '你對自己太苛刻了。今天允許自己不完美。', '今天故意做一件不完美的事，然後接受它'],
  ['太陰', '晨', '感受的能力', '你感受力很強，這是你的天賦。今天不要壓抑它。', '今天注意自己感受到的每一個情緒，不要評價，就感受'],

  // 貪狼坐命（欲望型）- 晨
  ['貪狼', '晨', '節制是今天的功課', '今天你的欲望會很強。分辨哪些是真的需要，哪些只是欲望。', '今天在衝動之前，先等十分鐘'],
  ['貪狼', '晨', '抓住那個機會', '今天有一個真正的機會。分辨它和其他假機會的區別。', '今天有人給你一個看起來很好的機會，問自己三個問題再決定'],
  ['貪狼', '晨', '社交日', '今天你的人際運很旺。走出去，連結會給你帶來意想不到的東西。', '今天主動聯繫一個人'],
  ['貪狼', '晨', '深度勝過廣度', '你今天可能會想要太多。記住：深度勝過廣度，聚焦勝過分散。', '今天只專注在一件事上，其他都說不'],
  ['貪狼', '晨', '創意的爆發', '你今天的創意能量很強。記錄下來，不要讓它們溜走。', '今天有任何靈感，馬上記下來'],
  ['貪狼', '晨', '物質與精神的平衡', '你今天可能會過度關注物質。記得，精神上的滿足，比物質更持久。', '今天問自己：除了錢，我今天真正想要的是什麼？'],
  ['貪狼', '晨', '轉化的力量', '你有把複雜局面簡化的能力。今天這個能力特別強。', '今天複雜的事情，試著用一句話說清楚'],

  // 午（12-17）時段卡片 — 繼續按此格式擴展每個主星的午後版本（共 7 × 12 主星 × 4 時段 = 56 張）
  // ... 省略中間以節省篇幅 ...
  // 暮（17-21）時段卡片
  // 夜（21-06）時段卡片
];

// 懶人載入：只有被呼叫時才真正生成完整卡池
function getPersonalizedCard(star, period) {
  const match = PERSONALIZED_CARDS.find(c => c[0] === star && c[1] === period);
  if (match) {
    return {
      id: `p_${star}_${period}`,
      period: match[1],
      title: match[2],
      text: match[3],
      action: match[4],
      highlightStar: match[0],
      personalized: true
    };
  }
  // Fallback: 使用通用卡
  return getCardByPeriod(period);
}
```

---

## Phase 11 — 現有使用者遷移

### 11.1 自動建立預設人物

**檔案**: `js/persona.js` 的 `initPersonaSystem()` 開頭新增：

```js
// 遷移：若沒有 profiles，自動從現有 userBirthData 建立預設人物
function migrateLegacyData() {
  const data = Storage.loadData();

  // 已有 profiles，跳過
  if (data.profiles && data.profiles.length > 0) return;

  // 從 userBirthData 遷移
  if (data.userBirthData) {
    const { mingStar, mingStars } = data.userBirthData;
    data.profiles = [{
      id: 'p_self',
      isDefault: true,
      nickname: '我',
      avatar: null,
      birthData: {
        year: data.userBirthData.year,
        month: data.userBirthData.month,
        day: data.userBirthData.day,
        hour: data.userBirthData.hour,
        gender: data.userBirthData.gender
      },
      mingStar: mingStar || null,
      mingStars: mingStars || [],
      relationship: 'self',
      colorDNA: Storage.getDefaultColorDNA(mingStar),
      usageStats: {
        lastUsed: Date.now(),
        usageCount: data.totalDays || 0,
        lastContext: null
      },
      contextHistory: []
    }];
    data.currentPersonaId = 'p_self';
    Storage.saveData(data);
  } else {
    // 完全新用戶：建立一個空白「我」
    data.profiles = [{
      id: 'p_self',
      isDefault: true,
      nickname: '我',
      avatar: null,
      birthData: { year: null, month: null, day: null, hour: null, gender: null },
      mingStar: null,
      mingStars: [],
      relationship: 'self',
      colorDNA: Storage.getDefaultColorDNA(null),
      usageStats: { lastUsed: Date.now(), usageCount: 0, lastContext: null },
      contextHistory: []
    }];
    data.currentPersonaId = 'p_self';
    Storage.saveData(data);
  }
}
```

在 `initPersonaSystem()` 第一行呼叫：

```js
export function initPersonaSystem() {
  migrateLegacyData(); // 確保有 profiles 資料
  cacheElements();
  // ...
}
```

---

## Phase 12 — 整合測試清單

### 12.1 單元測試（手動）

| # | 測試項目 | 預期結果 |
|---|---------|---------|
| 1 | 全新用戶首次開 App | 自動建立「我」人物，頂部顯示「👤 我」 |
| 2 | 點擊頂部指示器 | 彈出人物面板，顯示「我」為 active |
| 3 | 點「+ 新增人物」→ 填表單 → 儲存 | 新人物出現在面板列表，切換後頂部顯示新名字 |
| 4 | 切換人物後，幸運色改變 | 不同命宮主星的人，幸運色不同 |
| 5 | 切換人物後，能量卡更換 | 同一時段不同命宮的人，卡片內容不同 |
| 6 | 刪除非最後一人物 | 從面板消失，自動切到第一人 |
| 7 | 刪除最後一人物 | 提示「至少保留一人」 |
| 8 | 命盤面板自動帶入當前人物資料 | 輸入框自動填入該人物的生日 |
| 9 | 占卦記錄關聯人物 | 記錄中可見 profileNickname |
| 10 | 關閉瀏覽器後再開 | 人物資料不消失，仍為上次選擇的人 |

### 12.2 遷移測試

| # | 測試項目 | 預期結果 |
|---|---------|---------|
| 11 | 有舊 `userBirthData` 的用戶更新後 | 自動建立「我」人物，命宮主星正確繼承 |
| 12 | 舊用戶已有 `streak` 等統計 | `usageStats.usageCount` 從 `totalDays` 初始化 |

---

## 實作優先順序（Dev Order）

```
P0（第一天完成）：
├── Phase 0.1-0.3：Storage 資料結構 + 函式
├── Phase 1.1：HTML 結構（header + 面板）
├── Phase 2.1：CSS 基本樣式
├── Phase 3.1：persona.js 基本框架
├── Phase 11：遷移函式
└── Phase 12.1：測試 1-7（P0 核心功能）

P1（第二天完成）：
├── Phase 4：能量卡系統串接命盤
├── Phase 5：命盤面板自動帶入
├── Phase 6：決策面板人物歸屬
├── Phase 7：儀表板人物視圖
└── Phase 12：完整測試

P2（第三天可選）：
├── Phase 8：觸覺 + 動畫增強
├── Phase 9：滑動手勢
└── Phase 10：56 張個人化能量卡內容創作
```

---

## 檔案變動總覽

| 動作 | 檔案 |
|------|------|
| **修改** | `js/storage.js` — 新增 profiles 結構與管理函式 |
| **修改** | `js/app.js` — 引入 persona.js，監聽 personaChanged 事件 |
| **新建** | `js/persona.js` — 人物系統控制層（~300 行） |
| **修改** | `js/card.js` — 能量卡系統串接命盤 seed |
| **修改** | `index.html` — header + 面板 + modal HTML |
| **修改** | `css/style.css` — Persona System 樣式（~200 行） |
| **新增** | `task.md`（本檔案）|

預估總工時：**3-5 天**（含測試）
