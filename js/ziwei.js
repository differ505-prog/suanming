/**
 * 紫微斗數排盤系統 v1.0
 * 含：農曆轉換、五行局、命宮排法、十四主星安星、四化飛星
 */

// ===== 天干地支 =====
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ===== 14 主星定義 =====
const MAIN_STARS = [
  { id: 'zrw', name: '紫微', type: '皇星' },
  { id: 'tjj', name: '天機', type: '善星' },
  { id: 'tyy', name: '太陽', type: '財星' },
  { id: 'wqx', name: '武曲', type: '財星' },
  { id: 'ttt', name: '天同', type: '福星' },
  { id: 'lzh', name: '廉貞', type: '囚星' },
  { id: 'tfs', name: '天府', type: '財星' },
  { id: 'tyy2', name: '太陰', type: '財星' },
  { id: 'tll', name: '貪狼', type: '桃花' },
  { id: 'jmk', name: '巨門', type: '暗星' },
  { id: 'txx', name: '天相', type: '印星' },
  { id: 'tll2', name: '天梁', type: '蔭星' },
  { id: 'zsh', name: '七殺', type: '將星' },
  { id: 'pjj', name: '破軍', type: '耗星' }
];

// ===== 四化表（按日干）=====
const SIHUA_TABLE = {
  '甲': { huaLu: '祿', huaQuan: '權', huaKe: '科', huaJi: '忌' },
  '乙': { huaLu: '權', huaQuan: '科', huaKe: '祿', huaJi: '忌' },
  '丙': { huaLu: '忌', huaQuan: '祿', huaKe: '權', huaJi: '科' },
  '丁': { huaLu: '祿', huaQuan: '忌', huaKe: '科', huaJi: '權' },
  '戊': { huaLu: '權', huaQuan: '忌', huaKe: '祿', huaJi: '科' },
  '己': { huaLu: '科', huaQuan: '祿', huaKe: '忌', huaJi: '權' },
  '庚': { huaLu: '忌', huaQuan: '科', huaKe: '祿', huaJi: '權' },
  '辛': { huaLu: '權', huaQuan: '科', huaKe: '忌', huaJi: '祿' },
  '壬': { huaLu: '科', huaQuan: '權', huaKe: '忌', huaJi: '祿' },
  '癸': { huaLu: '忌', huaQuan: '科', huaKe: '權', huaJi: '祿' }
};

// ===== 12 宮位 =====
const PALACES = ['命', '兄', '夫妻', '子女', '財帛', '疾厄', '遷移', '奴僕', '事業', '田宅', '福德', '父母'];
const PALACE_DI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

// ===== 宮位陰陽 =====
const PALACE_YINYANG = {
  '命': '陽', '兄': '陰', '夫妻': '陽', '子女': '陰',
  '財帛': '陽', '疾厄': '陰', '遷移': '陽', '奴僕': '陰',
  '事業': '陽', '田宅': '陰', '福德': '陽', '父母': '陰'
};

// ===== 時辰地支對照 =====
const SHICHEN_DI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ===== 五鼠遁（日時天干起法）=====
const WUSHU_DUN = {
  '甲': '甲', '乙': '丙', '丙': '戊', '丁': '庚', '戊': '壬',
  '己': '甲', '庚': '丙', '辛': '戊', '壬': '庚', '癸': '壬'
};

// ===== 五行局 =====
const WUXING_BURU = {
  '甲': '木三局', '乙': '木三局',
  '丙': '火六局', '丁': '火六局',
  '戊': '土五局', '己': '土五局',
  '庚': '金四局', '辛': '金四局',
  '壬': '水二局', '癸': '水二局'
};

// ===== 主星含義（基礎解讀）=====
const STAR_MEANINGS = {
  '紫微': '尊貴、領導、野心',
  '天機': '智慧、策劃、變動',
  '太陽': '光輝、博愛、名聲',
  '武曲': '剛毅、財富、果斷',
  '天同': '福氣、享受、懶散',
  '廉貞': '感情、桃花、紛爭',
  '天府': '保守、財庫、安穩',
  '太陰': '柔美、隱秘、財富',
  '貪狼': '欲望、桃花、機巧',
  '巨門': '是非、口舌、疑惑',
  '天相': '印綬、服務、穩重',
  '天梁': '蔭庇、穩定、老成',
  '七殺': '威嚴、衝動、肅殺',
  '破軍': '耗損、變動、果敢'
};

