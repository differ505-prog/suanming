/**
 * 紫微斗數排盤系統 v3.0（iztro 驅動版）
 * API 契約完全向後相容，所有現有呼叫無需修改
 */

// ===== 導入 iztro =====
import { astro } from 'iztro';

// ===== 舊版常數（供 STAR_TRAITS、交叉解讀等相容性程式使用）=====
const TIAN_GAN = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
const DI_ZHI   = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];

// ===== 舊版 STAR_TRAITS（供 getCrossReading 使用，完整保留）=====
const STAR_TRAITS = {
  '紫微': { type:'領袖型', desc:'愛面子、不服輸、抗壓力強', strength:'執行力', weakness:'控制欲' },
  '天機': { type:'智謀型', desc:'想得多、執行慢、愛糾結', strength:'策劃力', weakness:'猶豫不決' },
  '太陽': { type:'博愛型', desc:'重名聲、講義氣、脾氣急', strength:'社交力', weakness:'好勝心' },
  '武曲': { type:'剛毅型', desc:'固執、直接、不懂示弱', strength:'行動力', weakness:'脾氣硬' },
  '天同': { type:'福氣型', desc:'怕得罪人、依賴直覺、易滿足', strength:'適應力', weakness:'懶散' },
  '廉貞': { type:'情感型', desc:'執著、敢愛敢恨、情緒化', strength:'感受力', weakness:'糾結' },
  '天府': { type:'保守型', desc:'穩健理財、不愛冒險、防備心', strength:'理財力', weakness:'缺乏衝勁' },
  '太陰': { type:'柔韌型', desc:'隱忍、細膩、被動、不善表達', strength:'觀察力', weakness:'逃避衝突' },
  '貪狼': { type:'欲望型', desc:'野心大、桃花旺、社交高手', strength:'社交力', weakness:'貪心' },
  '巨門': { type:'疑惑型', desc:'多疑、口說傷人、愛分析', strength:'分析力', weakness:'玻璃心' },
  '天相': { type:'印綬型', desc:'配合度高、重承諾、有耐心', strength:'協調力', weakness:'無主見' },
  '天梁': { type:'蔭庇型', desc:'老成、喜照顧人、愛說教', strength:'照顧力', weakness:'固執' },
  '七殺': { type:'衝動型', desc:'果斷、急性子、爆發力強', strength:'突破力', weakness:'魯莽' },
  '破軍': { type:'變革型', desc:'不怕輸、敢破局、不計後果', strength:'破局力', weakness:'不穩定' }
};

// ===== 舊版 STAR_MEANINGS =====
const STAR_MEANINGS = {
  '紫微': '尊貴、領導、野心','天機': '智慧、策劃、變動','太陽': '光輝、博愛、名聲',
  '武曲': '剛毅、財富、果斷','天同': '福氣、享受、懶散','廉貞': '感情、桃花、紛爭',
  '天府': '保守、財庫、安穩','太陰': '柔美、隱秘、財富','貪狼': '欲望、桃花、機巧',
  '巨門': '是非、口舌、疑惑','天相': '印綬、服務、穩重','天梁': '蔭庇、穩定、老成',
  '七殺': '威嚴、衝動、肅殺','破軍': '耗損、變動、果敢'
};

// ===== 舊版 PALACES 與宮位映射 =====
const PALACES = ['命','兄','夫妻','子女','財帛','疾厄','遷移','奴僕','事業','田宅','福德','父母'];

// iztro 宮位名 → 內部宮位名映射
const PALACE_NAME_MAP = {
  '命宮': '命',
  '兄弟': '兄',
  '夫妻': '夫妻',
  '子女': '子女',
  '財帛': '財帛',
  '疾厄': '疾厄',
  '遷移': '遷移',
  '僕役': '奴僕',  // iztro 用"僕役"，內部用"奴僕"
  '官祿': '事業',  // iztro 用"官祿"，內部用"事業"
  '田宅': '田宅',
  '福德': '福德',
  '父母': '父母'
};

// ===== 舊版 SIHUA_TABLE（供解讀使用）=====
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

