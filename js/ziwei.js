/**
 * 紫微斗數排盤系統 v2.0
 * 含：農曆轉換、五行局、命宮排法、十四主星安星、四化飛星
 * 主星性格標籤（用於交叉解讀）
 */

// ===== 天干地支 =====
const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const DI_ZHI   = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ===== 12 宮位 =====
const PALACES = ['命', '兄', '夫妻', '子女', '財帛', '疾厄', '遷移', '奴僕', '事業', '田宅', '福德', '父母'];
// 宮位地支對照（命宮 = 寅，每宮遞增）
const PALACE_DI = ['寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥', '子', '丑'];

// ===== 宮位陰陽 =====
const PALACE_YINYANG = {
  '命': '陽', '兄': '陰', '夫妻': '陽', '子女': '陰',
  '財帛': '陽', '疾厄': '陰', '遷移': '陽', '奴僕': '陰',
  '事業': '陽', '田宅': '陰', '福德': '陽', '父母': '陰'
};

// ===== 時辰地支對照 =====
// 子時 23:00-00:59 → index 0，丑時 01:00-02:59 → index 1 ...
const SHICHEN_DI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// ===== 五行局 =====（日干天干定五行局）
const WUXING_BURU = {
  '甲': '木三局', '乙': '木三局',
  '丙': '火六局', '丁': '火六局',
  '戊': '土五局', '己': '土五局',
  '庚': '金四局', '辛': '金四局',
  '壬': '水二局', '癸': '水二局'
};

// ===== 五鼠遁（日起時天干）=====
const WUSHU_DUN = {
  '甲': '甲', '乙': '丙', '丙': '戊', '丁': '庚', '戊': '壬',
  '己': '甲', '庚': '丙', '辛': '戊', '壬': '庚', '癸': '壬'
};

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

// ===== 主星含義 =====（基礎解讀 ≤30字）
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

// ===== 主星性格標籤 =====（用於梅花×紫微交叉解讀）
const STAR_TRAITS = {
  '紫微': { type: '領袖型', desc: '愛面子、不服輸、抗壓力強', strength: '執行力', weakness: '控制欲' },
  '天機': { type: '智謀型', desc: '想得多、執行慢、愛糾結', strength: '策劃力', weakness: '猶豫不決' },
  '太陽': { type: '博愛型', desc: '重名聲、講義氣、脾氣急', strength: '社交力', weakness: '好勝心' },
  '武曲': { type: '剛毅型', desc: '固執、直接、不懂示弱', strength: '行動力', weakness: '脾氣硬' },
  '天同': { type: '福氣型', desc: '怕得罪人、依賴直覺、易滿足', strength: '適應力', weakness: '懶散' },
  '廉貞': { type: '情感型', desc: '執著、敢愛敢恨、情緒化', strength: '感受力', weakness: '糾結' },
  '天府': { type: '保守型', desc: '穩健理財、不愛冒險、防備心', strength: '理財力', weakness: '缺乏衝勁' },
  '太陰': { type: '柔韌型', desc: '隱忍、細膩、被動、不善表達', strength: '觀察力', weakness: '逃避衝突' },
  '貪狼': { type: '欲望型', desc: '野心大、桃花旺、社交高手', strength: '社交力', weakness: '貪心' },
  '巨門': { type: '疑惑型', desc: '多疑、口說傷人、愛分析', strength: '分析力', weakness: '玻璃心' },
  '天相': { type: '印綬型', desc: '配合度高、重承諾、有耐心', strength: '協調力', weakness: '無主見' },
  '天梁': { type: '蔭庇型', desc: '老成、喜照顧人、愛說教', strength: '照顧力', weakness: '固執' },
  '七殺': { type: '衝動型', desc: '果斷、急性子、爆發力強', strength: '突破力', weakness: '魯莽' },
  '破軍': { type: '變革型', desc: '不怕輸、敢破局、不計後果', strength: '破局力', weakness: '不穩定' }
};

// ===== 宮位解讀 =====（基礎解讀 ≤40字）
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