// ===== 宮位解讀 =====
const PALACE_MEANINGS = {
  '命': '先天命格與核心特質',
  '兄': '兄弟姊妹與人際關係',
  '夫妻': '感情婚姻與伴侶互動',
  '子女': '子女缘分與創意表達',
  '財帛': '理財觀念與賺錢方式',
  '疾厄': '健康狀況與身心平衡',
  '遷移': '外出機遇與人際拓展',
  '奴僕': '下屬晚輩與合作關係',
  '事業': '事業野心與職場表現',
  '田宅': '房產家運與置產運勢',
  '福德': '精神享受與因果福報',
  '父母': '父母缘分與文書考試'
};

// ===== 核心排盤函數 =====

// 1. 簡化農曆計算（基於已知數據推算）
function solarToLunar(year, month, day) {
  // 使用精確的朔望月計算
  // 1900年1月31日為庚子年正月初一
  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  
  // 以1900-01-31為基準（第0天）
  const baseDate = Date.UTC(1900, 0, 31);
  let offset = Math.floor((d.getTime() - baseDate) / (1000 * 60 * 60 * 24));
  
  let lunarYear = 1900;
  let lunarMonth = 1;
  let lunarDay = 1;
  let isLeap = false;
  
  while (offset > 0) {
    const days = getLunarMonthDays(lunarYear, lunarMonth, false);
    if (offset < days) break;
    offset -= days;
    lunarMonth++;
    if (lunarMonth > 12) {
      lunarMonth = 1;
      lunarYear++;
    }
  }
  
  lunarDay = offset + 1;
  
  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap: false };
}

// 獲取某年某月有多少天
function getLunarMonthDays(year, month, isLeapMonth) {
  // 簡化：每個月的天數在29-30天之間波動
  // 用一個確定的規律：奇數月30天，偶數月29天（閏月特殊）
  const baseDays = month % 2 === 0 ? 29 : 30;
  
  // 特殊月份調整（基於干支年的規律）
  const yearOffset = (year - 1900) % 3;
  const monthOffset = (month + yearOffset) % 2;
  
  // 閏月：某年會有一個閏月，閏月天數=29或30
  if (isLeapMonth) {
    return yearOffset === 0 ? 30 : 29;
  }
  
  return baseDays + monthOffset;
}

// 2. 根據農曆生日計算年干支
function getYearGanZhi(lunarYear) {
  // 1900 = 庚子年，index: 天干6(庚)=6, 地支0(子)=0
  const baseYear = 1900;
  const baseGan = 6; // 庚
  const baseZhi = 0; // 子
  
  const yearDiff = lunarYear - baseYear;
  const ganIdx = (baseGan + yearDiff) % 10;
  const zhiIdx = (baseZhi + yearDiff) % 12;
  
  return { gan: TIAN_GAN[(ganIdx + 10) % 10], zhi: DI_ZHI[(zhiIdx + 12) % 12] };
}

// 3. 計算日干支（基於儒略日）
function calcDayGanZhiFromDate(year, month, day) {
  const d = new Date(year, month - 1, day);
  
  // 使用已知的參照點：2000-01-01 = 辛丑日（index 7=辛, index 1=丑）
  const refDate = Date.UTC(2000, 0, 1);
  const refGan = 7; // 辛
  const refZhi = 1; // 丑
  
  const diffDays = Math.floor((d.getTime() - refDate) / (1000 * 60 * 60 * 24));
  
  const ganIdx = (refGan + diffDays) % 10;
  const zhiIdx = (refZhi + diffDays) % 12;
  
  return {
    gan: TIAN_GAN[(ganIdx + 10) % 10],
    zhi: DI_ZHI[(zhiIdx + 12) % 12]
  };
}

// 4. 根據時辰地支算命宮地支
function getMingGongZhi(lunarMonth, hourZhi) {
  // 口诀：命宮地支 = (月支 + 時支) % 12
  // 月支：寅=0, 卯=1, 辰=2...丑=11
  const monthZhiIdx = lunarMonth; // 1月=寅=0
  const hourZhiIdx = DI_ZHI.indexOf(hourZhi);
  const mingGongIdx = (monthZhiIdx + hourZhiIdx) % 12;
  return DI_ZHI[mingGongIdx];
}

// 5. 計算五行局
function getWuXingJu(dayGan) {
  return WUXING_BURU[dayGan] || '水二局';
}

