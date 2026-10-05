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

// ===== 時辰轉換：24小時制 → iztro timeIndex（0-12）=====
/**
 * 將 24 小時制數字轉換為 iztro 的 timeIndex（0-12）
 *
 * iztro TIME_RANGE 對照（子丑寅卯...由 timeIndex 決定）：
 *  timeIndex=0  → 00:00~01:00（早子時）
 *  timeIndex=1  → 01:00~03:00（丑時）
 *  timeIndex=2  → 03:00~05:00（寅時）
 *  timeIndex=3  → 05:00~07:00（卯時）
 *  timeIndex=4  → 07:00~09:00（辰時）
 *  timeIndex=5  → 09:00~11:00（巳時）  ← hour=9 用戶最常輸入
 *  timeIndex=6  → 11:00~13:00（午時）
 *  timeIndex=7  → 13:00~15:00（未時）
 *  timeIndex=8  → 15:00~17:00（申時）
 *  timeIndex=9  → 17:00~19:00（酉時）
 *  timeIndex=10 → 19:00~21:00（戌時）
 *  timeIndex=11 → 21:00~23:00（亥時）
 *  timeIndex=12 → 23:00~00:00（晚子時）
 *
 * 正確公式：(hour + 1) // 2
 *  hour=0  → (0+1)//2=0  ✅
 *  hour=1  → (1+1)//2=1  ✅ 丑時
 *  hour=9  → (9+1)//2=5  ✅ 巳時
 *  hour=23 → special case → 12 ✅ 晚子時
 *
 * @param {number} hour - 24 小時制（0-23）
 * @returns {number} timeIndex（0-12）
 */
function hourToTimeIndex(hour) {
  if (hour === 0)  return 0;   // 00:00 早子時
  if (hour === 23) return 12;  // 23:00 晚子時
  return Math.floor((hour + 1) / 2);  // 其餘：hour+1 再除以 2
}

