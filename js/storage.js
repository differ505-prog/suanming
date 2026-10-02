/**
 * localStorage 封裝 + 統計計算
 */

const STORAGE_KEY = 'suanming_v1';

// 初始化資料結構
function getDefaultData() {
  return {
    records: [],        // 問事記錄
    streak: 0,          // 當前連續天數
    streakHistory: 0,   // 歷史最高連續天數
    lastUsedDate: null, // 上次使用日期 (YYYY-MM-DD)
    currentCard: null,  // 今日能量卡
    cardDate: null,     // 能量卡日期
    weeklyReview: [],   // 週末複盤
    reflections: [],    // 決策回看記錄
    totalDays: 0        // 總使用天數
  };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultData();
    const data = JSON.parse(raw);
    return { ...getDefaultData(), ...data };
  } catch (e) {
    return getDefaultData();
  }
}

function saveData(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.warn('Storage save failed:', e);
  }
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// 更新 streak
function updateStreak() {
  const data = loadData();
  const todayStr = today();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
  
  if (data.lastUsedDate === todayStr) {
    // 今日已記錄，不重複
    return;
  }
  
  if (data.lastUsedDate === yesterdayStr) {
    // 昨天用過，streak +1
    data.streak += 1;
  } else {
    // streak 中斷，重新計算
    data.streak = 1;
  }
  
  data.lastUsedDate = todayStr;
  data.totalDays = (data.totalDays || 0) + 1;
  
  if (data.streak > data.streakHistory) {
    data.streakHistory = data.streak;
  }
  
  saveData(data);
}

// 添加一筆記錄
function addRecord(record) {
  const data = loadData();
  data.records.unshift({
    id: Date.now(),
    date: today(),
    time: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
    ...record
  });
  // 保留最近 50 筆記錄
  if (data.records.length > 50) {
    data.records = data.records.slice(0, 50);
  }
  saveData(data);
  updateStreak();
}

// 獲取統計
function getStats() {
  const data = loadData();
  const records = data.records || [];
  
  // 模式統計
  const modeCount = {};
  records.forEach(r => {
    modeCount[r.mode] = (modeCount[r.mode] || 0) + 1;
  });
  
  // 最常用模式
  const topMode = Object.entries(modeCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
  
  // 最常卦象
  const hexagramCount = {};
  records.filter(r => r.hexagram).forEach(r => {
    hexagramCount[r.hexagram] = (hexagramCount[r.hexagram] || 0) + 1;
  });
  const topHexagrams = Object.entries(hexagramCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  
  return {
    totalUses: records.length,
    streak: data.streak,
    streakHistory: data.streakHistory,
    topMode,
    topHexagrams,
    totalDays: data.totalDays || 0
  };
}

// 獲取記錄列表
function getRecords() {
  const data = loadData();
  return data.records || [];
}

// 刪除單筆記錄
function deleteRecord(id) {
  const data = loadData();
  data.records = data.records.filter(r => r.id !== id);
  saveData(data);
}

// 清除所有資料
function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

// 匯出 JSON
function exportJSON() {
  const data = loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `suanming-export-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 儲存今日能量卡
function saveTodayCard(card) {
  const data = loadData();
  data.currentCard = card;
  data.cardDate = today();
  saveData(data);
}

// 獲取今日能量卡
function getTodayCard() {
  const data = loadData();
  if (data.cardDate === today()) {
    return data.currentCard;
  }
  return null;
}

// 週末複盤
function addWeeklyReview(text) {
  const data = loadData();
  const weekNum = getWeekNumber();
  data.weeklyReview = data.weeklyReview.filter(r => r.week !== weekNum);
  data.weeklyReview.push({ week: weekNum, text, date: today() });
  saveData(data);
}

function getWeekNumber() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

// 決策回看
function addReflection(recordId, text, result) {
  const data = loadData();
  data.reflections.push({ recordId, text, result, date: today() });
  saveData(data);
}

function getReflections() {
  return (loadData().reflections || []).slice(-10).reverse();
}

export { loadData, saveData, updateStreak, addRecord, getStats, getRecords, deleteRecord, clearAll, exportJSON, saveTodayCard, getTodayCard, addWeeklyReview, getWeekNumber, addReflection, getReflections, today };