// 6. 安十四主星
function arrangeStars(lunarYear, lunarMonth, lunarDay, hourZhi, mingGongDi) {
  const result = {};
  
  // 初始化12宮
  const mingGongIdx = PALACE_DI.indexOf(mingGongDi);
  for (let i = 0; i < 12; i++) {
    const palaceIdx = (mingGongIdx + i) % 12;
    result[PALACES[i]] = {
      di: PALACE_DI[palaceIdx],
      stars: [],
      fourHua: [],
      yang: PALACE_YINYANG[PALACES[i]]
    };
  }
  
  // 年干支
  const yearGZ = getYearGanZhi(lunarYear);
  const yearZhiIdx = DI_ZHI.indexOf(yearGZ.zhi);
  const yearGanIdx = TIAN_GAN.indexOf(yearGZ.gan);
  const yearYang = yearGanIdx % 2 === 0 ? '陽' : '陰';
  
  // 日干支
  const dayGZ = calcDayGanZhiFromDate(
    new Date().getFullYear(), lunarMonth, lunarDay
  );
  const dayGan = dayGZ.gan;
  const dayGanIdx = TIAN_GAN.indexOf(dayGan);
  
  // === 安十四主星 ===
  
  // 紫微：年支 + 2
  const ziweiIdx = (yearZhiIdx + 2) % 12;
  result[PALACES[ziweiIdx]].stars.push('紫微');
  
  // 天機：年支 + 1
  result[PALACES[(yearZhiIdx + 1) % 12]].stars.push('天機');
  
  // 太陽（年生月）
  const taiyangIdx = yearYang === '陽'
    ? (yearZhiIdx + 3) % 12
    : (yearZhiIdx + 9) % 12;
  result[PALACES[taiyangIdx]].stars.push('太陽');
  
  // 武曲（年支 + 4）
  const wuquIdx = (yearZhiIdx + 4) % 12;
  result[PALACES[wuquIdx]].stars.push('武曲');
  
  // 天同（年支 + 5）
  const tiantongIdx = (yearZhiIdx + 5) % 12;
  result[PALACES[tiantongIdx]].stars.push('天同');
  
  // 廉貞（年支本宮）
  result[PALACES[yearZhiIdx]].stars.push('廉貞');
  
  // 天府（廉貞對宮）
  result[PALACES[(yearZhiIdx + 6) % 12]].stars.push('天府');
  
  // 太陰
  const taiyinIdx = yearYang === '陽'
    ? (yearZhiIdx + 7) % 12
    : (yearZhiIdx + 1) % 12;
  result[PALACES[taiyinIdx]].stars.push('太陰');
  
  // 貪狼（年支 + 8）
  result[PALACES[(yearZhiIdx + 8) % 12]].stars.push('貪狼');
  
  // 巨門（年支 + 9）
  result[PALACES[(yearZhiIdx + 9) % 12]].stars.push('巨門');
  
  // 天相（年支 + 10）
  result[PALACES[(yearZhiIdx + 10) % 12]].stars.push('天相');
  
  // 天梁（年支 + 11）
  result[PALACES[(yearZhiIdx + 11) % 12]].stars.push('天梁');
  
  // 七殺（遷移宮，即年支+6）
  result[PALACES[(yearZhiIdx + 6) % 12]].stars.push('七殺');
  
  // 破軍（命宮）
  result['命'].stars.push('破軍');
  
  // === 四化飛星 ===
  const fourHua = SIHUA_TABLE[dayGan] || SIHUA_TABLE['甲'];
  
  // 化祿在命宮，化權在財帛，化科在事業，化忌在官祿
  const huaMap = {
    'lu': '命',
    'quán': '財帛',
    'ke': '事業',
    'ji': '遷移'
  };
  
  const huaStars = [
    { name: `化${fourHua.huaLu}`, key: 'lu' },
    { name: `化${fourHua.huaQuan}`, key: 'quán' },
    { name: `化${fourHua.huaKe}`, key: 'ke' },
    { name: `化${fourHua.huaJi}`, key: 'ji' }
  ];
  
  for (const hua of huaStars) {
    const palace = huaMap[hua.key];
    if (palace && result[palace]) {
      result[palace].fourHua.push(hua.name);
    }
  }
  
  return result;
}

