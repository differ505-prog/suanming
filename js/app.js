/**
 * 算命助手 — 主程式 v2.0
 * 含：主星認領、交叉解讀、晨間氣場、個人化稱呼
 */

import { divinate, getAuspicious } from './meihua.js';
import { castZiwei, generateReading, getCrossReading, STAR_TRAITS } from './ziwei.js';
import { getSaying } from './sayings.js';
import { getCurrentCard, drawRandomCard, saveTodayCard, getTodayCard } from './card.js';
import { ARCHETYPES } from './archetypes.js';
import {
  addRecord, getStats, getRecords, deleteRecord, clearAll, exportJSON,
  saveTodayCard as saveCard, getTodayCard as loadCard,
  addWeeklyReview, addReflection, getReflections,
  saveUserBirthData, getUserBirthData,
  scheduleReflectionReminder, getPendingReminders, clearReminder
} from './storage.js';
import { getDailyVibe, hasCheckedIn, getCheckInStreak, checkIn } from './card.js';

// ===== 全域狀態 =====
let currentMode = 'today';
let currentResult = null;
let userBirthData = null; // 命宮主星資料
let birthData = null; // 當前命盤輸入資料

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

// ===== DOM 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  // 讀取用戶命宮資料
  userBirthData = getUserBirthData();

  initNav();
  initTabs();
  initTodayMode();
  initDecisionMode();
  initChartMode();
  loadDashboard();

  // 如果有今日卡片，直接顯示；否則自動抽取
  const savedCard = getTodayCard();
  if (savedCard) {
    showCard(savedCard);
  } else {
    const firstCard = getCurrentCard();
    showCard(firstCard);
    saveTodayCard(firstCard);
  }

  // 檢查待複盤提醒
  const pending = getPendingReminders();
  if (pending.length > 0) {
    const reminder = pending[0];
    showReflectionReminder(reminder);
  }
});

// ===== 導航切換 =====
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchMode(btn.dataset.mode);
    });
  });
}

function switchMode(mode) {
  currentMode = mode;
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('hidden', p.dataset.panel !== mode);
  });
}

// ===== 今日模式 =====
function initTodayMode() {
  const cardArea = document.getElementById('card-area');
  if (!cardArea) return;

  // 點擊刷新
  cardArea.addEventListener('click', (e) => {
    if (e.target.closest('.refresh-btn') || e.target.id === 'card-refresh') {
      const card = drawRandomCard(currentResult?.card?.id);
      showCard(card);
      saveTodayCard(card);
      addRecord({ mode: '每日能量卡', card: card.title });
      track('card_draw', { cardId: card.id, period: card.period });
    }
  });
}

function showCard(card) {
  const area = document.getElementById('card-area');
  if (!area) return;

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

  // 晨間特別標題
  const hour = new Date().getHours();
  const isMorning = hour >= 6 && hour < 12;
  const morningBadge = isMorning ? '<div class="card-morning-badge">🌅 今日晨間氣場</div>' : '';

  // 個人化稱呼
  const personalGreeting = getPersonalGreeting();

  area.innerHTML = `
    <div class="energy-card">
      ${vibeHTML}
      ${morningBadge}
      ${personalGreeting ? `<div class="personal-greeting">${personalGreeting}</div>` : ''}
      <div class="card-period">${card.period}</div>
      <div class="card-title">${card.title}</div>
      <div class="card-text">${card.text}</div>
      <div class="card-action">${card.action ? '↳ ' + card.action : ''}</div>
      <button class="refresh-btn" id="card-refresh">↺ 換一張</button>
    </div>
  `;
  currentResult = { card };
  initTodayMode();
}

// 個人化稱呼：根據命宮主星生成問候語
function getPersonalGreeting() {
  if (!userBirthData) return '';
  const star = userBirthData.mingStar;
  const traits = STAR_TRAITS[star];
  if (!traits) return '';

  const greetings = [
    `【${star}坐命】的專屬決策所，今日來了`,
    `今日的${star}星人，準備好遇見今天的卦象了`,
    `${star}人專屬的時空能量場，歡迎回來`,
  ];
  // 用日期作 seed 固定選擇
  const idx = (new Date().getDate() + star.charCodeAt(0)) % greetings.length;
  return greetings[idx];
}

