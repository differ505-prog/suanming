/**
 * 靈魂金句庫 v1.0
 * 2 場景 × 4 語氣 × 2 句 × 2 卦象類型 = 32 句
 * 標準：≤ 80字、有畫面感、不正能量雞湯、不巴納姆
 */

const SAYINGS = {
  career: [
    // ===== 語氣 A：毒舌激將 =====
    {
      id: 'career_aggressive_1',
      tone: '毒舌激將',
      category: 'bad',
      text: '卦象說得很清楚：阻礙你的不是老闆，是你拿著一份三年沒更新的履歷在等奇蹟。別人可以踩狗屎運，你沒那個命。',
      keywords: ['轉職', '跳槽', '面試', '遲遲']
    },
    {
      id: 'career_aggressive_2',
      tone: '毒舌激將',
      category: 'good',
      text: '這個卦等於在說：前方三里有路，但你還在路口燒香。機會不會跪著求你，頂多給你三分鐘考慮，現在開始倒計時。',
      keywords: ['轉職', 'offer', '新工作']
    },
    {
      id: 'career_aggressive_3',
      tone: '毒舌激將',
      category: 'bad',
      text: '問這卦的人，三個有兩個是想逃而不是想衝。問題不是環境爛，是你根本沒在環境裡站穩就想著跑路。',
      keywords: ['想離開', '痛苦', '忍耐', '撐不下去']
    },
    {
      id: 'career_aggressive_4',
      tone: '毒舌激將',
      category: 'good',
      text: '外應告訴你：有魚在水面跳，但你得先學會撒網。這次不是運氣，是有人在水面給你敲信號，你接不接？',
      keywords: ['offer', '機會', '貴人', '突然']
    },
    // ===== 語氣 B：溫柔洞察 =====
    {
      id: 'career_gentle_1',
      tone: '溫柔洞察',
      category: 'bad',
      text: '你的焦慮不是來自現實，而是來自對「落後」的想像。卦象在說：你一直盯著別人的跑道，忘記了自己腳下的才是真正的路。',
      keywords: ['焦慮', '別人', '羨慕', '比']
    },
    {
      id: 'career_gentle_2',
      tone: '溫柔洞察',
      category: 'good',
      text: '這個卦在提醒你：不是所有努力都需要被看見。你在累積的東西，正在以你感知不到的速度改變你的軌道。',
      keywords: ['累積', '低潮', '慢慢', '看不見']
    },
    {
      id: 'career_gentle_3',
      tone: '溫柔洞察',
      category: 'bad',
      text: '有些卡點不是時機未到，是你一直在同一個地方打轉。卦象說：你需要的不是更多的資訊，而是把一件事做到徹底的勇氣。',
      keywords: ['卡住', '原地', '重複', '一樣']
    },
    {
      id: 'career_gentle_4',
      tone: '溫柔洞察',
      category: 'good',
      text: '這組卦像是一個安靜的早晨，湖面結冰但水底在流動。你感覺停滯，但其實正在為某件事準備一次真正有意義的啟動。',
      keywords: ['準備', '等待', '醞釀', '看不出']
    },
    // ===== 語氣 C：神秘隱喻 =====
    {
      id: 'career_mystic_1',
      tone: '神秘隱喻',
      category: 'bad',
      text: '有人在山腳問山上的路，但你已經在山腰了。問題是：你一直回頭看山腳的人，以為那是方向，其實那只是影子。',
      keywords: ['方向', '迷失', '不知道']
    },
    {
      id: 'career_mystic_2',
      tone: '神秘隱喻',
      category: 'good',
      text: '這組卦是乾卦的底層能量在告訴你：九龍之水不往上流，但往下流的時候，會順便帶走所有阻礙。',
      keywords: ['突破', '阻礙', '水流']
    },
    {
      id: 'career_mystic_3',
      tone: '神秘隱喻',
      category: 'bad',
      text: '卦象顯示：你在等的那把傘不會來，但雨遲早會停。與其繼續等，不如承認自己從一開始就沒有傘，然後決定要不要繼續走。',
      keywords: ['等待', '期待', '依靠', '失望']
    },
    {
      id: 'career_mystic_4',
      tone: '神秘隱喻',
      category: 'good',
      text: '這是個「看不見的門正在打開」的卦。你還沒感覺到，但有一個房間的燈已經亮了，只是你還站在走廊裡。',
      keywords: ['新的', '將要', '預感', '接近']
    },
    // ===== 語氣 D：乾脆果斷 =====
    {
      id: 'career_blunt_1',
      tone: '乾脆果斷',
      category: 'bad',
      text: '卦象說：現在不是行動的時機。具體來說，別投履歷、別提辭呈、別做任何「斷後路」的動作。給自己三週。',
      keywords: ['現在', '此時', '該不該']
    },
    {
      id: 'career_blunt_2',
      tone: '乾脆果斷',
      category: 'good',
      text: '這個卦等於給你發了一張黃金門票，時限三個月。具體建議：本週內主動聯繫那個你一直在關注的人或公司，別再等了。',
      keywords: ['要不要', '能不能', '去做']
    },
    {
      id: 'career_blunt_3',
      tone: '乾脆果斷',
      category: 'bad',
      text: '問這個問題的背後，其實你不是想轉職，你是想逃離。卦象說：這兩個不是同一件事。逃離不用轉職，只需要面對。',
      keywords: ['想逃', '不想做了', '忍不了']
    },
    {
      id: 'career_blunt_4',
      tone: '乾脆果斷',
      category: 'good',
      text: '卦象給你一個很清晰的訊號：有人正在等你的消息，而你以為是自己不夠好。事實相反。明天聯繫。',
      keywords: ['面試', '回覆', '等']
    }
  ],
  love: [
    // ===== 語氣 A：毒舌激將 =====
    {
      id: 'love_aggressive_1',
      tone: '毒舌激將',
      category: 'bad',
      text: '已讀不回不是他不喜歡你，是他比你還在權衡要不要當那個先開口的人。卦象說：再等一條訊息的時間，然後你先發。',
      keywords: ['已讀不回', '沈默', '不讀']
    },
    {
      id: 'love_aggressive_2',
      tone: '毒舌激將',
      category: 'good',
      text: '這個卦在笑你：明明是個成年人在談感情，卻在等一個人先說對不起。沒有對錯，只有誰願意先破這個僵局。',
      keywords: ['冷戰', '僵局', '等對方']
    },
    {
      id: 'love_aggressive_3',
      tone: '毒舌激將',
      category: 'bad',
      text: '卦象說：你不是在複合，你是在心裡續租一間已經過期的房子。房租免了，但房東不是他了，你是在跟自己過不去。',
      keywords: ['複合', '前任', '過去']
    },
    {
      id: 'love_aggressive_4',
      tone: '毒舌激將',
      category: 'good',
      text: '曖昧期的卦象最誠實：你以為在等信號，其實對方也在等。兩個人都在等對方，等成了一個死結。這個結誰先剪，誰就贏。',
      keywords: ['曖昧', '確認', '要不要說']
    },
    // ===== 語氣 B：溫柔洞察 =====
    {
      id: 'love_gentle_1',
      tone: '溫柔洞察',
      category: 'bad',
      text: '卦象在說：你一直想確認對方的心意，但你的心意其實早就確認了。你在等的不是他的答案，是你自己願不願意接受。',
      keywords: ['確認', '他喜歡我嗎', '不確定']
    },
    {
      id: 'love_gentle_2',
      tone: '溫柔洞察',
      category: 'good',
      text: '這個卦像是一個安靜的晚上，你們都坐在同一艘船上，只是各自看著不同方向的水面。船會到岸，但前提是你們得知道彼此在船上。',
      keywords: ['在一起', '未確認', '兩人']
    },
    {
      id: 'love_gentle_3',
      tone: '溫柔洞察',
      category: 'bad',
      text: '你怕的不是失去這個人，是怕那個「被拋下」的感覺再次出現。卦象說：這兩件事要分開處理，不然你會拿錯誤的恐懼去阻擋正確的人。',
      keywords: ['怕失去', '不敢', '受傷']
    },
    {
      id: 'love_gentle_4',
      tone: '溫柔洞察',
      category: 'good',
      text: '有些感情像春天的雪，看起來還在，但其實已經開始融化了。這個卦在說：享受最後的清冷，但開始準備春天的衣服。',
      keywords: ['結果', '未來', '長久', '發展']
    },
    // ===== 語氣 C：神秘隱喻 =====
    {
      id: 'love_mystic_1',
      tone: '神秘隱喻',
      category: 'bad',
      text: '這個卦是「井水不犯河水」的能量。你以為是兩個人在僵持，其實只有一個人站在井邊，另一個人早就不在井旁邊了。',
      keywords: ['他', '不回', '不動']
    },
    {
      id: 'love_mystic_2',
      tone: '神秘隱喻',
      category: 'good',
      text: '卦象說：你們之間有一層薄薄的霧，薄到你能看到對方的輪廓，但伸手碰到的只是空氣。破霧的辦法不是找路，是先確定那個人也在找。',
      keywords: ['曖昧', '看不清', '霧']
    },
    {
      id: 'love_mystic_3',
      tone: '神秘隱喻',
      category: 'bad',
      text: '這組卦是個「逆水行舟」的局。你在用力划，但船沒往前開。不是你划得不夠，是有什麼東西在船底拖著你，你得先處理那個。',
      keywords: ['停滯', '不前', '努力沒用']
    },
    {
      id: 'love_mystic_4',
      tone: '神秘隱喻',
      category: 'good',
      text: '卦象說：有人正拿著一把你以為弄丟了的鑰匙在找你。那把鑰匙一直在門上，只是你一直在找的是另一扇窗。',
      keywords: ['復合', '舊人', '回頭', '找']
    },
    // ===== 語氣 D：乾脆果斷 =====
    {
      id: 'love_blunt_1',
      tone: '乾脆果斷',
      category: 'bad',
      text: '卦象很直接：這條訊息發出去，你不會得到你想要的答案。不是他不好，是你們現在不在同一個頻道。具體建議：再等四十八小時再發。',
      keywords: ['訊息', '發', '問']
    },
    {
      id: 'love_blunt_2',
      tone: '乾脆果斷',
      category: 'good',
      text: '這個卦說：他正在等一個台階，你給他，他下來，你不給，他找別人的台階。具體建議：今天之內給一個不經意的信號讓他下來。',
      keywords: ['他想', '等', '主動', '給機會']
    },
    {
      id: 'love_blunt_3',
      tone: '乾脆果斷',
      category: 'bad',
      text: '卦象說：你這段感情的核心問題是「沒有人在真的說話」。你們都在演對的角色、說對的話，但沒有人在場。',
      keywords: ['問題', '不對', '哪裡', '出軌']
    },
    {
      id: 'love_blunt_4',
      tone: '乾脆果斷',
      category: 'good',
      text: '這個卦等於一張提前兌現的支票：他已經動心了，只是還沒有表達出來。你的下一步：給他一個安全的表情，讓他敢開口。',
      keywords: ['表白', '確認', '在一起', '喜歡']
    }
  ]
};

// 根據場景和卦象吉凶抽取金句
function getSaying(scenario, isGood) {
  const pool = SAYINGS[scenario] || SAYINGS.career;
  const category = isGood ? 'good' : 'bad';
  const filtered = pool.filter(s => s.category === category);
  
  if (filtered.length === 0) return pool[0];
  
  // 根據日期 seed 確保同一問題同結果
  const today = new Date();
  const seed = (today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate()) % filtered.length;
  return filtered[seed];
}

// 獲取所有金句（用於儀表板展示）
function getAllSayings() {
  return SAYINGS;
}

export { SAYINGS, getSaying, getAllSayings };
