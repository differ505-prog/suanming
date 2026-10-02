/**
 * 算命助手 — 主程式
 */

import { divinate, getAuspicious, HEXAGRAMS } from './meihua.js';
import { castZiwei, generateReading, PALACES } from './ziwei.js';
import { getSaying } from './sayings.js';
import { getCurrentCard, drawRandomCard, saveTodayCard, getTodayCard } from './card.js';
import { addRecord, getStats, getRecords, deleteRecord, clearAll, exportJSON, saveTodayCard as saveCard, getTodayCard as loadCard, addWeeklyReview, addReflection, getReflections } from './storage.js';

// ===== 全域狀態 =====
let currentMode = 'today'; // today | decision | chart
let currentResult = null;
let isLeapMonth = false;
let birthData = {};

// ===== DOM 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
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
    // 第一次訪問自動抽取一張
    const firstCard = getCurrentCard();
    showCard(firstCard);
    saveTodayCard(firstCard);
  }
});

// ===== 導航切換 =====
function initNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      switchMode(mode);
    });
  });
}

function switchMode(mode) {
  currentMode = mode;
  
  // 更新 nav 按鈕狀態
  document.querySelectorAll('.nav-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  
  // 更新面板顯示
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('hidden', p.dataset.panel !== mode);
  });
}

// ===== 今日模式 =====
function initTodayMode() {
  const cardArea = document.getElementById('card-area');
  const refreshBtn = document.getElementById('card-refresh');
  
  // 抽取按鈕
  cardArea.addEventListener('click', (e) => {
    if (e.target.closest('.refresh-btn') || e.target.id === 'card-refresh') {
      const card = drawRandomCard(currentResult?.card?.id);
      showCard(card);
      saveTodayCard(card);
      addRecord({ mode: '每日能量卡', card: card.title });
    }
  });
}

function showCard(card) {
  const area = document.getElementById('card-area');
  if (!area) return;
  area.innerHTML = `
    <div class="energy-card">
      <div class="card-period">${card.period}</div>
      <div class="card-title">${card.title}</div>
      <div class="card-text">${card.text}</div>
      <div class="card-action">${card.action ? '↳ ' + card.action : ''}</div>
      <button class="refresh-btn" id="card-refresh">↺ 換一張</button>
    </div>
  `;
  currentResult = { card };
  initTodayMode(); // 重新綁事件
}

// ===== 決策模式 =====
function initDecisionMode() {
  const form = document.getElementById('decision-form');
  if (!form) return;
  
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    handleDivination();
  });
  
  // 清空按鈕
  const clearBtn = document.getElementById('decision-clear');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('result-area').innerHTML = '<div class="placeholder">在此輸入或選擇起卦方式</div>';
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
    
    if (!year || !month || !day) {
      alert('請填寫完整日期時間');
      return;
    }
    input = { type: 'time', year, month, day, hour: hour || 0 };
    
  } else if (type === 'number') {
    const a = parseInt(document.getElementById('input-num-a').value);
    const b = parseInt(document.getElementById('input-num-b').value);
    if (!a || !b) {
      alert('請填寫兩個數字');
      return;
    }
    input = { type: 'number', a, b };
    
  } else if (type === 'text') {
    const text = document.getElementById('input-text').value.trim();
    if (!text) {
      alert('請輸入文字');
      return;
    }
    input = { type: 'text', text };
  }
  
  const result = divinate(input);
  if (!result) return;
  
  currentResult = { ...result, scenario };
  
  // 判定吉凶
  const isGood = getAuspicious(result.hexagram, result.tiyong) === 'good';
  const saying = getSaying(scenario, isGood);
  
  // 渲染結果
  renderDivinationResult(result, saying);
  
  // 記錄
  addRecord({
    mode: '梅花易數',
    method: result.method,
    hexagram: result.hexagram.name,
    scenario,
    auspicious: isGood ? '吉' : '兇',
    tiyong: result.tiyong.relation
  });
}

function renderDivinationResult(result, saying) {
  const area = document.getElementById('result-area');
  if (!area) return;
  
  const { hexagram, upperTrigram, lowerTrigram, movingLine, movingLineText, tiyong, hugua, biangua, guaci, sequence } = result;
  
  // 構建六爻顯示
  const linesHTML = sequence.map(line => {
    const symbol = line.yang ? '—' : '–';
    const movingMark = line.moving ? '●' : ' ';
    const color = line.moving ? 'var(--accent)' : 'var(--text-muted)';
    return `<span class="yao" style="color:${color}">${movingMark}${symbol}${symbol}${movingMark}</span>`;
  }).join('');
  
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
      
      <div class="saying-section">
        <div class="saying-tone">【${saying.tone}】</div>
        <div class="saying-text">${saying.text}</div>
      </div>
      
      <button class="btn-secondary" onclick="openReflection(${Date.now()})">
        記下這個決定 → 7天後回來複盤
      </button>
    </div>
  `;
}

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
  
  const { yearGZ, dayGZ, mingGongDi, wuxingJu, fourHua } = result;
  
  // 基本資訊
  const headerHTML = `
    <div class="chart-header">
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
  
  // 12宮排列（4×3 grid）
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
  const records = getRecords().slice(0, 10);
  
  const statsEl = document.getElementById('stats-area');
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value">${stats.totalUses}</div>
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
  
  // 綁定匯出 / 清除按鈕
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
  // 決策模式的起卦方式切換
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
    const result = confirm('後續有結果了嗎？');
    addReflection(recordId, text, result ? '有結果' : '待觀察');
    alert('已記錄，7天後可在儀表板回顧');
  }
};

// ===== 匯出所有記錄 =====
window.exportAllData = function() {
  exportJSON();
};

window.clearAllData = function() {
  clearAll();
  loadDashboard();
};

// ===== 快捷鍵：及時抽取 =====
document.addEventListener('keydown', (e) => {
  // 按 D：決策模式
  if (e.key === 'd' && !e.metaKey && !e.ctrlKey && !e.target.matches('input, textarea')) {
    switchMode('decision');
  }
  // 按 T：今日模式
  if (e.key === 't' && !e.metaKey && !e.ctrlKey && !e.target.matches('input, textarea')) {
    switchMode('today');
  }
  // 按 M：命盤模式
  if (e.key === 'm' && !e.metaKey && !e.ctrlKey && !e.target.matches('input, textarea')) {
    switchMode('chart');
  }
  // 按 S：儀表板
  if (e.key === 's' && !e.metaKey && !e.ctrlKey && !e.target.matches('input, textarea')) {
    document.querySelector('.nav-btn[data-mode="dashboard"]')?.click();
    if (currentMode !== 'dashboard') switchMode('dashboard');
    loadDashboard();
  }
});

export { switchMode, loadDashboard };