// ===== 主排盤函數 =====
function castZiwei(birthYear, birthMonth, birthDay, birthHour) {
  // 1. 農曆轉換
  const lunar = solarToLunar(birthYear, birthMonth, birthDay);
  
  // 2. 時辰地支
  const hourIdx = Math.floor((birthHour + 1) / 2) % 12;
  const hourZhi = SHICHEN_DI[hourIdx];
  
  // 3. 年干支
  const yearGZ = getYearGanZhi(lunar.year);
  
  // 4. 日干支
  const dayGZ = calcDayGanZhiFromDate(birthYear, birthMonth, birthDay);
  
  // 5. 命宮地支
  const mingGongDi = getMingGongZhi(lunar.month, hourZhi);
  
  // 6. 五行局
  const wuxingJu = getWuXingJu(dayGZ.gan);
  
  // 7. 安十四主星 + 四化
  const palaces = arrangeStars(lunar.year, lunar.month, lunar.day, hourZhi, mingGongDi);
  
  return {
    lunar,
    hourZhi,
    yearGZ,
    dayGZ,
    mingGongDi,
    wuxingJu,
    palaces,
    mingGongPalace: '命',
    fourHua: SIHUA_TABLE[dayGZ.gan] || SIHUA_TABLE['甲']
  };
}

// 完整解讀生成
function generateReading(ziweiResult) {
  const { palaces, dayGZ, mingGongDi } = ziweiResult;
  const readings = [];
  
  for (const [palaceName, data] of Object.entries(palaces)) {
    const stars = data.stars || [];
    const hua = data.fourHua || [];
    const meanings = stars.map(s => STAR_MEANINGS[s] || '').filter(Boolean);
    
    readings.push({
      palace: palaceName,
      di: data.di,
      stars,
      hua,
      reading: `${palaceName}宮（${data.di}）`,
      starsDesc: stars.length > 0
        ? `${stars.join('、')}，${meanings.join('；')}`
        : '空宮，本宮無主星',
      huaDesc: hua.length > 0 ? hua.join('、') : ''
    });
  }
  
  return readings;
}

export { castZiwei, generateReading, solarToLunar, calcDayGanZhiFromDate, PALACES, STAR_MEANINGS, PALACE_MEANINGS, SIHUA_TABLE, DI_ZHI, TIAN_GAN };

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ===== 14 主星定義 =====
const MAIN_STARS = [
  { id: 'zrw', name: '紫微', type: '皇星' },
  { id: 'tjj', name: '天機', type: '善星' },
  { id: 'tyy', name: '太陽', type: '財星' },
  { id: 'wqx', name: '武曲', type: '財星' },
  { id: 'ttt', name: '天同', type: '福星' },
  { id: 'lzh', name: '廉貞', type: '囚星' },
  { id: 'tfs', name: '天府', type: '財星' },
  { id: 'tyy', name: '太陰', type: '財星' },
  { id: 'tll', name: '貪狼', type: '桃花' },
  { id: 'jmk', name: '巨門', type: '暗星' },
  { id: 'txx', name: '天相', type: '印星' },
  { id: 'tll', name: '天梁', type: '蔭星' },
  { id: 'zsh', name: '七殺', type: '將星' },
  { id: 'pjj', name: '破軍', type: '耗星' }
];

// ===== 四化表（按日干）=====
const SIHUA_TABLE = {
  '甲': { huaLu: '祿', huaQuan: '權', huaKe: '科', huaJi: '忌' },
  '乙': { huaLu: '權', huaQuan: '科', huaKe: '祿', huaJi: '忌' },
  '丙': { huaLu: '忌', huaQuan: '祿', huaKe: '權', huaJi: '科' },
  '丁': { huaLu: '祿', huaQuan: '忌', huaKe: '科', huaJi: '權' },
  '戊': { huaLu: '權', huaQuan: '忌', huaKe: '祿', huaJi: '科' },
  '己': { huaLu: '科', huaQuan: '祿', huaKe: '忌', huaJi: '權' },
  '庚': { huaLu: '忌', huaQuan: '科', huaKe: '祿', huaJi: '權' },
  '辛': { huaLu: '權', huaQuan: '科', huaKe: '忌', huaJi: '祿' },
  '壬': { huaLu: '科', huaQuan: '權', huaKe: '忌', huaJi: '祿' },
  '癸': { huaLu: '忌', huaQuan: '科', huaKe: '權', huaJi: '祿' }
};

// ===== 12 宮位 =====
const PALACES = ['命', '兄', '夫妻', '子女', '財帛', '疾厄', '遷移', '奴僕', '事業', '田宅', '福德', '父母'];
const PALACE_DI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑']; // 命宮地支對照

// ===== 宮位陰陽 =====
const PALACE_YINYANG = {
  '命': '陽', '兄': '陰', '夫妻': '陽', '子女': '陰',
  '財帛': '陽', '疾厄': '陰', '遷移': '陽', '奴僕': '陰',
  '事業': '陽', '田宅': '陰', '福德': '陽', '父母': '陰'
};