// ===== 主排盤函數（完整向後相容）=====
function castZiwei(birthYear, birthMonth, birthDay, birthHour, gender = 'male') {
  const dateStr = `${birthYear}-${birthMonth}-${birthDay}`;
  // 關鍵修復：將 24 小時制轉為 iztro timeIndex（0-12）
  // 之前 Bug：直接傳 birthHour=9，導致 iztro 把 9 當成 timeIndex=9（酉時）而非 timeIndex=5（巳時）
  const timeIndex = hourToTimeIndex(birthHour);
  const astrolabe = astro.astrolabeBySolarDate(dateStr, timeIndex, gender, true, 'zh-TW');

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

    // 提取主星名稱（攜帶 brightness + mutagen 供渲染層使用）
    const majorStars = palace.majorStars || [];
    palaces[internalName].stars = majorStars.map(s => ({
      name: s.name,
      brightness: s.brightness || null,
      mutagen: s.mutagen
        ? (typeof s.mutagen === 'string' ? s.mutagen : (s.mutagen.type || null))
        : null
    }));

    // 四化星（取星曜的四化標記）
    // mutagen 可能為字串（'祿'/'權'/'科'/'忌'）或物件 {type, star}
    const fourHua = [];
    for (const star of majorStars) {
      if (star.mutagen) {
        const huaType = typeof star.mutagen === 'string' ? star.mutagen : star.mutagen.type;
        if (huaType) fourHua.push(huaType);
      }
    }
    palaces[internalName].fourHua = fourHua;

    // 宮位地支（直接從 iztro palace 取得，最準確）
    palaces[internalName].di = palace.earthlyBranch || '';

    // 副星、輔星（字串格式，供桃花/貴人星統計用）
    palaces[internalName].minorStars = (palace.minorStars || []).map(s => s.name || s);
    palaces[internalName].adjectiveStars = (palace.adjectiveStars || []).map(s => s.name || s);

    // 十二長生位
    palaces[internalName].changsheng12 = palace.changsheng12 || '';
  }

  // === 命宮地支 ===
  // 關鍵修復：直接從 astrolabe 讀取，不依賴 palace 映射
  // earthlyBranchOfSoulPalace 是 iztro 計算命宮時的標準欄位
  const mingGongDi = astrolabe.earthlyBranchOfSoulPalace
    || palaces['命']?.di
    || '子';

  // === 身宮：找到身宮所在的宮位及其主星 ===
  const shenPalaceName = astrolabe.bodyPalaceName || '疾厄';  // iztro 預設
  const shenPalace = astrolabe.palaces.find(p =>
    p.name === shenPalaceName ||
    PALACE_NAME_MAP[p.name] === shenPalaceName ||
    p.earthlyBranch === astrolabe.earthlyBranchOfBodyPalace
  );
  const shenPalaceStars = shenPalace
    ? shenPalace.majorStars.map(s => ({
        name: s.name,
        brightness: s.brightness || null,
        mutagen: s.mutagen
          ? (typeof s.mutagen === 'string' ? s.mutagen : (s.mutagen.type || null))
          : null
      }))
    : [];

  // === 生年四化表（以年干為準）===
  // 關鍵修復：原本用 dayGZ.gan（日干）是錯的，應以 yearGZ.gan（年干）為準
  // 生年四化口訣：「甲廉破武陽、乙陰同機……」
  const fourHuaTable = SIHUA_TABLE[yearGZ.gan] || SIHUA_TABLE['甲'];

  // === 大限資料 ===
  const horoscope = astrolabe.horoscope();
  const currentDecadal = horoscope?.decadal || null;

  // 五行局數字 → 起運歲數（水二局=2，以此類推）
  const bureauNumberMap = { '水一局':1,'水二局':2,'水三局':3,'木一局':1,'木二局':2,'木三局':3,'金一局':1,'金二局':2,'金三局':3,'土一局':1,'土二局':2,'土三局':3,'火一局':1,'火二局':2,'火三局':3 };
  const bureauNumber = bureauNumberMap[wuxingJu] || 2;
  const decadalIndex = currentDecadal?.index ?? 0;
  const decadalStartAge = (currentDecadal?.startAge != null)
    ? currentDecadal.startAge
    : bureauNumber + decadalIndex * 10;
  const decadalEndAge = decadalStartAge + 9;

  // 構造完整 12 宮大限名稱（從 decadal 的 index 出發，遍歷 12 宮）
  let decadalPalaceNames = [];
  if (currentDecadal && currentDecadal.palaceNames) {
    decadalPalaceNames = currentDecadal.palaceNames;
  } else if (astrolabe.palaces && astrolabe.palaces.length === 12) {
    decadalPalaceNames = astrolabe.palaces.map(p => PALACE_NAME_MAP[p.name] || p.name);
  }

  return {
    lunar: { year: birthYear, month: birthMonth, day: birthDay },
    lunarDateStr: astrolabe.rawDates?.lunarDate
      ? `${astrolabe.rawDates.lunarDate.lunarYear}年${astrolabe.rawDates.lunarDate.lunarMonth}月${astrolabe.rawDates.lunarDate.lunarDay}日`
      : null,
    zodiac: astrolabe.zodiac || null,   // 馬/龍/蛇...
    sign: astrolabe.sign || null,       // 雙子座/牡羊座...
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
    shenPalaceName,          // 身宮所在宮位名（如「疾厄」）
    shenPalaceStars,         // 身宮主星（物件格式）
    fourHua: fourHuaTable,
    currentDecadal: currentDecadal ? {
      index: currentDecadal.index ?? 0,
      name: currentDecadal.name || '',              // 當前大限宮位名（iztro 提供）
      heavenlyStem: currentDecadal.heavenlyStem || '',
      earthlyBranch: currentDecadal.earthlyBranch || '',
      palaceNames: decadalPalaceNames,
      startAge: decadalStartAge,                    // 起運歲數（水二局+index×10）
      ageRange: `${decadalStartAge}-${decadalEndAge}歲`
    } : null,
    _astrolabe: astrolabe
  };
}

// ===== generateReading（完整向後相容）=====
function generateReading(ziweiResult) {
  const { palaces } = ziweiResult;
  const readings = [];

  for (const [palaceName, data] of Object.entries(palaces)) {
    const stars = data.stars || [];
    // stars 現為物件陣列 [{name, brightness, mutagen}]
    const starNames = stars.map(s => (typeof s === 'string' ? s : s.name));
    const hua = data.fourHua || [];
    const meanings = starNames.map(s => STAR_MEANINGS[s] || '').filter(Boolean);

    readings.push({
      palace: palaceName,
      di: data.di,
      stars,          // 完整物件 [{name, brightness, mutagen}]
      starNames,      // 字串陣列 ["紫微","天機"]
      minorStars: data.minorStars || [],
      adjectiveStars: data.adjectiveStars || [],
      changsheng12: data.changsheng12 || '',
      hua,
      starsDesc: starNames.length > 0
        ? `${starNames.join('、')}，${meanings.join('；')}`
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