// ===== 主星認領 Modal =====
// 建立 Modal DOM（懶載，只建立一次）
function ensureClaimModal() {
  if (document.getElementById('claim-modal')) return;
  const modal = document.createElement('div');
  modal.id = 'claim-modal';
  modal.innerHTML = `
    <div class="modal-overlay" id="claim-overlay"></div>
    <div class="modal-content">
      <div class="modal-header">
        <div class="modal-icon">⭐</div>
        <h2>認領你的命宮主星</h2>
        <p class="modal-subtitle">解鎖專屬於你的性格底色，從此每次占卜都有雙引擎護航</p>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label class="form-label">出生年份</label>
          <input type="number" id="claim-year" placeholder="如 1990" min="1900" max="2010">
        </div>
        <div class="form-group">
          <label class="form-label">出生月份</label>
          <input type="number" id="claim-month" placeholder="1-12" min="1" max="12">
        </div>
        <div class="form-group">
          <label class="form-label">出生日期</label>
          <input type="number" id="claim-day" placeholder="1-31" min="1" max="31">
        </div>
        <div class="form-group">
          <label class="form-label">出生時辰（24小時制）</label>
          <input type="number" id="claim-hour" placeholder="如 8" min="0" max="23">
          <div class="form-hint">子時=23 / 丑時=1 / 寅時=3 / 卯時=5 / 辰時=7<br>巳時=9 / 午時=11 / 未時=13 / 申時=15 / 酉時=17<br>戌時=19 / 亥時=21</div>
        </div>
        <button class="btn-primary" id="claim-submit">解鎖我的主星</button>
        <button class="btn-secondary" id="claim-skip" style="margin-top:8px">稍後再說</button>
      </div>
      <div class="modal-result hidden" id="claim-result">
        <div class="result-star-icon">⭐</div>
        <div class="result-star-name" id="result-star-name"></div>
        <div class="result-star-type" id="result-star-type"></div>
        <div class="result-star-desc" id="result-star-desc"></div>
        <div class="result-star-strength" id="result-star-strength"></div>
        <button class="btn-primary" id="claim-close">開始使用</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // 事件綁定
  document.getElementById('claim-skip')?.addEventListener('click', closeClaimModal);
  document.getElementById('claim-overlay')?.addEventListener('click', closeClaimModal);
  document.getElementById('claim-submit')?.addEventListener('click', handleClaimSubmit);
  document.getElementById('claim-close')?.addEventListener('click', () => {
    closeClaimModal();
    // 刷新今日面板
    const savedCard = getTodayCard() || getCurrentCard();
    showCard(savedCard);
  });
}

function openClaimModal() {
  ensureClaimModal();
  document.getElementById('claim-modal').classList.add('open');
  document.getElementById('claim-result').classList.add('hidden');
  document.getElementById('claim-result').previousElementSibling?.classList.remove('hidden');
}

function closeClaimModal() {
  document.getElementById('claim-modal')?.classList.remove('open');
}

function handleClaimSubmit() {
  const year = parseInt(document.getElementById('claim-year').value);
  const month = parseInt(document.getElementById('claim-month').value);
  const day = parseInt(document.getElementById('claim-day').value);
  const hour = parseInt(document.getElementById('claim-hour').value) || 8;

  if (!year || !month || !day) {
    alert('請填寫完整出生日期');
    return;
  }

  try {
    const result = castZiwei(year, month, day, hour);
    const mingStar = result.mingStar || '天同';
    const mingStars = result.mingStars || [];
    const traits = STAR_TRAITS[mingStar];

    // 保存到 localStorage
    saveUserBirthData({ year, month, day, hour }, mingStar, mingStars);
    userBirthData = { year, month, day, hour, mingStar, mingStars };

    // 顯示結果
    document.getElementById('result-star-name').textContent = `你是【${mingStar}】星人`;
    document.getElementById('result-star-type').textContent = `性格類型：${traits?.type || '未知'}`;
    document.getElementById('result-star-desc').textContent = traits?.desc || '';
    document.getElementById('result-star-strength').textContent = `核心優勢：${traits?.strength || '待探索'} · 成長功課：${traits?.weakness || '待發現'}`;

    document.getElementById('claim-result').classList.remove('hidden');
    document.querySelector('.modal-body > .form-group')?.parentElement?.classList.add('hidden');
    document.querySelector('.modal-body > button')?.parentElement?.classList.add('hidden');

    // 添加「查看完整人格卡」按鈕
    const descEl = document.getElementById('result-star-desc');
    if (descEl) {
      const btn = document.createElement('button');
      btn.className = 'btn-primary';
      btn.style.cssText = 'margin-top:12px';
      btn.textContent = '⭐ 查看完整人格卡';
      btn.onclick = () => { closeClaimModal(); showArchetypeCard(mingStar); };
      descEl.insertAdjacentElement('afterend', btn);
    }
  } catch (e) {
    alert('排盤失敗，請檢查日期是否正確');
  }
}

// 顯示認領按鈕（當沒有認領過時，在今日面板顯示引導）
function showClaimButtonIfNeeded() {
  if (userBirthData) return; // 已經認領過
  const cardArea = document.getElementById('card-area');
  if (!cardArea) return;

  // 在 energy-card 後面加一個認領入口
  const existingBtn = cardArea.querySelector('.claim-entry-btn');
  if (existingBtn) return;

  const btn = document.createElement('button');
  btn.className = 'claim-entry-btn btn-secondary';
  btn.textContent = '⭐ 認領你的命宮主星，解鎖雙引擎解讀';
  btn.style.cssText = 'margin-top:12px; width:100%; font-size:0.85rem; border: 1px solid var(--accent); color: var(--accent);';
  btn.addEventListener('click', openClaimModal);
  cardArea.appendChild(btn);
}

// ===== 決策模式 =====
function initDecisionMode() {
  const form = document.getElementById('decision-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleDivination();
  });

  const clearBtn = document.getElementById('decision-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('result-area').innerHTML = '<div class="placeholder">在此輸入或選擇起卦方式，獲取卦象指引</div>';
      currentResult = null;
    });
  }
}

function handleDivination() {
  const type = document.querySelector('input[name="div-type"]:checked')?.value;
  const scenario = document.querySelector('#scenario-select')?.value || 'career';

  let input;

  if (type === 'time') {
    const year = parseInt(document.getElementById('input-year').value);
    const month = parseInt(document.getElementById('input-month').value);
    const day = parseInt(document.getElementById('input-day').value);
    const hour = parseInt(document.getElementById('input-hour').value);
    if (!year || !month || !day) { alert('請填寫完整日期時間'); return; }
    input = { type: 'time', year, month, day, hour: hour || 0 };

  } else if (type === 'number') {
    const a = parseInt(document.getElementById('input-num-a').value);
    const b = parseInt(document.getElementById('input-num-b').value);
    if (!a || !b) { alert('請填寫兩個數字'); return; }
    input = { type: 'number', a, b };

  } else if (type === 'text') {
    const text = document.getElementById('input-text').value.trim();
    if (!text) { alert('請輸入文字'); return; }
    input = { type: 'text', text };
  }

  const result = divinate(input);
  if (!result) return;

  currentResult = { ...result, scenario };
  const isGood = getAuspicious(result.hexagram, result.tiyong, scenario) === 'good';
  const saying = getSaying(scenario, isGood);

  track('divination', {
    method: result.method,
    hexagram: result.hexagram.name,
    auspicious: isGood ? 'good' : 'bad',
    scenario
  });

  renderDivinationResult(result, saying);
  addRecord({
    mode: '梅花易數',
    method: result.method,
    hexagram: result.hexagram.name,
    scenario,
    auspicious: isGood ? '吉' : '兇',
    tiyong: result.tiyong.relation
  });
}

async function renderDivinationResult(result, saying) {
  const area = document.getElementById('result-area');
  if (!area) return;

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

  const { hexagram, upperTrigram, lowerTrigram, movingLine, movingLineText, tiyong, hugua, biangua, sequence } = result;

  const linesHTML = sequence.map(line => {
    const symbol = line.yang ? '—' : '–';
    const movingMark = line.moving ? '●' : ' ';
    const color = line.moving ? 'var(--accent)' : 'var(--text-muted)';
    return `<span class="yao" style="color:${color}">${movingMark}${symbol}${symbol}${movingMark}</span>`;
  }).join('');

  // === 交叉解讀：梅花卦象 × 命宮主星 ===
  let crossReadingHTML = '';
  if (userBirthData && userBirthData.mingStar) {
    const cross = getCrossReading(hexagram, tiyong, userBirthData.mingStar);
    if (cross) {
      crossReadingHTML = `
        <div class="cross-reading-section">
          <div class="cross-reading-header">⭐ 【${cross.star}提醒】</div>
          <div class="cross-reading-type">${cross.type} · ${cross.traits}</div>
          <div class="cross-reading-text">${cross.reading}</div>
          <div class="cross-reading-relation">
            今日卦象給你的功課：${cross.relation === '助力' ? '趁勢而為' : cross.relation === '阻力' ? '先緩後動' : '保持平常心'}
          </div>
        </div>
      `;
    }
  }

  area.innerHTML = `
    <div class="result-card">
      <div class="hexagram-symbol">${upperTrigram.symbol} / ${lowerTrigram.symbol}</div>
      <div class="hexagram-name">${hexagram.name}卦</div>
      <div class="hexagram-meta">${hexagram.guaci}</div>

      <div class="yao-sequence">${linesHTML}</div>
      <div class="yao-labels">
        <span>六</span><span>五</span><span>四</span>
        <span>三</span><span>二</span><span>初</span>
      </div>

      <div class="moving-line">
        <span class="label">動爻</span>
        <span class="value">${movingLine}爻 — ${movingLineText}</span>
      </div>

      <div class="hexagram-detail">
        <div class="detail-row">
          <span class="label">上卦</span>
          <span class="value">${upperTrigram.name}（${upperTrigram.symbol}）${upperTrigram.nature}屬</span>
        </div>
        <div class="detail-row">
          <span class="label">下卦</span>
          <span class="value">${lowerTrigram.name}（${lowerTrigram.symbol}）${lowerTrigram.nature}屬</span>
        </div>
        <div class="detail-row highlight">
          <span class="label">體用</span>
          <span class="value">${tiyong.ti.name}（體）${tiyong.relation}${tiyong.yong.name}（用）— ${tiyong.judgment}</span>
        </div>
        <div class="detail-row">
          <span class="label">互卦</span>
          <span class="value">${hugua.name}，${hugua.upper.nature}上${hugua.lower.nature}下</span>
        </div>
        <div class="detail-row">
          <span class="label">變卦</span>
          <span class="value">${biangua ? biangua.name + '卦' : '無變爻'}</span>
        </div>
      </div>

      <div class="tiyong-desc">${tiyong.desc}</div>

      ${crossReadingHTML}

      <div class="saying-section">
        <div class="saying-tone">【${saying.tone}】</div>
        <div class="saying-text">${saying.text}</div>
      </div>

      <button class="btn-secondary" onclick="openReflection(${Date.now()})" style="margin-top:12px">
        ↪ 記下這個決定 → 7天後回來複盤
      </button>

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

      <button class="btn-secondary" onclick="generateShareCard()" style="margin-top:8px; width:100%">
        🖼 生成可分享圖卡
      </button>
    </div>
  `;
}

// ===== handleFeedback =====
function handleFeedback(type) {
  const hex = currentResult?.hexagram?.name || 'unknown';
  const method = currentResult?.method || 'unknown';
  track('feedback', { feedback: type, hexagram: hex, method });

  document.getElementById('feedback-up')?.classList.add('hidden');
  document.getElementById('feedback-down')?.classList.add('hidden');
  document.getElementById('feedback-thanks')?.classList.remove('hidden');
}

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

// ===== 命盤模式 =====
function initChartMode() {
  const form = document.getElementById('chart-form');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleChartCast();
  });
}

function handleChartCast() {
  const year = parseInt(document.getElementById('birth-year').value);
  const month = parseInt(document.getElementById('birth-month').value);
  const day = parseInt(document.getElementById('birth-day').value);
  const hour = parseInt(document.getElementById('birth-hour').value) || 12;
  const gender = document.getElementById('gender-select')?.value || 'm';

  if (!year || !month || !day) {
    alert('請填寫完整生日');
    return;
  }

  birthData = { year, month, day, hour, gender };

  try {
    const result = castZiwei(year, month, day, hour);
    const readings = generateReading(result);
    currentResult = { type: 'ziwei', data: result, readings };
    renderZiweiResult(result, readings);

    // 如果用戶還沒認領過主星，自動儲存
    if (!userBirthData) {
      saveUserBirthData({ year, month, day, hour }, result.mingStar, result.mingStars);
      userBirthData = { year, month, day, hour, mingStar: result.mingStar, mingStars: result.mingStars };
    }

    addRecord({
      mode: '紫微斗數',
      birth: `${year}/${month}/${day} ${hour}時`,
      gender,
      yearGZ: `${result.yearGZ.gan}${result.yearGZ.zhi}`
    });
  } catch (e) {
    console.error(e);
    alert('排盤計算錯誤，請檢查日期是否正確');
  }
}

function renderZiweiResult(result, readings) {
  const area = document.getElementById('chart-result');
  if (!area) return;

  const { yearGZ, dayGZ, mingGongDi, wuxingJu, fourHua, mingStar } = result;

  const headerHTML = `
    <div class="chart-header">
      ${mingStar ? `<div class="chart-ming-star" onclick="showArchetypeCard('${mingStar}')" style="cursor:pointer" title="點擊查看完整人格卡">命宮主星：${mingStar} ⭐</div>` : ''}
      <div class="chart-info-row">
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

  const palacesHTML = readings.map(r => `
    <div class="palace-card ${r.palace === '命' ? 'palace-ming' : ''}" onclick="togglePalace(this)">
      <div class="palace-name">${r.palace}</div>
      <div class="palace-di">${r.di}</div>
      <div class="palace-stars">${r.stars.length > 0 ? r.stars.join('·') : '<span class="empty-palace">空</span>'}</div>
      ${r.hua.length > 0 ? `<div class="palace-hua">${r.hua.join('·')}</div>` : ''}
      <div class="palace-expanded hidden">
        <div class="palace-stars-desc">${r.starsDesc}</div>
        <div class="palace-hua-desc">${r.huaDesc || '本宮無四化'}</div>
      </div>
    </div>
  `).join('');

  area.innerHTML = headerHTML + `
    <div class="palace-grid">${palacesHTML}</div>
    <div class="chart-note">點擊宮位展開解讀</div>
  `;
}