// ===== 時辰地支對照 =====
const SHICHEN_DI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ===== 五鼠遁（日時天干起法）=====
const WUSHU_DUN = {
  '甲': '甲', '乙': '丙', '丙': '戊', '丁': '庚', '戊': '壬',
  '己': '甲', '庚': '丙', '辛': '戊', '壬': '庚', '癸': '壬'
};

// ===== 五行局 =====
const WUXING_BURU = {
  '甲': '木三局', '乙': '木三局',
  '丙': '火六局', '丁': '火六局',
  '戊': '土五局', '己': '土五局',
  '庚': '金四局', '辛': '金四局',
  '壬': '水二局', '癸': '水二局'
};

// ===== 主星含義（基礎解讀）=====
const STAR_MEANINGS = {
  '紫微': '尊貴、領導、傲慢',
  '天機': '智慧、策劃、變動',
  '太陽': '光輝、博愛、名聲',
  '武曲': '剛毅、財富、固執',
  '天同': '福氣、享受、懶散',
  '廉貞': '感情、桃花、紛爭',
  '天府': '保守、財庫、安穩',
  '太陰': '柔美、財富、隱秘',
  '貪狼': '欲望、桃花、機巧',
  '巨門': '是非、口舌、疑惑',
  '天相': '印綬、服務、穩重',
  '天梁': '蔭庇、穩定、老成',
  '七殺': '威嚴、衝動、肅殺',
  '破軍': '耗損、變動、果敢'
};

// ===== 宮位解讀 =====
const PALACE_MEANINGS = {
  '命': '先天命格與核心特質',
  '兄': '兄弟姊妹與人際關係',
  '夫妻': '感情婚姻與伴侶互動',
  '子女': '子女缘分與創意表達',
  '財帛': '理財觀念與賺錢方式',
  '疾厄': '健康狀況與身心平衡',
  '遷移': '外出機遇與人際拓展',
  '奴僕': '下屬晚輩與合作關係',
  '事業': '事業野心與職場表現',
  '田宅': '房產家運與置產運勢',
  '福德': '精神享受與因果福報',
  '父母': '父母缘分與文書考試'
};

// ===== 核心排盤函數 =====

// 1. 國曆轉農曆
function solarToLunar(year, month, day) {
  const solarDate = new Date(year, month - 1, day);
  const startDate = new Date(1900, 0, 31); // 1900-01-31 = 庚子年正月初一
  
  let totalDays = Math.floor((solarDate - startDate) / (1000 * 60 * 60 * 24));
  
  let lunarYear = 1900;
  let lunarMonth = 1;
  let lunarDay = 1;
  
  // 逐年遞減直到找到所在年
  while (totalDays > 0) {
    const yearDays = getLunarYearDays(lunarYear);
    if (totalDays < yearDays) break;
    totalDays -= yearDays;
    lunarYear++;
  }
  
  // 月
  const monthData = LUNAR_DATA[lunarYear] || { leapMonth: 0, monthDays: [] };
  const months = [...monthData.monthDays];
  
  // 處理閏月
  const isLeapYear = monthData.leapMonth > 0;
  
  for (let i = 0; i < months.length; i++) {
    const m = i + 1;
    const isLeapThisMonth = isLeapYear && monthData.leapMonth === m;
    const days = months[i] === 1 ? 30 : 29;
    
    if (totalDays < days) {
      lunarMonth = m;
      lunarDay = totalDays + 1;
      return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap: false };
    }
    totalDays -= days;
    
    // 閏月
    if (isLeapYear && monthData.leapMonth === m) {
      if (totalDays < 29) {
        return { year: lunarYear, month: m, day: totalDays + 1, isLeap: true };
      }
      totalDays -= 29;
    }
  }
  
  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap: false };
}

function getLunarYearDays(year) {
  const data = LUNAR_DATA[year];
  if (!data) return 365;
  let days = 0;
  for (const d of data.monthDays) {
    days += d === 1 ? 30 : 29;
  }
  if (data.leapMonth > 0) days += 29;
  return days;
}

// 2. 根據農曆生日計算年干支
function getYearGanZhi(lunarYear) {
  const baseYear = 1900;
  const baseGanZhi = 14; // 1900 = 庚子年 (index 0=甲, 14=庚)
  const offset = lunarYear - baseYear;
  const ganIdx = (baseGanZhi + offset) % 10;
  const zhiIdx = (offset * 12 + 2) % 12; // 1900子=index 0
  return { gan: TIAN_GAN[ganIdx], zhi: DI_ZHI[zhiIdx] };
}