// ===== 農曆數據表（1900-2050，含閏月）=====
// 格式：year: { leapMonth: 0~13（0=無閏月）, monthDays: [每月天數] }
// 月份 index 0 = 正月，monthDays[i] = 0→29天，1→30天
const LUNAR_DATA = {
  1900:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1901:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1902:{leapMonth:0,monthDays:[1,0,1,0,1,1,0,1,0,1,0,1,0]},1903:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1904:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1905:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},
  1906:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1907:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1908:{leapMonth:0,monthDays:[1,0,1,0,1,1,0,1,0,1,0,1,0]},1909:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1910:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1911:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},
  1912:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1913:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1914:{leapMonth:0,monthDays:[1,0,1,0,1,1,0,1,0,1,0,1,0]},1915:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1916:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1917:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1918:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1919:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1920:{leapMonth:0,monthDays:[1,0,1,0,1,1,0,1,0,1,0,1,0]},1921:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1922:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1923:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1924:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1925:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1926:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1927:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1928:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1929:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1930:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1931:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1932:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1933:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1934:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1935:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1936:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1937:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1938:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1939:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1940:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1941:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1942:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1943:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1944:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1945:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1946:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1947:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1948:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1949:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1950:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1951:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1952:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1953:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1954:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1955:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1956:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1957:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1958:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1959:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1960:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1961:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1962:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1963:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1964:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1965:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1966:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1967:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1968:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1969:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1970:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1971:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1972:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1973:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1974:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1975:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1976:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1977:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1978:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1979:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1980:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1981:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1982:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1983:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1984:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1985:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1986:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1987:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1988:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1989:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1990:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1991:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1992:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1993:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  1994:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},1995:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  1996:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},1997:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  1998:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},1999:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2000:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2001:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2002:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2003:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2004:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2005:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2006:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2007:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2008:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2009:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2010:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2011:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2012:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2013:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2014:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2015:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2016:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2017:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2018:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2019:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2020:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2021:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2022:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2023:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2024:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2025:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2026:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2027:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2028:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2029:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2030:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2031:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2032:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2033:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2034:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2035:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2036:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2037:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2038:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2039:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2040:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2041:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2042:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2043:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2044:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},2045:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},
  2046:{leapMonth:0,monthDays:[1,0,1,1,0,1,0,1,0,1,0,1,0]},2047:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]},
  2048:{leapMonth:0,monthDays:[0,1,0,1,0,1,0,1,0,1,0,1,0]},2049:{leapMonth:0,monthDays:[1,1,0,1,0,1,0,1,0,1,0,1,0]},
  2050:{leapMonth:0,monthDays:[1,0,1,0,1,0,1,0,1,0,1,0,1]}
};

// ===== 輔助：某年某月有多少天 =====
function _monthDays(year, month, isLeap) {
  const data = LUNAR_DATA[year];
  if (!data) return 30;
  const leap = data.leapMonth;
  if (isLeap && leap === month) return 29;
  const arr = data.monthDays;
  const idx = month - 1;
  if (idx < 0 || idx >= arr.length) return 30;
  return arr[idx] === 1 ? 30 : 29;
}

// ===== 1. 國曆轉農曆 =====
// 1900-01-31 = 庚子年正月初一（朔望月偏移法）
function solarToLunar(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const base = new Date(Date.UTC(1900, 0, 31)); // 庚子年正月初一
  let offset = Math.floor((d - base) / 86400000); // 離基準的天數

  let lunarYear = 1900;
  let lunarMonth = 1;
  let lunarDay = 1;

  while (offset > 0) {
    const days = _getYearTotalDays(lunarYear);
    if (offset < days) break;
    offset -= days;
    lunarYear++;
  }

  const data = LUNAR_DATA[lunarYear] || { leapMonth: 0, monthDays: [0] };
  const months = data.monthDays;

  for (let m = 1; m <= 12; m++) {
    const days = months[m - 1] === 1 ? 30 : 29;
    if (offset < days) {
      lunarMonth = m;
      lunarDay = offset + 1;
      return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap: false };
    }
    offset -= days;
    if (data.leapMonth === m) {
      if (offset < 29) {
        return { year: lunarYear, month: m, day: offset + 1, isLeap: true };
      }
      offset -= 29;
    }
  }

  return { year: lunarYear, month: lunarMonth, day: lunarDay, isLeap: false };
}

function _getYearTotalDays(year) {
  const data = LUNAR_DATA[year];
  if (!data) return 360;
  let days = 0;
  for (const d of data.monthDays) days += d === 1 ? 30 : 29;
  if (data.leapMonth > 0) days += 29;
  return days;
}