window.togglePalace = function(el) {
  const expanded = el.querySelector('.palace-expanded');
  if (expanded) expanded.classList.toggle('hidden');
};

// ===== 儀表板 =====
function loadDashboard() {
  const stats = getStats();
  const eventStats = getEventStats();
  const records = getRecords().slice(0, 10);
  const ud = getUserBirthData();

  const statsEl = document.getElementById('stats-area');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-grid">
        ${ud && ud.mingStar ? `
        <div class="stat-item" style="grid-column:1/-1; text-align:center; margin-bottom:8px; cursor:pointer" onclick="showArchetypeCard('${ud.mingStar}')">
          <div class="stat-value" style="color:var(--accent)">⭐ ${ud.mingStar}坐命 ⭐</div>
        </div>
        ` : ''}
        <div class="stat-item">
          <div class="stat-value">${stats.totalUses + eventStats.total}</div>
          <div class="stat-label">總使用次數</div>
        </div>
        <div class="stat-item streak">
          <div class="stat-value">${stats.streak}天</div>
          <div class="stat-label">當前連續</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.streakHistory}天</div>
          <div class="stat-label">歷史最高</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.topMode}</div>
          <div class="stat-label">最常用模式</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${stats.topHexagrams.slice(0, 2).join('·') || '—'}</div>
          <div class="stat-label">常見卦象</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${eventStats.feedbackRate !== null ? eventStats.feedbackRate + '%' : '—'}</div>
          <div class="stat-label">神準率</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">${getCheckInStreak()}天</div>
          <div class="stat-label">簽到連續</div>
        </div>
      </div>
    `;
  }

  const recordsEl = document.getElementById('records-list');
  if (recordsEl) {
    if (records.length === 0) {
      recordsEl.innerHTML = '<div class="placeholder">尚無記錄，開始你的第一卦吧</div>';
    } else {
      recordsEl.innerHTML = records.map(r => `
        <div class="record-item">
          <div class="record-meta">
            <span class="record-mode">${r.mode}</span>
            <span class="record-date">${r.date} ${r.time || ''}</span>
          </div>
          <div class="record-detail">
            ${r.hexagram ? `<span class="record-tag gua">${r.hexagram}卦</span>` : ''}
            ${r.scenario ? `<span class="record-tag">${r.scenario === 'career' ? '職場' : '情感'}</span>` : ''}
            ${r.yearGZ ? `<span class="record-tag">${r.yearGZ}</span>` : ''}
          </div>
          ${r.hexagram ? `<div class="record-sub">${r.method || ''} · ${r.auspicious || ''} · ${r.tiyong || ''}</div>` : ''}
        </div>
      `).join('');
    }
  }

  const exportBtn = document.getElementById('export-btn');
  const clearBtn = document.getElementById('clear-btn');
  const reviewBtn = document.getElementById('add-review-btn');

  if (exportBtn) exportBtn.addEventListener('click', exportJSON);
  if (clearBtn) clearBtn.addEventListener('click', () => {
    if (confirm('確定清除所有資料？此操作不可恢復。')) {
      clearAll();
      loadDashboard();
    }
  });
  if (reviewBtn) reviewBtn.addEventListener('click', () => {
    const text = prompt('本週複盤心得：');
    if (text) {
      addWeeklyReview(text);
      alert('已儲存本週複盤');
    }
  });
}

// ===== 面板初始化（tabs）=====
function initTabs() {
  document.querySelectorAll('input[name="div-type"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.getElementById('time-inputs').classList.toggle('hidden', e.target.value !== 'time');
      document.getElementById('number-inputs').classList.toggle('hidden', e.target.value !== 'number');
      document.getElementById('text-inputs').classList.toggle('hidden', e.target.value !== 'text');
    });
  });
}

// ===== 決策回看 =====
window.openReflection = function(recordId) {
  const text = prompt('描述你做的這個決定：');
  if (text) {
    addReflection(recordId, text, '待觀察');
    scheduleReflectionReminder(recordId, text); // 新增：排程3天後提醒
    alert('已記錄，3天後我會提醒你回來看看結果 🔔');
  }
};

// ===== 匯出所有記錄 =====
window.exportAllData = function() { exportJSON(); };
window.clearAllData = function() { clearAll(); loadDashboard(); };

// ===== 快捷鍵 =====
document.addEventListener('keydown', (e) => {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'd') switchMode('decision');
  if (e.key === 't') switchMode('today');
  if (e.key === 'm') switchMode('chart');
  if (e.key === 's') {
    document.querySelector('.nav-btn[data-mode="dashboard"]')?.click();
    loadDashboard();
  }
});

// ===== PWA 安裝提示 =====
window.addEventListener('load', () => {
  // 延遲顯示認領按鈕（等卡片渲染完）
  setTimeout(showClaimButtonIfNeeded, 300);

  // PWA 安裝提示
  let deferredPrompt;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // 在今日面板顯示安裝提示
    const cardArea = document.getElementById('card-area');
    if (cardArea && !document.getElementById('pwa-install-btn')) {
      const btn = document.createElement('button');
      btn.id = 'pwa-install-btn';
      btn.className = 'btn-secondary';
      btn.style.cssText = 'margin-top:8px; width:100%; font-size:0.8rem;';
      btn.textContent = '📱 安裝到手機主畫面';
      btn.addEventListener('click', async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          if (outcome === 'accepted') btn.remove();
        }
      });
      cardArea.appendChild(btn);
    }
  });
});

export { switchMode, loadDashboard, openClaimModal };