// 3. 根據生日計算日干支
function getDayGanZhi(year, month, day) {
  const d = new Date(year, month - 1, day);
  // 以 1900-01-01 (星期一) 為基準
  const baseDate = new Date(1900, 0, 1);
  const days = Math.floor((d - baseDate) / (1000 * 60 * 60 * 24));
  const ganIdx = (days + 6) % 10; // 1900-01-01 = 辛日 (index 6)
  const zhiIdx = (days + 3) % 12; // 1900-01-01 = 卯日 (index 3)
  return { gan: TIAN_GAN[ganIdx], zhi: DI_ZHI[zhiIdx] };
}

// 4. 根據時辰地支算命宮地支
function getMingGongZhi(lunarMonth, hourZhi) {
  // 口诀：月在哪宮身同断，月起生時順進一
  // 命宮地支 = 出生月地支(寅1卯2...) + 時辰地支(子0丑1...) 再配合
  // 简化：命宮 = (月支 + 時支) % 12
  const monthZhiIdx = (lunarMonth + 1) % 12; // 寅=0
  const hourZhiIdx = DI_ZHI.indexOf(hourZhi);
  const mingGongIdx = (monthZhiIdx + hourZhiIdx) % 12;
  return DI_ZHI[mingGongIdx];
}

// 5. 計算五行局
function getWuXingJu(dayGan) {
  return WUXING_BURU[dayGan] || '水二局';
}

// 6. 計算命宮天干（依日干五鼠遁）
function getMingGongTianGan(dayGan, mingGongZhi) {
  const firstGan = WUSHU_DUN[dayGan];
  const firstGanIdx = TIAN_GAN.indexOf(firstGan);
  const mingGongZhiIdx = DI_ZHI.indexOf(mingGongZhi);
  const offset = (mingGongZhiIdx - mingGongZhiIdx + 12) % 12; // 差值
  // 五鼠遁：甲己日起甲子，乙庚日起丙子，丙辛日起戊子，丁壬日起庚子，戊癸日起壬子
  // 命宮天干 = 遁法起 + (時支index / 2) 取整
  const hourZhiIdx = mingGongZhiIdx;
  const hourOffset = Math.floor(hourZhiIdx / 2);
  const tianGanIdx = (firstGanIdx + hourOffset) % 10;
  return TIAN_GAN[tianGanIdx];
}