// ===== 2. 年干支 =====
// 1900 = 庚子年（天干 6=庚, 地支 0=子）
function getYearGanZhi(lunarYear) {
  const diff = lunarYear - 1900;
  const ganIdx = (6 + diff) % 10;
  const zhiIdx = (0 + diff) % 12;
  return { gan: TIAN_GAN[(ganIdx + 10) % 10], zhi: DI_ZHI[(zhiIdx + 12) % 12] };
}

// ===== 3. 日干支 =====
// 以 1900-01-01（丙子日, gan=2, zhi=0）為基準
function calcDayGanZhiFromDate(year, month, day) {
  const base = new Date(1900, 0, 1);
  const target = new Date(year, month - 1, day);
  const diff = Math.floor((target - base) / 86400000);
  const ganIdx = (2 + diff) % 10;
  const zhiIdx = (0 + diff) % 12;
  return { gan: TIAN_GAN[(ganIdx + 10) % 10], zhi: DI_ZHI[(zhiIdx + 12) % 12] };
}

// ===== 4. 命宮地支 =====
// 口诀：命宮 = (月支 + 時支) % 12
// 月支：寅=0(正月), 卯=1, 辰=2...丑=11
function getMingGongZhi(lunarMonth, hourZhi) {
  const monthZhiIdx = lunarMonth; // 1月=寅=0
  const hourZhiIdx = DI_ZHI.indexOf(hourZhi);
  const mingGongIdx = (monthZhiIdx + hourZhiIdx) % 12;
  return DI_ZHI[mingGongIdx];
}

// ===== 5. 五行局 =====
// 日干定五行局
function getWuXingJu(dayGan) {
  return WUXING_BURU[dayGan] || '水二局';
}

// ===== 6. 命宮天干 =====（依日干五鼠遁）
function getMingGongTianGan(dayGan, mingGongZhi) {
  const firstGan = WUSHU_DUN[dayGan];
  const firstIdx = TIAN_GAN.indexOf(firstGan);
  const hourIdx = DI_ZHI.indexOf(mingGongZhi);
  const offset = Math.floor(hourIdx / 2);
  return TIAN_GAN[(firstIdx + offset) % 10];
}

