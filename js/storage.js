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
    totalDays: 0,       // 總使用天數
    userBirthData: null // 用戶命宮主星資料 {year, month, day, hour, mingStar, mingStars}
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

  // 埋點統計
  const eventStats = (() => {
    try {
      const evData = JSON.parse(localStorage.getItem('suanming_events') || '[]');
      const fb = evData.filter(d => d.event === 'feedback');
      const up = fb.filter(d => d.properties.feedback === 'up').length;
      return {
        feedbackTotal: fb.length,
        feedbackUp: up,
        feedbackRate: fb.length > 0 ? Math.round((up / fb.length) * 100) : null
      };
    } catch { return { feedbackTotal: 0, feedbackUp: 0, feedbackRate: null }; }
  })();

  return {
    totalUses: records.length,
    streak: data.streak,
    streakHistory: data.streakHistory,
    topMode,
    topHexagrams,
    totalDays: data.totalDays || 0,
    feedbackRate: eventStats.feedbackRate,
    feedbackTotal: eventStats.feedbackTotal
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

// 決策回看
function addReflection(recordId, text, result) {
  const data = loadData();
  data.reflections.push({ recordId, text, result, date: today() });

  // 如果有結果標記，清除提醒
  if (result && result !== '待觀察') {
    data.pendingReminders = (data.pendingReminders || []).filter(r => String(r.recordId) !== String(recordId));
  }

  saveData(data);
}

function getReflections() {
  return (loadData().reflections || []).slice(-10).reverse();
}

// 保存用戶命宮主星資料
function saveUserBirthData(birthData, mingStar, mingStars) {
  const data = loadData();
  data.userBirthData = { ...birthData, mingStar, mingStars, savedAt: today() };
  saveData(data);
}

// 讀取用戶命宮主星資料
function getUserBirthData() {
  const data = loadData();
  return data.userBirthData || null;
}

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

// 切換當前人物
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
    colorDNA: profileData.colorDNA || getDefaultColorDNA(profileData.mingStar),
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

// 刪除人物
function deleteProfile(profileId) {
  const data = loadData();
  if (!data.profiles || data.profiles.length <= 1) return false;
  data.profiles = data.profiles.filter(p => p.id !== profileId);
  if (data.currentPersonaId === profileId) {
    data.currentPersonaId = data.profiles[0].id;
  }
  saveData(data);
  return true;
}

// 記錄人物使用
function recordProfileUsage(profileId, context) {
  const data = loadData();
  const idx = data.profiles?.findIndex(p => p.id === profileId);
  if (idx === -1 || idx === undefined) return;
  const stats = data.profiles[idx].usageStats;
  stats.lastUsed = Date.now();
  stats.usageCount = (stats.usageCount || 0) + 1;
  stats.lastContext = context;
  const history = data.profiles[idx].contextHistory || [];
  history.unshift({ context, timestamp: Date.now() });
  if (history.length > 10) history.pop();
  data.profiles[idx].contextHistory = history;
  saveData(data);
}

// 根據主星取得預設 colorDNA
function getDefaultColorDNA(mingStar) {
  const dnaMap = {
    '紫微': { primary: '#c9a84c', secondary: '#2a2010', font: 'serif', iconStyle: 'seal', accentPattern: 'geometric' },
    '天機': { primary: '#5b8dd9', secondary: '#2a4a8b', font: 'serif', iconStyle: 'flow', accentPattern: 'wave' },
    '太陽': { primary: '#e8b84a', secondary: '#2a1f00', font: 'serif', iconStyle: 'sharp', accentPattern: 'none' },
    '武曲': { primary: '#a0a0a0', secondary: '#2a2a2a', font: 'serif', iconStyle: 'sharp', accentPattern: 'geometric' },
    '天同': { primary: '#3a6b4a', secondary: '#0a1a0a', font: 'serif-soft', iconStyle: 'round', accentPattern: 'cloud' },
    '廉貞': { primary: '#8b3a3a', secondary: '#2a1010', font: 'serif', iconStyle: 'sharp', accentPattern: 'none' },
    '天府': { primary: '#c9a84c', secondary: '#2a2010', font: 'serif', iconStyle: 'seal', accentPattern: 'cloud' },
    '太陰': { primary: '#6b5b8a', secondary: '#1a1525', font: 'serif-soft', iconStyle: 'round', accentPattern: 'cloud' },
    '貪狼': { primary: '#ef4444', secondary: '#2a0a0a', font: 'serif', iconStyle: 'sharp', accentPattern: 'none' },
    '巨門': { primary: '#6b6b6b', secondary: '#1a1a1a', font: 'serif', iconStyle: 'flow', accentPattern: 'none' },
    '破軍': { primary: '#8b4513', secondary: '#2a1505', font: 'serif', iconStyle: 'sharp', accentPattern: 'geometric' },
    '七殺': { primary: '#dc2626', secondary: '#2a0a0a', font: 'serif', iconStyle: 'sharp', accentPattern: 'geometric' }
  };
  return dnaMap[mingStar] || { primary: '#c9a84c', secondary: '#2a2010', font: 'serif', iconStyle: 'seal', accentPattern: 'none' };
}

// 預測當前人物（時間 + 歷史）
function predictCurrentProfile() {
  const data = loadData();
  const profiles = data.profiles || [];
  if (profiles.length <= 1) return profiles[0]?.id || null;

  const now = new Date();
  const hour = now.getHours();
  const dayOfWeek = now.getDay();

  const timeWeights = {
    self:    hour >= 6 && hour < 10 ? 3 : (hour >= 22 || hour < 2) ? 2 : 1,
    family:  hour >= 18 && hour < 22 ? 2 : 1,
    partner: hour >= 20 && hour < 23 ? 2 : 1,
    client:  hour >= 9 && hour < 18 ? 3 : 1,
    friend:  hour >= 12 && hour < 14 ? 2 : 1
  };

  const scored = profiles.map(p => {
    let score = (timeWeights[p.relationship] || 1);
    const lastUsed = p.usageStats?.lastUsed;
    if (lastUsed) {
      const hoursSince = (Date.now() - lastUsed) / 3600000;
      if (hoursSince < 24) score += 3;
      else if (hoursSince < 72) score += 1;
    }
    score += Math.min((p.usageStats?.usageCount || 0) / 50, 2);
    if (dayOfWeek === 0 && p.relationship === 'family') score += 2;
    return { id: p.id, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.id || profiles[0]?.id;
}

// 遷移：若沒有 profiles，自動從現有資料建立預設人物
function migrateLegacyData() {
  const data = loadData();
  if (data.profiles && data.profiles.length > 0) return;

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
      colorDNA: getDefaultColorDNA(mingStar),
      usageStats: {
        lastUsed: Date.now(),
        usageCount: data.totalDays || 0,
        lastContext: null
      },
      contextHistory: []
    }];
    data.currentPersonaId = 'p_self';
    saveData(data);
  } else {
    data.profiles = [{
      id: 'p_self',
      isDefault: true,
      nickname: '我',
      avatar: null,
      birthData: { year: null, month: null, day: null, hour: null, gender: null },
      mingStar: null,
      mingStars: [],
      relationship: 'self',
      colorDNA: getDefaultColorDNA(null),
      usageStats: { lastUsed: Date.now(), usageCount: 0, lastContext: null },
      contextHistory: []
    }];
    data.currentPersonaId = 'p_self';
    saveData(data);
  }
}

export { loadData, saveData, updateStreak, addRecord, getStats, getRecords, deleteRecord, clearAll, exportJSON, saveTodayCard, getTodayCard, addWeeklyReview, getWeekNumber, addReflection, getReflections, today, saveUserBirthData, getUserBirthData, scheduleReflectionReminder, getPendingReminders, clearReminder, getProfiles, getCurrentProfile, setCurrentProfile, addProfile, updateProfile, deleteProfile, recordProfileUsage, getDefaultColorDNA, predictCurrentProfile, migrateLegacyData };