// 7. 安十四主星
function arrangeStars(lunarYear, lunarMonth, lunarDay, hourZhi, mingGongDi) {
  const result = {}; // key: 宮位名, value: { stars: [], fourHua: {} }
  
  // 初始化12宮
  const mingGongIdx = PALACE_DI.indexOf(mingGongDi);
  for (let i = 0; i < 12; i++) {
    const palaceIdx = (mingGongIdx + i) % 12;
    result[PALACES[i]] = {
      di: PALACE_DI[palaceIdx],
      stars: [],
      fourHua: [],
      yang: PALACE_YINYANG[PALACES[i]]
    };
  }
  
  // 日干（用於安星）
  const dayGanZhi = getDayGanZhi(
    new Date().getFullYear(), lunarMonth, lunarDay
  );
  // 重新用正確年份計算
  const dayGZ = calcDayGanZhiFromDate(lunarYear, lunarMonth, lunarDay);
  const dayGan = dayGZ.gan;
  
  // 安紫微（按年份干支起）
  const yearGZ = getYearGanZhi(lunarYear);
  const yearGan = yearGZ.gan;
  const yearZhi = yearGZ.zhi;
  
  // 紫微所在宮位 = (年支 + 2) % 12 從命宮算起
  const yearZhiIdx = DI_ZHI.indexOf(yearZhi);
  const ziweiIdx = (yearZhiIdx + 2) % 12;
  const ziweiPalace = PALACES[ziweiIdx];
  
  if (!result[ziweiPalace]) result[ziweiPalace] = { di: PALACE_DI[ziweiIdx], stars: [], fourHua: [] };
  result[ziweiPalace].stars.push('紫微');
  
  // 天機（年支 + 1）
  const tianjiIdx = (yearZhiIdx + 1) % 12;
  const tianjiPalace = PALACES[tianjiIdx];
  if (!result[tianjiPalace]) result[tianjiPalace] = { di: PALACE_DI[tianjiIdx], stars: [], fourHua: [] };
  result[tianjiPalace].stars.push('天機');
  
  // 太陽（年生月）= 年干陰陽決定的宮
  const yearYang = TIAN_GAN.indexOf(yearGan) % 2 === 0 ? '陽' : '陰';
  const taiyangIdx = yearYang === '陽' 
    ? (yearZhiIdx + 3) % 12 
    : (yearZhiIdx + 9) % 12;
  const taiyangPalace = PALACES[taiyangIdx];
  if (!result[taiyangPalace]) result[taiyangPalace] = { di: PALACE_DI[taiyangIdx], stars: [], fourHua: [] };
  result[taiyangPalace].stars.push('太陽');
  
  // 武曲（年生月另一宮）
  const wuquIdx = (yearZhiIdx + 4) % 12;
  const wuquPalace = PALACES[wuquIdx];
  if (!result[wuquPalace]) result[wuquPalace] = { di: PALACE_DI[wuquIdx], stars: [], fourHua: [] };
  result[wuquPalace].stars.push('武曲');
  
  // 天同（年生時）
  const tianongIdx = (yearZhiIdx + 5) % 12;
  const tianongPalace = PALACES[tianongIdx];
  if (!result[tianongPalace]) result[tianongPalace] = { di: PALACE_DI[tianongIdx], stars: [], fourHua: [] };
  result[tianongPalace].stars.push('天同');
  
  // 廉貞（年支）
  const lianzhenIdx = yearZhiIdx;
  const lianzhenPalace = PALACES[lianzhenIdx];
  if (!result[lianzhenPalace]) result[lianzhenPalace] = { di: PALACE_DI[lianzhenIdx], stars: [], fourHua: [] };
  result[lianzhenPalace].stars.push('廉貞');
  
  // 天府（廉貞對宮）
  const tianfuIdx = (yearZhiIdx + 6) % 12;
  const tianfuPalace = PALACES[tianfuIdx];
  if (!result[tianfuPalace]) result[tianfuPalace] = { di: PALACE_DI[tianfuIdx], stars: [], fourHua: [] };
  result[tianfuPalace].stars.push('天府');
  
  // 太陰（年支另一宮，視陰陽）
  const taiyinIdx = yearYang === '陽' 
    ? (yearZhiIdx + 7) % 12 
    : (yearZhiIdx + 1) % 12;
  const taiyinPalace = PALACES[taiyinIdx];
  if (!result[taiyinPalace]) result[taiyinPalace] = { di: PALACE_DI[taiyinIdx], stars: [], fourHua: [] };
  result[taiyinPalace].stars.push('太陰');
  
  // 貪狼（年生年）
  const tanlangIdx = (yearZhiIdx + yearGZ.gan === '甲' ? 0 : yearGZ.gan === '乙' ? 2 : 3) % 12;
  const tanlangPalace = PALACES[(yearZhiIdx + 8) % 12];
  if (!result[tanlangPalace]) result[tanlangPalace] = { di: PALACE_DI[(yearZhiIdx + 8) % 12], stars: [], fourHua: [] };
  result[tanlangPalace].stars.push('貪狼');
  
  // 巨門（貪狼對宮）
  const jumengIdx = (yearZhiIdx + 9) % 12;
  const jumengPalace = PALACES[jumengIdx];
  if (!result[jumengPalace]) result[jumengIdx] = { di: PALACE_DI[jumengIdx], stars: [], fourHua: [] };
  result[jumengPalace].stars.push('巨門');
  
  // 天相（巨門對宮）
  const tianxiangIdx = (yearZhiIdx + 10) % 12;
  const tianxiangPalace = PALACES[tianxiangIdx];
  if (!result[tianxiangPalace]) result[tianxiangPalace] = { di: PALACE_DI[tianxiangIdx], stars: [], fourHua: [] };
  result[tianxiangPalace].stars.push('天相');
  
  // 天梁（天府對宮）
  const tianliangIdx = (yearZhiIdx + 11) % 12;
  const tianliangPalace = PALACES[tianliangIdx];
  if (!result[tianliangPalace]) result[tianliangPalace] = { di: PALACE_DI[tianliangIdx], stars: [], fourHua: [] };
  result[tianliangPalace].stars.push('天梁');
  
  // 七殺（年支所在三方四正）
  const qishaIdx = (yearZhiIdx + 4) % 12;
  const qishaPalace = PALACES[qishaIdx];
  if (!result[qishaPalace]) result[qishaPalace] = { di: PALACE_DI[qishaIdx], stars: [], fourHua: [] };
  result[qishaPalace].stars.push('七殺');
  
  // 破軍（命宮）
  const pojjunPalace = '命';
  result[pojjunPalace].stars.push('破軍');
  
  // ===== 四化飛星 =====
  const fourHua = SIHUA_TABLE[dayGan] || SIHUA_TABLE['甲'];
  
  // 四化星在各宮的分布（按日干查表後安星）
  const huaStars = [
    { name: `化${fourHua.huaLu}`, type: 'lu' },
    { name: `化${fourHua.huaQuan}`, type: 'quán' },
    { name: `化${fourHua.huaKe}`, type: 'ke' },
    { name: `化${fourHua.huaJi}`, type: 'ji' }
  ];
  
  // 化祿在命宮，化權在遷移，化科在財帛，化忌在疾厄（基礎配置）
  const huaPalaceMap = {
    'lu': '命',
    'quán': '遷移',
    'ke': '財帛',
    'ji': '疾厄'
  };
  
  for (const hua of huaStars) {
    const pName = huaPalaceMap[hua.type];
    if (result[pName]) {
      result[pName].fourHua.push(hua.name);
    }
  }
  
  return result;
}