// ===== 7. 安十四主星 =====
// 核心口诀：紫微居何宮，年支加二宮
// 天府：廉貞對宮（廉貞+6）
// 太陰：視年干陰陽（陽→年支+7，陰→年支+1）
// 殺破狼：根據五行局從遷移宮起逆數
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
  const yearYang = TIAN_GAN.indexOf(yearGZ.gan) % 2 === 0 ? '陽' : '陰';

  // 日干支（用於四化）
  const dayGZ = calcDayGanZhiFromDate(lunarYear, lunarMonth, lunarDay);
  const dayGan = dayGZ.gan;

  // === 安十四主星 ===

  // 紫微：年支 + 2
  const ziweiIdx = (yearZhiIdx + 2) % 12;
  result[PALACES[ziweiIdx]].stars.push('紫微');

  // 天機：年支 + 1
  result[PALACES[(yearZhiIdx + 1) % 12]].stars.push('天機');

  // 太陽：視年干陰陽（陽→年支+3，陰→年支+9）
  const taiyangIdx = yearYang === '陽'
    ? (yearZhiIdx + 3) % 12
    : (yearZhiIdx + 9) % 12;
  result[PALACES[taiyangIdx]].stars.push('太陽');

  // 武曲：年支 + 4
  const wuquIdx = (yearZhiIdx + 4) % 12;
  result[PALACES[wuquIdx]].stars.push('武曲');

  // 天同：年支 + 5
  const tiantongIdx = (yearZhiIdx + 5) % 12;
  result[PALACES[tiantongIdx]].stars.push('天同');

  // 廉貞：年支本宮
  result[PALACES[yearZhiIdx]].stars.push('廉貞');

  // 天府：廉貞對宮（廉貞+6，即年支+6+2）
  const tianfuIdx = (yearZhiIdx + 6 + 2) % 12;
  result[PALACES[tianfuIdx]].stars.push('天府');

  // 太陰：視年干陰陽（陽→年支+7，陰→年支+1）
  const taiyinIdx = yearYang === '陽'
    ? (yearZhiIdx + 7) % 12
    : (yearZhiIdx + 1) % 12;
  result[PALACES[taiyinIdx]].stars.push('太陰');

  // 貪狼：年支 + 8
  result[PALACES[(yearZhiIdx + 8) % 12]].stars.push('貪狼');

  // 巨門：年支 + 9
  result[PALACES[(yearZhiIdx + 9) % 12]].stars.push('巨門');

  // 天相：年支 + 10
  result[PALACES[(yearZhiIdx + 10) % 12]].stars.push('天相');

  // 天梁：年支 + 11
  result[PALACES[(yearZhiIdx + 11) % 12]].stars.push('天梁');

  // 破軍：命宮（遷移宮對應位置，年支+6 的對宮）
  result['命'].stars.push('破軍');

  // 七殺：殺破狼系列，安於遷移宮（年支+6）
  const qishaIdx = (yearZhiIdx + 6) % 12;
  result[PALACES[qishaIdx]].stars.push('七殺');

  // === 四化飛星（按日干）===
  const fourHua = SIHUA_TABLE[dayGan] || SIHUA_TABLE['甲'];

  // 化祿在命宮，化權在財帛，化科在事業，化忌在疾厄
  const huaPalaceMap = {
    'lu': '命',
    'quán': '財帛',
    'ke': '事業',
    'ji': '疾厄'
  };

  const huaStars = [
    { name: `化${fourHua.huaLu}`, key: 'lu' },
    { name: `化${fourHua.huaQuan}`, key: 'quán' },
    { name: `化${fourHua.huaKe}`, key: 'ke' },
    { name: `化${fourHua.huaJi}`, key: 'ji' }
  ];

  for (const hua of huaStars) {
    const pName = huaPalaceMap[hua.key];
    if (pName && result[pName]) {
      result[pName].fourHua.push(hua.name);
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

  // 8. 命宮主星（用於交叉解讀）
  const mingGongData = palaces['命'];
  const mingStars = mingGongData ? mingGongData.stars : [];
  const mingStar = mingStars[0] || null; // 第一顆為命宮主星

  return {
    lunar,
    hourZhi,
    yearGZ,
    dayGZ,
    mingGongDi,
    wuxingJu,
    palaces,
    mingGongPalace: '命',
    mingStar,
    mingStars,
    fourHua: SIHUA_TABLE[dayGZ.gan] || SIHUA_TABLE['甲']
  };
}

// ===== 完整解讀生成 =====
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

// ===== 交叉解讀：梅花卦象 × 命宮主星 =====
function getCrossReading(hexagram, tiyong, mingStar) {
  if (!mingStar) return null;

  const traits = STAR_TRAITS[mingStar];
  if (!traits) return null;

  const { ti, yong, relation } = tiyong;
  const tiNature = ti.nature; // '陽' or '陰'
  const yongNature = yong.nature;

  // 體用關係描述
  const relationDesc = {
    '生': '助力',
    '被生': '消耗',
    '比和': '和諧',
    '剋': '阻力',
    '被剋': '考驗',
    '同': '共振'
  };

  // 根據主星性格 + 體用關係 生成交叉解讀
  const readings = {
    '紫微': {
      '生': `紫微星人今天的領導力得到卦象的加持，正好是你大膽做決定的時機。`,
      '被生': `紫微星人今天的精力稍被消耗，不宜強出頭，低調觀望更穩。`,
      '比和': `紫微星今天的氣場和卦象共振，適合主導談判或公開發言。`,
      '剋': `紫微星人今天的卦象帶來阻力，強行推動只會招致反效果，先退一步。`,
      '被剋': `今天的挑戰恰好補足紫微星人固執的盲點，接受磨合反而有收獲。`,
    },
    '天同': {
      '生': `天同星人今天的直覺被卦象放大，跟著感覺走是對的。`,
      '被生': `今天的卦象提醒天同星人：享受要有節制，先把手上的事做完再休息。`,
      '比和': `天同星今天的狀態平穩，適合處理日常瑣事，不宜做重大抉擇。`,
      '剋': `天同星人今天的惰性與卦象的阻力碰撞，強迫自己動起來才有出路。`,
      '被剋': `今天的難關恰好是讓天同星人成長的機會，咬牙撐過去就不一樣了。`,
    },
    '天府': {
      '生': `天府星人今天的理財直覺上揚，適合評估財務決策或保守型投資。`,
      '被生': `今天的卦象讓天府星人更傾向保守防守，不宜做出激進財務動作。`,
      '比和': `天府星今天的穩健氣場與卦象吻合，按原計劃執行即可。`,
      '剋': `天府星人今天的卦象帶來財務壓力，盡量避免大額支出或借貸。`,
      '被剋': `今天的挑戰考驗天府星人的理財判斷力，危機也是轉機。`,
    },
    '七殺': {
      '生': `七殺星人今天的行動力得到卦象支持，正是衝刺的時機，直接去做。`,
      '被生': `今天的卦象稍為制約七殺星人的爆發力，先觀察再出手更穩。`,
      '比和': `七殺星今天的能量與卦象共振，適合談判、對抗或突破僵局。`,
      '剋': `七殺星人今天的卦象預警衝突，強硬只會兩敗俱傷，先退讓。`,
      '被剋': `今天的阻力讓七殺星人冷靜下來，反而避免魯莽決定。`,
    },
    '貪狼': {
      '生': `貪狼星人今天的社交運勢被卦象放大，出席場合或主動聯繫都會有收獲。`,
      '被生': `今天的卦象稍微冷卻貪狼星人的慾望，是個適合低調觀望的日子。`,
      '比和': `貪狼星今天的吸引力與卦象吻合，社交場合會遇到有趣的人。`,
      '剋': `貪狼星人今天的社交雷達可能失靈，容易遇到表面熱絡但實際無用的人脈。`,
      '被剋': `今天的卦象提醒貪狼星人：想要的太多反而容易落空，先專注一件。`,
    },
    '太陰': {
      '生': `太陰星人今天的內在能量與卦象和諧，適合處理細節、記錄、觀察類的事。`,
      '被生': `今天的卦象讓太陰星人更有耐心，沉得住氣是今天最大的武器。`,
      '比和': `太陰星今天的直覺與卦象一致，相信第一直覺往往是對的。`,
      '剋': `太陰星人今天的卦象預警情緒波動，盡量避免與人正面衝突。`,
      '被剋': `今天的難關是讓太陰星人走出舒適區的機會，逼自己面對才有成長。`,
    },
    '天梁': {
      '生': `天梁星人今天的照顧能量被卦象放大，今天適合關心身邊的人或處理公益事務。`,
      '被生': `今天的卦象讓天梁星人更傾向低調行事，不宜過度干預他人事務。`,
      '比和': `天梁星今天的穩重氣場與卦象吻合，按你的節奏走就好。`,
      '剋': `天梁星人今天的卦象提醒：說教無益，先管好自己的事再說。`,
      '被剋': `今天的挑戰讓天梁星人學會不那麼用力付出，收到的反而更多。`,
    },
  };

  // 通用 fallback（針對其餘主星）
  const genericReadings = {
    '生': `${mingStar}星人今天的能量得到卦象的助力，是個適合行動的日子。`,
    '被生': `今天的卦象對${mingStar}星人來說是個消耗日，先照顧好自己再說。`,
    '比和': `${mingStar}星人今天的氣場與卦象和諧，保持當下狀態即可。`,
    '剋': `今天的卦象對${mingStar}星人帶來阻力，穩住節奏，不要強行推進。`,
    '被剋': `${mingStar}星人今天的挑戰恰好補足性格盲點，是成長的時機。`,
  };

  const starReadings = readings[mingStar] || genericReadings;
  const relationKey = relationDesc[relation] || relation;

  return {
    star: mingStar,
    type: traits.type,
    traits: traits.desc,
    strength: traits.strength,
    relation: relationKey,
    reading: starReadings[relation] || `${mingStar}星人今天的卦象呈現${relationKey}之勢，保持平常心。`,
  };
}

export {
  castZiwei,
  generateReading,
  getCrossReading,
  solarToLunar,
  calcDayGanZhiFromDate,
  PALACES,
  STAR_MEANINGS,
  STAR_TRAITS,
  PALACE_MEANINGS,
  SIHUA_TABLE,
  DI_ZHI,
  TIAN_GAN,
  LUNAR_DATA
};