// ===== 主排盤函數（完整向後相容）=====
function castZiwei(birthYear, birthMonth, birthDay, birthHour, gender = 'male') {
  const dateStr = `${birthYear}-${birthMonth}-${birthDay}`;
  const astrolabe = astro.astrolabeBySolarDate(dateStr, birthHour, gender, true, 'zh-TW');

  // === 命宮主星 ===
  const mingStar = astrolabe.soul || null;
  const shenStar = astrolabe.body || null;

  // === 五行局 ===
  const wuxingJu = astrolabe.fiveElementsClass || '水二局';

  // === 解析年干支、日干支 ===
  const chineseDate = astrolabe.chineseDate || '';
  const dateParts = chineseDate.split(/\s+/);
  
  let yearGZ = { gan: '甲', zhi: '子' };
  let dayGZ = { gan: '甲', zhi: '子' };
  let hourZhi = '子';

  if (dateParts.length >= 1) {
    // 第一段是年干支
    const yearStr = dateParts[0];
    if (yearStr.length >= 2) {
      yearGZ = { gan: yearStr[0], zhi: yearStr[1] };
    }
  }
  if (dateParts.length >= 2) {
    // 第二段是日干支
    const dayStr = dateParts[1];
    if (dayStr.length >= 2) {
      dayGZ = { gan: dayStr[0], zhi: dayStr[1] };
    }
  }
  if (dateParts.length >= 3) {
    // 第三段是時干支
    const hourStr = dateParts[2];
    if (hourStr.length >= 2) {
      hourZhi = hourStr[1];
    }
  }

  // === 12 宮星曜 ===
  const palaces = {};
  for (const name of PALACES) {
    palaces[name] = {
      stars: [],
      fourHua: [],
      di: ''
    };
  }

  // 遍歷 iztro 回傳的宮位
  for (const palace of astrolabe.palaces) {
    const internalName = PALACE_NAME_MAP[palace.name];
    if (!internalName) continue;

    // 提取主星名稱
    const majorStars = palace.majorStars || [];
    palaces[internalName].stars = majorStars.map(s => s.name);

    // 四化星
    const fourHua = [];
    for (const star of majorStars) {
      if (star.mutagen) {
        fourHua.push(star.mutagen);
      }
    }
    palaces[internalName].fourHua = fourHua;

    // 宮位地支
    palaces[internalName].di = palace.earthlyBranch || '';
  }

  // === 命宮地支 ===
  const mingGongDi = palaces['命']?.di || '申';

  // === 日干四化表 ===
  const fourHuaTable = SIHUA_TABLE[dayGZ.gan] || SIHUA_TABLE['甲'];

  return {
    lunar: { year: birthYear, month: birthMonth, day: birthDay },
    hourZhi,
    yearGZ,
    dayGZ,
    mingGongDi,
    wuxingJu,
    palaces,
    mingGongPalace: '命',
    mingStar,
    mingStars: palaces['命']?.stars || [],
    shenStar,
    fourHua: fourHuaTable,
    _astrolabe: astrolabe
  };
}

// ===== generateReading（完整向後相容）=====
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
      starsDesc: stars.length > 0
        ? `${stars.join('、')}，${meanings.join('；')}`
        : '空宮，本宮無主星',
      huaDesc: hua.length > 0 ? hua.join('、') : ''
    });
  }

  return readings;
}

// ===== getCrossReading（完整向後相容）=====
function getCrossReading(hexagram, tiyong, mingStar) {
  if (!mingStar) return null;
  const traits = STAR_TRAITS[mingStar];
  if (!traits) return null;
  const { ti, yong } = tiyong;
  const tiNature = ti?.nature || '陽';
  const yongNature = yong?.nature || '陰';
  const natureMap = { '乾':'陽','坤':'陰','震':'陽','巽':'陰','坎':'陽','離':'陰','艮':'陽','兌':'陰' };
  const hexNature = natureMap[hexagram] || '陽';
  const relation = tiNature === hexNature ? '比和'
    : (tiNature === '陽' && hexNature === '陰') ? '剋' : '生';

  const crossReadings = {
    '紫微': { '生':'紫微星人今天的領導力得到卦象的加持，正好是你大膽做決定的時機。','比和':'紫微星今天的氣場和卦象共振，適合主導談判或公開發言。','剋':'紫微星人今天的卦象帶來阻力，強行推動只會招致反效果，先退一步。' },
    '天同': { '生':'天同星人今天的直覺被卦象放大，跟著感覺走是對的。','比和':'天同星今天的狀態平穩，適合處理日常瑣事。','剋':'天同星人今天的惰性與卦象的阻力碰撞，強迫自己動起來才有出路。' },
    '天府': { '生':'天府星人今天的理財直覺上揚，適合評估財務決策或保守型投資。','比和':'天府星今天的穩健氣場與卦象吻合，按原計劃執行即可。','剋':'天府星人今天的卦象帶來財務壓力，盡量避免大額支出或借貸。' },
    '七殺': { '生':'七殺星人今天的行動力得到卦象支持，正是衝刺的時機。','比和':'七殺星今天的能量與卦象共振，適合談判、對抗或突破僵局。','剋':'七殺星人今天的卦象預警衝突，強硬只會兩敗俱傷，先退讓。' },
    '天機': { '生':'天機星今天的謀劃能力被放大，適合做策略性思考。','比和':'天機星今天的思考平穩，適合整理思緒。','剋':'天機星今天的過度分析反而形成阻礙，行動比想太多更重要。' },
    '太陽': { '生':'太陽星今天的博愛能量被放大，適合社交或公開場合。','比和':'太陽星今天的光輝正旺，適合表現自己。','剋':'太陽星今天的脾氣容易失控，收斂鋒芒為宜。' },
    '武曲': { '生':'武曲星今天的行動力被放大，適合做果斷決策。','比和':'武曲星今天執行力強，按計劃前進。','剋':'武曲星今天的固執可能帶來麻煩，彈性應對。' },
    '太陰': { '生':'太陰星今天的直覺敏銳，適合處理隱秘事務。','比和':'太陰星今天情緒平穩，低調行事。','剋':'太陰星今天容易過度敏感，多給自己空間。' },
    '貪狼': { '生':'貪狼星今天的社交運勢被放大，適合拓展人脈。','比和':'貪狼星今天慾望高漲，慎防貪多。','剋':'貪狼星今天容易过度欲望，克制为上。' }
  };

  return crossReadings[mingStar]?.[relation]
    || `${mingStar}星人今天的能量與${hexagram}卦象互動，保持平常心即可。`;
}

// ===== 匯出（完整向後相容）=====
export {
  castZiwei,
  generateReading,
  getCrossReading,
  STAR_TRAITS,
  STAR_MEANINGS,
  PALACES,
  SIHUA_TABLE,
  DI_ZHI,
  TIAN_GAN
};