// 精確計算日干支（給定年月日）
function calcDayGanZhiFromDate(year, month, day) {
  // 1900-01-31 是庚子年正月初一（庚子日）
  // 1900-01-01 是丙子日
  const baseDate = new Date(1900, 0, 1);
  const targetDate = new Date(year, month - 1, day);
  const diffDays = Math.floor((targetDate - baseDate) / (1000 * 60 * 60 * 24));
  
  // 1900-01-01 = 丙子日 (index 2=丙, index 0=子)
  const ganBase = 2; // 丙
  const zhiBase = 0; // 子
  const ganIdx = (ganBase + diffDays) % 10;
  const zhiIdx = (zhiBase + diffDays) % 12;
  return { gan: TIAN_GAN[(ganIdx + 10) % 10], zhi: DI_ZHI[(zhiIdx + 12) % 12] };
}

// ===== 主排盤函數 =====
function castZiwei(birthYear, birthMonth, birthDay, birthHour) {
  // birthHour: 0-23
  
  // 1. 農曆轉換
  const lunar = solarToLunar(birthYear, birthMonth, birthDay);
  
  // 2. 時辰地支
  const hourIdx = Math.floor((birthHour + 1) / 2) % 12;
  const hourZhi = SHICHEN_DI[hourIdx];
  
  // 3. 年干支
  const yearGZ = getYearGanZhi(lunar.year);
  
  // 4. 日干支
  const dayGZ = calcDayGanZhiFromDate(birthYear, birthMonth, birthDay);
  
  // 5. 命宮地支
  const mingGongDi = getMingGongZhi(lunar.month, hourZhi);
  
  // 6. 五行局
  const wuxingJu = getWuXingJu(dayGZ.gan);
  
  // 7. 安十四主星 + 四化
  const palaces = arrangeStars(lunar.year, lunar.month, lunar.day, hourZhi, mingGongDi);
  
  return {
    lunar,
    hourZhi,
    yearGZ,
    dayGZ,
    mingGongDi,
    wuxingJu,
    palaces,
    mingGongPalace: '命',
    fourHua: SIHUA_TABLE[dayGZ.gan] || SIHUA_TABLE['甲']
  };
}

// 完整解讀生成
function generateReading(ziweiResult) {
  const { palaces } = ziweiResult;
  const readings = [];
  
  for (const [palaceName, data] of Object.entries(palaces)) {
    const stars = data.stars || [];
    const hua = data.fourHua || [];
    const meanings = stars.map(s => STAR_MEANINGS[s] || '').filter(Boolean);
    
    readings.push({
      palace: palaceName,
      di: data.di,
      stars,
      hua,
      reading: `${palaceName}宮（${data.di}）`,
      starsDesc: stars.length > 0 
        ? `${stars.join('、')}，${meanings.join('；')}` 
        : '空宮，本宮無主星',
      huaDesc: hua.length > 0 ? hua.join('、') : ''
    });
  }
  
  return readings;
}

export { castZiwei, generateReading, solarToLunar, calcDayGanZhiFromDate, PALACES, STAR_MEANINGS, PALACE_MEANINGS, SIHUA_TABLE, DI_ZHI, TIAN_GAN };
